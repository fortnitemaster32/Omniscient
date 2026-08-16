/**
 * Unit tests for the Omniscient parser and session logic.
 * Runs under plain Node (no Obsidian APIs): `npm test`.
 *
 * Deliberately uses no Node built-in imports and no console.log so the
 * file passes the same lint rules as the plugin sources.
 */

import {
    assembleBody,
    hashString,
    isStatusToken,
    parseHeader,
    parseQuestions,
    patchQuestionHeader,
    serializeHeader,
    splitTokens,
    stripQuotePrefix,
} from '../src/parser';
import { QuizSession } from '../src/session';
import type { QuestionBlock, QuizSessionConfig } from '../src/types';

const LABELS = ['Easy', 'Medium', 'Hard'];

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, msg?: string): void {
    if (!deepEq(actual, expected)) {
        throw new Error(
            `${msg ?? 'assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
        );
    }
}

function deepEq(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b) {
        return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((v, i) => deepEq(v, b[i]));
    }
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        return (
            ka.length === kb.length &&
            ka.every((k) =>
                deepEq(
                    (a as Record<string, unknown>)[k],
                    (b as Record<string, unknown>)[k],
                ),
            )
        );
    }
    return false;
}

function test(name: string, fn: () => void): void {
    try {
        fn();
        passed++;
        console.debug(`  ok  ${name}`);
    } catch (error) {
        failed++;
        console.error(`FAIL  ${name}`);
        console.error(error instanceof Error ? error.message : String(error));
    }
}

function makeBlock(overrides: Partial<QuestionBlock>): QuestionBlock {
    return {
        id: 'x',
        headerIndex: 0,
        headerLine: '> Question',
        stem: '> Question',
        questionBody: 'body',
        answerBody: 'answer',
        difficulty: undefined,
        status: undefined,
        passes: 0,
        bodyHash: hashString('body'),
        ...overrides,
    };
}

function makeConfig(overrides: Partial<QuizSessionConfig>): QuizSessionConfig {
    return {
        filePath: 'test.md',
        shuffle: false,
        statusFilter: 'all',
        difficultyFilter: 'all',
        masteredPasses: 2,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Header parsing
// ---------------------------------------------------------------------------

test('plain question header', () => {
    const h = parseHeader('> Question', LABELS);
    eq(h, { kind: 'question', lineStem: '> Question', tokens: [] });
});

test('plain answer header', () => {
    const h = parseHeader('> Answer', LABELS);
    eq(h, { kind: 'answer', lineStem: '> Answer', tokens: [] });
});

test('callout question header', () => {
    const h = parseHeader('> [!question] Hard | Mastered(2)', LABELS);
    eq(h?.kind, 'question');
    eq(h?.lineStem, '> [!question]');
    eq(h?.tokens, ['Hard', 'Mastered(2)']);
});

test('foldable callout question header', () => {
    const h = parseHeader('> [!question]- Medium | Almost', LABELS);
    eq(h?.kind, 'question');
    eq(h?.lineStem, '> [!question]-');
    eq(h?.tokens, ['Medium', 'Almost']);
});

test('callout with title word keeps the word in the stem', () => {
    const h = parseHeader('> [!Question] Question | Hard | Mastered(2)', LABELS);
    eq(h?.kind, 'question');
    eq(h?.lineStem, '> [!Question] Question');
    eq(h?.tokens, ['Hard', 'Mastered(2)']);
    eq(parseHeader('> [!Answer] Answer', LABELS)?.lineStem, '> [!Answer] Answer');
});

test('callout answer header', () => {
    const h = parseHeader('> [!answer]', LABELS);
    eq(h?.kind, 'answer');
});

test('unrelated callout is ignored', () => {
    eq(parseHeader('> [!warning] Careful', LABELS), null);
});

test('prose line is ignored', () => {
    eq(parseHeader('## Heading', LABELS), null);
    eq(parseHeader('plain text', LABELS), null);
});

test('case-insensitive keywords', () => {
    eq(parseHeader('> QUESTION | HARD', LABELS)?.kind, 'question');
    eq(parseHeader('> [!Question]', LABELS)?.kind, 'question');
});

test('case-insensitive status with counter', () => {
    const h = parseHeader('> Question | MASTERED(3)', LABELS);
    eq(h?.tokens, ['MASTERED(3)']);
    eq(isStatusToken('mastered(2)'), 'Mastered');
});

test('unrecognized trailing token keeps the whole line as stem', () => {
    const h = parseHeader('> Question | Complicated | Hard', LABELS);
    eq(h?.lineStem, '> Question | Complicated');
    eq(h?.tokens, ['Hard']);
});

test('space-separated single difficulty token is recognized', () => {
    const h = parseHeader('> Question Hard', LABELS);
    eq(h?.tokens, ['Hard']);
    eq(h?.lineStem, '> Question');
});

test('splitTokens preserves prose in the middle', () => {
    const { stem, tokens } = splitTokens(': what is X | Hard', LABELS);
    eq(stem, ': what is X');
    eq(tokens, ['Hard']);
});

test('splitTokens without pipes returns everything as stem', () => {
    const { stem, tokens } = splitTokens('What is the answer', LABELS);
    eq(stem, 'What is the answer');
    eq(tokens, []);
});

// ---------------------------------------------------------------------------
// Body handling
// ---------------------------------------------------------------------------

test('stripQuotePrefix removes one level', () => {
    eq(stripQuotePrefix('> text'), 'text');
    eq(stripQuotePrefix('>   spaced'), '  spaced');
    eq(stripQuotePrefix('>'), '');
    eq(stripQuotePrefix('plain'), 'plain');
});

test('stripQuotePrefix preserves nested callouts', () => {
    eq(stripQuotePrefix('> [!tip] Hint'), '> [!tip] Hint');
    eq(stripQuotePrefix('> > [!tip] Nested'), '> [!tip] Nested');
});

test('assembleBody trims blank lines', () => {
    eq(assembleBody(['', 'a', '', 'b', '']), 'a\n\nb');
});

// ---------------------------------------------------------------------------
// Full file parsing
// ---------------------------------------------------------------------------

test('parses the example format file', () => {
    const content = [
        '## Topic',
        '',
        '> Question',
        '',
        'what is the maximum of this function',
        '',
        '> Answer',
        '',
        'the answer',
        '',
        '> Question',
        '',
        'etc...',
    ].join('\n');
    const { questions } = parseQuestions(content, LABELS);
    eq(questions.length, 2);
    eq(questions[0]?.questionBody, 'what is the maximum of this function');
    eq(questions[0]?.answerBody, 'the answer');
    eq(questions[1]?.questionBody, 'etc...');
    eq(questions[1]?.answerBody, '');
});

test('parses math blocks and code fences inside quotes', () => {
    const content = [
        '> Question | Hard',
        '> $$',
        '> f(x) = x^2',
        '> $$',
        '> Answer',
        '> ```',
        '> const x = 1;',
        '> ```',
    ].join('\n');
    const { questions } = parseQuestions(content, LABELS);
    eq(questions.length, 1);
    eq(questions[0]?.questionBody, '$$\nf(x) = x^2\n$$');
    eq(questions[0]?.answerBody, '```\nconst x = 1;\n```');
    eq(questions[0]?.difficulty, 'Hard');
});

test('extracts difficulty and status metadata', () => {
    const { questions } = parseQuestions(
        '> Question | Medium | Mastered(2)\nbody\n> Answer\nans',
        LABELS,
    );
    eq(questions[0]?.difficulty, 'Medium');
    eq(questions[0]?.status, 'Mastered');
    eq(questions[0]?.passes, 2);
});

test('status without counter defaults to one pass', () => {
    const { questions } = parseQuestions('> Question | Mastered\nbody\n> Answer\nans', LABELS);
    eq(questions[0]?.status, 'Mastered');
    eq(questions[0]?.passes, 1);
});

test('almost status has no passes', () => {
    const { questions } = parseQuestions('> Question | Almost\nbody\n> Answer\nans', LABELS);
    eq(questions[0]?.status, 'Almost');
    eq(questions[0]?.passes, 0);
});

test('custom difficulty labels are honored', () => {
    const { questions } = parseQuestions(
        '> Question | Brutal | Mastered\nbody\n> Answer\nans',
        ['Brutal'],
    );
    eq(questions[0]?.difficulty, 'Brutal');
});

test('detects CRLF line endings', () => {
    const { eol } = parseQuestions('> Question\r\nbody\r\n> Answer\r\nans', LABELS);
    eq(eol, '\r\n');
});

// ---------------------------------------------------------------------------
// Serialization and patching
// ---------------------------------------------------------------------------

test('serializeHeader builds canonical metadata', () => {
    eq(serializeHeader('> Question', 'Hard', 'Mastered', 2), '> Question | Hard | Mastered(2)');
    eq(serializeHeader('> Question', undefined, 'Almost', 0), '> Question | Almost');
    eq(serializeHeader('> Question', 'Easy', undefined, 0), '> Question | Easy');
    eq(serializeHeader('> Question', undefined, undefined, 0), '> Question');
    eq(serializeHeader('> [!question]', 'Hard', undefined, 0), '> [!question] | Hard');
});

test('patchQuestionHeader replaces the matching header only', () => {
    const content = [
        '> Question',
        'first body',
        '> Answer',
        'first answer',
        '',
        '> Question',
        'second body',
        '> Answer',
        'second answer',
    ].join('\n');
    const { questions } = parseQuestions(content, LABELS);
    eq(questions.length, 2);
    const patched = patchQuestionHeader(
        content,
        questions[1],
        '> Question | Mastered(1)',
        LABELS,
    );
    const lines = patched.split('\n');
    eq(lines[5], '> Question | Mastered(1)');
    eq(lines[0], '> Question');
});

test('patchQuestionHeader is a no-op when the body changed', () => {
    const content = '> Question\noriginal body\n> Answer\nans';
    const { questions } = parseQuestions(content, LABELS);
    const edited = content.replace('original body', 'edited body');
    const patched = patchQuestionHeader(
        edited,
        questions[0],
        '> Question | Mastered(1)',
        LABELS,
    );
    eq(patched, edited);
});

test('patchQuestionHeader preserves CRLF', () => {
    const content = '> Question\r\nbody\r\n> Answer\r\nans';
    const { questions } = parseQuestions(content, LABELS);
    const patched = patchQuestionHeader(
        content,
        questions[0],
        '> Question | Hard | Mastered(1)',
        LABELS,
    );
    eq(patched, '> Question | Hard | Mastered(1)\r\nbody\r\n> Answer\r\nans');
});

test('patchQuestionHeader is a no-op when the header changed', () => {
    const content = '> Question\nbody\n> Answer\nans';
    const { questions } = parseQuestions(content, LABELS);
    const edited = content.replace('> Question', '> Question | Easy');
    const patched = patchQuestionHeader(
        edited,
        questions[0],
        '> Question | Mastered(1)',
        LABELS,
    );
    eq(patched, edited);
});

test('round trip: grade, serialize, re-parse', () => {
    const content = '> Question | Hard\nbody\n> Answer\nans';
    const parsed = parseQuestions(content, LABELS);
    const block = parsed.questions[0];
    block.status = 'Mastered';
    block.passes = 1;
    const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
    const patched = patchQuestionHeader(content, block, newLine, LABELS);
    const reparsed = parseQuestions(patched, LABELS);
    eq(reparsed.questions[0]?.status, 'Mastered');
    eq(reparsed.questions[0]?.passes, 1);
    eq(reparsed.questions[0]?.difficulty, 'Hard');
    eq(reparsed.questions[0]?.questionBody, 'body');
});

// ---------------------------------------------------------------------------
// Session logic
// ---------------------------------------------------------------------------

test('session grades and advances', () => {
    const blocks = [makeBlock({ questionBody: 'a' }), makeBlock({ questionBody: 'b' })];
    const session = new QuizSession(blocks, makeConfig({}));
    eq(session.total, 2);
    eq(session.current?.block.questionBody, 'a');
    const graded = session.gradeCurrent('Mastered');
    eq(graded?.block.status, 'Mastered');
    eq(graded?.block.passes, 1);
    eq(session.current?.block.questionBody, 'b');
    session.gradeCurrent('Struggling');
    eq(session.isComplete, true);
    eq(session.counts, {
        answered: 2,
        mastered: 1,
        almost: 0,
        struggling: 1,
    });
});

test('consecutive mastered passes accumulate and reset', () => {
    const block = makeBlock({});
    const session = new QuizSession([block], makeConfig({}));
    session.gradeCurrent('Mastered');
    eq(block.passes, 1);
    const session2 = new QuizSession([block], makeConfig({}));
    session2.gradeCurrent('Mastered');
    eq(block.passes, 2);
    const session3 = new QuizSession([block], makeConfig({}));
    session3.gradeCurrent('Almost');
    eq(block.passes, 0);
    eq(block.status, 'Almost');
    const session4 = new QuizSession([block], makeConfig({}));
    session4.gradeCurrent('Mastered');
    eq(block.passes, 1);
});

test('status filter selects the right questions', () => {
    const newBlock = makeBlock({ questionBody: 'new' });
    const struggling = makeBlock({ questionBody: 's', status: 'Struggling' });
    const almost = makeBlock({ questionBody: 'a', status: 'Almost' });
    const mastered1 = makeBlock({ questionBody: 'm1', status: 'Mastered', passes: 1 });
    const mastered2 = makeBlock({ questionBody: 'm2', status: 'Mastered', passes: 2 });
    const blocks = [newBlock, struggling, almost, mastered1, mastered2];

    const all = new QuizSession(blocks, makeConfig({ statusFilter: 'all' }));
    eq(all.total, 5);
    const fresh = new QuizSession(blocks, makeConfig({ statusFilter: 'new' }));
    eq(fresh.total, 1);
    eq(fresh.current?.block.questionBody, 'new');
    const s = new QuizSession(blocks, makeConfig({ statusFilter: 'struggling' }));
    eq(s.total, 1);
    const al = new QuizSession(blocks, makeConfig({ statusFilter: 'almost' }));
    eq(al.total, 1);
    const mastered = new QuizSession(blocks, makeConfig({ statusFilter: 'mastered' }));
    eq(mastered.total, 1);
    eq(mastered.current?.block.questionBody, 'm2');
    const notMastered = new QuizSession(blocks, makeConfig({ statusFilter: 'not-mastered' }));
    eq(notMastered.total, 4);
});

test('difficulty filter works', () => {
    const hard = makeBlock({ questionBody: 'h', difficulty: 'Hard' });
    const easy = makeBlock({ questionBody: 'e', difficulty: 'Easy' });
    const none = makeBlock({ questionBody: 'n' });
    const session = new QuizSession([hard, easy, none], makeConfig({ difficultyFilter: 'Hard' }));
    eq(session.total, 1);
    eq(session.current?.block.questionBody, 'h');
});

test('shuffle keeps all questions', () => {
    const blocks = Array.from({ length: 20 }, (_, i) => makeBlock({ questionBody: `q${i}` }));
    const session = new QuizSession(blocks, makeConfig({ shuffle: true }));
    eq(session.total, 20);
    eq(session.counts.answered, 0);
});

// ---------------------------------------------------------------------------

console.debug(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
}
