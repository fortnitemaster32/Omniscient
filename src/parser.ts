/**
 * Markdown parser for Omniscient question files.
 *
 * A question file is a normal markdown file containing blockquote
 * question/answer pairs:
 *
 *     > Question | Hard | Mastered(2)
 *     What is the derivative of x^2?
 *     > Answer
 *     2x
 *
 * Both the plain style (`> Question`) and the Obsidian callout style
 * (`> [!question]`) are recognized. Answers use `> [!success]` (Obsidian's
 * built-in green callout) or the plain `> Answer` style; `[!answer]` is
 * still accepted as an alias for files written with the old type. Metadata
 * is read from trailing pipe-separated tokens on the question header line: a difficulty label
 * (as configured in settings) and/or a status token. Status tokens are
 * `Struggling`, `Almost`, and `Mastered`, where `Mastered` may carry a
 * consecutive-pass counter: `Mastered(2)`.
 *
 * This module is intentionally free of Obsidian imports so it can be
 * unit-tested outside the app.
 */

import type { QuestionBlock, QuestionStatus } from './types';

export const STATUS_LABELS: readonly QuestionStatus[] = [
    'Struggling',
    'Almost',
    'Mastered',
];

const STATUS_CANONICAL: Record<string, QuestionStatus> = {
    struggling: 'Struggling',
    almost: 'Almost',
    mastered: 'Mastered',
};

const STATUS_RE = /^(struggling|almost|mastered)\s*(?:\(\s*(\d+)\s*\))?$/i;

/** Fast pre-scan regex used to find candidate quiz files in a vault. */
export const HAS_QUESTIONS_RE = /^ {0,3}>\s*(?:\[!\s*)?question\b/im;

/** Matches `> [!type] rest` callout-style headers. */
const CALLOUT_RE = /^( {0,3}>\s*)\[!([^\]]*)\]([^\n]*)$/i;

/** Matches `> Question rest` plain-style headers. */
const PLAIN_RE = /^( {0,3}>\s*)(question|answer)\b([^\n]*)$/i;

export interface ParsedHeader {
    kind: 'question' | 'answer';
    /** The original line with recognized trailing metadata tokens removed. */
    lineStem: string;
    /** Recognized trailing metadata tokens, in original order. */
    tokens: string[];
}

export interface ParsedFile {
    eol: '\n' | '\r\n';
    questions: QuestionBlock[];
}

/** Returns the canonical status for a token, or null if it is not a status. */
export function isStatusToken(token: string): QuestionStatus | null {
    const m = STATUS_RE.exec(token.trim());
    if (!m) return null;
    return STATUS_CANONICAL[m[1].toLowerCase()] ?? null;
}

/** Returns the configured label a token matches, or null. */
export function isDifficultyToken(token: string, labels: string[]): string | null {
    const t = token.trim().toLowerCase();
    for (const label of labels) {
        const trimmed = label.trim();
        if (trimmed.length > 0 && trimmed.toLowerCase() === t) {
            return trimmed;
        }
    }
    return null;
}

/**
 * Splits the text after a question/answer keyword into a verbatim stem and
 * recognized trailing metadata tokens. Tokens are scanned from the end of
 * the line so that unrecognized prose in the middle is preserved verbatim.
 */
export function splitTokens(
    rest: string,
    difficultyLabels: string[],
): { stem: string; tokens: string[] } {
    const parts = rest.split('|').map((p) => p.trim());
    // Drop empty trailing segments so "| Hard |" parses like "| Hard".
    while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop();
    }
    const tokens: string[] = [];
    let end = parts.length - 1;
    while (
        end >= 0 &&
        (isStatusToken(parts[end]) !== null ||
            isDifficultyToken(parts[end], difficultyLabels) !== null)
    ) {
        tokens.unshift(parts[end]);
        end--;
    }
    const stem = parts.slice(0, end + 1).join(' | ').trim();
    return { stem, tokens };
}

/** Parses one line into a question/answer header, or null. */
export function parseHeader(
    line: string,
    difficultyLabels: string[],
): ParsedHeader | null {
    const callout = CALLOUT_RE.exec(line);
    if (callout) {
        const type = callout[2].trim().toLowerCase();
        // Exact match only: Obsidian resolves callout types by exact name,
        // so "[!questionable]" or "[!success-story]" are other callouts,
        // not quiz delimiters.
        const kind =
            type === 'question'
                ? 'question'
                : type === 'success' || type === 'answer'
                  ? 'answer'
                  : null;
        if (!kind) return null;
        // Foldable callouts use a trailing dash after the type; keep it in
        // the stem so the original syntax survives a rewrite.
        let rest = callout[3];
        const foldable = /^-\s*/.test(rest) ? '-' : '';
        if (foldable) {
            rest = rest.replace(/^-\s*/, '');
        }
        const { stem, tokens } = splitTokens(rest, difficultyLabels);
        const prefix = `${callout[1]}[!${callout[2]}]${foldable}`;
        const lineStem = stem.length > 0 ? `${prefix} ${stem}` : prefix;
        return { kind, lineStem, tokens };
    }
    const plain = PLAIN_RE.exec(line);
    if (!plain) {
        return null;
    }
    const kind = plain[2].toLowerCase() === 'question' ? 'question' : 'answer';
    const { stem, tokens } = splitTokens(plain[3], difficultyLabels);
    const lineStem = stem.length > 0 ? `${plain[1]}${plain[2]} ${stem}` : `${plain[1]}${plain[2]}`;
    return { kind, lineStem, tokens };
}

/**
 * Strips one blockquote prefix from a line. Only 0-3 spaces of indentation
 * are allowed before the `>` (CommonMark blockquote rule); deeper indented
 * lines are indented code and are left untouched. Nested callouts (lines
 * that become `[!type]` after stripping) are re-prefixed so Obsidian still
 * renders them as callouts inside the body.
 */
export function stripQuotePrefix(line: string): string {
    const m = /^ {0,3}>\s?/.exec(line);
    if (!m) {
        return line;
    }
    const stripped = line.slice(m[0].length);
    if (/^\[!/.test(stripped)) {
        return `> ${stripped}`;
    }
    return stripped;
}

/** Joins body lines, dropping leading and trailing blank lines. */
export function assembleBody(lines: string[]): string {
    let start = 0;
    let end = lines.length;
    while (start < end && lines[start].trim().length === 0) {
        start++;
    }
    while (end > start && lines[end - 1].trim().length === 0) {
        end--;
    }
    return lines.slice(start, end).join('\n');
}

/** Small deterministic hash of a string (djb2). */
export function hashString(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    }
    return h >>> 0;
}

function extractMetadata(
    tokens: string[],
    difficultyLabels: string[],
): {
    difficulty: string | undefined;
    status: QuestionStatus | undefined;
    passes: number;
} {
    let difficulty: string | undefined;
    let status: QuestionStatus | undefined;
    let passes = 0;
    for (const token of tokens) {
        const st = isStatusToken(token);
        if (st !== null && status === undefined) {
            status = st;
            const m = STATUS_RE.exec(token.trim());
            const n = m?.[2] === undefined ? undefined : Number.parseInt(m[2], 10);
            passes = st === 'Mastered' ? (n !== undefined && n > 0 ? n : 1) : 0;
        } else if (st === null && difficulty === undefined) {
            const d = isDifficultyToken(token, difficultyLabels);
            if (d !== null) {
                difficulty = d;
            }
        }
    }
    return { difficulty, status, passes };
}

/** Matches a CommonMark code fence opener/closer (0-3 spaces indent). */
const FENCE_RE = /^ {0,3}(```|~~~)/;

/** Parses a full file into question blocks. */
export function parseQuestions(content: string, difficultyLabels: string[]): ParsedFile {
    const eol: '\n' | '\r\n' = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const questions: QuestionBlock[] = [];
    let current: QuestionBlock | null = null;
    let collectingQuestion = false;
    let body: string[] = [];
    let inFence = false;

    const finalizeBody = () => {
        if (current === null) {
            return;
        }
        const assembled = assembleBody(body);
        if (collectingQuestion) {
            current.questionBody = assembled;
            current.bodyHash = hashString(assembled);
        } else {
            current.answerBody = assembled;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const stripped = stripQuotePrefix(lines[i]);
        // Toggle fence mode on every line, before any header parsing: a
        // fenced code block anywhere in the file (even before the first
        // question) is body text, never a quiz delimiter.
        if (FENCE_RE.test(stripped)) {
            inFence = !inFence;
        }
        if (inFence) {
            if (current !== null) {
                body.push(stripped);
            }
            continue;
        }
        const header = parseHeader(lines[i], difficultyLabels);
        if (header === null) {
            if (current !== null) {
                body.push(stripped);
            }
            continue;
        }
        if (header.kind === 'question') {
            if (current !== null) {
                finalizeBody();
            }
            const meta = extractMetadata(header.tokens, difficultyLabels);
            current = {
                headerIndex: i,
                headerLine: lines[i],
                stem: header.lineStem,
                sourcePath: '',
                questionBody: '',
                answerBody: '',
                difficulty: meta.difficulty,
                status: meta.status,
                passes: meta.passes,
                bodyHash: 0,
            };
            questions.push(current);
            collectingQuestion = true;
            body = [];
        } else {
            // Answer header: switch from question body to answer body.
            if (current !== null && collectingQuestion) {
                finalizeBody();
                collectingQuestion = false;
                body = [];
            }
        }
    }
    if (current !== null) {
        finalizeBody();
    }
    return { eol, questions };
}

/** Rebuilds a header line from its stem and current metadata. */
export function serializeHeader(
    lineStem: string,
    difficulty: string | undefined,
    status: QuestionStatus | undefined,
    passes: number,
): string {
    const tokens: string[] = [];
    if (difficulty !== undefined && difficulty.length > 0) {
        tokens.push(difficulty);
    }
    if (status !== undefined) {
        tokens.push(status === 'Mastered' ? `Mastered(${passes})` : status);
    }
    return tokens.length > 0 ? `${lineStem} | ${tokens.join(' | ')}` : lineStem;
}

function bodyHashAt(
    lines: string[],
    headerIdx: number,
    difficultyLabels: string[],
): number {
    const body: string[] = [];
    let inFence = false;
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const stripped = stripQuotePrefix(lines[i]);
        // Mirror parseQuestions: fences toggle anywhere and apply to both
        // ``` and ~~~ so the body hash stays consistent with parsing.
        if (FENCE_RE.test(stripped)) {
            inFence = !inFence;
        }
        if (inFence) {
            body.push(stripped);
            continue;
        }
        const h = parseHeader(lines[i], difficultyLabels);
        if (h !== null) {
            break;
        }
        body.push(stripped);
    }
    return hashString(assembleBody(body));
}

/**
 * Replaces the header line of the given block in a file's content.
 *
 * The block is located by its original header text plus a hash of its
 * question body, so edits made to the file after the session started never
 * corrupt unrelated content. When the block cannot be found, the content
 * is returned unchanged with `patched: false` so the caller can count the
 * failed write.
 */
export function patchQuestionHeader(
    content: string,
    block: QuestionBlock,
    newLine: string,
    difficultyLabels: string[],
): { content: string; patched: boolean } {
    const eol: '\n' | '\r\n' = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const needle = block.headerLine.trim();
    // Find the best match: exact header text plus body hash, preferring the
    // candidate closest to the block's original position so that identical
    // duplicate questions patch the right one.
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== needle) {
            continue;
        }
        if (bodyHashAt(lines, i, difficultyLabels) !== block.bodyHash) {
            continue;
        }
        const distance = Math.abs(i - block.headerIndex);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = i;
        }
    }
    if (best === null) {
        return { content, patched: false };
    }
    lines[best] = newLine;
    return { content: lines.join(eol), patched: true };
}
