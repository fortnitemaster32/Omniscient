/** Prompt for adding, editing, or removing a question's hint note. */

import { App, Modal } from 'obsidian';

export interface HintModalOptions {
    /** Existing hint text (empty when there is none). */
    initialText: string;
    /** True when the question already has a hint. */
    hasHint: boolean;
    /**
     * Saves the text, or removes the hint when null. Returns false when the
     * write failed, in which case the dialog stays open so the typed text
     * is not lost.
     */
    onSubmit: (text: string | null) => Promise<boolean>;
    /** Runs after the dialog closes, so the quiz view can take focus back. */
    onClosed?: () => void;
}

export class HintModal extends Modal {
    private textarea: HTMLTextAreaElement | null = null;
    private saving = false;

    constructor(app: App, private readonly options: HintModalOptions) {
        super(app);
    }

    onOpen(): void {
        this.render();
    }

    onClose(): void {
        this.contentEl.empty();
        this.options.onClosed?.();
    }

    private render(): void {
        const { contentEl } = this;
        this.setTitle(this.options.hasHint ? 'Edit hint' : 'Add hint');
        contentEl.createDiv({
            cls: 'omniscient-hint-modal-help',
            text: 'Hidden during the session until you ask for it. Use it to note what you missed last time.',
        });
        this.textarea = contentEl.createEl('textarea', {
            cls: 'omniscient-hint-textarea',
            attr: {
                rows: '4',
                'aria-label': 'Hint text',
                placeholder: 'What tripped you up last time?',
            },
        });
        this.textarea.value = this.options.initialText;

        const buttons = contentEl.createDiv({ cls: 'omniscient-modal-buttons' });
        if (this.options.hasHint) {
            const remove = buttons.createEl('button', { text: 'Remove hint' });
            remove.addClass('mod-warning');
            remove.addEventListener('click', () => {
                void this.submit(null, remove);
            });
        }
        const cancel = buttons.createEl('button', { text: 'Cancel' });
        cancel.addEventListener('click', () => {
            this.close();
        });
        const save = buttons.createEl('button', { text: 'Save' });
        save.addClass('mod-cta');
        save.addEventListener('click', () => {
            void this.submit(this.textarea?.value ?? '', save);
        });
        this.textarea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void this.submit(this.textarea?.value ?? '', save);
            }
        });
        window.setTimeout(() => this.textarea?.focus(), 0);
    }

    private async submit(text: string | null, button: HTMLButtonElement): Promise<void> {
        if (this.saving) {
            return;
        }
        const value = text === null ? null : text.trim();
        if (value !== null && value.length === 0 && !this.options.hasHint) {
            // Nothing to save on a question that has no hint yet.
            this.close();
            return;
        }
        this.saving = true;
        button.disabled = true;
        let ok = false;
        try {
            ok = await this.options.onSubmit(value);
        } finally {
            this.saving = false;
            button.disabled = false;
        }
        if (ok) {
            this.close();
        }
    }
}
