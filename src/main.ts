/** Omniscient plugin entry point. */

import { Notice, Plugin, TFile } from 'obsidian';
import { QuizFilePicker } from './filePickerModal';
import { HAS_QUESTIONS_RE, parseQuestions } from './parser';
import { QUIZ_VIEW_TYPE, QuizView } from './quizView';
import {
    DEFAULT_SETTINGS,
    OmniscientSettingTab,
    parseDifficultyLabels,
} from './settings';
import { SetupModal } from './setupModal';
import type { OmniscientSettings } from './settings';
import type { QuizSessionConfig, SessionRecord } from './types';

export default class OmniscientPlugin extends Plugin {
    settings: OmniscientSettings = Object.assign({}, DEFAULT_SETTINGS);
    /**
     * Config handed to the next quiz view that opens. View state is only
     * available after onOpen() in Obsidian, so the config is passed through
     * the plugin instead of view state.
     */
    private pendingQuizConfig: QuizSessionConfig | null = null;

    async onload(): Promise<void> {
        try {
            await this.loadPersisted();

            this.registerView(QUIZ_VIEW_TYPE, (leaf) => new QuizView(leaf, this));
            this.addSettingTab(new OmniscientSettingTab(this.app, this));

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

            this.addRibbonIcon('target', 'Start quiz', () => {
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
            new Notice('Open a markdown file first, then run this command.');
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
    async startQuizFlow(
        file: TFile,
        preset?: Partial<QuizSessionConfig>,
    ): Promise<void> {
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
        if (preset) {
            const config: QuizSessionConfig = {
                filePath: file.path,
                shuffle: this.settings.shuffleByDefault,
                statusFilter: 'all',
                difficultyFilter: 'all',
                masteredPasses: this.settings.masteredPasses,
                ...preset,
            };
            void this.openQuizView(file, config);
            return;
        }
        new SetupModal(this.app, this, file.path, questions.length, (config) => {
            void this.openQuizView(file, config);
        }).open();
    }

    /**
     * Returns the config for a quiz view that is about to open, and clears
     * the slot. Returns null when the view is restored from a saved layout.
     */
    consumePendingQuizConfig(): QuizSessionConfig | null {
        const config = this.pendingQuizConfig;
        this.pendingQuizConfig = null;
        return config;
    }

    private async openQuizView(file: TFile, config: QuizSessionConfig): Promise<void> {
        try {
            this.pendingQuizConfig = Object.assign({}, config, { filePath: file.path });
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.setViewState({ type: QUIZ_VIEW_TYPE, active: true });
            void this.app.workspace.revealLeaf(leaf);
        } catch (error) {
            this.pendingQuizConfig = null;
            console.error('Omniscient: failed to open quiz view', error);
            new Notice('Could not open the quiz view. See the developer console for details.');
        }
    }

    private async pickQuizFile(): Promise<void> {
        const files: TFile[] = [];
        for (const file of this.app.vault.getMarkdownFiles()) {
            try {
                const content = await this.app.vault.cachedRead(file);
                if (HAS_QUESTIONS_RE.test(content)) {
                    files.push(file);
                }
            } catch {
                // Skip files that cannot be read.
            }
        }
        if (files.length === 0) {
            new Notice('No quiz files found in the vault.');
            return;
        }
        new QuizFilePicker(this.app, this, files).open();
    }

    // ------------------------------------------------------------------
    // Persistence
    // ------------------------------------------------------------------

    private async loadPersisted(): Promise<void> {
        const data = (await this.loadData()) as Partial<OmniscientSettings> | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
        if (!Array.isArray(this.settings.history)) {
            this.settings.history = [];
        } else {
            // Never share the defaults array across reloads.
            this.settings.history = [...this.settings.history];
        }
    }

    async recordSession(record: SessionRecord): Promise<void> {
        this.settings.history.unshift(record);
        this.settings.history = this.settings.history.slice(0, 100);
        await this.saveData(this.settings);
    }

    async clearHistory(): Promise<void> {
        this.settings.history = [];
        await this.saveData(this.settings);
    }
}
