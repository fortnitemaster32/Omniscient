/** Aggregate statistics over a set of parsed question blocks. */

import type { QuestionBlock } from './types';

export interface BlockSummary {
    total: number;
    /** Status Mastered with at least the required consecutive passes. */
    examReady: number;
    newCount: number;
    struggling: number;
    almost: number;
    mastered: number;
    byDifficulty: { label: string; count: number }[];
}

export function summarizeBlocks(blocks: QuestionBlock[], masteredPasses: number): BlockSummary {
    const summary: BlockSummary = {
        total: blocks.length,
        examReady: 0,
        newCount: 0,
        struggling: 0,
        almost: 0,
        mastered: 0,
        byDifficulty: [],
    };
    const difficultyCounts = new Map<string, number>();
    for (const block of blocks) {
        if (block.status === 'Struggling') {
            summary.struggling++;
        } else if (block.status === 'Almost') {
            summary.almost++;
        } else if (block.status === 'Mastered') {
            summary.mastered++;
            if (block.passes >= masteredPasses) {
                summary.examReady++;
            }
        } else {
            summary.newCount++;
        }
        if (block.difficulty !== undefined) {
            difficultyCounts.set(block.difficulty, (difficultyCounts.get(block.difficulty) ?? 0) + 1);
        }
    }
    summary.byDifficulty = [...difficultyCounts.entries()].map(([label, count]) => ({
        label,
        count,
    }));
    return summary;
}
