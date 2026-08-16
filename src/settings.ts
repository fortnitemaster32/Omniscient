/** Plugin settings, defaults, and the declarative settings tab. */

import { App, Notice, PluginSettingTab, Setting, SettingGroup } from 'obsidian';
import type { SettingDefinitionItem } from 'obsidian';
import type OmniscientPlugin from './main';
import type { SessionRecord } from './types';

export interface OmniscientSettings {
    /** Comma-separated difficulty labels used in question metadata. */
    difficultyLabels: string;
    /** Consecutive mastered answers before a question counts as exam-ready. */
    masteredPasses: number;
    /** Randomize question order when a session starts. */
    shuffleByDefault: boolean;
    /** Finished sessions, newest first. */
    history: SessionRecord[];
}

export const DEFAULT_SETTINGS: OmniscientSettings = {
    difficultyLabels: 'Easy, Medium, Hard',
    masteredPasses: 2,
    shuffleByDefault: true,
    history: [],
};

export function parseDifficultyLabels(raw: string): string[] {
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

function formatSessionLine(record: SessionRecord): string {
    const fileName = record.filePath.split('/').pop() ?? record.filePath;
    const date = record.date.slice(0, 10);
    return `${date} · ${fileName} · ${record.mastered}/${record.answered} mastered`;
}

export class OmniscientSettingTab extends PluginSettingTab {
    plugin: OmniscientPlugin;

    constructor(app: App, plugin: OmniscientPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const history = this.plugin.settings.history;
        return [
            {
                name: 'Difficulty labels',
                desc: 'Comma-separated labels used to grade question difficulty, e.g. "Easy, Medium, Hard".',
                control: {
                    type: 'text',
                    key: 'difficultyLabels',
                    placeholder: 'Easy, Medium, Hard',
                },
            },
            {
                name: 'Mastered passes',
                desc: 'Consecutive mastered answers required before a question counts as exam-ready.',
                control: {
                    type: 'number',
                    key: 'masteredPasses',
                    min: 1,
                    max: 10,
                    step: 1,
                },
            },
            {
                name: 'Shuffle questions',
                desc: 'Randomize question order when a session starts.',
                control: { type: 'toggle', key: 'shuffleByDefault' },
            },
            {
                name: 'Session history',
                desc: 'A summary of your most recent quiz sessions.',
                render: (setting: Setting, _group: SettingGroup) => {
                    const frag = createFragment();
                    if (history.length === 0) {
                        frag.createSpan({ text: 'No sessions recorded yet.' });
                    } else {
                        const totalAnswered = history.reduce((sum, r) => sum + r.answered, 0);
                        const totalMastered = history.reduce((sum, r) => sum + r.mastered, 0);
                        const pct =
                            totalAnswered > 0
                                ? Math.round((totalMastered / totalAnswered) * 100)
                                : 0;
                        frag.createDiv({
                            text: `${history.length} sessions · ${pct}% of answers mastered`,
                        });
                        const list = frag.createEl('ul', {
                            cls: 'omniscient-history-list',
                        });
                        for (const record of history.slice(0, 5)) {
                            list.createEl('li', {
                                text: formatSessionLine(record),
                            });
                        }
                    }
                    setting.descEl.empty();
                    setting.descEl.appendChild(frag);
                },
            },
            {
                name: 'Clear session history',
                desc: 'Remove all recorded sessions from this device.',
                action: () => {
                    void this.plugin.clearHistory();
                    new Notice('Session history cleared.');
                    this.update();
                },
            },
        ];
    }
}
