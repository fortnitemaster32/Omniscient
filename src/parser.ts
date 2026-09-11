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

/** Matches an ATX heading (up to three leading spaces); for section tracking. */
const ATX_HEADING_RE = /^ {0,3}(#{1,6})(.*)$/;

/** Matches the start of a hint callout. */
const HINT_START_RE = /^ {0,3}>\s*\[!\s*hint\s*\]/i;

/** Matches any blockquote line (used to bound a hint callout). */
const QUOTE_LINE_RE = /^ {0,3}>/;

/** Matches a thematic break used as a question separator. */
const THEMATIC_BREAK_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;

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
 * True when a heading introduces section content: the next line that is
 * not blank and not another heading is a question header. Structural
 * headings still belong to the section tree, but they are kept out of
 * question and answer bodies instead of rendering as stray text at the
 * end of the previous answer.
 */
function isSectionHeading(
    lines: string[],
    start: number,
    difficultyLabels: string[],
): boolean {
    for (let i = start + 1; i < lines.length; i++) {
        if (lines[i].trim().length === 0 || parseHeading(lines[i]) !== null) {
            continue;
        }
        // Hint callouts can be added, edited, or removed at any time, and
        // thematic breaks can sit between a heading and the question it
        // introduces. Skipping both keeps the classification, and with it
        // the question-body hash, stable across hint writes.
        const hintRun = readHintRun(lines, i, difficultyLabels);
        if (hintRun !== null) {
            i = hintRun.end - 1;
            continue;
        }
        if (THEMATIC_BREAK_RE.test(lines[i])) {
            continue;
        }
        const header = parseHeader(lines[i], difficultyLabels);
        return header !== null && header.kind === 'question';
    }
    return false;
}

/**
 * Parses an ATX heading line into its level and text. Headings are used
 * for the section filter, so indented code, fenced code and blockquoted
 * headings are excluded by the callers (this function only sees raw lines
 * outside fences and never matches a line that starts with `>`).
 */
export function parseHeading(line: string): { level: number; text: string } | null {
    const m = ATX_HEADING_RE.exec(line);
    if (!m) {
        return null;
    }
    const rest = m[2];
    // CommonMark: the #s must be followed by a space or end of line.
    if (rest.length > 0 && !/^\s/.test(rest)) {
        return null;
    }
    let text = rest.trim();
    // A closing sequence of #s is not part of the heading text.
    text = text.replace(/\s+#+\s*$/, '').trim();
    return { level: m[1].length, text };
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

/** One `> [!Hint]` callout found in a file. */
export interface HintRun {
    /** Index of the `> [!Hint]` line. */
    start: number;
    /** First index after the callout's contiguous blockquote lines. */
    end: number;
    /** Callout body with blockquote prefixes stripped. */
    text: string;
}

/**
 * Reads a hint callout starting at `start`, or returns null. The run is a
 * contiguous blockquote whose body is taken from the quoted lines that
 * follow (standard Obsidian callout syntax). A quote line that parses as a
 * question or answer header ends the run so a following question is never
 * swallowed as hint text.
 */
export function readHintRun(
    lines: string[],
    start: number,
    difficultyLabels: string[],
): HintRun | null {
    if (!HINT_START_RE.test(lines[start])) {
        return null;
    }
    let end = start + 1;
    while (
        end < lines.length &&
        QUOTE_LINE_RE.test(lines[end]) &&
        parseHeader(lines[end], difficultyLabels) === null
    ) {
        end++;
    }
    const body: string[] = [];
    for (let i = start + 1; i < end; i++) {
        body.push(stripQuotePrefix(lines[i]));
    }
    return { start, end, text: decodeCharRefs(assembleBody(body)) };
}

/**
 * Decodes the leading numeric character reference that hintLinesFor
 * writes at the start of a header-shaped hint line. Only those exact
 * codes, and only at the start of a line, are decoded, so character
 * references the user typed themselves are left untouched.
 */
const NEUTRALIZED_CODES: Record<string, string> = {
    '65': 'A',
    '81': 'Q',
    '91': '[',
    '97': 'a',
    '113': 'q',
};

function decodeCharRefs(text: string): string {
    return text
        .split('\n')
        .map((line) =>
            line.replace(
                /^(\s*)&#(65|81|91|97|113);/,
                (_whole, indent: string, code: string) =>
                    `${indent}${NEUTRALIZED_CODES[code]}`,
            ),
        )
        .join('\n');
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
    /** Headings above the current position, with their levels. */
    const stack: { level: number; text: string }[] = [];

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
        const heading = parseHeading(lines[i]);
        if (heading !== null) {
            // Section tracking: a heading at a level replaces the previous
            // heading at that level and everything below it. Comparing
            // levels (not stack length) keeps same-level headings as
            // siblings even when a level was skipped, e.g. H1 then H3.
            while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
                stack.pop();
            }
            stack.push({ level: heading.level, text: heading.text });
            if (isSectionHeading(lines, i, difficultyLabels)) {
                continue;
            }
        }
        const hintRun = readHintRun(lines, i, difficultyLabels);
        if (hintRun !== null) {
            // Hint callouts stay in the file but never enter the bodies, so
            // the body hash used to locate a block survives hint edits. An
            // empty callout (or one the writer cannot round-trip) leaves the
            // block without a hint instead of producing an empty one.
            if (current !== null && hintRun.text.length > 0) {
                current.hint =
                    current.hint === undefined
                        ? hintRun.text
                        : `${current.hint}\n\n${hintRun.text}`;
            }
            i = hintRun.end - 1;
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
                ordinal: 0,
                fileTotal: 0,
                headerLine: lines[i],
                stem: header.lineStem,
                sourcePath: '',
                sectionPath: stack.map((entry) => entry.text),
                questionBody: '',
                answerBody: '',
                hint: undefined,
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
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        question.ordinal = i + 1;
        question.fileTotal = questions.length;
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
        const hintRun = readHintRun(lines, i, difficultyLabels);
        if (hintRun !== null) {
            // Hints are excluded from the hash exactly like in parsing, so
            // adding or editing one never breaks later grade writes.
            i = hintRun.end - 1;
            continue;
        }
        if (parseHeading(lines[i]) !== null && isSectionHeading(lines, i, difficultyLabels)) {
            // Mirror parseQuestions: structural headings are not body text.
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
 * Maps each question-header line index to its 1-based question ordinal,
 * using the same fence and hint-run rules as parsing. Ordinals are stable
 * when a hint is inserted or removed, unlike raw line indices.
 */
function questionOrdinals(
    lines: string[],
    difficultyLabels: string[],
): Map<number, number> {
    const ordinals = new Map<number, number>();
    let inFence = false;
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
        const stripped = stripQuotePrefix(lines[i]);
        if (FENCE_RE.test(stripped)) {
            inFence = !inFence;
        }
        if (inFence) {
            continue;
        }
        const hintRun = readHintRun(lines, i, difficultyLabels);
        if (hintRun !== null) {
            i = hintRun.end - 1;
            continue;
        }
        const header = parseHeader(lines[i], difficultyLabels);
        if (header !== null && header.kind === 'question') {
            count++;
            ordinals.set(i, count);
        }
    }
    return ordinals;
}

/**
 * Locates the header line of a block: exact header text plus question-body
 * hash. The block's ordinal decides between identical duplicate questions,
 * because ordinals survive hint insertions and removals (which shift line
 * indices); the closest original position is the fallback when the file
 * changed enough that the ordinal no longer matches.
 */
function locateBlockHeader(
    lines: string[],
    block: QuestionBlock,
    difficultyLabels: string[],
): number | null {
    const needle = block.headerLine.trim();
    const ordinals = questionOrdinals(lines, difficultyLabels);
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let fallback: number | null = null;
    let fallbackDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() !== needle) {
            continue;
        }
        if (bodyHashAt(lines, i, difficultyLabels) !== block.bodyHash) {
            continue;
        }
        const distance = Math.abs(i - block.headerIndex);
        if (ordinals.get(i) === block.ordinal) {
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i;
            }
        } else if (distance < fallbackDistance) {
            fallbackDistance = distance;
            fallback = i;
        }
    }
    return best ?? fallback;
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
    const best = locateBlockHeader(lines, block, difficultyLabels);
    if (best === null) {
        return { content, patched: false };
    }
    lines[best] = newLine;
    return { content: lines.join(eol), patched: true };
}

/** First index after a block: the next question header, or end of file. */
function findBlockEnd(
    lines: string[],
    headerIdx: number,
    difficultyLabels: string[],
): number {
    let inFence = false;
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const stripped = stripQuotePrefix(lines[i]);
        if (FENCE_RE.test(stripped)) {
            inFence = !inFence;
        }
        if (inFence) {
            continue;
        }
        const hintRun = readHintRun(lines, i, difficultyLabels);
        if (hintRun !== null) {
            // Skip whole hint callouts so fence-shaped lines inside a hint
            // cannot desync the scan.
            i = hintRun.end - 1;
            continue;
        }
        const header = parseHeader(lines[i], difficultyLabels);
        if (header !== null && header.kind === 'question') {
            return i;
        }
    }
    return lines.length;
}

/**
 * Rewrites a hint line that would parse as a question or answer header so
 * it still renders the same but can never be read back as a delimiter.
 * The first character becomes a numeric character reference, which the
 * reader decodes again.
 */
function neutralizeHeaderLine(line: string): string {
    const match = /^(\s*)(.*)$/.exec(line);
    if (match === null) {
        return line;
    }
    const indent = match[1];
    const body = match[2];
    const headerShaped =
        /^(?:question|answer)\b/i.test(body) ||
        /^\[!\s*(?:question|success|answer)\s*\]/i.test(body);
    if (!headerShaped) {
        return line;
    }
    return `${indent}&#${body.charCodeAt(0)};${body.slice(1)}`;
}

/** Formats a hint body as hint callout lines. */
function hintLinesFor(text: string): string[] {
    const out = ['> [!Hint]'];
    for (const line of text.split(/\r?\n/)) {
        out.push(line.trim().length === 0 ? '>' : `> ${neutralizeHeaderLine(line)}`);
    }
    return out;
}

function isBlankLine(line: string | undefined): boolean {
    return line === undefined || line.trim().length === 0;
}

/** Cleans up spacing left behind after a hint callout was removed. */
function tidyAfterRemoval(lines: string[], index: number): void {
    if (index >= lines.length) {
        if (index > 0 && lines[index - 1].trim().length === 0) {
            lines.splice(index - 1, 1);
        }
        return;
    }
    if (index > 0 && lines[index - 1].trim().length === 0 && lines[index].trim().length === 0) {
        lines.splice(index, 1);
    }
}

/**
 * Adds, replaces, or removes the hint note on a question block.
 *
 * The block is located exactly like a header patch. The hint is written as
 * a top-level `> [!Hint]` callout at the end of the block, before trailing
 * blank lines and `---` separators. Passing null (or blank text) removes
 * the hint. Returns `patched: false` when the block can no longer be found
 * (for example, the question was edited mid-session).
 */
export function patchQuestionHint(
    content: string,
    block: QuestionBlock,
    hint: string | null,
    difficultyLabels: string[],
): { content: string; patched: boolean } {
    const eol: '\n' | '\r\n' = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const headerIdx = locateBlockHeader(lines, block, difficultyLabels);
    if (headerIdx === null) {
        return { content, patched: false };
    }
    const end = findBlockEnd(lines, headerIdx, difficultyLabels);
    // Collect hint callouts inside this block (there should be at most one).
    const runs: HintRun[] = [];
    let inFence = false;
    for (let i = headerIdx + 1; i < end; i++) {
        const stripped = stripQuotePrefix(lines[i]);
        if (FENCE_RE.test(stripped)) {
            inFence = !inFence;
        }
        if (inFence) {
            continue;
        }
        const run = readHintRun(lines, i, difficultyLabels);
        if (run !== null) {
            runs.push(run);
            i = run.end - 1;
        }
    }
    if (hint === null || hint.trim().length === 0) {
        // Remove from the end so earlier indices stay valid.
        for (let i = runs.length - 1; i >= 0; i--) {
            const run = runs[i];
            lines.splice(run.start, run.end - run.start);
            tidyAfterRemoval(lines, run.start);
        }
        return { content: lines.join(eol), patched: true };
    }
    const fresh = hintLinesFor(hint);
    // Manual extra callouts are folded into the saved one: the first
    // position is kept and the rest are dropped.
    for (let i = runs.length - 1; i >= 1; i--) {
        const run = runs[i];
        lines.splice(run.start, run.end - run.start);
        tidyAfterRemoval(lines, run.start);
    }
    const first = runs[0];
    if (first !== undefined) {
        lines.splice(first.start, first.end - first.start, ...fresh);
        return { content: lines.join(eol), patched: true };
    }
    // New hint: place it at the end of the block content, before trailing
    // blank lines and `---` separators.
    let insertAt = end;
    while (
        insertAt > headerIdx + 1 &&
        (isBlankLine(lines[insertAt - 1]) || THEMATIC_BREAK_RE.test(lines[insertAt - 1]))
    ) {
        insertAt--;
    }
    const insertion = [...fresh];
    if (!isBlankLine(lines[insertAt - 1])) {
        insertion.unshift('');
    }
    if (insertAt < lines.length && !isBlankLine(lines[insertAt])) {
        insertion.push('');
    }
    lines.splice(insertAt, 0, ...insertion);
    return { content: lines.join(eol), patched: true };
}
