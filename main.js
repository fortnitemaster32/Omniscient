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
var import_obsidian6 = require("obsidian");

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
    void this.plugin.startQuizFlow(item, "practice");
  }
};

// src/parser.ts
var STATUS_CANONICAL = {
  struggling: "Struggling",
  almost: "Almost",
  mastered: "Mastered"
};
var STATUS_RE = /^(struggling|almost|mastered)\s*(?:\(\s*(\d+)\s*\))?$/i;
var HAS_QUESTIONS_RE = /^>\s*(?:\[!\s*)?question\b/im;
var CALLOUT_RE = /^(\s*>\s*)\[!([^\]]*)\]([^\n]*)$/i;
var PLAIN_RE = /^(\s*>\s*)(question|answer)\b([^\n]*)$/i;
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
    const kind2 = type.startsWith("question") ? "question" : type.startsWith("answer") ? "answer" : null;
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
function stripQuotePrefix(line) {
  const m = /^\s*>\s?/.exec(line);
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
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim().length === 0) {
    start++;
  }
  while (end > start && lines[end - 1].trim().length === 0) {
    end--;
  }
  return lines.slice(start, end).join("\n");
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
      passes = st === "Mastered" ? n != null ? n : 1 : 0;
    } else if (st === null && difficulty === void 0) {
      const d = isDifficultyToken(token, difficultyLabels);
      if (d !== null) {
        difficulty = d;
      }
    }
  }
  return { difficulty, status, passes };
}
function parseQuestions(content, difficultyLabels) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const questions = [];
  let current = null;
  let collectingQuestion = false;
  let body = [];
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
    const header = parseHeader(lines[i], difficultyLabels);
    if (header === null) {
      if (current !== null) {
        body.push(stripQuotePrefix(lines[i]));
      }
      continue;
    }
    if (header.kind === "question") {
      if (current !== null) {
        finalizeBody();
      }
      const meta = extractMetadata(header.tokens, difficultyLabels);
      current = {
        id: `q${questions.length}-${lines[i].trim()}`,
        headerIndex: i,
        headerLine: lines[i],
        stem: header.lineStem,
        questionBody: "",
        answerBody: "",
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
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const h = parseHeader(lines[i], difficultyLabels);
    if (h !== null) {
      break;
    }
    body.push(stripQuotePrefix(lines[i]));
  }
  return hashString(assembleBody(body));
}
function patchQuestionHeader(content, block, newLine, difficultyLabels) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const needle = block.headerLine.trim();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== needle) {
      continue;
    }
    if (bodyHashAt(lines, i, difficultyLabels) !== block.bodyHash) {
      continue;
    }
    lines[i] = newLine;
    return lines.join(eol);
  }
  return content;
}

// src/quizView.ts
var import_obsidian3 = require("obsidian");

// src/session.ts
function matchesFilter(block, config) {
  var _a;
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
    this.startedAt = Date.now();
    this.cursor = 0;
    const filtered = blocks.filter((b) => matchesFilter(b, config));
    this.items = filtered.map((block) => ({ block, grade: null }));
    if (config.shuffle) {
      shuffle(this.items);
    }
    this.total = this.items.length;
  }
  get current() {
    var _a;
    return (_a = this.items[this.cursor]) != null ? _a : null;
  }
  get isComplete() {
    return this.cursor >= this.items.length;
  }
  get counts() {
    const counts = {
      answered: 0,
      mastered: 0,
      almost: 0,
      struggling: 0
    };
    for (const item of this.items) {
      if (item.grade === null) {
        continue;
      }
      counts.answered++;
      if (item.grade === "Mastered") {
        counts.mastered++;
      } else if (item.grade === "Almost") {
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
  gradeCurrent(grade) {
    const item = this.current;
    if (item === null) {
      return null;
    }
    item.grade = grade;
    const block = item.block;
    if (grade === "Mastered") {
      block.passes = block.status === "Mastered" ? block.passes + 1 : 1;
      block.status = "Mastered";
    } else {
      block.status = grade;
      block.passes = 0;
    }
    this.cursor++;
    return item;
  }
};

// src/summaryModal.ts
var import_obsidian2 = require("obsidian");
function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
var SummaryModal = class extends import_obsidian2.Modal {
  constructor(app, options) {
    super(app);
    this.options = options;
  }
  onOpen() {
    const { contentEl } = this;
    const { counts, total, mode } = this.options;
    this.setTitle(
      mode === "timed" ? "Mock exam complete" : "Session complete"
    );
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
    cell("Time", formatTime(this.options.timeSec));
    if (this.options.failedWrites > 0) {
      contentEl.createDiv({
        cls: "omniscient-summary-note",
        text: `${this.options.failedWrites} question(s) could not be saved because the file changed during the session.`
      });
    }
    new import_obsidian2.Setting(contentEl).addButton((button) => {
      button.setButtonText("Done").onClick(() => {
        this.close();
        this.options.onDone();
      });
    });
    if (counts.struggling > 0) {
      new import_obsidian2.Setting(contentEl).addButton((button) => {
        button.setButtonText("Review struggling questions").setCta().onClick(() => {
          this.close();
          this.options.onReviewStruggling();
        });
      });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/quizView.ts
var QUIZ_VIEW_TYPE = "omniscient-quiz-view";
function formatTime2(total) {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
var QuizView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.config = null;
    this.session = null;
    this.file = null;
    this.revealed = false;
    this.finished = false;
    this.failedWrites = 0;
    this.writeQueue = Promise.resolve();
    this.timerHandle = null;
    this.timeLeftSec = 0;
    this.startedAt = Date.now();
    // ------------------------------------------------------------------
    // View element references (assigned in renderShell)
    // ------------------------------------------------------------------
    this.contentArea = null;
    this.hintEl = null;
    this.timerEl = null;
    this.progressTextEl = null;
    this.progressFillEl = null;
  }
  getViewType() {
    return QUIZ_VIEW_TYPE;
  }
  getDisplayText() {
    var _a, _b;
    return `Omniscient \u2014 ${(_b = (_a = this.file) == null ? void 0 : _a.basename) != null ? _b : "quiz"}`;
  }
  getIcon() {
    return "target";
  }
  async onOpen() {
    var _a;
    const state = this.getState();
    const config = state == null ? void 0 : state.config;
    if (!config) {
      this.leaf.detach();
      return;
    }
    this.config = config;
    const abstract = this.app.vault.getAbstractFileByPath(config.filePath);
    if (!(abstract instanceof import_obsidian3.TFile)) {
      new import_obsidian3.Notice("The quiz file no longer exists.");
      this.leaf.detach();
      return;
    }
    this.file = abstract;
    try {
      const content = await this.app.vault.read(this.file);
      const { questions } = parseQuestions(content, this.plugin.getDifficultyLabels());
      this.session = new QuizSession(questions, config);
    } catch (e) {
      new import_obsidian3.Notice("Could not read the quiz file.");
      this.leaf.detach();
      return;
    }
    if (this.session.total === 0) {
      new import_obsidian3.Notice("No questions match the selected filters.");
      this.leaf.detach();
      return;
    }
    this.renderShell();
    this.registerDomEvent(
      this.containerEl,
      "keydown",
      (event) => this.handleKeydown(event)
    );
    if (this.config.mode === "timed") {
      this.timeLeftSec = Math.max(
        60,
        Math.round(this.config.minutesPerQuestion * this.session.total * 60)
      );
      this.updateTimer();
      const win = (_a = this.containerEl.ownerDocument.defaultView) != null ? _a : window;
      this.timerHandle = win.setInterval(() => this.tick(), 1e3);
    }
    this.renderQuestion();
    this.containerEl.focus();
  }
  onClose() {
    var _a;
    const win = (_a = this.containerEl.ownerDocument.defaultView) != null ? _a : window;
    if (this.timerHandle !== null) {
      win.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    return Promise.resolve();
  }
  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  renderShell() {
    var _a, _b, _c, _d;
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
      text: (_b = (_a = this.file) == null ? void 0 : _a.basename) != null ? _b : "Quiz"
    });
    header.createDiv({
      cls: "omniscient-quiz-mode",
      text: ((_c = this.config) == null ? void 0 : _c.mode) === "timed" ? "Timed mock exam" : "Practice"
    });
    if (((_d = this.config) == null ? void 0 : _d.mode) === "timed") {
      this.timerEl = header.createDiv({ cls: "omniscient-timer" });
    }
    header.createDiv({ cls: "omniscient-quiz-spacer" });
    this.progressTextEl = header.createDiv({ cls: "omniscient-progress-text" });
    const endButton = header.createEl("button", {
      cls: "clickable-icon",
      attr: { "aria-label": "End session", "data-tooltip-position": "top" }
    });
    endButton.setText("End session");
    endButton.addEventListener("click", () => this.endSession());
    const bar = contentEl.createDiv({ cls: "omniscient-progress-bar" });
    this.progressFillEl = bar.createDiv({ cls: "omniscient-progress-bar-fill" });
    this.contentArea = contentEl.createDiv({ cls: "omniscient-content" });
    this.hintEl = contentEl.createDiv({ cls: "omniscient-hint" });
    this.hintEl.setText(
      "Space or enter reveals the answer \xB7 1 struggling \xB7 2 almost \xB7 3 mastered \xB7 esc ends"
    );
  }
  renderQuestion() {
    var _a, _b, _c, _d, _e;
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
    const meta = (_a = item.block.difficulty) != null ? _a : "";
    const status = item.block.status ? item.block.status === "Mastered" ? `Mastered(${item.block.passes})` : item.block.status : "New";
    const metaText = meta.length > 0 ? `Difficulty: ${meta} \xB7 Status: ${status}` : `Status: ${status}`;
    const card = area.createDiv({ cls: "omniscient-question-card" });
    card.createDiv({ cls: "omniscient-question-meta", text: metaText });
    void import_obsidian3.MarkdownRenderer.render(
      this.app,
      item.block.questionBody,
      card,
      (_c = (_b = this.file) == null ? void 0 : _b.path) != null ? _c : "",
      this
    );
    if (!this.revealed) {
      const actions = area.createDiv({ cls: "omniscient-actions" });
      const reveal = actions.createEl("button", {
        cls: "mod-cta",
        text: "Reveal answer",
        attr: { "aria-label": "Reveal the answer" }
      });
      reveal.addEventListener("click", () => this.reveal());
    } else {
      const answerCard = area.createDiv({ cls: "omniscient-answer-card" });
      answerCard.createDiv({ cls: "omniscient-answer-label", text: "Answer" });
      if (item.block.answerBody.length > 0) {
        void import_obsidian3.MarkdownRenderer.render(
          this.app,
          item.block.answerBody,
          answerCard,
          (_e = (_d = this.file) == null ? void 0 : _d.path) != null ? _e : "",
          this
        );
      } else {
        answerCard.createDiv({
          cls: "omniscient-hint",
          text: "No answer provided for this question."
        });
      }
      const actions = area.createDiv({ cls: "omniscient-actions" });
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
    }
    this.updateProgress();
    this.containerEl.focus();
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
  updateTimer() {
    if (this.timerEl) {
      this.timerEl.setText(formatTime2(this.timeLeftSec));
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
    if (event.key === "1" || event.key === "2" || event.key === "3") {
      event.preventDefault();
      if (this.revealed) {
        const grades = ["Struggling", "Almost", "Mastered"];
        this.grade(grades[Number.parseInt(event.key, 10) - 1]);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.endSession();
    }
  }
  reveal() {
    this.revealed = true;
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
      this.endSession();
      return;
    }
    this.revealed = false;
    this.renderQuestion();
  }
  enqueueWrite(block) {
    const file = this.file;
    if (file === null || this.config === null) {
      return;
    }
    const labels = this.plugin.getDifficultyLabels();
    const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await this.app.vault.process(
          file,
          (content) => patchQuestionHeader(content, block, newLine, labels)
        );
      } catch (error) {
        console.error("Omniscient: failed to save question status", error);
        this.failedWrites++;
      }
    });
  }
  tick() {
    if (this.finished || this.session === null) {
      return;
    }
    this.timeLeftSec--;
    this.updateTimer();
    if (this.timeLeftSec <= 0) {
      while (!this.session.isComplete) {
        const graded = this.session.gradeCurrent("Struggling");
        if (graded === null) {
          break;
        }
        this.enqueueWrite(graded.block);
      }
      this.updateProgress();
      this.endSession();
    }
  }
  endSession() {
    var _a, _b, _c, _d, _e, _f, _g;
    const session = this.session;
    if (session === null || this.finished) {
      return;
    }
    this.finished = true;
    const win = (_a = this.containerEl.ownerDocument.defaultView) != null ? _a : window;
    if (this.timerHandle !== null) {
      win.clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    const counts = session.counts;
    const timeSec = Math.round((Date.now() - this.startedAt) / 1e3);
    void this.plugin.recordSession({
      date: (/* @__PURE__ */ new Date()).toISOString(),
      mode: (_c = (_b = this.config) == null ? void 0 : _b.mode) != null ? _c : "practice",
      filePath: (_e = (_d = this.config) == null ? void 0 : _d.filePath) != null ? _e : "",
      total: session.total,
      answered: counts.answered,
      mastered: counts.mastered,
      almost: counts.almost,
      struggling: counts.struggling,
      timeSec
    });
    const file = this.file;
    const config = this.config;
    new SummaryModal(this.app, {
      mode: (_f = config == null ? void 0 : config.mode) != null ? _f : "practice",
      fileBasename: (_g = file == null ? void 0 : file.basename) != null ? _g : "Quiz",
      counts,
      total: session.total,
      timeSec,
      failedWrites: this.failedWrites,
      onDone: () => {
        this.leaf.detach();
      },
      onReviewStruggling: () => {
        if (file !== null) {
          void this.plugin.startQuizFlow(file, "practice", {
            statusFilter: "struggling"
          });
        }
      }
    }).open();
  }
};

// src/settings.ts
var import_obsidian4 = require("obsidian");
var DEFAULT_SETTINGS = {
  difficultyLabels: "Easy, Medium, Hard",
  masteredPasses: 2,
  shuffleByDefault: true,
  minutesPerQuestion: 2,
  history: []
};
function parseDifficultyLabels(raw) {
  return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}
function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatSessionLine(record) {
  var _a;
  const fileName = (_a = record.filePath.split("/").pop()) != null ? _a : record.filePath;
  const date = record.date.slice(0, 10);
  const mode = record.mode === "timed" ? "timed" : "practice";
  return `${date} \xB7 ${mode} \xB7 ${fileName} \xB7 ${record.mastered}/${record.answered} mastered`;
}
var OmniscientSettingTab = class extends import_obsidian4.PluginSettingTab {
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
        name: "Minutes per question",
        desc: "Time allotted per question in timed mock exams.",
        control: {
          type: "number",
          key: "minutesPerQuestion",
          min: 0.5,
          max: 60,
          step: 0.5
        }
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
            frag.createDiv({
              text: `Total time studied: ${formatSeconds(
                history.reduce((sum, r) => sum + r.timeSec, 0)
              )}`,
              cls: "omniscient-history-total"
            });
          }
          setting.descEl.empty();
          setting.descEl.appendChild(frag);
        }
      },
      {
        name: "Clear session history",
        desc: "Remove all recorded sessions from this device.",
        action: () => {
          void this.plugin.clearHistory();
          new import_obsidian4.Notice("Session history cleared.");
          this.update();
        }
      }
    ];
  }
};

// src/setupModal.ts
var import_obsidian5 = require("obsidian");
var STATUS_OPTIONS = {
  all: "All questions",
  new: "New",
  struggling: "Struggling",
  almost: "Almost there",
  "not-mastered": "Not mastered yet",
  mastered: "Mastered"
};
var SetupModal = class extends import_obsidian5.Modal {
  constructor(app, plugin, filePath, mode, questionCount, onStart) {
    super(app);
    this.plugin = plugin;
    this.filePath = filePath;
    this.mode = mode;
    this.questionCount = questionCount;
    this.onStart = onStart;
    this.statusFilter = "all";
    this.difficultyFilter = "all";
    this.shuffle = plugin.settings.shuffleByDefault;
    this.minutesPerQuestion = plugin.settings.minutesPerQuestion;
    this.difficultyLabels = plugin.getDifficultyLabels();
  }
  onOpen() {
    const { contentEl } = this;
    this.setTitle(this.mode === "timed" ? "Timed mock exam" : "Quiz setup");
    new import_obsidian5.Setting(contentEl).setName("Questions").setDesc(`${this.questionCount} questions in the file`).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(STATUS_OPTIONS)) {
        dropdown.addOption(value, label);
      }
      dropdown.setValue(this.statusFilter).onChange((value) => {
        this.statusFilter = value;
      });
    });
    if (this.difficultyLabels.length > 0) {
      new import_obsidian5.Setting(contentEl).setName("Difficulty").setDesc("Only include questions with this difficulty").addDropdown((dropdown) => {
        dropdown.addOption("all", "All difficulties");
        for (const label of this.difficultyLabels) {
          dropdown.addOption(label, label);
        }
        dropdown.setValue(this.difficultyFilter).onChange((value) => {
          this.difficultyFilter = value;
        });
      });
    }
    new import_obsidian5.Setting(contentEl).setName("Shuffle order").setDesc("Randomize the question order").addToggle((toggle) => {
      toggle.setValue(this.shuffle).onChange((value) => {
        this.shuffle = value;
      });
    });
    if (this.mode === "timed") {
      new import_obsidian5.Setting(contentEl).setName("Minutes per question").setDesc("Total time is this value times the number of questions").addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0.5";
        text.inputEl.step = "0.5";
        text.setValue(String(this.minutesPerQuestion)).onChange((value) => {
          const parsed = Number.parseFloat(value);
          this.minutesPerQuestion = Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
        });
      });
    }
    new import_obsidian5.Setting(contentEl).addButton((button) => {
      button.setButtonText("Start session").setCta().onClick(() => {
        this.close();
        this.onStart({
          filePath: this.filePath,
          mode: this.mode,
          shuffle: this.shuffle,
          statusFilter: this.statusFilter,
          difficultyFilter: this.difficultyFilter,
          minutesPerQuestion: this.minutesPerQuestion,
          masteredPasses: this.plugin.settings.masteredPasses
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/main.ts
var OmniscientPlugin = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
  }
  async onload() {
    await this.loadPersisted();
    this.registerView(QUIZ_VIEW_TYPE, (leaf) => new QuizView(leaf, this));
    this.addSettingTab(new OmniscientSettingTab(this.app, this));
    this.addCommand({
      id: "start-quiz",
      name: "Start quiz",
      checkCallback: (checking) => this.startQuizCommand(checking, "practice")
    });
    this.addCommand({
      id: "start-timed-exam",
      name: "Start timed mock exam",
      checkCallback: (checking) => this.startQuizCommand(checking, "timed")
    });
    this.addCommand({
      id: "choose-quiz-file",
      name: "Choose quiz file",
      callback: () => {
        void this.pickQuizFile();
      }
    });
  }
  getDifficultyLabels() {
    return parseDifficultyLabels(this.settings.difficultyLabels);
  }
  // ------------------------------------------------------------------
  // Commands
  // ------------------------------------------------------------------
  startQuizCommand(checking, mode) {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return false;
    }
    if (!checking) {
      void this.startQuizFlow(file, mode);
    }
    return true;
  }
  /**
   * Reads the file, validates it contains questions, and starts a session.
   *
   * Without a preset, shows the setup modal first. With a preset (e.g.
   * "review struggling") the session starts immediately using the preset
   * over the settings defaults.
   */
  async startQuizFlow(file, mode, preset) {
    let content;
    try {
      content = await this.app.vault.read(file);
    } catch (e) {
      new import_obsidian6.Notice("Could not read the selected file.");
      return;
    }
    const questions = parseQuestions(content, this.getDifficultyLabels()).questions;
    if (questions.length === 0) {
      new import_obsidian6.Notice(`No questions found in ${file.basename}.`);
      return;
    }
    if (preset) {
      const config = {
        filePath: file.path,
        mode,
        shuffle: this.settings.shuffleByDefault,
        statusFilter: "all",
        difficultyFilter: "all",
        minutesPerQuestion: this.settings.minutesPerQuestion,
        masteredPasses: this.settings.masteredPasses,
        ...preset
      };
      void this.openQuizView(file, config);
      return;
    }
    new SetupModal(
      this.app,
      this,
      file.path,
      mode,
      questions.length,
      (config) => {
        void this.openQuizView(file, config);
      }
    ).open();
  }
  async openQuizView(file, config) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: QUIZ_VIEW_TYPE,
      active: true,
      state: { config: Object.assign({}, config, { filePath: file.path }) }
    });
    void this.app.workspace.revealLeaf(leaf);
  }
  async pickQuizFile() {
    const files = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      try {
        const content = await this.app.vault.cachedRead(file);
        if (HAS_QUESTIONS_RE.test(content)) {
          files.push(file);
        }
      } catch (e) {
      }
    }
    if (files.length === 0) {
      new import_obsidian6.Notice("No quiz files found in the vault.");
      return;
    }
    new QuizFilePicker(this.app, this, files).open();
  }
  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------
  async loadPersisted() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data != null ? data : {});
    if (!Array.isArray(this.settings.history)) {
      this.settings.history = [];
    } else {
      this.settings.history = [...this.settings.history];
    }
  }
  async recordSession(record) {
    this.settings.history.unshift(record);
    this.settings.history = this.settings.history.slice(0, 100);
    await this.saveData(this.settings);
  }
  async clearHistory() {
    this.settings.history = [];
    await this.saveData(this.settings);
  }
};
