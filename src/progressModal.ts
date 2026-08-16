/** Per-file progress summary modal. */

import { App, Modal, Setting } from 'obsidian';
import type { BlockSummary } from './stats';

export class ProgressModal extends Modal {
    constructor(
        app: App,
        private readonly fileBasename: string,
        private readonly summary: BlockSummary,
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        const { summary } = this;
        this.setTitle('Quiz progress');

        contentEl.createDiv({
            cls: 'omniscient-summary-file',
            text: this.fileBasename,
        });

        const grid = contentEl.createDiv({ cls: 'omniscient-summary-grid' });
        const cell = (label: string, value: string, cls?: string) => {
            const div = grid.createDiv({ cls: 'omniscient-summary-cell' });
            div.createDiv({ cls: 'omniscient-summary-value', text: value });
            div.createDiv({ cls: 'omniscient-summary-label', text: label });
            if (cls) {
                div.addClass(cls);
            }
        };
        cell('Exam-ready', `${summary.examReady}/${summary.total}`, 'omniscient-summary-good');
        cell('Mastered', String(summary.mastered), 'omniscient-summary-good');
        cell('Almost', String(summary.almost), 'omniscient-summary-warn');
        cell('Struggling', String(summary.struggling), 'omniscient-summary-bad');
        cell('New', String(summary.newCount));

        if (summary.byDifficulty.length > 0) {
            const difficulties = contentEl.createDiv({ cls: 'omniscient-progress-section' });
            difficulties.createDiv({ cls: 'omniscient-summary-label', text: 'By difficulty' });
            for (const entry of summary.byDifficulty) {
                difficulties.createDiv({
                    cls: 'omniscient-progress-row',
                    text: `${entry.label}: ${entry.count}`,
                });
            }
        }

        new Setting(contentEl).addButton((button) => {
            button.setButtonText('Done').onClick(() => {
                this.close();
            });
        });
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
