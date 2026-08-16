/** Folder picker for starting a quiz across an entire folder tree. */

import { App, FuzzySuggestModal, TFolder } from 'obsidian';
import type OmniscientPlugin from './main';

export class FolderPickModal extends FuzzySuggestModal<TFolder> {
    constructor(app: App, private readonly plugin: OmniscientPlugin) {
        super(app);
        this.setPlaceholder('Pick a folder');
    }

    getItems(): TFolder[] {
        return this.app.vault
            .getAllLoadedFiles()
            .filter((file): file is TFolder => file instanceof TFolder);
    }

    getItemText(item: TFolder): string {
        return item.path === '/' ? '/' : item.path;
    }

    onChooseItem(item: TFolder): void {
        void this.plugin.startFolderQuizFlow(item);
    }
}
