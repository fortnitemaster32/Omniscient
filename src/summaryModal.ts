/** End-of-session summary modal. */

import { App, Modal, Setting } from 'obsidian';
import type { SessionCounts } from './session';
import type { SessionMode } from './types';

export interface SummaryOptions {
    mode: SessionMode;
    fileBasename: string;
    counts: SessionCounts;
    total: number;
    timeSec: number;
    failedWrites: number;
    onDone: () => void;
    onReviewStruggling: () => void;
}

function formatTime(total: number): string {
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export class SummaryModal extends Modal {
    constructor(app: App, private readonly options: SummaryOptions) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        const { counts, total, mode } = this.options;
        this.setTitle(
            mode === 'timed' ? 'Mock exam complete' : 'Session complete',
        );

        contentEl.createDiv({
            cls: 'omniscient-summary-file',
            text: this.options.fileBasename,
        });

        const grid = contentEl.createDiv({ cls: 'omniscient-summary-grid' });
        const cell = (label: string, value: string, cls?: string) => {
            const div = grid.createDiv({ cls: 'omniscient-summary-cell' });
            div.createDiv({ cls: 'omniscient-summary-value', text: value });
            div.createDiv({
                cls: 'omniscient-summary-label',
                text: label,
            });
            if (cls) {
                div.addClass(cls);
            }
        };
        cell('Answered', `${counts.answered}/${total}`);
        cell('Mastered', String(counts.mastered), 'omniscient-summary-good');
        cell('Almost', String(counts.almost), 'omniscient-summary-warn');
        cell('Struggling', String(counts.struggling), 'omniscient-summary-bad');
        cell('Time', formatTime(this.options.timeSec));

        if (this.options.failedWrites > 0) {
            contentEl.createDiv({
                cls: 'omniscient-summary-note',
                text: `${this.options.failedWrites} question(s) could not be saved because the file changed during the session.`,
            });
        }

        new Setting(contentEl).addButton((button) => {
            button.setButtonText('Done').onClick(() => {
                this.close();
                this.options.onDone();
            });
        });

        if (counts.struggling > 0) {
            new Setting(contentEl).addButton((button) => {
                button
                    .setButtonText('Review struggling questions')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.options.onReviewStruggling();
                    });
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
