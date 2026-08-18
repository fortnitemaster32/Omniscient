/** Omniscient plugin entry point. */

import { Notice, Plugin, TFolder, TFile } from 'obsidian';
import { QuizFilePicker } from './filePickerModal';
import { FolderPickModal } from './folderPickModal';
import { GuideModal } from './guideModal';
import { OMNISCIENT_ICON } from './icon';
import { HAS_QUESTIONS_RE, parseQuestions } from './parser';
import { SAMPLE_QUIZ_CONTENT } from './sampleQuiz';
import { ProgressModal } from './progressModal';
import { QUIZ_VIEW_TYPE, QuizView } from './quizView';
import {
    DEFAULT_SETTINGS,
    OmniscientSettingTab,
    parseDifficultyLabels,
} from './settings';
import { SetupModal } from './setupModal';
import { summarizeBlocks } from './stats';
import type { OmniscientSettings } from './settings';
import type { QuestionBlock, QuizSessionConfig, SessionRecord } from './types';

export default class OmniscientPlugin extends Plugin {
    settings: OmniscientSettings = Object.assign({}, DEFAULT_SETTINGS);
    /**
     * Configs handed to quiz views that are about to open. View state is
     * only available after onOpen() in Obsidian, so configs are passed
     * through the plugin instead of view state. A queue (not a single slot)
     * keeps concurrent opens from clobbering each other.
     */
    private pendingQuizConfigs: QuizSessionConfig[] = [];
    /** Serializes settings writes so concurrent saves cannot interleave. */
    private saveQueue: Promise<void> = Promise.resolve();
    /** Guards createSampleFile against double-clicks while a create is in flight. */
    private sampleFileInFlight = false;

    async onload(): Promise<void> {
        try {
            await this.loadPersisted();

            // First run: show the usage guide once, then never again unless
            // the user reopens it (command palette or settings).
            this.app.workspace.onLayoutReady(() => {
                if (!this.settings.guideSeen) {
                    this.settings.guideSeen = true;
                    void this.persistSettings();
                    this.openGuide(() => {
                        void this.pickQuizFile();
                    });
                }
            });

            this.registerView(QUIZ_VIEW_TYPE, (leaf) => new QuizView(leaf, this));
            this.addSettingTab(new OmniscientSettingTab(this.app, this));

            this.addCommand({
                id: 'show-guide',
                name: 'Show usage guide',
                callback: () => {
                    this.openGuide();
                },
            });
            this.addCommand({
                id: 'start-quiz',
                name: 'Start quiz',
                checkCallback: (checking) => this.startQuizCommand(checking),
            });
            this.addCommand({
                id: 'choose-quiz-file',
                name: 'Choose quiz file',
                callback: () => {
                    void this.pickQuizFile();
                },
            });
            this.addCommand({
                id: 'start-folder-quiz',
                name: 'Start quiz from folder',
                callback: () => {
                    new FolderPickModal(this.app, this).open();
                },
            });
            this.addCommand({
                id: 'show-progress',
                name: 'Show quiz progress',
                checkCallback: (checking) => this.showProgressCommand(checking),
            });

            this.addRibbonIcon(OMNISCIENT_ICON, 'Start quiz', () => {
                const file = this.app.workspace.getActiveFile();
                if (file && file.extension === 'md') {
                    void this.startQuizFlow(file);
                } else {
                    void this.pickQuizFile();
                }
            });
        } catch (error) {
            console.error('Omniscient: failed to load', error);
            new Notice('Omniscient failed to load. See the developer console for details.');
        }
    }

    getDifficultyLabels(): string[] {
        return parseDifficultyLabels(this.settings.difficultyLabels);
    }

    /** Opens the in-app usage guide. */
    openGuide(onStart?: () => void): void {
        new GuideModal(this.app, {
            onStart,
            onCreateSample: () => {
                void this.createSampleFile();
            },
        }).open();
    }

    /**
     * Creates the sample quiz note in the vault root, or opens the
     * existing one if the user already created it.
     */
    async createSampleFile(): Promise<TFile | null> {
        if (this.sampleFileInFlight) {
            return null;
        }
        this.sampleFileInFlight = true;
        try {
            const path = 'Omniscient sample quiz.md';
            const existing = this.app.vault.getAbstractFileByPath(path);
            if (existing instanceof TFile) {
                new Notice('Sample quiz file already exists.');
                await this.app.workspace.getLeaf('tab').openFile(existing);
                return existing;
            }
            const file = await this.app.vault.create(path, SAMPLE_QUIZ_CONTENT);
            await this.app.workspace.getLeaf('tab').openFile(file);
            new Notice('Sample quiz file created.');
            return file;
        } catch (error) {
            console.error('Omniscient: failed to create sample file', error);
            new Notice('Could not create the sample file. See the developer console for details.');
            return null;
        } finally {
            this.sampleFileInFlight = false;
        }
    }

    // ------------------------------------------------------------------
    // Commands
    // ------------------------------------------------------------------

    /**
     * Always enabled so the palette never silently no-ops: if there is no
     * active markdown file we say so explicitly.
     */
    private startQuizCommand(checking: boolean): boolean {
        if (checking) {
            return true;
        }
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') {
            new Notice('Open a Markdown file first, then run this command.');
            return true;
        }
        void this.startQuizFlow(file);
        return true;
    }

    /**
     * Reads the file, validates it contains questions, and starts a session.
     *
     * Without a preset, shows the setup modal first. With a preset (e.g.
     * "review struggling") the session starts immediately using the preset
     * over the settings defaults.
     */
    async startQuizFlow(file: TFile, preset?: Partial<QuizSessionConfig>): Promise<void> {
        await this.startQuizFlowFromPaths([file.path], preset);
    }

    /** Starts a quiz over every markdown file inside a folder tree. */
    async startFolderQuizFlow(folder: TFolder): Promise<void> {
        const prefix = folder.path === '/' ? '' : `${folder.path}/`;
        const paths = this.app.vault
            .getMarkdownFiles()
            .filter((file) => file.path.startsWith(prefix))
            .map((file) => file.path);
        if (paths.length === 0) {
            new Notice('No Markdown files in this folder.');
            return;
        }
        await this.startQuizFlowFromPaths(paths);
    }

    /**
     * Reads the files, validates they contain questions, and starts a
     * session. Without a preset, shows the setup modal first. With a preset
     * (e.g. "review struggling") the session starts immediately using the
     * preset over the settings defaults.
     */
    async startQuizFlowFromPaths(
        filePaths: string[],
        preset?: Partial<QuizSessionConfig>,
    ): Promise<void> {
        const labels = this.getDifficultyLabels();
        const blocks: QuestionBlock[] = [];
        let foundFiles = 0;
        for (const path of filePaths) {
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
            new Notice('Could not read the selected file(s).');
            return;
        }
        if (blocks.length === 0) {
            new Notice('No questions found in the selected file(s).');
            return;
        }
        if (preset) {
            const config: QuizSessionConfig = {
                filePaths,
                shuffle: this.settings.shuffleByDefault,
                statusFilter: 'all',
                difficultyFilter: 'all',
                masteredPasses: this.settings.masteredPasses,
                ...preset,
            };
            void this.openQuizView(config);
            return;
        }
        const summary = summarizeBlocks(blocks, this.settings.masteredPasses);
        new SetupModal(
            this.app,
            this,
            filePaths,
            blocks.length,
            foundFiles,
            summary.examReady,
            (config) => {
                void this.openQuizView(config);
            },
        ).open();
    }

    /**
     * Returns the config for a quiz view that is about to open, in FIFO
     * order. Returns null when the view is restored from a saved layout.
     */
    consumePendingQuizConfig(): QuizSessionConfig | null {
        return this.pendingQuizConfigs.shift() ?? null;
    }

    private async openQuizView(config: QuizSessionConfig): Promise<void> {
        this.pendingQuizConfigs.push(config);
        try {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.setViewState({ type: QUIZ_VIEW_TYPE, active: true });
            void this.app.workspace.revealLeaf(leaf);
        } catch (error) {
            // Remove exactly the config this call pushed. Index-based
            // removal is unsafe here: another view may have consumed an
            // earlier entry (shift) while this one was opening.
            const slot = this.pendingQuizConfigs.indexOf(config);
            if (slot !== -1) {
                this.pendingQuizConfigs.splice(slot, 1);
            }
            console.error('Omniscient: failed to open quiz view', error);
            new Notice('Could not open the quiz view. See the developer console for details.');
        }
    }

    private async showProgress(file: TFile): Promise<void> {
        let content: string;
        try {
            content = await this.app.vault.read(file);
        } catch {
            new Notice('Could not read the selected file.');
            return;
        }
        const questions = parseQuestions(content, this.getDifficultyLabels()).questions;
        if (questions.length === 0) {
            new Notice(`No questions found in ${file.basename}.`);
            return;
        }
        const summary = summarizeBlocks(questions, this.settings.masteredPasses);
        new ProgressModal(this.app, file.basename, summary).open();
    }

    private showProgressCommand(checking: boolean): boolean {
        if (checking) {
            return true;
        }
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') {
            new Notice('Open a Markdown file first, then run this command.');
            return true;
        }
        void this.showProgress(file);
        return true;
    }

    private async pickQuizFile(): Promise<void> {
        const files = this.app.vault.getMarkdownFiles();
        const results = await Promise.all(
            files.map(async (file) => {
                try {
                    const content = await this.app.vault.cachedRead(file);
                    return HAS_QUESTIONS_RE.test(content) ? file : null;
                } catch {
                    // Skip files that cannot be read.
                    return null;
                }
            }),
        );
        const matches = results.filter((file): file is TFile => file !== null);
        if (matches.length === 0) {
            new Notice(
                'No quiz files found in the vault. Use the usage guide to create a sample quiz file.',
            );
            return;
        }
        new QuizFilePicker(this.app, this, matches).open();
    }

    // ------------------------------------------------------------------
    // Persistence
    // ------------------------------------------------------------------

    private async loadPersisted(): Promise<void> {
        const data = (await this.loadData()) as Partial<OmniscientSettings> | null;
        this.settings = this.normalizeSettings(data ?? {});
    }

    /**
     * Validates persisted settings field by field so a corrupted data.json
     * (wrong types, missing keys) degrades to defaults instead of crashing
     * or producing nonsense filters.
     */
    private normalizeSettings(raw: Partial<OmniscientSettings>): OmniscientSettings {
        const difficultyLabels =
            typeof raw.difficultyLabels === 'string' && raw.difficultyLabels.trim().length > 0
                ? raw.difficultyLabels
                : DEFAULT_SETTINGS.difficultyLabels;
        const masteredPasses =
            typeof raw.masteredPasses === 'number' &&
            Number.isFinite(raw.masteredPasses) &&
            raw.masteredPasses >= 1
                ? Math.floor(raw.masteredPasses)
                : DEFAULT_SETTINGS.masteredPasses;
        const shuffleByDefault =
            typeof raw.shuffleByDefault === 'boolean'
                ? raw.shuffleByDefault
                : DEFAULT_SETTINGS.shuffleByDefault;
        const history = Array.isArray(raw.history)
            ? raw.history.filter(isValidSessionRecord)
            : [];
        const guideSeen =
            typeof raw.guideSeen === 'boolean' ? raw.guideSeen : DEFAULT_SETTINGS.guideSeen;
        return {
            difficultyLabels,
            masteredPasses,
            shuffleByDefault,
            history,
            guideSeen,
        };
    }

    async recordSession(record: SessionRecord): Promise<void> {
        this.settings.history.unshift(record);
        this.settings.history = this.settings.history.slice(0, 100);
        await this.persistSettings();
    }

    async clearHistory(): Promise<void> {
        this.settings.history = [];
        await this.persistSettings();
    }

    /**
     * Serializes settings writes through one promise chain so concurrent
     * sessions (or a session finishing while history is cleared) cannot
     * interleave saves and leave data.json in the wrong state.
     */
    private persistSettings(): Promise<void> {
        this.saveQueue = this.saveQueue.then(() => this.saveData(this.settings));
        return this.saveQueue;
    }
}

/**
 * Field-by-field check for one session history record so a corrupted
 * data.json cannot crash the settings tab.
 */
function isValidSessionRecord(entry: unknown): entry is SessionRecord {
    if (typeof entry !== 'object' || entry === null) {
        return false;
    }
    const r = entry as Record<string, unknown>;
    return (
        typeof r.date === 'string' &&
        typeof r.filePath === 'string' &&
        typeof r.total === 'number' &&
        Number.isFinite(r.total) &&
        typeof r.answered === 'number' &&
        Number.isFinite(r.answered) &&
        typeof r.mastered === 'number' &&
        Number.isFinite(r.mastered) &&
        typeof r.almost === 'number' &&
        Number.isFinite(r.almost) &&
        typeof r.struggling === 'number' &&
        Number.isFinite(r.struggling)
    );
}
