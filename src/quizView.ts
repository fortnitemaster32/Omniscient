/**
 * The quiz session view: shows one question at a time, hides the answer
 * until the user asks to reveal it, then self-grades and writes the status
 * back to the source file.
 */

import { ItemView, MarkdownRenderer, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import type OmniscientPlugin from './main';
import { parseQuestions, patchQuestionHeader, serializeHeader } from './parser';
import { QuizSession } from './session';
import { SummaryModal } from './summaryModal';
import type { GradeKind, QuestionBlock, QuizSessionConfig } from './types';

export const QUIZ_VIEW_TYPE = 'omniscient-quiz-view';

function formatTime(total: number): string {
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export class QuizView extends ItemView {
    private config: QuizSessionConfig | null = null;
    private session: QuizSession | null = null;
    private file: TFile | null = null;
    private revealed = false;
    private finished = false;
    private failedWrites = 0;
    private writeQueue: Promise<void> = Promise.resolve();
    private timerHandle: number | null = null;
    private timeLeftSec = 0;
    private readonly startedAt = Date.now();

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
        return `Omniscient — ${this.file?.basename ?? 'quiz'}`;
    }

    getIcon(): string {
        return 'target';
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
        const abstract = this.app.vault.getAbstractFileByPath(config.filePath);
        if (!(abstract instanceof TFile)) {
            new Notice('The quiz file no longer exists.');
            this.leaf.detach();
            return;
        }
        this.file = abstract;
        try {
            const content = await this.app.vault.read(this.file);
            const { questions } = parseQuestions(content, this.plugin.getDifficultyLabels());
            this.session = new QuizSession(questions, config);
        } catch {
            new Notice('Could not read the quiz file.');
            this.leaf.detach();
            return;
        }
        if (this.session.total === 0) {
            new Notice('No questions match the selected filters.');
            this.leaf.detach();
            return;
        }

        this.renderShell();
        this.registerDomEvent(this.containerEl, 'keydown', (event) =>
            this.handleKeydown(event),
        );
        if (this.config.mode === 'timed') {
            this.timeLeftSec = Math.max(
                60,
                Math.round(this.config.minutesPerQuestion * this.session.total * 60),
            );
            this.updateTimer();
            const win = this.containerEl.ownerDocument.defaultView ?? window;
            this.timerHandle = win.setInterval(() => this.tick(), 1000);
        }
        this.renderQuestion();
        this.containerEl.focus();
    }

    onClose(): Promise<void> {
        const win = this.containerEl.ownerDocument.defaultView ?? window;
        if (this.timerHandle !== null) {
            win.clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
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
            text: this.file?.basename ?? 'Quiz',
        });
        header.createDiv({
            cls: 'omniscient-quiz-mode',
            text: this.config?.mode === 'timed' ? 'Timed mock exam' : 'Practice',
        });
        if (this.config?.mode === 'timed') {
            this.timerEl = header.createDiv({ cls: 'omniscient-timer' });
        }
        header.createDiv({ cls: 'omniscient-quiz-spacer' });
        this.progressTextEl = header.createDiv({ cls: 'omniscient-progress-text' });
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
            'Space or enter reveals the answer · 1 struggling · 2 almost · 3 mastered · esc ends',
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
            this.file?.path ?? '',
            this,
        );

        if (!this.revealed) {
            const actions = area.createDiv({ cls: 'omniscient-actions' });
            const reveal = actions.createEl('button', {
                cls: 'mod-cta',
                text: 'Reveal answer',
                attr: { 'aria-label': 'Reveal the answer' },
            });
            reveal.addEventListener('click', () => this.reveal());
        } else {
            const answerCard = area.createDiv({ cls: 'omniscient-answer-card' });
            answerCard.createDiv({ cls: 'omniscient-answer-label', text: 'Answer' });
            if (item.block.answerBody.length > 0) {
                void MarkdownRenderer.render(
                    this.app,
                    item.block.answerBody,
                    answerCard,
                    this.file?.path ?? '',
                    this,
                );
            } else {
                answerCard.createDiv({
                    cls: 'omniscient-hint',
                    text: 'No answer provided for this question.',
                });
            }

            const actions = area.createDiv({ cls: 'omniscient-actions' });
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

    private updateTimer(): void {
        if (this.timerEl) {
            this.timerEl.setText(formatTime(this.timeLeftSec));
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
        if (event.key === '1' || event.key === '2' || event.key === '3') {
            event.preventDefault();
            if (this.revealed) {
                const grades: GradeKind[] = ['Struggling', 'Almost', 'Mastered'];
                this.grade(grades[Number.parseInt(event.key, 10) - 1]);
            }
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
        const file = this.file;
        if (file === null || this.config === null) {
            return;
        }
        const labels = this.plugin.getDifficultyLabels();
        const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                await this.app.vault.process(file, (content) =>
                    patchQuestionHeader(content, block, newLine, labels),
                );
            } catch (error) {
                console.error('Omniscient: failed to save question status', error);
                this.failedWrites++;
            }
        });
    }

    private tick(): void {
        if (this.finished || this.session === null) {
            return;
        }
        this.timeLeftSec--;
        this.updateTimer();
        if (this.timeLeftSec <= 0) {
            // Time is up: everything unanswered counts as struggling.
            while (!this.session.isComplete) {
                const graded = this.session.gradeCurrent('Struggling');
                if (graded === null) {
                    break;
                }
                this.enqueueWrite(graded.block);
            }
            this.updateProgress();
            this.endSession();
        }
    }

    private endSession(): void {
        const session = this.session;
        if (session === null || this.finished) {
            return;
        }
        this.finished = true;
        const win = this.containerEl.ownerDocument.defaultView ?? window;
        if (this.timerHandle !== null) {
            win.clearInterval(this.timerHandle);
            this.timerHandle = null;
        }
        const counts = session.counts;
        const timeSec = Math.round((Date.now() - this.startedAt) / 1000);
        void this.plugin.recordSession({
            date: new Date().toISOString(),
            mode: this.config?.mode ?? 'practice',
            filePath: this.config?.filePath ?? '',
            total: session.total,
            answered: counts.answered,
            mastered: counts.mastered,
            almost: counts.almost,
            struggling: counts.struggling,
            timeSec,
        });
        const file = this.file;
        const config = this.config;
        new SummaryModal(this.app, {
            mode: config?.mode ?? 'practice',
            fileBasename: file?.basename ?? 'Quiz',
            counts,
            total: session.total,
            timeSec,
            failedWrites: this.failedWrites,
            onDone: () => {
                this.leaf.detach();
            },
            onReviewStruggling: () => {
                if (file !== null) {
                    void this.plugin.startQuizFlow(file, 'practice', {
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
    private timerEl: HTMLElement | null = null;
    private progressTextEl: HTMLElement | null = null;
    private progressFillEl: HTMLElement | null = null;
}
