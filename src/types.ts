/** Shared data types for Omniscient. */

export type QuestionStatus = 'Struggling' | 'Almost' | 'Mastered';

export type GradeKind = QuestionStatus;

export type StatusFilter =
    | 'all'
    | 'new'
    | 'struggling'
    | 'almost'
    | 'not-mastered'
    | 'mastered';

/** A single question/answer pair parsed from a markdown file. */
export interface QuestionBlock {
    /** Stable id derived from the question body. */
    id: string;
    /** 0-based line index of the question header in the parsed content. */
    headerIndex: number;
    /** Full original text of the header line (used for write-back lookup). */
    headerLine: string;
    /** Header text with recognized trailing metadata tokens removed. */
    stem: string;
    /** Path of the file this question was parsed from. */
    sourcePath: string;
    /** Question body as markdown (blockquote prefixes stripped). */
    questionBody: string;
    /** Answer body as markdown (blockquote prefixes stripped). */
    answerBody: string;
    /** Matched difficulty label as configured in settings (undefined = none). */
    difficulty: string | undefined;
    /** Matched status (undefined = untested). */
    status: QuestionStatus | undefined;
    /** Consecutive mastered passes (only meaningful when status is Mastered). */
    passes: number;
    /** Hash of the question body, used to locate the block after edits. */
    bodyHash: number;
}

/** Everything needed to run a quiz session. */
export interface QuizSessionConfig {
    /** Files whose questions are included in this session. */
    filePaths: string[];
    shuffle: boolean;
    statusFilter: StatusFilter;
    difficultyFilter: string;
    /** Consecutive mastered passes required to be considered exam-ready. */
    masteredPasses: number;
}

/** One finished session, kept for statistics. */
export interface SessionRecord {
    /** ISO timestamp of when the session ended. */
    date: string;
    filePath: string;
    total: number;
    answered: number;
    mastered: number;
    almost: number;
    struggling: number;
}
