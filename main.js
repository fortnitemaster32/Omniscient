/* Omniscient - quiz-and-recall study sessions for Obsidian */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => OmniscientPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian10 = require("obsidian");

// src/filePickerModal.ts
var import_obsidian = require("obsidian");
var QuizFilePicker = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, plugin, files) {
    super(app);
    this.plugin = plugin;
    this.files = files;
    this.setPlaceholder("Pick a quiz file");
  }
  getItems() {
    return this.files;
  }
  getItemText(item) {
    return item.path;
  }
  onChooseItem(item) {
    void this.plugin.startQuizFlow(item);
  }
};

// src/folderPickModal.ts
var import_obsidian2 = require("obsidian");
var FolderPickModal = class extends import_obsidian2.FuzzySuggestModal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.setPlaceholder("Pick a folder");
  }
  getItems() {
    return this.app.vault.getAllLoadedFiles().filter((file) => file instanceof import_obsidian2.TFolder);
  }
  getItemText(item) {
    return item.path === "/" ? "/" : item.path;
  }
  onChooseItem(item) {
    void this.plugin.startFolderQuizFlow(item);
  }
};

// src/guideModal.ts
var import_obsidian3 = require("obsidian");

// src/icon.ts
var OMNISCIENT_ICON = "brain";

// src/guideModal.ts
var GuideModal = class extends import_obsidian3.Modal {
  constructor(app, options = {}) {
    super(app);
    this.options = options;
  }
  onOpen() {
    this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
  render() {
    const { contentEl } = this;
    this.setTitle("Getting started");
    const header = contentEl.createDiv({ cls: "omniscient-guide-header" });
    const logo = header.createDiv({ cls: "omniscient-guide-logo" });
    (0, import_obsidian3.setIcon)(logo, OMNISCIENT_ICON);
    header.createDiv({
      cls: "omniscient-guide-intro",
      text: "Quiz-and-recall study sessions for your mega problem sets. The question is shown, the answer stays hidden until you reveal it, and every grade is written back to your notes."
    });
    contentEl.createEl("h4", { cls: "omniscient-guide-heading", text: "The file format" });
    contentEl.createDiv({
      cls: "omniscient-guide-section",
      text: "Any Markdown note can hold quiz questions. A question is a callout, and the next callout is its answer:"
    });
    contentEl.createEl("pre", {
      cls: "omniscient-guide-example",
      text: [
        "> [!Question] Question | Hard | Mastered(2)",
        "",
        "What is the derivative of x\xB2?",
        "",
        "> [!Success] Answer",
        "",
        "2x"
      ].join("\n")
    });
    const formatList = contentEl.createEl("ul", { cls: "omniscient-guide-list" });
    this.listItem(formatList, "[!Question] starts a question; [!Success] (or [!answer]) starts its answer.");
    this.listItem(formatList, "Optional metadata after the pipe: a difficulty label and a status like Mastered(2).");
    this.listItem(formatList, "An optional > [!Hint] callout after an answer holds a note for yourself; it stays hidden until you ask for it.");
    this.listItem(formatList, "Questions inside code fences, or indented by four or more spaces, are ignored.");
    contentEl.createEl("h4", { cls: "omniscient-guide-heading", text: "Start a session" });
    const startList = contentEl.createEl("ul", { cls: "omniscient-guide-list" });
    this.listItem(startList, "Run Start quiz for the current note, Choose quiz file, or Start quiz from folder from the command palette.");
    this.listItem(startList, "The ribbon icon (a brain) starts a quiz for the active note, or opens the file picker.");
    this.listItem(startList, "In the setup dialog you can filter by status, difficulty, and section, and toggle shuffling (it defaults to Not mastered yet, so each session shows only the gaps).");
    contentEl.createEl("h4", { cls: "omniscient-guide-heading", text: "During the session" });
    const sessionList = contentEl.createEl("ul", { cls: "omniscient-guide-list" });
    this.listItem(sessionList, "Space reveals the answer; grade yourself with Struggling, Almost, or Mastered (keys 1, 2 and 3).");
    this.listItem(sessionList, "Each question shows its number in the file, and hints stay hidden until you ask: H shows one, N adds or edits it.");
    this.listItem(sessionList, "Every grade is saved to the file immediately, and Undo restores it both in the session and in the note.");
    this.listItem(sessionList, "Finishing early is normal: press Esc or End session whenever you run out of time.");
    contentEl.createEl("h4", { cls: "omniscient-guide-heading", text: "Exam-ready" });
    contentEl.createDiv({
      cls: "omniscient-guide-section",
      text: "A question is exam-ready once you answer Mastered as many times in a row as the Mastered passes setting requires (2 by default). Mastered(2) in your note means it is already there."
    });
    new import_obsidian3.Setting(contentEl).addButton((button) => {
      button.setButtonText(this.options.onStart ? "Start using Omniscient" : "Got it").setCta().onClick(() => {
        var _a, _b;
        this.close();
        (_b = (_a = this.options).onStart) == null ? void 0 : _b.call(_a);
      });
    }).addButton((button) => {
      if (this.options.onCreateSample) {
        button.setButtonText("Create a sample quiz file").onClick(() => {
          var _a, _b;
          this.close();
          (_b = (_a = this.options).onCreateSample) == null ? void 0 : _b.call(_a);
        });
      }
    });
  }
  listItem(list, text) {
    list.createEl("li", { text });
  }
};

// src/parser.ts
var STATUS_CANONICAL = {
  struggling: "Struggling",
  almost: "Almost",
  mastered: "Mastered"
};
var STATUS_RE = /^(struggling|almost|mastered)\s*(?:\(\s*(\d+)\s*\))?$/i;
var HAS_QUESTIONS_RE = /^ {0,3}>\s*(?:\[!\s*)?question\b/im;
var CALLOUT_RE = /^( {0,3}>\s*)\[!([^\]]*)\]([^\n]*)$/i;
var PLAIN_RE = /^( {0,3}>\s*)(question|answer)\b([^\n]*)$/i;
var ATX_HEADING_RE = /^ {0,3}(#{1,6})(.*)$/;
var HINT_START_RE = /^ {0,3}>\s*\[!\s*hint\s*\]/i;
var QUOTE_LINE_RE = /^ {0,3}>/;
var THEMATIC_BREAK_RE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
function isStatusToken(token) {
  var _a;
  const m = STATUS_RE.exec(token.trim());
  if (!m) return null;
  return (_a = STATUS_CANONICAL[m[1].toLowerCase()]) != null ? _a : null;
}
function isDifficultyToken(token, labels) {
  const t = token.trim().toLowerCase();
  for (const label of labels) {
    const trimmed = label.trim();
    if (trimmed.length > 0 && trimmed.toLowerCase() === t) {
      return trimmed;
    }
  }
  return null;
}
function splitTokens(rest, difficultyLabels) {
  const parts = rest.split("|").map((p) => p.trim());
  while (parts.length > 0 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  const tokens = [];
  let end = parts.length - 1;
  while (end >= 0 && (isStatusToken(parts[end]) !== null || isDifficultyToken(parts[end], difficultyLabels) !== null)) {
    tokens.unshift(parts[end]);
    end--;
  }
  const stem = parts.slice(0, end + 1).join(" | ").trim();
  return { stem, tokens };
}
function parseHeader(line, difficultyLabels) {
  const callout = CALLOUT_RE.exec(line);
  if (callout) {
    const type = callout[2].trim().toLowerCase();
    const kind2 = type === "question" ? "question" : type === "success" || type === "answer" ? "answer" : null;
    if (!kind2) return null;
    let rest = callout[3];
    const foldable = /^-\s*/.test(rest) ? "-" : "";
    if (foldable) {
      rest = rest.replace(/^-\s*/, "");
    }
    const { stem: stem2, tokens: tokens2 } = splitTokens(rest, difficultyLabels);
    const prefix = `${callout[1]}[!${callout[2]}]${foldable}`;
    const lineStem2 = stem2.length > 0 ? `${prefix} ${stem2}` : prefix;
    return { kind: kind2, lineStem: lineStem2, tokens: tokens2 };
  }
  const plain = PLAIN_RE.exec(line);
  if (!plain) {
    return null;
  }
  const kind = plain[2].toLowerCase() === "question" ? "question" : "answer";
  const { stem, tokens } = splitTokens(plain[3], difficultyLabels);
  const lineStem = stem.length > 0 ? `${plain[1]}${plain[2]} ${stem}` : `${plain[1]}${plain[2]}`;
  return { kind, lineStem, tokens };
}
function isSectionHeading(lines, start, difficultyLabels) {
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim().length === 0 || parseHeading(lines[i]) !== null) {
      continue;
    }
    const hintRun = readHintRun(lines, i, difficultyLabels);
    if (hintRun !== null) {
      i = hintRun.end - 1;
      continue;
    }
    if (THEMATIC_BREAK_RE.test(lines[i])) {
      continue;
    }
    const header = parseHeader(lines[i], difficultyLabels);
    return header !== null && header.kind === "question";
  }
  return false;
}
function parseHeading(line) {
  const m = ATX_HEADING_RE.exec(line);
  if (!m) {
    return null;
  }
  const rest = m[2];
  if (rest.length > 0 && !/^\s/.test(rest)) {
    return null;
  }
  let text = rest.trim();
  text = text.replace(/\s+#+\s*$/, "").trim();
  return { level: m[1].length, text };
}
function stripQuotePrefix(line) {
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
function assembleBody(lines) {
  return assembleBodyLines(lines, false);
}
function assembleBodyContent(lines) {
  return assembleBodyLines(lines, true);
}
function assembleBodyLines(lines, trimSeparators) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim().length === 0) {
    start++;
  }
  for (; ; ) {
    const before = end;
    while (end > start && lines[end - 1].trim().length === 0) {
      end--;
    }
    if (trimSeparators) {
      while (end > start && THEMATIC_BREAK_RE.test(lines[end - 1])) {
        end--;
      }
    }
    if (end === before) {
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}
function readHintRun(lines, start, difficultyLabels) {
  if (!HINT_START_RE.test(lines[start])) {
    return null;
  }
  let end = start + 1;
  while (end < lines.length && QUOTE_LINE_RE.test(lines[end]) && parseHeader(lines[end], difficultyLabels) === null) {
    end++;
  }
  const body = [];
  for (let i = start + 1; i < end; i++) {
    body.push(stripQuotePrefix(lines[i]));
  }
  return { start, end, text: decodeCharRefs(assembleBody(body)) };
}
var NEUTRALIZED_CODES = {
  "65": "A",
  "81": "Q",
  "91": "[",
  "97": "a",
  "113": "q"
};
function decodeCharRefs(text) {
  return text.split("\n").map(
    (line) => line.replace(
      /^(\s*)&#(65|81|91|97|113);/,
      (_whole, indent, code) => `${indent}${NEUTRALIZED_CODES[code]}`
    )
  ).join("\n");
}
function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i) >>> 0;
  }
  return h >>> 0;
}
function extractMetadata(tokens, difficultyLabels) {
  let difficulty;
  let status;
  let passes = 0;
  for (const token of tokens) {
    const st = isStatusToken(token);
    if (st !== null && status === void 0) {
      status = st;
      const m = STATUS_RE.exec(token.trim());
      const n = (m == null ? void 0 : m[2]) === void 0 ? void 0 : Number.parseInt(m[2], 10);
      passes = st === "Mastered" ? n !== void 0 && n > 0 ? n : 1 : 0;
    } else if (st === null && difficulty === void 0) {
      const d = isDifficultyToken(token, difficultyLabels);
      if (d !== null) {
        difficulty = d;
      }
    }
  }
  return { difficulty, status, passes };
}
var FENCE_RE = /^ {0,3}(```|~~~)/;
function parseQuestions(content, difficultyLabels) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const questions = [];
  let current = null;
  let collectingQuestion = false;
  let body = [];
  let inFence = false;
  const stack = [];
  const finalizeBody = () => {
    if (current === null) {
      return;
    }
    const assembled = assembleBodyContent(body);
    if (collectingQuestion) {
      current.questionBody = assembled;
      current.bodyHash = hashString(assembled);
    } else {
      current.answerBody = assembled;
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const stripped = stripQuotePrefix(lines[i]);
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
      if (current !== null && hintRun.text.length > 0) {
        current.hint = current.hint === void 0 ? hintRun.text : `${current.hint}

${hintRun.text}`;
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
    if (header.kind === "question") {
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
        sourcePath: "",
        sectionPath: stack.map((entry) => entry.text),
        questionBody: "",
        answerBody: "",
        hint: void 0,
        difficulty: meta.difficulty,
        status: meta.status,
        passes: meta.passes,
        bodyHash: 0
      };
      questions.push(current);
      collectingQuestion = true;
      body = [];
    } else {
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
function serializeHeader(lineStem, difficulty, status, passes) {
  const tokens = [];
  if (difficulty !== void 0 && difficulty.length > 0) {
    tokens.push(difficulty);
  }
  if (status !== void 0) {
    tokens.push(status === "Mastered" ? `Mastered(${passes})` : status);
  }
  return tokens.length > 0 ? `${lineStem} | ${tokens.join(" | ")}` : lineStem;
}
function bodyHashAt(lines, headerIdx, difficultyLabels) {
  const body = [];
  let inFence = false;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const stripped = stripQuotePrefix(lines[i]);
    if (FENCE_RE.test(stripped)) {
      inFence = !inFence;
    }
    if (inFence) {
      body.push(stripped);
      continue;
    }
    const hintRun = readHintRun(lines, i, difficultyLabels);
    if (hintRun !== null) {
      i = hintRun.end - 1;
      continue;
    }
    if (parseHeading(lines[i]) !== null && isSectionHeading(lines, i, difficultyLabels)) {
      continue;
    }
    const h = parseHeader(lines[i], difficultyLabels);
    if (h !== null) {
      break;
    }
    body.push(stripped);
  }
  return hashString(assembleBodyContent(body));
}
function questionOrdinals(lines, difficultyLabels) {
  const ordinals = /* @__PURE__ */ new Map();
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
    if (header !== null && header.kind === "question") {
      count++;
      ordinals.set(i, count);
    }
  }
  return ordinals;
}
function locateBlockHeader(lines, block, difficultyLabels) {
  const needle = block.headerLine.trim();
  const ordinals = questionOrdinals(lines, difficultyLabels);
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let fallback = null;
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
  return best != null ? best : fallback;
}
function patchQuestionHeader(content, block, newLine, difficultyLabels) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const best = locateBlockHeader(lines, block, difficultyLabels);
  if (best === null) {
    return { content, patched: false };
  }
  lines[best] = newLine;
  return { content: lines.join(eol), patched: true };
}
function findBlockEnd(lines, headerIdx, difficultyLabels) {
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
      i = hintRun.end - 1;
      continue;
    }
    const header = parseHeader(lines[i], difficultyLabels);
    if (header !== null && header.kind === "question") {
      return i;
    }
  }
  return lines.length;
}
function neutralizeHeaderLine(line) {
  const match = /^(\s*)(.*)$/.exec(line);
  if (match === null) {
    return line;
  }
  const indent = match[1];
  const body = match[2];
  const headerShaped = /^(?:question|answer)\b/i.test(body) || /^\[!\s*(?:question|success|answer)\s*\]/i.test(body);
  if (!headerShaped) {
    return line;
  }
  return `${indent}&#${body.charCodeAt(0)};${body.slice(1)}`;
}
function hintLinesFor(text) {
  const out = ["> [!Hint]"];
  for (const line of text.split(/\r?\n/)) {
    out.push(line.trim().length === 0 ? ">" : `> ${neutralizeHeaderLine(line)}`);
  }
  return out;
}
function isBlankLine(line) {
  return line === void 0 || line.trim().length === 0;
}
function tidyAfterRemoval(lines, index) {
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
function patchQuestionHint(content, block, hint, difficultyLabels) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const headerIdx = locateBlockHeader(lines, block, difficultyLabels);
  if (headerIdx === null) {
    return { content, patched: false };
  }
  const end = findBlockEnd(lines, headerIdx, difficultyLabels);
  const runs = [];
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
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      lines.splice(run.start, run.end - run.start);
      tidyAfterRemoval(lines, run.start);
    }
    return { content: lines.join(eol), patched: true };
  }
  const fresh = hintLinesFor(hint);
  for (let i = runs.length - 1; i >= 1; i--) {
    const run = runs[i];
    lines.splice(run.start, run.end - run.start);
    tidyAfterRemoval(lines, run.start);
  }
  const first = runs[0];
  if (first !== void 0) {
    lines.splice(first.start, first.end - first.start, ...fresh);
    return { content: lines.join(eol), patched: true };
  }
  let insertAt = end;
  while (insertAt > headerIdx + 1 && (isBlankLine(lines[insertAt - 1]) || THEMATIC_BREAK_RE.test(lines[insertAt - 1]))) {
    insertAt--;
  }
  const insertion = [...fresh];
  if (!isBlankLine(lines[insertAt - 1])) {
    insertion.unshift("");
  }
  if (insertAt < lines.length && !isBlankLine(lines[insertAt])) {
    insertion.push("");
  }
  lines.splice(insertAt, 0, ...insertion);
  return { content: lines.join(eol), patched: true };
}

// src/sampleQuiz.ts
var SAMPLE_QUIZ_CONTENT = `<!-- Omniscient sample quiz
Copy this file and replace the questions with your own.
Format: a [!Question] callout holds the question, the following
[!Success] callout holds its answer. Optional metadata after the
pipe: a difficulty label and a status (Struggling, Almost, or
Mastered with its pass count). A [!Hint] callout after an answer
stays hidden during a session until you ask for it. Headings group
questions into sections you can pick in the setup dialog. -->

# Omniscient sample quiz

## Limits

> [!Question] Question | Easy

What does it mean for a limit to exist?

> [!Success] Answer

The function approaches one value from both sides as the input nears the point.

> [!Hint]
> "Approaches", not "equals": think about where the graph is heading.

> [!Question] Question | Hard

This question intentionally has no answer. Try revealing it during a session.

## Derivatives

> [!Question] Question | Easy | Mastered(2)

What is the derivative of x\xB2?

> [!Success] Answer

2x

> [!Question] Question | Medium | Almost

State the power rule.

> [!Success] Answer

For f(x) = x\u207F, f\u2032(x) = n\xB7x\u207F\u207B\xB9.

> [!Hint]
> Multiply by the old exponent first, then subtract one from it.
>
> Check yourself: x\xB2 becomes 2x, not x.

## Integrals

> [!Question] Question | Medium

What is the integral of 2x?

> [!Success] Answer

x\xB2 + C. Do not forget the constant of integration.

> [!Hint]
> The +C is the part everyone drops under exam pressure.

## Method

> [!Question] Question | Hard | Struggling

What is a mega-problem set?

> [!Success] Answer

A large set of practice questions on one topic, worked through with retrieval practice.

> [!Hint]
> It is one topic at a time, not a mixed practice exam.
`;

// src/progressModal.ts
var import_obsidian4 = require("obsidian");
var ProgressModal = class extends import_obsidian4.Modal {
  constructor(app, fileBasename, summary) {
    super(app);
    this.fileBasename = fileBasename;
    this.summary = summary;
  }
  onOpen() {
    const { contentEl } = this;
    const { summary } = this;
    this.setTitle("Quiz progress");
    contentEl.createDiv({
      cls: "omniscient-summary-file",
      text: this.fileBasename
    });
    const grid = contentEl.createDiv({ cls: "omniscient-summary-grid" });
    const cell = (label, value, cls) => {
      const div = grid.createDiv({ cls: "omniscient-summary-cell" });
      div.createDiv({ cls: "omniscient-summary-value", text: value });
      div.createDiv({ cls: "omniscient-summary-label", text: label });
      if (cls) {
        div.addClass(cls);
      }
    };
    cell("Exam-ready", `${summary.examReady}/${summary.total}`, "omniscient-summary-good");
    cell("Mastered", String(summary.mastered), "omniscient-summary-good");
    cell("Almost", String(summary.almost), "omniscient-summary-warn");
    cell("Struggling", String(summary.struggling), "omniscient-summary-bad");
    cell("New", String(summary.newCount));
    if (summary.byDifficulty.length > 0) {
      const difficulties = contentEl.createDiv({ cls: "omniscient-progress-section" });
      difficulties.createDiv({ cls: "omniscient-summary-label", text: "By difficulty" });
      for (const entry of summary.byDifficulty) {
        difficulties.createDiv({
          cls: "omniscient-progress-row",
          text: `${entry.label}: ${entry.count}`
        });
      }
    }
    new import_obsidian4.Setting(contentEl).addButton((button) => {
      button.setButtonText("Done").onClick(() => {
        this.close();
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/quizView.ts
var import_obsidian7 = require("obsidian");

// src/hintModal.ts
var import_obsidian5 = require("obsidian");
var HintModal = class extends import_obsidian5.Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
    this.textarea = null;
    this.saving = false;
  }
  onOpen() {
    this.render();
  }
  onClose() {
    var _a, _b;
    this.contentEl.empty();
    (_b = (_a = this.options).onClosed) == null ? void 0 : _b.call(_a);
  }
  render() {
    const { contentEl } = this;
    this.setTitle(this.options.hasHint ? "Edit hint" : "Add hint");
    contentEl.createDiv({
      cls: "omniscient-hint-modal-help",
      text: "Hidden during the session until you ask for it. Use it to note what you missed last time."
    });
    this.textarea = contentEl.createEl("textarea", {
      cls: "omniscient-hint-textarea",
      attr: {
        rows: "4",
        "aria-label": "Hint text",
        placeholder: "What tripped you up last time?"
      }
    });
    this.textarea.value = this.options.initialText;
    const buttons = contentEl.createDiv({ cls: "omniscient-modal-buttons" });
    if (this.options.hasHint) {
      const remove = buttons.createEl("button", { text: "Remove hint" });
      remove.addClass("mod-warning");
      remove.addEventListener("click", () => {
        void this.submit(null, remove);
      });
    }
    const cancel = buttons.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => {
      this.close();
    });
    const save = buttons.createEl("button", { text: "Save" });
    save.addClass("mod-cta");
    save.addEventListener("click", () => {
      var _a, _b;
      void this.submit((_b = (_a = this.textarea) == null ? void 0 : _a.value) != null ? _b : "", save);
    });
    this.textarea.addEventListener("keydown", (event) => {
      var _a, _b;
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void this.submit((_b = (_a = this.textarea) == null ? void 0 : _a.value) != null ? _b : "", save);
      }
    });
    window.setTimeout(() => {
      var _a;
      return (_a = this.textarea) == null ? void 0 : _a.focus();
    }, 0);
  }
  async submit(text, button) {
    if (this.saving) {
      return;
    }
    const value = text === null ? null : text.trim();
    if (value !== null && value.length === 0 && !this.options.hasHint) {
      this.close();
      return;
    }
    this.saving = true;
    button.disabled = true;
    let ok = false;
    try {
      ok = await this.options.onSubmit(value);
    } finally {
      this.saving = false;
      button.disabled = false;
    }
    if (ok) {
      this.close();
    }
  }
};

// src/session.ts
function sameSectionPath(a, b) {
  return a.length === b.length && a.every((part, index) => part === b[index]);
}
function matchesFilter(block, config) {
  var _a;
  if (config.headingFilter !== void 0) {
    const inSelectedSection = config.headingFilter.some(
      (ref) => ref.filePath === block.sourcePath && sameSectionPath(ref.sectionPath, block.sectionPath)
    );
    if (!inSelectedSection) {
      return false;
    }
  }
  if (config.difficultyFilter !== "all" && ((_a = block.difficulty) != null ? _a : "").toLowerCase() !== config.difficultyFilter.toLowerCase()) {
    return false;
  }
  const mastered = block.status === "Mastered" && block.passes >= config.masteredPasses;
  switch (config.statusFilter) {
    case "all":
      return true;
    case "new":
      return block.status === void 0;
    case "struggling":
      return block.status === "Struggling";
    case "almost":
      return block.status === "Almost";
    case "mastered":
      return mastered;
    case "not-mastered":
      return !mastered;
  }
}
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
}
var QuizSession = class {
  constructor(blocks, config) {
    /** Graded questions with the state needed to undo them, newest last. */
    this.gradedHistory = [];
    const filtered = blocks.filter((b) => matchesFilter(b, config));
    this.queue = filtered.map((block) => ({ block, grade: null }));
    if (config.shuffle) {
      shuffle(this.queue);
    }
    this.total = this.queue.length;
  }
  get current() {
    var _a;
    return (_a = this.queue[0]) != null ? _a : null;
  }
  get isComplete() {
    return this.queue.length === 0;
  }
  get hasUndo() {
    return this.gradedHistory.length > 0;
  }
  get counts() {
    const counts = {
      answered: 0,
      mastered: 0,
      almost: 0,
      struggling: 0
    };
    for (const entry of this.gradedHistory) {
      const grade = entry.item.grade;
      if (grade === null) {
        continue;
      }
      counts.answered++;
      if (grade === "Mastered") {
        counts.mastered++;
      } else if (grade === "Almost") {
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
  gradeCurrent(grade) {
    const item = this.current;
    if (item === null) {
      return null;
    }
    this.queue.shift();
    this.applyGrade(item, grade);
    return item;
  }
  applyGrade(item, grade) {
    item.grade = grade;
    const block = item.block;
    this.gradedHistory.push({
      item,
      prevStatus: block.status,
      prevPasses: block.passes
    });
    if (grade === "Mastered") {
      block.passes = block.status === "Mastered" ? block.passes + 1 : 1;
      block.status = "Mastered";
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
  skipCurrent() {
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
  undoLast() {
    const entry = this.gradedHistory.pop();
    if (entry === void 0) {
      return null;
    }
    entry.item.grade = null;
    entry.item.block.status = entry.prevStatus;
    entry.item.block.passes = entry.prevPasses;
    this.queue.unshift(entry.item);
    return entry.item;
  }
};

// src/summaryModal.ts
var import_obsidian6 = require("obsidian");
var SummaryModal = class extends import_obsidian6.Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
  }
  onOpen() {
    const { contentEl } = this;
    const { counts, total } = this.options;
    this.setTitle("Session complete");
    contentEl.createDiv({
      cls: "omniscient-summary-file",
      text: this.options.fileBasename
    });
    const grid = contentEl.createDiv({ cls: "omniscient-summary-grid" });
    const cell = (label, value, cls) => {
      const div = grid.createDiv({ cls: "omniscient-summary-cell" });
      div.createDiv({ cls: "omniscient-summary-value", text: value });
      div.createDiv({
        cls: "omniscient-summary-label",
        text: label
      });
      if (cls) {
        div.addClass(cls);
      }
    };
    cell("Answered", `${counts.answered}/${total}`);
    cell("Mastered", String(counts.mastered), "omniscient-summary-good");
    cell("Almost", String(counts.almost), "omniscient-summary-warn");
    cell("Struggling", String(counts.struggling), "omniscient-summary-bad");
    const remaining = total - counts.answered;
    if (remaining > 0) {
      cell("Remaining", String(remaining));
    }
    if (this.options.failedWrites > 0) {
      contentEl.createDiv({
        cls: "omniscient-summary-note",
        text: `${this.options.failedWrites} change(s) could not be saved because the file changed during the session.`
      });
    }
    new import_obsidian6.Setting(contentEl).addButton((button) => {
      button.setButtonText("Done").onClick(() => {
        this.close();
      });
    });
    if (counts.struggling > 0) {
      new import_obsidian6.Setting(contentEl).addButton((button) => {
        button.setButtonText("Review struggling questions").setCta().onClick(() => {
          this.close();
          this.options.onReviewStruggling();
        });
      });
    }
  }
  onClose() {
    this.contentEl.empty();
    this.options.onDone();
  }
};

// src/quizView.ts
var QUIZ_VIEW_TYPE = "omniscient-quiz-view";
var QuizView = class extends import_obsidian7.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.config = null;
    this.session = null;
    this.revealed = false;
    this.finished = false;
    this.viewClosed = false;
    this.failedWrites = 0;
    this.writeQueue = Promise.resolve();
    // ------------------------------------------------------------------
    // View element references (assigned in renderShell)
    // ------------------------------------------------------------------
    this.contentArea = null;
    this.hintEl = null;
    this.undoButtonEl = null;
    this.progressTextEl = null;
    this.progressFillEl = null;
    /** Whether the current question's hint is revealed (always resets). */
    this.hintVisible = false;
    /** Block the hint visibility belongs to, so it resets per question. */
    this.lastHintBlock = null;
  }
  getViewType() {
    return QUIZ_VIEW_TYPE;
  }
  getDisplayText() {
    return `Omniscient \u2014 ${this.displayName()}`;
  }
  getIcon() {
    return OMNISCIENT_ICON;
  }
  displayName() {
    var _a, _b, _c;
    const paths = (_a = this.config) == null ? void 0 : _a.filePaths;
    if (!paths || paths.length === 0) {
      return "Quiz";
    }
    if (paths.length === 1) {
      return (_c = (_b = paths[0].split("/").pop()) == null ? void 0 : _b.replace(/\.md$/i, "")) != null ? _c : "Quiz";
    }
    return `${paths.length} files`;
  }
  async onOpen() {
    try {
      await this.setup();
    } catch (error) {
      console.error("Omniscient: failed to open quiz view", error);
      new import_obsidian7.Notice("Could not open the quiz view. See the developer console for details.");
      this.leaf.detach();
    }
  }
  async setup() {
    const config = this.plugin.consumePendingQuizConfig();
    if (!config) {
      this.leaf.detach();
      return;
    }
    this.config = config;
    const labels = this.plugin.getDifficultyLabels();
    const blocks = [];
    let foundFiles = 0;
    for (const path of config.filePaths) {
      const abstract = this.app.vault.getAbstractFileByPath(path);
      if (!(abstract instanceof import_obsidian7.TFile)) {
        continue;
      }
      try {
        const content = await this.app.vault.read(abstract);
        const parsed = parseQuestions(content, labels);
        for (const question of parsed.questions) {
          question.sourcePath = path;
        }
        blocks.push(...parsed.questions);
        foundFiles++;
      } catch (e) {
      }
    }
    if (foundFiles === 0) {
      new import_obsidian7.Notice("The quiz file(s) no longer exist.");
      this.leaf.detach();
      return;
    }
    this.session = new QuizSession(blocks, config);
    if (this.session.total === 0) {
      new import_obsidian7.Notice("No questions match the selected filters.");
      this.leaf.detach();
      return;
    }
    this.renderShell();
    this.registerDomEvent(
      this.containerEl,
      "keydown",
      (event) => this.handleKeydown(event)
    );
    this.renderQuestion();
    this.contentEl.focus();
  }
  onClose() {
    return Promise.resolve();
  }
  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  renderShell() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("omniscient-quiz-view");
    contentEl.setAttribute("tabindex", "0");
    contentEl.setAttribute(
      "aria-label",
      "Quiz session. Space reveals the answer, 1, 2 and 3 grade it."
    );
    const header = contentEl.createDiv({ cls: "omniscient-quiz-header" });
    header.createDiv({
      cls: "omniscient-quiz-title",
      text: this.displayName()
    });
    header.createDiv({ cls: "omniscient-quiz-spacer" });
    this.progressTextEl = header.createDiv({ cls: "omniscient-progress-text" });
    this.progressTextEl.setAttribute("aria-live", "polite");
    const undoButton = header.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "Undo last grade", "data-tooltip-position": "top" }
    });
    undoButton.setText("Undo");
    undoButton.addEventListener("click", () => this.undo());
    this.undoButtonEl = undoButton;
    const endButton = header.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "End session", "data-tooltip-position": "top" }
    });
    endButton.setText("End session");
    endButton.addEventListener("click", () => void this.endSession());
    const bar = contentEl.createDiv({ cls: "omniscient-progress-bar" });
    this.progressFillEl = bar.createDiv({ cls: "omniscient-progress-bar-fill" });
    this.contentArea = contentEl.createDiv({ cls: "omniscient-content" });
    this.hintEl = contentEl.createDiv({ cls: "omniscient-hint" });
    this.hintEl.setText(
      "Space or enter reveals \xB7 1 struggling \xB7 2 almost \xB7 3 mastered \xB7 h hint \xB7 n edit hint \xB7 s skip \xB7 u undo \xB7 esc ends"
    );
  }
  renderQuestion() {
    var _a, _b, _c, _d;
    const session = this.session;
    if (!session || !this.contentArea) {
      return;
    }
    const item = session.current;
    if (!item) {
      return;
    }
    const area = this.contentArea;
    area.empty();
    if (this.lastHintBlock !== item.block) {
      this.hintVisible = false;
      this.lastHintBlock = item.block;
    }
    if (this.undoButtonEl) {
      this.undoButtonEl.disabled = !session.hasUndo;
    }
    const meta = (_a = item.block.difficulty) != null ? _a : "";
    const status = item.block.status ? item.block.status === "Mastered" ? `Mastered(${item.block.passes})` : item.block.status : "New";
    const metaParts = [];
    if (((_c = (_b = this.config) == null ? void 0 : _b.filePaths.length) != null ? _c : 0) > 1) {
      metaParts.push((_d = item.block.sourcePath.split("/").pop()) != null ? _d : item.block.sourcePath);
    }
    metaParts.push(`Question ${item.block.ordinal} of ${item.block.fileTotal}`);
    if (meta.length > 0) {
      metaParts.push(`Difficulty: ${meta}`);
    }
    metaParts.push(`Status: ${status}`);
    const card = area.createDiv({ cls: "omniscient-question-card" });
    card.createDiv({ cls: "omniscient-question-meta", text: metaParts.join(" \xB7 ") });
    void import_obsidian7.MarkdownRenderer.render(
      this.app,
      item.block.questionBody,
      card,
      item.block.sourcePath,
      this
    );
    if (this.hintVisible && item.block.hint !== void 0) {
      const hintCard = area.createDiv({ cls: "omniscient-hint-card" });
      hintCard.createDiv({ cls: "omniscient-hint-card-label", text: "Hint" });
      void import_obsidian7.MarkdownRenderer.render(
        this.app,
        item.block.hint,
        hintCard,
        item.block.sourcePath,
        this
      );
    }
    const actions = area.createDiv({ cls: "omniscient-actions" });
    if (!this.revealed) {
      const reveal = actions.createEl("button", {
        cls: "omniscient-grade-btn mod-cta",
        text: "Reveal answer",
        attr: { "aria-label": "Reveal the answer" }
      });
      reveal.addEventListener("click", () => this.reveal());
      this.addHintButtons(actions);
      const skip = actions.createEl("button", {
        cls: "omniscient-grade-btn",
        text: "Skip",
        attr: { "aria-label": "Skip this question for now" }
      });
      skip.addEventListener("click", () => this.skip());
    } else {
      const answerCard = area.createDiv({ cls: "omniscient-answer-card" });
      answerCard.createDiv({ cls: "omniscient-answer-label", text: "Answer" });
      if (item.block.answerBody.length > 0) {
        void import_obsidian7.MarkdownRenderer.render(
          this.app,
          item.block.answerBody,
          answerCard,
          item.block.sourcePath,
          this
        );
      } else {
        answerCard.createDiv({
          cls: "omniscient-hint",
          text: "No answer provided for this question."
        });
      }
      const gradeButtons = [
        { grade: "Struggling", label: "Struggling", cls: "mod-warning" },
        { grade: "Almost", label: "Almost" },
        { grade: "Mastered", label: "Mastered", cls: "mod-cta" }
      ];
      for (const def of gradeButtons) {
        const button = actions.createEl("button", {
          cls: "omniscient-grade-btn",
          text: def.label,
          attr: { "aria-label": `Grade as ${def.label}` }
        });
        if (def.cls) {
          button.addClass(def.cls);
        }
        button.addEventListener("click", () => this.grade(def.grade));
      }
      this.addHintButtons(actions);
      const skip = actions.createEl("button", {
        cls: "omniscient-grade-btn",
        text: "Skip",
        attr: { "aria-label": "Skip this question for now" }
      });
      skip.addEventListener("click", () => this.skip());
    }
    this.updateProgress();
    this.contentEl.focus();
  }
  updateProgress() {
    const session = this.session;
    if (!session) {
      return;
    }
    const { answered } = session.counts;
    if (this.progressTextEl) {
      this.progressTextEl.setText(`${answered}/${session.total}`);
    }
    if (this.progressFillEl) {
      const pct = session.total > 0 ? answered / session.total * 100 : 0;
      this.progressFillEl.style.width = `${pct}%`;
    }
  }
  // ------------------------------------------------------------------
  // Interaction
  // ------------------------------------------------------------------
  handleKeydown(event) {
    if (event.target instanceof HTMLElement && event.target.closest("button")) {
      return;
    }
    if (this.finished || this.session === null) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (!this.revealed) {
        this.reveal();
      }
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "1" || key === "2" || key === "3") {
      event.preventDefault();
      if (this.revealed) {
        const grades = ["Struggling", "Almost", "Mastered"];
        this.grade(grades[Number.parseInt(event.key, 10) - 1]);
      }
      return;
    }
    if (key === "h") {
      event.preventDefault();
      this.toggleHint();
      return;
    }
    if (key === "n") {
      event.preventDefault();
      this.openHintModal();
      return;
    }
    if (key === "s") {
      event.preventDefault();
      this.skip();
      return;
    }
    if (key === "u") {
      event.preventDefault();
      this.undo();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      void this.endSession();
    }
  }
  reveal() {
    this.revealed = true;
    this.renderQuestion();
  }
  /** Adds the hint toggle (when a hint exists) and the add/edit button. */
  addHintButtons(actions) {
    var _a;
    const item = (_a = this.session) == null ? void 0 : _a.current;
    if (!item) {
      return;
    }
    if (item.block.hint !== void 0) {
      const label = this.hintVisible ? "Hide hint" : "Show hint";
      const hintButton = actions.createEl("button", {
        cls: "omniscient-grade-btn",
        text: label,
        attr: { "aria-label": label }
      });
      hintButton.addEventListener("click", () => this.toggleHint());
    }
    const hasHint = item.block.hint !== void 0;
    const noteButton = actions.createEl("button", {
      cls: "omniscient-grade-btn",
      text: hasHint ? "Edit hint" : "Add hint",
      attr: { "aria-label": hasHint ? "Edit the hint" : "Add a hint" }
    });
    noteButton.addEventListener("click", () => this.openHintModal());
  }
  toggleHint() {
    var _a;
    const item = (_a = this.session) == null ? void 0 : _a.current;
    if (!item) {
      return;
    }
    if (item.block.hint === void 0) {
      this.openHintModal();
      return;
    }
    this.hintVisible = !this.hintVisible;
    this.renderQuestion();
  }
  openHintModal() {
    var _a, _b;
    const item = (_a = this.session) == null ? void 0 : _a.current;
    if (!item) {
      return;
    }
    const block = item.block;
    new HintModal(this.app, {
      initialText: (_b = block.hint) != null ? _b : "",
      hasHint: block.hint !== void 0,
      onSubmit: async (text) => {
        const ok = await this.writeHint(block, text);
        if (!ok) {
          new import_obsidian7.Notice(
            "Could not save the hint: the question changed in the file. Your text was kept."
          );
        }
        return ok;
      },
      onClosed: () => {
        this.contentEl.focus();
      }
    }).open();
  }
  /**
   * Writes a hint through the same queue as grade writes so the two never
   * interleave. Returns false when the block can no longer be located.
   */
  async writeHint(block, text) {
    var _a;
    const path = block.sourcePath || ((_a = this.config) == null ? void 0 : _a.filePaths[0]);
    if (!path) {
      return false;
    }
    const abstract = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof import_obsidian7.TFile)) {
      return false;
    }
    const labels = this.plugin.getDifficultyLabels();
    let patched = false;
    this.writeQueue = this.writeQueue.then(async () => {
      await this.app.vault.process(abstract, (content) => {
        const result = patchQuestionHint(content, block, text, labels);
        patched = result.patched;
        return result.content;
      });
    }).catch((error) => {
      console.error("Omniscient: failed to save question hint", error);
      patched = false;
    });
    await this.writeQueue;
    if (!patched) {
      this.failedWrites++;
      return false;
    }
    const trimmed = text === null ? "" : text.trim();
    block.hint = trimmed.length > 0 ? text != null ? text : void 0 : void 0;
    if (block.hint === void 0) {
      this.hintVisible = false;
    }
    this.renderQuestion();
    return true;
  }
  skip() {
    const session = this.session;
    if (session === null || this.finished) {
      return;
    }
    session.skipCurrent();
    this.revealed = false;
    this.renderQuestion();
  }
  undo() {
    const session = this.session;
    if (session === null || this.finished) {
      return;
    }
    const item = session.undoLast();
    if (item === null) {
      return;
    }
    this.enqueueWrite(item.block);
    this.revealed = false;
    this.renderQuestion();
  }
  grade(grade) {
    const session = this.session;
    if (session === null || !this.revealed || this.finished) {
      return;
    }
    const graded = session.gradeCurrent(grade);
    if (graded === null) {
      return;
    }
    this.enqueueWrite(graded.block);
    this.updateProgress();
    if (session.isComplete) {
      void this.endSession();
      return;
    }
    this.revealed = false;
    this.renderQuestion();
  }
  enqueueWrite(block) {
    var _a;
    const path = block.sourcePath || ((_a = this.config) == null ? void 0 : _a.filePaths[0]);
    if (!path) {
      return;
    }
    const abstract = this.app.vault.getAbstractFileByPath(path);
    if (!(abstract instanceof import_obsidian7.TFile)) {
      this.failedWrites++;
      return;
    }
    const labels = this.plugin.getDifficultyLabels();
    const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await this.app.vault.process(abstract, (content) => {
          const result = patchQuestionHeader(content, block, newLine, labels);
          if (result.patched) {
            block.headerLine = newLine;
          } else {
            this.failedWrites++;
          }
          return result.content;
        });
      } catch (error) {
        console.error("Omniscient: failed to save question status", error);
        this.failedWrites++;
      }
    });
  }
  async endSession() {
    var _a, _b, _c;
    const session = this.session;
    if (session === null || this.finished) {
      return;
    }
    this.finished = true;
    try {
      await this.writeQueue;
    } catch (e) {
    }
    const counts = session.counts;
    void this.plugin.recordSession({
      date: (/* @__PURE__ */ new Date()).toISOString(),
      filePath: (_b = (_a = this.config) == null ? void 0 : _a.filePaths.join(", ")) != null ? _b : "",
      total: session.total,
      answered: counts.answered,
      mastered: counts.mastered,
      almost: counts.almost,
      struggling: counts.struggling
    }).catch((error) => {
      console.error("Omniscient: failed to record session", error);
    });
    const filePaths = (_c = this.config) == null ? void 0 : _c.filePaths;
    new SummaryModal(this.app, {
      fileBasename: this.displayName(),
      counts,
      total: session.total,
      failedWrites: this.failedWrites,
      onDone: () => {
        if (!this.viewClosed) {
          this.viewClosed = true;
          this.leaf.detach();
        }
      },
      onReviewStruggling: () => {
        if (filePaths) {
          void this.plugin.startQuizFlowFromPaths(filePaths, {
            statusFilter: "struggling"
          });
        }
      }
    }).open();
  }
};

// src/settings.ts
var import_obsidian8 = require("obsidian");
var DEFAULT_SETTINGS = {
  difficultyLabels: "Easy, Medium, Hard",
  masteredPasses: 2,
  shuffleByDefault: true,
  history: [],
  guideSeen: false
};
function parseDifficultyLabels(raw) {
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function formatSessionLine(record) {
  var _a;
  const fileName = (_a = record.filePath.split("/").pop()) != null ? _a : record.filePath;
  const date = record.date.slice(0, 10);
  return `${date} \xB7 ${fileName} \xB7 ${record.mastered}/${record.answered} mastered`;
}
var OmniscientSettingTab = class extends import_obsidian8.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  getSettingDefinitions() {
    const history = this.plugin.settings.history;
    return [
      {
        name: "Difficulty labels",
        desc: 'Comma-separated labels used to grade question difficulty, e.g. "Easy, Medium, Hard".',
        control: {
          type: "text",
          key: "difficultyLabels",
          placeholder: "Easy, Medium, Hard"
        }
      },
      {
        name: "Mastered passes",
        desc: "Consecutive mastered answers required before a question counts as exam-ready.",
        control: {
          type: "number",
          key: "masteredPasses",
          min: 1,
          max: 10,
          step: 1
        }
      },
      {
        name: "Shuffle questions",
        desc: "Randomize question order when a session starts.",
        control: { type: "toggle", key: "shuffleByDefault" }
      },
      {
        name: "Session history",
        desc: "A summary of your most recent quiz sessions.",
        render: (setting, _group) => {
          const frag = createFragment();
          if (history.length === 0) {
            frag.createSpan({ text: "No sessions recorded yet." });
          } else {
            const totalAnswered = history.reduce((sum, r) => sum + r.answered, 0);
            const totalMastered = history.reduce((sum, r) => sum + r.mastered, 0);
            const pct = totalAnswered > 0 ? Math.round(totalMastered / totalAnswered * 100) : 0;
            frag.createDiv({
              text: `${history.length} sessions \xB7 ${pct}% of answers mastered`
            });
            const list = frag.createEl("ul", {
              cls: "omniscient-history-list"
            });
            for (const record of history.slice(0, 5)) {
              list.createEl("li", {
                text: formatSessionLine(record)
              });
            }
          }
          setting.descEl.empty();
          setting.descEl.appendChild(frag);
        }
      },
      {
        name: "Usage guide",
        desc: "Reopen the introduction to the question format and commands.",
        action: () => {
          this.plugin.openGuide();
        }
      },
      {
        name: "Create sample file",
        desc: "Adds a sample quiz note to your vault to show the question format.",
        action: () => {
          void this.plugin.createSampleFile();
        }
      },
      {
        name: "Clear session history",
        desc: "Remove all recorded sessions from this device.",
        action: () => {
          void this.plugin.clearHistory();
          new import_obsidian8.Notice("Session history cleared.");
          this.update();
        }
      }
    ];
  }
};

// src/setupModal.ts
var import_obsidian9 = require("obsidian");

// src/stats.ts
function summarizeBlocks(blocks, masteredPasses) {
  var _a;
  const summary = {
    total: blocks.length,
    examReady: 0,
    newCount: 0,
    struggling: 0,
    almost: 0,
    mastered: 0,
    byDifficulty: []
  };
  const difficultyCounts = /* @__PURE__ */ new Map();
  for (const block of blocks) {
    if (block.status === "Struggling") {
      summary.struggling++;
    } else if (block.status === "Almost") {
      summary.almost++;
    } else if (block.status === "Mastered") {
      summary.mastered++;
      if (block.passes >= masteredPasses) {
        summary.examReady++;
      }
    } else {
      summary.newCount++;
    }
    if (block.difficulty !== void 0) {
      difficultyCounts.set(block.difficulty, ((_a = difficultyCounts.get(block.difficulty)) != null ? _a : 0) + 1);
    }
  }
  summary.byDifficulty = [...difficultyCounts.entries()].map(([label, count]) => ({
    label,
    count
  }));
  return summary;
}

// src/setupModal.ts
var STATUS_OPTIONS = {
  all: "All questions",
  new: "New",
  struggling: "Struggling",
  almost: "Almost there",
  "not-mastered": "Not mastered yet",
  mastered: "Mastered"
};
function sectionKey(filePath, sectionPath) {
  return JSON.stringify([filePath, ...sectionPath]);
}
function nodeKey(node) {
  return node.isRoot ? JSON.stringify(["root", node.filePath]) : sectionKey(node.filePath, node.sectionPath);
}
var SetupModal = class extends import_obsidian9.Modal {
  constructor(app, plugin, filePaths, blocks, onStart) {
    super(app);
    this.plugin = plugin;
    this.filePaths = filePaths;
    this.blocks = blocks;
    this.onStart = onStart;
    /** Defaults to the book's review loop: only questions not yet exam-ready. */
    this.statusFilter = "not-mastered";
    this.difficultyFilter = "all";
    this.refByKey = /* @__PURE__ */ new Map();
    this.selected = /* @__PURE__ */ new Set();
    this.searchQuery = "";
    this.questionsSetting = null;
    this.treeEl = null;
    this.startButton = null;
    this.shuffle = plugin.settings.shuffleByDefault;
    this.difficultyLabels = plugin.getDifficultyLabels();
    this.roots = this.buildSectionTree();
    for (const node of this.allNodes(this.roots)) {
      if (!node.isRoot) {
        this.selected.add(sectionKey(node.filePath, node.sectionPath));
        this.refByKey.set(sectionKey(node.filePath, node.sectionPath), {
          filePath: node.filePath,
          sectionPath: node.sectionPath
        });
      }
    }
    this.hasSections = this.allNodes(this.roots).some(
      (node) => node.sectionPath.length > 0
    );
  }
  onOpen() {
    try {
      this.render();
    } catch (error) {
      console.error("Omniscient: failed to render setup dialog", error);
      new import_obsidian9.Notice("Omniscient setup failed. See the developer console for details.");
      this.close();
    }
  }
  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  render() {
    const { contentEl } = this;
    this.setTitle("Quiz setup");
    this.questionsSetting = new import_obsidian9.Setting(contentEl).setName("Questions").addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(STATUS_OPTIONS)) {
        dropdown.addOption(value, label);
      }
      dropdown.setValue(this.statusFilter).onChange((value) => {
        this.statusFilter = value;
        this.refreshAll();
      });
    });
    if (this.difficultyLabels.length > 0) {
      new import_obsidian9.Setting(contentEl).setName("Difficulty").setDesc("Only include questions with this difficulty").addDropdown((dropdown) => {
        dropdown.addOption("all", "All difficulties");
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
    new import_obsidian9.Setting(contentEl).setName("Shuffle order").setDesc("Randomize the question order").addToggle((toggle) => {
      toggle.setValue(this.shuffle).onChange((value) => {
        this.shuffle = value;
      });
    });
    new import_obsidian9.Setting(contentEl).addButton((button) => {
      this.startButton = button.buttonEl;
      button.setButtonText("Start session").setCta().onClick(() => {
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
          headingFilter: this.selectedRefs()
        });
      });
    });
    this.refreshCounts();
  }
  renderSections(contentEl) {
    new import_obsidian9.Setting(contentEl).setName("Sections").setDesc("Only include questions under the selected headings").addButton((button) => {
      button.setButtonText("Select all").onClick(() => {
        this.selected.clear();
        for (const node of this.allNodes(this.roots)) {
          if (!node.isRoot) {
            this.selected.add(sectionKey(node.filePath, node.sectionPath));
          }
        }
        this.refreshAll();
      });
    }).addButton((button) => {
      button.setButtonText("Clear").onClick(() => {
        this.selected.clear();
        this.refreshAll();
      });
    });
    const search = contentEl.createEl("input", {
      cls: "omniscient-section-search",
      attr: {
        type: "search",
        placeholder: "Filter sections",
        "aria-label": "Filter sections"
      }
    });
    search.addEventListener("input", () => {
      this.searchQuery = search.value.trim().toLowerCase();
      this.refreshTree();
    });
    this.treeEl = contentEl.createDiv({ cls: "omniscient-section-tree" });
    this.refreshTree();
  }
  refreshTree() {
    const tree = this.treeEl;
    if (tree === null) {
      return;
    }
    tree.empty();
    const visible = this.searchQuery.length > 0 ? this.visibleKeys(this.searchQuery) : null;
    const matching = this.baseFilteredBlocks();
    const walk = (nodes, depth) => {
      for (const node of nodes) {
        if (visible !== null && !visible.has(nodeKey(node))) {
          continue;
        }
        const count = matching.filter(
          (block) => block.sourcePath === node.filePath && this.inSubtree(block, node)
        ).length;
        const row = tree.createDiv({ cls: "omniscient-section-row" });
        row.style.paddingLeft = `${depth * 16}px`;
        const state = this.nodeState(node);
        const box = row.createEl("input", {
          attr: {
            type: "checkbox",
            "aria-label": `${node.label} (${count} questions)`
          }
        });
        box.checked = state === "on";
        box.indeterminate = state === "partial";
        box.addEventListener("change", () => {
          this.setSubtree(node, box.checked);
          this.refreshAll();
        });
        row.createDiv({
          cls: node.isRoot ? "omniscient-section-label omniscient-section-root" : "omniscient-section-label",
          text: node.label
        });
        row.createDiv({
          cls: "omniscient-section-count",
          text: String(count)
        });
        walk(node.children, depth + 1);
      }
    };
    walk(this.roots, 0);
  }
  /** Repaints the tree (counts included) and the live totals. */
  refreshAll() {
    this.refreshTree();
    this.refreshCounts();
  }
  refreshCounts() {
    const filtered = this.filteredBlocks();
    if (this.questionsSetting === null) {
      return;
    }
    if (filtered.length === 0) {
      this.questionsSetting.setDesc("No questions match the selected filters.");
    } else {
      const fileCount = new Set(filtered.map((block) => block.sourcePath)).size;
      const examReady = summarizeBlocks(
        filtered,
        this.plugin.settings.masteredPasses
      ).examReady;
      const across = fileCount > 1 ? ` across ${fileCount} files` : "";
      this.questionsSetting.setDesc(
        `${filtered.length} questions${across} \xB7 ${examReady} exam-ready`
      );
    }
    if (this.startButton !== null) {
      this.startButton.disabled = filtered.length === 0;
    }
  }
  // ------------------------------------------------------------------
  // Section tree data
  // ------------------------------------------------------------------
  allNodes(nodes) {
    const out = [];
    for (const node of nodes) {
      out.push(node, ...this.allNodes(node.children));
    }
    return out;
  }
  buildSectionTree() {
    var _a;
    const roots = [];
    const multiFile = this.filePaths.length > 1;
    for (const filePath of this.filePaths) {
      const fileBlocks = this.blocks.filter((block) => block.sourcePath === filePath);
      if (fileBlocks.length === 0) {
        continue;
      }
      const fileRoot = {
        filePath,
        sectionPath: [],
        label: (_a = filePath.split("/").pop()) != null ? _a : filePath,
        children: [],
        isRoot: true
      };
      const nodes = /* @__PURE__ */ new Map();
      for (const block of fileBlocks) {
        if (block.sectionPath.length === 0) {
          const key = sectionKey(filePath, []);
          let node = nodes.get(key);
          if (node === void 0) {
            node = {
              filePath,
              sectionPath: [],
              label: "(no heading)",
              children: [],
              isRoot: false
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
          if (node === void 0) {
            node = {
              filePath,
              sectionPath: path,
              label: block.sectionPath[depth],
              children: [],
              isRoot: false
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
  subtreeKeys(node) {
    const keys = [];
    if (!node.isRoot) {
      keys.push(sectionKey(node.filePath, node.sectionPath));
    }
    for (const child of node.children) {
      keys.push(...this.subtreeKeys(child));
    }
    return keys;
  }
  nodeState(node) {
    const keys = this.subtreeKeys(node);
    let on = 0;
    for (const key of keys) {
      if (this.selected.has(key)) {
        on++;
      }
    }
    if (on === 0) {
      return "off";
    }
    return on === keys.length ? "on" : "partial";
  }
  setSubtree(node, checked) {
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
  visibleKeys(query) {
    const visible = /* @__PURE__ */ new Set();
    const markSubtree = (node) => {
      visible.add(nodeKey(node));
      for (const child of node.children) {
        markSubtree(child);
      }
    };
    const walk = (node) => {
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
  selectedRefs() {
    const selectable = this.allNodes(this.roots).filter((node) => !node.isRoot);
    if (this.selected.size === selectable.length) {
      return void 0;
    }
    const refs = [];
    for (const key of this.selected) {
      const ref = this.refByKey.get(key);
      if (ref !== void 0) {
        refs.push(ref);
      }
    }
    return refs;
  }
  filteredBlocks() {
    const config = {
      filePaths: this.filePaths,
      shuffle: false,
      statusFilter: this.statusFilter,
      difficultyFilter: this.difficultyFilter,
      masteredPasses: this.plugin.settings.masteredPasses,
      headingFilter: this.selectedRefs()
    };
    return this.blocks.filter((block) => matchesFilter(block, config));
  }
  /** Blocks matching the status and difficulty filters, ignoring sections. */
  baseFilteredBlocks() {
    const config = {
      filePaths: this.filePaths,
      shuffle: false,
      statusFilter: this.statusFilter,
      difficultyFilter: this.difficultyFilter,
      masteredPasses: this.plugin.settings.masteredPasses,
      headingFilter: void 0
    };
    return this.blocks.filter((block) => matchesFilter(block, config));
  }
  /** True when a block belongs to a section node or one of its descendants. */
  inSubtree(block, node) {
    if (node.isRoot) {
      return true;
    }
    if (node.sectionPath.length === 0) {
      return block.sectionPath.length === 0;
    }
    return node.sectionPath.every((part, index) => block.sectionPath[index] === part);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/main.ts
var OmniscientPlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    /**
     * Configs handed to quiz views that are about to open. View state is
     * only available after onOpen() in Obsidian, so configs are passed
     * through the plugin instead of view state. A queue (not a single slot)
     * keeps concurrent opens from clobbering each other.
     */
    this.pendingQuizConfigs = [];
    /** Serializes settings writes so concurrent saves cannot interleave. */
    this.saveQueue = Promise.resolve();
    /** Guards createSampleFile against double-clicks while a create is in flight. */
    this.sampleFileInFlight = false;
  }
  async onload() {
    try {
      await this.loadPersisted();
      this.app.workspace.onLayoutReady(() => {
        if (!this.settings.guideSeen) {
          this.settings.guideSeen = true;
          void this.persistSettings();
          this.openGuide(() => {
            void this.pickQuizFile();
          });
        }
      });
      this.registerView(QUIZ_VIEW_TYPE, (leaf) => new QuizView(leaf, this));
      this.addSettingTab(new OmniscientSettingTab(this.app, this));
      this.addCommand({
        id: "show-guide",
        name: "Show usage guide",
        callback: () => {
          this.openGuide();
        }
      });
      this.addCommand({
        id: "start-quiz",
        name: "Start quiz",
        checkCallback: (checking) => this.startQuizCommand(checking)
      });
      this.addCommand({
        id: "choose-quiz-file",
        name: "Choose quiz file",
        callback: () => {
          void this.pickQuizFile();
        }
      });
      this.addCommand({
        id: "start-folder-quiz",
        name: "Start quiz from folder",
        callback: () => {
          new FolderPickModal(this.app, this).open();
        }
      });
      this.addCommand({
        id: "show-progress",
        name: "Show quiz progress",
        checkCallback: (checking) => this.showProgressCommand(checking)
      });
      this.addRibbonIcon(OMNISCIENT_ICON, "Start quiz", () => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === "md") {
          void this.startQuizFlow(file);
        } else {
          void this.pickQuizFile();
        }
      });
    } catch (error) {
      console.error("Omniscient: failed to load", error);
      new import_obsidian10.Notice("Omniscient failed to load. See the developer console for details.");
    }
  }
  getDifficultyLabels() {
    return parseDifficultyLabels(this.settings.difficultyLabels);
  }
  /** Opens the in-app usage guide. */
  openGuide(onStart) {
    new GuideModal(this.app, {
      onStart,
      onCreateSample: () => {
        void this.createSampleFile();
      }
    }).open();
  }
  /**
   * Creates the sample quiz note in the vault root, or opens the
   * existing one if the user already created it.
   */
  async createSampleFile() {
    if (this.sampleFileInFlight) {
      return null;
    }
    this.sampleFileInFlight = true;
    try {
      const path = "Omniscient sample quiz.md";
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof import_obsidian10.TFile) {
        new import_obsidian10.Notice("Sample quiz file already exists.");
        await this.app.workspace.getLeaf("tab").openFile(existing);
        return existing;
      }
      const file = await this.app.vault.create(path, SAMPLE_QUIZ_CONTENT);
      await this.app.workspace.getLeaf("tab").openFile(file);
      new import_obsidian10.Notice("Sample quiz file created.");
      return file;
    } catch (error) {
      console.error("Omniscient: failed to create sample file", error);
      new import_obsidian10.Notice("Could not create the sample file. See the developer console for details.");
      return null;
    } finally {
      this.sampleFileInFlight = false;
    }
  }
  // ------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------
  /**
   * Always enabled so the palette never silently no-ops: if there is no
   * active markdown file we say so explicitly.
   */
  startQuizCommand(checking) {
    if (checking) {
      return true;
    }
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new import_obsidian10.Notice("Open a Markdown file first, then run this command.");
      return true;
    }
    void this.startQuizFlow(file);
    return true;
  }
  /**
   * Reads the file, validates it contains questions, and starts a session.
   *
   * Without a preset, shows the setup modal first. With a preset (e.g.
   * "review struggling") the session starts immediately using the preset
   * over the settings defaults.
   */
  async startQuizFlow(file, preset) {
    await this.startQuizFlowFromPaths([file.path], preset);
  }
  /** Starts a quiz over every markdown file inside a folder tree. */
  async startFolderQuizFlow(folder) {
    const prefix = folder.path === "/" ? "" : `${folder.path}/`;
    const paths = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix)).map((file) => file.path);
    if (paths.length === 0) {
      new import_obsidian10.Notice("No Markdown files in this folder.");
      return;
    }
    await this.startQuizFlowFromPaths(paths);
  }
  /**
   * Reads the files, validates they contain questions, and starts a
   * session. Without a preset, shows the setup modal first. With a preset
   * (e.g. "review struggling") the session starts immediately using the
   * preset over the settings defaults.
   */
  async startQuizFlowFromPaths(filePaths, preset) {
    const labels = this.getDifficultyLabels();
    const blocks = [];
    let foundFiles = 0;
    for (const path of filePaths) {
      const abstract = this.app.vault.getAbstractFileByPath(path);
      if (!(abstract instanceof import_obsidian10.TFile)) {
        continue;
      }
      try {
        const content = await this.app.vault.read(abstract);
        const parsed = parseQuestions(content, labels);
        for (const question of parsed.questions) {
          question.sourcePath = path;
        }
        blocks.push(...parsed.questions);
        foundFiles++;
      } catch (e) {
      }
    }
    if (foundFiles === 0) {
      new import_obsidian10.Notice("Could not read the selected file(s).");
      return;
    }
    if (blocks.length === 0) {
      new import_obsidian10.Notice("No questions found in the selected file(s).");
      return;
    }
    if (preset) {
      const config = {
        filePaths,
        shuffle: this.settings.shuffleByDefault,
        statusFilter: "all",
        difficultyFilter: "all",
        masteredPasses: this.settings.masteredPasses,
        headingFilter: void 0,
        ...preset
      };
      void this.openQuizView(config);
      return;
    }
    new SetupModal(this.app, this, filePaths, blocks, (config) => {
      void this.openQuizView(config);
    }).open();
  }
  /**
   * Returns the config for a quiz view that is about to open, in FIFO
   * order. Returns null when the view is restored from a saved layout.
   */
  consumePendingQuizConfig() {
    var _a;
    return (_a = this.pendingQuizConfigs.shift()) != null ? _a : null;
  }
  async openQuizView(config) {
    this.pendingQuizConfigs.push(config);
    try {
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: QUIZ_VIEW_TYPE, active: true });
      void this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      const slot = this.pendingQuizConfigs.indexOf(config);
      if (slot !== -1) {
        this.pendingQuizConfigs.splice(slot, 1);
      }
      console.error("Omniscient: failed to open quiz view", error);
      new import_obsidian10.Notice("Could not open the quiz view. See the developer console for details.");
    }
  }
  async showProgress(file) {
    let content;
    try {
      content = await this.app.vault.read(file);
    } catch (e) {
      new import_obsidian10.Notice("Could not read the selected file.");
      return;
    }
    const questions = parseQuestions(content, this.getDifficultyLabels()).questions;
    if (questions.length === 0) {
      new import_obsidian10.Notice(`No questions found in ${file.basename}.`);
      return;
    }
    const summary = summarizeBlocks(questions, this.settings.masteredPasses);
    new ProgressModal(this.app, file.basename, summary).open();
  }
  showProgressCommand(checking) {
    if (checking) {
      return true;
    }
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      new import_obsidian10.Notice("Open a Markdown file first, then run this command.");
      return true;
    }
    void this.showProgress(file);
    return true;
  }
  async pickQuizFile() {
    const files = this.app.vault.getMarkdownFiles();
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await this.app.vault.cachedRead(file);
          return HAS_QUESTIONS_RE.test(content) ? file : null;
        } catch (e) {
          return null;
        }
      })
    );
    const matches = results.filter((file) => file !== null);
    if (matches.length === 0) {
      new import_obsidian10.Notice(
        "No quiz files found in the vault. Use the usage guide to create a sample quiz file."
      );
      return;
    }
    new QuizFilePicker(this.app, this, matches).open();
  }
  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------
  async loadPersisted() {
    const data = await this.loadData();
    this.settings = this.normalizeSettings(data != null ? data : {});
  }
  /**
   * Validates persisted settings field by field so a corrupted data.json
   * (wrong types, missing keys) degrades to defaults instead of crashing
   * or producing nonsense filters.
   */
  normalizeSettings(raw) {
    const difficultyLabels = typeof raw.difficultyLabels === "string" && raw.difficultyLabels.trim().length > 0 ? raw.difficultyLabels : DEFAULT_SETTINGS.difficultyLabels;
    const masteredPasses = typeof raw.masteredPasses === "number" && Number.isFinite(raw.masteredPasses) && raw.masteredPasses >= 1 ? Math.floor(raw.masteredPasses) : DEFAULT_SETTINGS.masteredPasses;
    const shuffleByDefault = typeof raw.shuffleByDefault === "boolean" ? raw.shuffleByDefault : DEFAULT_SETTINGS.shuffleByDefault;
    const history = Array.isArray(raw.history) ? raw.history.filter(isValidSessionRecord) : [];
    const guideSeen = typeof raw.guideSeen === "boolean" ? raw.guideSeen : DEFAULT_SETTINGS.guideSeen;
    return {
      difficultyLabels,
      masteredPasses,
      shuffleByDefault,
      history,
      guideSeen
    };
  }
  async recordSession(record) {
    this.settings.history.unshift(record);
    this.settings.history = this.settings.history.slice(0, 100);
    await this.persistSettings();
  }
  async clearHistory() {
    this.settings.history = [];
    await this.persistSettings();
  }
  /**
   * Serializes settings writes through one promise chain so concurrent
   * sessions (or a session finishing while history is cleared) cannot
   * interleave saves and leave data.json in the wrong state.
   */
  persistSettings() {
    this.saveQueue = this.saveQueue.then(() => this.saveData(this.settings));
    return this.saveQueue;
  }
};
function isValidSessionRecord(entry) {
  if (typeof entry !== "object" || entry === null) {
    return false;
  }
  const r = entry;
  return typeof r.date === "string" && typeof r.filePath === "string" && typeof r.total === "number" && Number.isFinite(r.total) && typeof r.answered === "number" && Number.isFinite(r.answered) && typeof r.mastered === "number" && Number.isFinite(r.mastered) && typeof r.almost === "number" && Number.isFinite(r.almost) && typeof r.struggling === "number" && Number.isFinite(r.struggling);
}
