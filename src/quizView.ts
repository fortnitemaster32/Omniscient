/**
 * The quiz session view: shows one question at a time, hides the answer
 * until the user asks to reveal it, then self-grades and writes the status
 * back to the source file. Supports skipping and undoing grades.
 */

import { ItemView, MarkdownRenderer, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import type OmniscientPlugin from './main';
import { parseQuestions, patchQuestionHeader, serializeHeader } from './parser';
import { QuizSession } from './session';
import { SummaryModal } from './summaryModal';
import type { GradeKind, QuestionBlock, QuizSessionConfig } from './types';

export const QUIZ_VIEW_TYPE = 'omniscient-quiz-view';

export class QuizView extends ItemView {
    private config: QuizSessionConfig | null = null;
    private session: QuizSession | null = null;
    private revealed = false;
    private finished = false;
    private failedWrites = 0;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(
        leaf: WorkspaceLeaf,
        private readonly plugin: OmniscientPlugin,
    ) {
        super(leaf);
    }

    getViewType(): string {
        return QUIZ_VIEW_TYPE;
    }

    getDisplayText(): string {
        return `Omniscient — ${this.displayName()}`;
    }

    getIcon(): string {
        return 'target';
    }

    private displayName(): string {
        const paths = this.config?.filePaths;
        if (!paths || paths.length === 0) {
            return 'Quiz';
        }
        if (paths.length === 1) {
            return paths[0].split('/').pop()?.replace(/\.md$/i, '') ?? 'Quiz';
        }
        return `${paths.length} files`;
    }

    async onOpen(): Promise<void> {
        try {
            await this.setup();
        } catch (error) {
            console.error('Omniscient: failed to open quiz view', error);
            new Notice('Could not open the quiz view. See the developer console for details.');
            this.leaf.detach();
        }
    }

    private async setup(): Promise<void> {
        const config = this.plugin.consumePendingQuizConfig();
        if (!config) {
            // View restored from a saved workspace layout: nothing to run.
            this.leaf.detach();
            return;
        }
        this.config = config;

        const labels = this.plugin.getDifficultyLabels();
        const blocks: QuestionBlock[] = [];
        let foundFiles = 0;
        for (const path of config.filePaths) {
            const abstract = this.app.vault.getAbstractFileByPath(path);
            if (!(abstract instanceof TFile)) {
                continue;
            }
            try {
                const content = await this.app.vault.read(abstract);
                const parsed = parseQuestions(content, labels);
                for (const question of parsed.questions) {
                    question.sourcePath = path;
                }
                blocks.push(...parsed.questions);
                foundFiles++;
            } catch {
                // Skip files that cannot be read.
            }
        }
        if (foundFiles === 0) {
            new Notice('The quiz file(s) no longer exist.');
            this.leaf.detach();
            return;
        }
        this.session = new QuizSession(blocks, config);
        if (this.session.total === 0) {
            new Notice('No questions match the selected filters.');
            this.leaf.detach();
            return;
        }

        this.renderShell();
        this.registerDomEvent(this.containerEl, 'keydown', (event) =>
            this.handleKeydown(event),
        );
        this.renderQuestion();
        this.containerEl.focus();
    }

    onClose(): Promise<void> {
        return Promise.resolve();
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    private renderShell(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('omniscient-quiz-view');
        contentEl.setAttribute('tabindex', '0');
        contentEl.setAttribute(
            'aria-label',
            'Quiz session. Space reveals the answer, 1, 2 and 3 grade it.',
        );

        const header = contentEl.createDiv({ cls: 'omniscient-quiz-header' });
        header.createDiv({
            cls: 'omniscient-quiz-title',
            text: this.displayName(),
        });
        header.createDiv({ cls: 'omniscient-quiz-spacer' });
        this.progressTextEl = header.createDiv({ cls: 'omniscient-progress-text' });
        const undoButton = header.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'Undo last grade', 'data-tooltip-position': 'top' },
        });
        undoButton.setText('Undo');
        undoButton.addEventListener('click', () => this.undo());
        this.undoButtonEl = undoButton;
        const endButton = header.createEl('button', {
            cls: 'clickable-icon',
            attr: { 'aria-label': 'End session', 'data-tooltip-position': 'top' },
        });
        endButton.setText('End session');
        endButton.addEventListener('click', () => this.endSession());

        const bar = contentEl.createDiv({ cls: 'omniscient-progress-bar' });
        this.progressFillEl = bar.createDiv({ cls: 'omniscient-progress-bar-fill' });

        this.contentArea = contentEl.createDiv({ cls: 'omniscient-content' });
        this.hintEl = contentEl.createDiv({ cls: 'omniscient-hint' });
        this.hintEl.setText(
            'Space or enter reveals · 1 struggling · 2 almost · 3 mastered · s skip · u undo · esc ends',
        );
    }

    private renderQuestion(): void {
        const session = this.session;
        if (!session || !this.contentArea) {
            return;
        }
        const item = session.current;
        if (!item) {
            return;
        }
        const area = this.contentArea;
        area.empty();

        if (this.undoButtonEl) {
            this.undoButtonEl.disabled = !session.hasUndo;
        }

        const meta = item.block.difficulty ?? '';
        const status = item.block.status
            ? item.block.status === 'Mastered'
                ? `Mastered(${item.block.passes})`
                : item.block.status
            : 'New';
        const metaText =
            meta.length > 0 ? `Difficulty: ${meta} · Status: ${status}` : `Status: ${status}`;

        const card = area.createDiv({ cls: 'omniscient-question-card' });
        card.createDiv({ cls: 'omniscient-question-meta', text: metaText });
        void MarkdownRenderer.render(
            this.app,
            item.block.questionBody,
            card,
            item.block.sourcePath,
            this,
        );

        const actions = area.createDiv({ cls: 'omniscient-actions' });

        if (!this.revealed) {
            const reveal = actions.createEl('button', {
                cls: 'omniscient-grade-btn mod-cta',
                text: 'Reveal answer',
                attr: { 'aria-label': 'Reveal the answer' },
            });
            reveal.addEventListener('click', () => this.reveal());
            const skip = actions.createEl('button', {
                cls: 'omniscient-grade-btn',
                text: 'Skip',
                attr: { 'aria-label': 'Skip this question for now' },
            });
            skip.addEventListener('click', () => this.skip());
        } else {
            const answerCard = area.createDiv({ cls: 'omniscient-answer-card' });
            answerCard.createDiv({ cls: 'omniscient-answer-label', text: 'Answer' });
            if (item.block.answerBody.length > 0) {
                void MarkdownRenderer.render(
                    this.app,
                    item.block.answerBody,
                    answerCard,
                    item.block.sourcePath,
                    this,
                );
            } else {
                answerCard.createDiv({
                    cls: 'omniscient-hint',
                    text: 'No answer provided for this question.',
                });
            }

            const gradeButtons: { grade: GradeKind; label: string; cls?: string }[] = [
                { grade: 'Struggling', label: 'Struggling', cls: 'mod-warning' },
                { grade: 'Almost', label: 'Almost' },
                { grade: 'Mastered', label: 'Mastered', cls: 'mod-cta' },
            ];
            for (const def of gradeButtons) {
                const button = actions.createEl('button', {
                    cls: 'omniscient-grade-btn',
                    text: def.label,
                    attr: { 'aria-label': `Grade as ${def.label}` },
                });
                if (def.cls) {
                    button.addClass(def.cls);
                }
                button.addEventListener('click', () => this.grade(def.grade));
            }
            const skip = actions.createEl('button', {
                cls: 'omniscient-grade-btn',
                text: 'Skip',
                attr: { 'aria-label': 'Skip this question for now' },
            });
            skip.addEventListener('click', () => this.skip());
        }

        this.updateProgress();
        this.containerEl.focus();
    }

    private updateProgress(): void {
        const session = this.session;
        if (!session) {
            return;
        }
        const { answered } = session.counts;
        if (this.progressTextEl) {
            this.progressTextEl.setText(`${answered}/${session.total}`);
        }
        if (this.progressFillEl) {
            const pct = session.total > 0 ? (answered / session.total) * 100 : 0;
            this.progressFillEl.style.width = `${pct}%`;
        }
    }

    // ------------------------------------------------------------------
    // Interaction
    // ------------------------------------------------------------------

    private handleKeydown(event: KeyboardEvent): void {
        if (event.target instanceof HTMLElement && event.target.closest('button')) {
            return;
        }
        if (this.finished || this.session === null) {
            return;
        }
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            if (!this.revealed) {
                this.reveal();
            }
            return;
        }
        const key = event.key.toLowerCase();
        if (key === '1' || key === '2' || key === '3') {
            event.preventDefault();
            if (this.revealed) {
                const grades: GradeKind[] = ['Struggling', 'Almost', 'Mastered'];
                this.grade(grades[Number.parseInt(event.key, 10) - 1]);
            }
            return;
        }
        if (key === 's') {
            event.preventDefault();
            this.skip();
            return;
        }
        if (key === 'u') {
            event.preventDefault();
            this.undo();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.endSession();
        }
    }

    private reveal(): void {
        this.revealed = true;
        this.renderQuestion();
    }

    private skip(): void {
        const session = this.session;
        if (session === null || this.finished) {
            return;
        }
        session.skipCurrent();
        this.revealed = false;
        this.renderQuestion();
    }

    private undo(): void {
        const session = this.session;
        if (session === null || this.finished) {
            return;
        }
        const item = session.undoLast();
        if (item === null) {
            return;
        }
        // Persist the restored status back to the file.
        this.enqueueWrite(item.block);
        this.revealed = false;
        this.renderQuestion();
    }

    private grade(grade: GradeKind): void {
        const session = this.session;
        if (session === null || !this.revealed || this.finished) {
            return;
        }
        const graded = session.gradeCurrent(grade);
        if (graded === null) {
            return;
        }
        this.enqueueWrite(graded.block);
        this.updateProgress();
        if (session.isComplete) {
            this.endSession();
            return;
        }
        this.revealed = false;
        this.renderQuestion();
    }

    private enqueueWrite(block: QuestionBlock): void {
        const path = block.sourcePath || this.config?.filePaths[0];
        if (!path) {
            return;
        }
        const abstract = this.app.vault.getAbstractFileByPath(path);
        if (!(abstract instanceof TFile)) {
            return;
        }
        const labels = this.plugin.getDifficultyLabels();
        const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                await this.app.vault.process(abstract, (content) =>
                    patchQuestionHeader(content, block, newLine, labels),
                );
            } catch (error) {
                console.error('Omniscient: failed to save question status', error);
                this.failedWrites++;
            }
        });
    }

    private endSession(): void {
        const session = this.session;
        if (session === null || this.finished) {
            return;
        }
        this.finished = true;
        const counts = session.counts;
        void this.plugin.recordSession({
            date: new Date().toISOString(),
            filePath: this.config?.filePaths.join(', ') ?? '',
            total: session.total,
            answered: counts.answered,
            mastered: counts.mastered,
            almost: counts.almost,
            struggling: counts.struggling,
        });
        const filePaths = this.config?.filePaths;
        new SummaryModal(this.app, {
            fileBasename: this.displayName(),
            counts,
            total: session.total,
            failedWrites: this.failedWrites,
            onDone: () => {
                this.leaf.detach();
            },
            onReviewStruggling: () => {
                if (filePaths) {
                    void this.plugin.startQuizFlowFromPaths(filePaths, {
                        statusFilter: 'struggling',
                    });
                }
            },
        }).open();
    }

    // ------------------------------------------------------------------
    // View element references (assigned in renderShell)
    // ------------------------------------------------------------------

    private contentArea: HTMLElement | null = null;
    private hintEl: HTMLElement | null = null;
    private undoButtonEl: HTMLButtonElement | null = null;
    private progressTextEl: HTMLElement | null = null;
    private progressFillEl: HTMLElement | null = null;
}
