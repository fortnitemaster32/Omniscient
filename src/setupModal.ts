/** Session setup modal: filters, shuffle, and timing. */

import { App, Modal, Notice, Setting } from 'obsidian';
import type OmniscientPlugin from './main';
import type { QuizSessionConfig, StatusFilter } from './types';

const STATUS_OPTIONS: Record<StatusFilter, string> = {
    all: 'All questions',
    new: 'New',
    struggling: 'Struggling',
    almost: 'Almost there',
    'not-mastered': 'Not mastered yet',
    mastered: 'Mastered',
};

export class SetupModal extends Modal {
    private shuffle: boolean;
    private statusFilter: StatusFilter = 'all';
    private difficultyFilter: string = 'all';
    private readonly difficultyLabels: string[];

    constructor(
        app: App,
        private readonly plugin: OmniscientPlugin,
        private readonly filePaths: string[],
        private readonly questionCount: number,
        private readonly fileCount: number,
        private readonly examReady: number,
        private readonly onStart: (config: QuizSessionConfig) => void,
    ) {
        super(app);
        this.shuffle = plugin.settings.shuffleByDefault;
        this.difficultyLabels = plugin.getDifficultyLabels();
    }

    onOpen(): void {
        try {
            this.render();
        } catch (error) {
            console.error('Omniscient: failed to render setup dialog', error);
            new Notice('Omniscient setup failed. See the developer console for details.');
            this.close();
        }
    }

    private render(): void {
        const { contentEl } = this;
        this.setTitle('Quiz setup');

        new Setting(contentEl)
            .setName('Questions')
            .setDesc(
                `${this.questionCount} questions${
                    this.fileCount > 1 ? ` across ${this.fileCount} files` : ''
                } · ${this.examReady} exam-ready`,
            )
            .addDropdown((dropdown) => {
                for (const [value, label] of Object.entries(STATUS_OPTIONS)) {
                    dropdown.addOption(value, label);
                }
                dropdown.setValue(this.statusFilter).onChange((value) => {
                    this.statusFilter = value as StatusFilter;
                });
            });

        if (this.difficultyLabels.length > 0) {
            new Setting(contentEl)
                .setName('Difficulty')
                .setDesc('Only include questions with this difficulty')
                .addDropdown((dropdown) => {
                    dropdown.addOption('all', 'All difficulties');
                    for (const label of this.difficultyLabels) {
                        dropdown.addOption(label, label);
                    }
                    dropdown.setValue(this.difficultyFilter).onChange((value) => {
                        this.difficultyFilter = value;
                    });
                });
        }

        new Setting(contentEl)
            .setName('Shuffle order')
            .setDesc('Randomize the question order')
            .addToggle((toggle) => {
                toggle.setValue(this.shuffle).onChange((value) => {
                    this.shuffle = value;
                });
            });

        new Setting(contentEl).addButton((button) => {
            button.setButtonText('Start session').setCta().onClick(() => {
                this.close();
                this.onStart({
                    filePaths: this.filePaths,
                    shuffle: this.shuffle,
                    statusFilter: this.statusFilter,
                    difficultyFilter: this.difficultyFilter,
                    masteredPasses: this.plugin.settings.masteredPasses,
                });
            });
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
