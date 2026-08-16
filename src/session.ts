/** In-memory quiz session state. */

import type { GradeKind, QuestionBlock, QuestionStatus, QuizSessionConfig } from './types';

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

interface GradedEntry {
    item: SessionQuestion;
    prevStatus: QuestionStatus | undefined;
    prevPasses: number;
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
    /** Questions still to be answered, in order. */
    private queue: SessionQuestion[];
    /** Graded questions with the state needed to undo them, newest last. */
    private gradedHistory: GradedEntry[] = [];

    constructor(blocks: QuestionBlock[], config: QuizSessionConfig) {
        const filtered = blocks.filter((b) => matchesFilter(b, config));
        this.queue = filtered.map((block) => ({ block, grade: null }));
        if (config.shuffle) {
            shuffle(this.queue);
        }
        this.total = this.queue.length;
    }

    get current(): SessionQuestion | null {
        return this.queue[0] ?? null;
    }

    get isComplete(): boolean {
        return this.queue.length === 0;
    }

    get hasUndo(): boolean {
        return this.gradedHistory.length > 0;
    }

    get counts(): SessionCounts {
        const counts: SessionCounts = {
            answered: 0,
            mastered: 0,
            almost: 0,
            struggling: 0,
        };
        for (const entry of this.gradedHistory) {
            const grade = entry.item.grade;
            if (grade === null) {
                continue;
            }
            counts.answered++;
            if (grade === 'Mastered') {
                counts.mastered++;
            } else if (grade === 'Almost') {
                counts.almost++;
            } else {
                counts.struggling++;
            }
        }
        return counts;
    }

    /**
     * Grades the current question and removes it from the queue. Updates the
     * block's status and consecutive-pass counter according to the
     * quiz-and-recall method: a Mastered grade increments the pass counter
     * (resetting it if the previous grade was anything else); any other
     * grade resets it.
     */
    gradeCurrent(grade: GradeKind): SessionQuestion | null {
        const item = this.current;
        if (item === null) {
            return null;
        }
        this.queue.shift();
        this.applyGrade(item, grade);
        return item;
    }

    private applyGrade(item: SessionQuestion, grade: GradeKind): void {
        item.grade = grade;
        const block = item.block;
        this.gradedHistory.push({
            item,
            prevStatus: block.status,
            prevPasses: block.passes,
        });
        if (grade === 'Mastered') {
            block.passes = block.status === 'Mastered' ? block.passes + 1 : 1;
            block.status = 'Mastered';
        } else {
            block.status = grade;
            block.passes = 0;
        }
    }

    /**
     * Moves the current question to the end of the queue without grading it.
     * Skipping is how you defer a question: it comes back later in the same
     * session and remains unanswered if the session ends first.
     */
    skipCurrent(): SessionQuestion | null {
        const item = this.current;
        if (item === null) {
            return null;
        }
        this.queue.shift();
        this.queue.push(item);
        return item;
    }

    /**
     * Reverts the most recent grade: restores the block's previous status
     * and pass counter and puts the question back at the front of the queue.
     */
    undoLast(): SessionQuestion | null {
        const entry = this.gradedHistory.pop();
        if (entry === undefined) {
            return null;
        }
        entry.item.grade = null;
        entry.item.block.status = entry.prevStatus;
        entry.item.block.passes = entry.prevPasses;
        this.queue.unshift(entry.item);
        return entry.item;
    }
}
