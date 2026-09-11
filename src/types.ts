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

/** One selected section in the heading filter (exact match). */
export interface SectionRef {
    /** Path of the file this section belongs to. */
    filePath: string;
    /** Heading path, outermost first; [] means before any heading. */
    sectionPath: string[];
}

/** A single question/answer pair parsed from a markdown file. */
export interface QuestionBlock {
    /** 0-based line index of the question header in the parsed content. */
    headerIndex: number;
    /** 1-based position among all questions parsed from the same file. */
    ordinal: number;
    /** Total questions parsed from the same file (independent of filters). */
    fileTotal: number;
    /** Full original text of the header line (used for write-back lookup). */
    headerLine: string;
    /** Header text with recognized trailing metadata tokens removed. */
    stem: string;
    /** Path of the file this question was parsed from. */
    sourcePath: string;
    /** Heading path above this question, outermost first ([] before any heading). */
    sectionPath: string[];
    /** Question body as markdown (blockquote prefixes stripped). */
    questionBody: string;
    /** Answer body as markdown (blockquote prefixes stripped). */
    answerBody: string;
    /** Hint note shown on demand during a session (undefined = none). */
    hint: string | undefined;
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
    /** Sections to include; undefined means every section. */
    headingFilter: SectionRef[] | undefined;
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
