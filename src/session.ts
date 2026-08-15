/** In-memory quiz session state. */

import type { GradeKind, QuestionBlock, QuizSessionConfig } from './types';

export interface SessionQuestion {
    block: QuestionBlock;
    /** Grade given in this session, or null while unanswered. */
    grade: GradeKind | null;
}

export interface SessionCounts {
    answered: number;
    mastered: number;
    almost: number;
    struggling: number;
}

function matchesFilter(block: QuestionBlock, config: QuizSessionConfig): boolean {
    if (
        config.difficultyFilter !== 'all' &&
        (block.difficulty ?? '').toLowerCase() !== config.difficultyFilter.toLowerCase()
    ) {
        return false;
    }
    const mastered = block.status === 'Mastered' && block.passes >= config.masteredPasses;
    switch (config.statusFilter) {
        case 'all':
            return true;
        case 'new':
            return block.status === undefined;
        case 'struggling':
            return block.status === 'Struggling';
        case 'almost':
            return block.status === 'Almost';
        case 'mastered':
            return mastered;
        case 'not-mastered':
            return !mastered;
    }
}

function shuffle<T>(items: T[]): void {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
    }
}

export class QuizSession {
    readonly total: number;
    readonly startedAt = Date.now();
    private readonly items: SessionQuestion[];
    private cursor = 0;

    constructor(blocks: QuestionBlock[], config: QuizSessionConfig) {
        const filtered = blocks.filter((b) => matchesFilter(b, config));
        this.items = filtered.map((block) => ({ block, grade: null }));
        if (config.shuffle) {
            shuffle(this.items);
        }
        this.total = this.items.length;
    }

    get current(): SessionQuestion | null {
        return this.items[this.cursor] ?? null;
    }

    get isComplete(): boolean {
        return this.cursor >= this.items.length;
    }

    get counts(): SessionCounts {
        const counts: SessionCounts = {
            answered: 0,
            mastered: 0,
            almost: 0,
            struggling: 0,
        };
        for (const item of this.items) {
            if (item.grade === null) {
                continue;
            }
            counts.answered++;
            if (item.grade === 'Mastered') {
                counts.mastered++;
            } else if (item.grade === 'Almost') {
                counts.almost++;
            } else {
                counts.struggling++;
            }
        }
        return counts;
    }

    /**
     * Grades the current question and advances. Updates the block's status
     * and consecutive-pass counter according to the quiz-and-recall method:
     * a Mastered grade increments the pass counter (resetting it if the
     * previous grade was anything else); any other grade resets it.
     */
    gradeCurrent(grade: GradeKind): SessionQuestion | null {
        const item = this.current;
        if (item === null) {
            return null;
        }
        item.grade = grade;
        const block = item.block;
        if (grade === 'Mastered') {
            block.passes = block.status === 'Mastered' ? block.passes + 1 : 1;
            block.status = 'Mastered';
        } else {
            block.status = grade;
            block.passes = 0;
        }
        this.cursor++;
        return item;
    }
}
