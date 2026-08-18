/** In-app usage guide: shown on first run, reopenable from the command
 * palette and the settings tab. */

import { Modal, setIcon, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { OMNISCIENT_ICON } from './icon';

export interface GuideModalOptions {
    /** Run when the primary CTA is clicked (e.g. open the file picker). */
    onStart?: () => void;
    /** Run when "Create a sample quiz file" is clicked. */
    onCreateSample?: () => void;
}

export class GuideModal extends Modal {
    constructor(app: App, private readonly options: GuideModalOptions = {}) {
        super(app);
    }

    onOpen(): void {
        this.render();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private render(): void {
        const { contentEl } = this;
        this.setTitle('Getting started');

        // Header: logo + one-line pitch.
        const header = contentEl.createDiv({ cls: 'omniscient-guide-header' });
        const logo = header.createDiv({ cls: 'omniscient-guide-logo' });
        setIcon(logo, OMNISCIENT_ICON);
        header.createDiv({
            cls: 'omniscient-guide-intro',
            text: 'Quiz-and-recall study sessions for your mega problem sets. The question is shown, the answer stays hidden until you reveal it, and every grade is written back to your notes.',
        });

        // The file format.
        contentEl.createEl('h4', { cls: 'omniscient-guide-heading', text: 'The file format' });
        contentEl.createDiv({
            cls: 'omniscient-guide-section',
            text: 'Any Markdown note can hold quiz questions. A question is a callout, and the next callout is its answer:',
        });
        contentEl.createEl('pre', {
            cls: 'omniscient-guide-example',
            text: [
                '> [!Question] Question | Hard | Mastered(2)',
                '',
                'What is the derivative of x²?',
                '',
                '> [!Success] Answer',
                '',
                '2x',
            ].join('\n'),
        });
        const formatList = contentEl.createEl('ul', { cls: 'omniscient-guide-list' });
        this.listItem(formatList, '[!Question] starts a question; [!Success] (or [!answer]) starts its answer.');
        this.listItem(formatList, 'Optional metadata after the pipe: a difficulty label and a status like Mastered(2).');
        this.listItem(formatList, 'Questions inside code fences, or indented by four or more spaces, are ignored.');

        // Starting a session.
        contentEl.createEl('h4', { cls: 'omniscient-guide-heading', text: 'Start a session' });
        const startList = contentEl.createEl('ul', { cls: 'omniscient-guide-list' });
        this.listItem(startList, 'Run Start quiz for the current note, Choose quiz file, or Start quiz from folder from the command palette.');
        this.listItem(startList, 'The ribbon icon (a brain) starts a quiz for the active note, or opens the file picker.');
        this.listItem(startList, 'In the setup dialog you can filter by status and difficulty and toggle shuffling (it defaults to Not mastered yet, so each session shows only the gaps).');

        // During the session.
        contentEl.createEl('h4', { cls: 'omniscient-guide-heading', text: 'During the session' });
        const sessionList = contentEl.createEl('ul', { cls: 'omniscient-guide-list' });
        this.listItem(sessionList, 'Space reveals the answer; grade yourself with Struggling, Almost, or Mastered (keys 1, 2 and 3).');
        this.listItem(sessionList, 'Every grade is saved to the file immediately, and Undo restores it both in the session and in the note.');
        this.listItem(sessionList, 'Finishing early is normal: press Esc or End session whenever you run out of time.');

        // Exam-ready.
        contentEl.createEl('h4', { cls: 'omniscient-guide-heading', text: 'Exam-ready' });
        contentEl.createDiv({
            cls: 'omniscient-guide-section',
            text: 'A question is exam-ready once you answer Mastered as many times in a row as the Mastered passes setting requires (2 by default). Mastered(2) in your note means it is already there.',
        });

        new Setting(contentEl)
            .addButton((button) => {
                button
                    .setButtonText(this.options.onStart ? 'Start using Omniscient' : 'Got it')
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.options.onStart?.();
                    });
            })
            .addButton((button) => {
                if (this.options.onCreateSample) {
                    button.setButtonText('Create a sample quiz file').onClick(() => {
                        this.close();
                        this.options.onCreateSample?.();
                    });
                }
            });
    }

    private listItem(list: HTMLUListElement, text: string): void {
        list.createEl('li', { text });
    }
}
