/** Fuzzy file picker for choosing a quiz file across the vault. */

import { App, FuzzySuggestModal, TFile } from 'obsidian';
import type OmniscientPlugin from './main';

export class QuizFilePicker extends FuzzySuggestModal<TFile> {
    constructor(
        app: App,
        private readonly plugin: OmniscientPlugin,
        private readonly files: TFile[],
    ) {
        super(app);
        this.setPlaceholder('Pick a quiz file');
    }

    getItems(): TFile[] {
        return this.files;
    }

    getItemText(item: TFile): string {
        return item.path;
    }

    onChooseItem(item: TFile): void {
        void this.plugin.startQuizFlow(item);
    }
}
