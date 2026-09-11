/** Session setup modal: filters, sections, shuffle, and a live count. */

import { App, Modal, Notice, Setting } from 'obsidian';
import type OmniscientPlugin from './main';
import { matchesFilter } from './session';
import { summarizeBlocks } from './stats';
import type { QuestionBlock, QuizSessionConfig, SectionRef, StatusFilter } from './types';

const STATUS_OPTIONS: Record<StatusFilter, string> = {
    all: 'All questions',
    new: 'New',
    struggling: 'Struggling',
    almost: 'Almost there',
    'not-mastered': 'Not mastered yet',
    mastered: 'Mastered',
};

interface SectionNode {
    filePath: string;
    /** Heading path, outermost first; [] for the "(no heading)" node. */
    sectionPath: string[];
    label: string;
    children: SectionNode[];
    /** Synthetic per-file parent, only used for multi-file sessions. */
    isRoot: boolean;
}

/** Stable key for one selectable node (file plus heading path). */
function sectionKey(filePath: string, sectionPath: string[]): string {
    return JSON.stringify([filePath, ...sectionPath]);
}

/** Key for tree state and search; file roots get their own namespace. */
function nodeKey(node: SectionNode): string {
    return node.isRoot
        ? JSON.stringify(['root', node.filePath])
        : sectionKey(node.filePath, node.sectionPath);
}

export class SetupModal extends Modal {
    private shuffle: boolean;
    /** Defaults to the book's review loop: only questions not yet exam-ready. */
    private statusFilter: StatusFilter = 'not-mastered';
    private difficultyFilter: string = 'all';
    private readonly difficultyLabels: string[];
    private readonly roots: SectionNode[];
    private readonly refByKey = new Map<string, SectionRef>();
    private readonly selected = new Set<string>();
    private readonly hasSections: boolean;
    private searchQuery = '';

    private questionsSetting: Setting | null = null;
    private treeEl: HTMLElement | null = null;
    private startButton: HTMLButtonElement | null = null;

    constructor(
        app: App,
        private readonly plugin: OmniscientPlugin,
        private readonly filePaths: string[],
        private readonly blocks: QuestionBlock[],
        private readonly onStart: (config: QuizSessionConfig) => void,
    ) {
        super(app);
        this.shuffle = plugin.settings.shuffleByDefault;
        this.difficultyLabels = plugin.getDifficultyLabels();
        this.roots = this.buildSectionTree();
        for (const node of this.allNodes(this.roots)) {
            if (!node.isRoot) {
                this.selected.add(sectionKey(node.filePath, node.sectionPath));
                this.refByKey.set(sectionKey(node.filePath, node.sectionPath), {
                    filePath: node.filePath,
                    sectionPath: node.sectionPath,
                });
            }
        }
        this.hasSections = this.allNodes(this.roots).some(
            (node) => node.sectionPath.length > 0,
        );
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

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    private render(): void {
        const { contentEl } = this;
        this.setTitle('Quiz setup');

        this.questionsSetting = new Setting(contentEl)
            .setName('Questions')
            .addDropdown((dropdown) => {
                for (const [value, label] of Object.entries(STATUS_OPTIONS)) {
                    dropdown.addOption(value, label);
                }
                dropdown.setValue(this.statusFilter).onChange((value) => {
                    this.statusFilter = value as StatusFilter;
                    this.refreshAll();
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
                        this.refreshAll();
                    });
                });
        }

        if (this.hasSections) {
            this.renderSections(contentEl);
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
            this.startButton = button.buttonEl;
            button.setButtonText('Start session').setCta().onClick(() => {
                if (this.filteredBlocks().length === 0) {
                    return;
                }
                this.close();
                this.onStart({
                    filePaths: this.filePaths,
                    shuffle: this.shuffle,
                    statusFilter: this.statusFilter,
                    difficultyFilter: this.difficultyFilter,
                    masteredPasses: this.plugin.settings.masteredPasses,
                    headingFilter: this.selectedRefs(),
                });
            });
        });

        this.refreshCounts();
    }

    private renderSections(contentEl: HTMLElement): void {
        new Setting(contentEl)
            .setName('Sections')
            .setDesc('Only include questions under the selected headings')
            .addButton((button) => {
                button.setButtonText('Select all').onClick(() => {
                    this.selected.clear();
                    for (const node of this.allNodes(this.roots)) {
                        if (!node.isRoot) {
                            this.selected.add(sectionKey(node.filePath, node.sectionPath));
                        }
                    }
                    this.refreshAll();
                });
            })
            .addButton((button) => {
                button.setButtonText('Clear').onClick(() => {
                    this.selected.clear();
                    this.refreshAll();
                });
            });

        const search = contentEl.createEl('input', {
            cls: 'omniscient-section-search',
            attr: {
                type: 'search',
                placeholder: 'Filter sections',
                'aria-label': 'Filter sections',
            },
        });
        search.addEventListener('input', () => {
            this.searchQuery = search.value.trim().toLowerCase();
            this.refreshTree();
        });

        this.treeEl = contentEl.createDiv({ cls: 'omniscient-section-tree' });
        this.refreshTree();
    }

    private refreshTree(): void {
        const tree = this.treeEl;
        if (tree === null) {
            return;
        }
        tree.empty();
        const visible =
            this.searchQuery.length > 0 ? this.visibleKeys(this.searchQuery) : null;
        // Counts follow the status and difficulty filters, so a section's
        // number is what a session would actually run from that section.
        const matching = this.baseFilteredBlocks();
        const walk = (nodes: SectionNode[], depth: number): void => {
            for (const node of nodes) {
                if (visible !== null && !visible.has(nodeKey(node))) {
                    continue;
                }
                const count = matching.filter(
                    (block) => block.sourcePath === node.filePath && this.inSubtree(block, node),
                ).length;
                const row = tree.createDiv({ cls: 'omniscient-section-row' });
                row.style.paddingLeft = `${depth * 16}px`;
                const state = this.nodeState(node);
                const box = row.createEl('input', {
                    attr: {
                        type: 'checkbox',
                        'aria-label': `${node.label} (${count} questions)`,
                    },
                });
                box.checked = state === 'on';
                box.indeterminate = state === 'partial';
                box.addEventListener('change', () => {
                    this.setSubtree(node, box.checked);
                    this.refreshAll();
                });
                row.createDiv({
                    cls: node.isRoot
                        ? 'omniscient-section-label omniscient-section-root'
                        : 'omniscient-section-label',
                    text: node.label,
                });
                row.createDiv({
                    cls: 'omniscient-section-count',
                    text: String(count),
                });
                walk(node.children, depth + 1);
            }
        };
        walk(this.roots, 0);
    }

    /** Repaints the tree (counts included) and the live totals. */
    private refreshAll(): void {
        this.refreshTree();
        this.refreshCounts();
    }

    private refreshCounts(): void {
        const filtered = this.filteredBlocks();
        if (this.questionsSetting === null) {
            return;
        }
        if (filtered.length === 0) {
            this.questionsSetting.setDesc('No questions match the selected filters.');
        } else {
            const fileCount = new Set(filtered.map((block) => block.sourcePath)).size;
            const examReady = summarizeBlocks(
                filtered,
                this.plugin.settings.masteredPasses,
            ).examReady;
            const across = fileCount > 1 ? ` across ${fileCount} files` : '';
            this.questionsSetting.setDesc(
                `${filtered.length} questions${across} · ${examReady} exam-ready`,
            );
        }
        if (this.startButton !== null) {
            this.startButton.disabled = filtered.length === 0;
        }
    }

    // ------------------------------------------------------------------
    // Section tree data
    // ------------------------------------------------------------------

    private allNodes(nodes: SectionNode[]): SectionNode[] {
        const out: SectionNode[] = [];
        for (const node of nodes) {
            out.push(node, ...this.allNodes(node.children));
        }
        return out;
    }

    private buildSectionTree(): SectionNode[] {
        const roots: SectionNode[] = [];
        const multiFile = this.filePaths.length > 1;
        for (const filePath of this.filePaths) {
            const fileBlocks = this.blocks.filter((block) => block.sourcePath === filePath);
            if (fileBlocks.length === 0) {
                continue;
            }
            const fileRoot: SectionNode = {
                filePath,
                sectionPath: [],
                label: filePath.split('/').pop() ?? filePath,
                children: [],
                isRoot: true,
            };
            const nodes = new Map<string, SectionNode>();
            for (const block of fileBlocks) {
                if (block.sectionPath.length === 0) {
                    const key = sectionKey(filePath, []);
                    let node = nodes.get(key);
                    if (node === undefined) {
                        node = {
                            filePath,
                            sectionPath: [],
                            label: '(no heading)',
                            children: [],
                            isRoot: false,
                        };
                        nodes.set(key, node);
                        fileRoot.children.push(node);
                    }
                    continue;
                }
                let parent = fileRoot;
                for (let depth = 0; depth < block.sectionPath.length; depth++) {
                    const path = block.sectionPath.slice(0, depth + 1);
                    const key = sectionKey(filePath, path);
                    let node = nodes.get(key);
                    if (node === undefined) {
                        node = {
                            filePath,
                            sectionPath: path,
                            label: block.sectionPath[depth],
                            children: [],
                            isRoot: false,
                        };
                        nodes.set(key, node);
                        parent.children.push(node);
                    }
                    parent = node;
                }
            }
            if (multiFile) {
                roots.push(fileRoot);
            } else {
                roots.push(...fileRoot.children);
            }
        }
        return roots;
    }

    /** Keys of every selectable node in a subtree (file roots are not selectable). */
    private subtreeKeys(node: SectionNode): string[] {
        const keys: string[] = [];
        if (!node.isRoot) {
            keys.push(sectionKey(node.filePath, node.sectionPath));
        }
        for (const child of node.children) {
            keys.push(...this.subtreeKeys(child));
        }
        return keys;
    }

    private nodeState(node: SectionNode): 'on' | 'off' | 'partial' {
        const keys = this.subtreeKeys(node);
        let on = 0;
        for (const key of keys) {
            if (this.selected.has(key)) {
                on++;
            }
        }
        if (on === 0) {
            return 'off';
        }
        return on === keys.length ? 'on' : 'partial';
    }

    private setSubtree(node: SectionNode, checked: boolean): void {
        if (!node.isRoot) {
            const key = sectionKey(node.filePath, node.sectionPath);
            if (checked) {
                this.selected.add(key);
            } else {
                this.selected.delete(key);
            }
        }
        for (const child of node.children) {
            this.setSubtree(child, checked);
        }
    }

    private visibleKeys(query: string): Set<string> {
        const visible = new Set<string>();
        const markSubtree = (node: SectionNode): void => {
            visible.add(nodeKey(node));
            for (const child of node.children) {
                markSubtree(child);
            }
        };
        const walk = (node: SectionNode): boolean => {
            const self = node.label.toLowerCase().includes(query);
            let any = self;
            for (const child of node.children) {
                if (walk(child)) {
                    any = true;
                }
            }
            if (self) {
                markSubtree(node);
            } else if (any) {
                visible.add(nodeKey(node));
            }
            return any;
        };
        for (const root of this.roots) {
            walk(root);
        }
        return visible;
    }

    // ------------------------------------------------------------------
    // Filtering
    // ------------------------------------------------------------------

    private selectedRefs(): SectionRef[] | undefined {
        const selectable = this.allNodes(this.roots).filter((node) => !node.isRoot);
        if (this.selected.size === selectable.length) {
            // Everything selected: skip the filter entirely.
            return undefined;
        }
        const refs: SectionRef[] = [];
        for (const key of this.selected) {
            const ref = this.refByKey.get(key);
            if (ref !== undefined) {
                refs.push(ref);
            }
        }
        return refs;
    }

    private filteredBlocks(): QuestionBlock[] {
        const config: QuizSessionConfig = {
            filePaths: this.filePaths,
            shuffle: false,
            statusFilter: this.statusFilter,
            difficultyFilter: this.difficultyFilter,
            masteredPasses: this.plugin.settings.masteredPasses,
            headingFilter: this.selectedRefs(),
        };
        return this.blocks.filter((block) => matchesFilter(block, config));
    }

    /** Blocks matching the status and difficulty filters, ignoring sections. */
    private baseFilteredBlocks(): QuestionBlock[] {
        const config: QuizSessionConfig = {
            filePaths: this.filePaths,
            shuffle: false,
            statusFilter: this.statusFilter,
            difficultyFilter: this.difficultyFilter,
            masteredPasses: this.plugin.settings.masteredPasses,
            headingFilter: undefined,
        };
        return this.blocks.filter((block) => matchesFilter(block, config));
    }

    /** True when a block belongs to a section node or one of its descendants. */
    private inSubtree(block: QuestionBlock, node: SectionNode): boolean {
        if (node.isRoot) {
            return true;
        }
        if (node.sectionPath.length === 0) {
            return block.sectionPath.length === 0;
        }
        return node.sectionPath.every((part, index) => block.sectionPath[index] === part);
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
