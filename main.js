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
var import_obsidian8 = require("obsidian");

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
        sourcePath: "",
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

// src/progressModal.ts
var import_obsidian3 = require("obsidian");
var ProgressModal = class extends import_obsidian3.Modal {
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
    new import_obsidian3.Setting(contentEl).addButton((button) => {
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
var import_obsidian5 = require("obsidian");

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
var import_obsidian4 = require("obsidian");
var SummaryModal = class extends import_obsidian4.Modal {
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
        text: `${this.options.failedWrites} question(s) could not be saved because the file changed during the session.`
      });
    }
    new import_obsidian4.Setting(contentEl).addButton((button) => {
      button.setButtonText("Done").onClick(() => {
        this.close();
        this.options.onDone();
      });
    });
    if (counts.struggling > 0) {
      new import_obsidian4.Setting(contentEl).addButton((button) => {
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
var QuizView = class extends import_obsidian5.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.config = null;
    this.session = null;
    this.revealed = false;
    this.finished = false;
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
  }
  getViewType() {
    return QUIZ_VIEW_TYPE;
  }
  getDisplayText() {
    return `Omniscient \u2014 ${this.displayName()}`;
  }
  getIcon() {
    return "target";
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
      new import_obsidian5.Notice("Could not open the quiz view. See the developer console for details.");
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
      if (!(abstract instanceof import_obsidian5.TFile)) {
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
      new import_obsidian5.Notice("The quiz file(s) no longer exist.");
      this.leaf.detach();
      return;
    }
    this.session = new QuizSession(blocks, config);
    if (this.session.total === 0) {
      new import_obsidian5.Notice("No questions match the selected filters.");
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
    this.containerEl.focus();
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
    endButton.addEventListener("click", () => this.endSession());
    const bar = contentEl.createDiv({ cls: "omniscient-progress-bar" });
    this.progressFillEl = bar.createDiv({ cls: "omniscient-progress-bar-fill" });
    this.contentArea = contentEl.createDiv({ cls: "omniscient-content" });
    this.hintEl = contentEl.createDiv({ cls: "omniscient-hint" });
    this.hintEl.setText(
      "Space or enter reveals \xB7 1 struggling \xB7 2 almost \xB7 3 mastered \xB7 s skip \xB7 u undo \xB7 esc ends"
    );
  }
  renderQuestion() {
    var _a;
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
    if (this.undoButtonEl) {
      this.undoButtonEl.disabled = !session.hasUndo;
    }
    const meta = (_a = item.block.difficulty) != null ? _a : "";
    const status = item.block.status ? item.block.status === "Mastered" ? `Mastered(${item.block.passes})` : item.block.status : "New";
    const metaText = meta.length > 0 ? `Difficulty: ${meta} \xB7 Status: ${status}` : `Status: ${status}`;
    const card = area.createDiv({ cls: "omniscient-question-card" });
    card.createDiv({ cls: "omniscient-question-meta", text: metaText });
    void import_obsidian5.MarkdownRenderer.render(
      this.app,
      item.block.questionBody,
      card,
      item.block.sourcePath,
      this
    );
    const actions = area.createDiv({ cls: "omniscient-actions" });
    if (!this.revealed) {
      const reveal = actions.createEl("button", {
        cls: "mod-cta",
        text: "Reveal answer",
        attr: { "aria-label": "Reveal the answer" }
      });
      reveal.addEventListener("click", () => this.reveal());
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
        void import_obsidian5.MarkdownRenderer.render(
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
      const skip = actions.createEl("button", {
        cls: "omniscient-grade-btn",
        text: "Skip",
        attr: { "aria-label": "Skip this question for now" }
      });
      skip.addEventListener("click", () => this.skip());
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
      this.endSession();
    }
  }
  reveal() {
    this.revealed = true;
    this.renderQuestion();
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
      this.endSession();
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
    if (!(abstract instanceof import_obsidian5.TFile)) {
      return;
    }
    const labels = this.plugin.getDifficultyLabels();
    const newLine = serializeHeader(block.stem, block.difficulty, block.status, block.passes);
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        await this.app.vault.process(
          abstract,
          (content) => patchQuestionHeader(content, block, newLine, labels)
        );
      } catch (error) {
        console.error("Omniscient: failed to save question status", error);
        this.failedWrites++;
      }
    });
  }
  endSession() {
    var _a, _b, _c;
    const session = this.session;
    if (session === null || this.finished) {
      return;
    }
    this.finished = true;
    const counts = session.counts;
    void this.plugin.recordSession({
      date: (/* @__PURE__ */ new Date()).toISOString(),
      filePath: (_b = (_a = this.config) == null ? void 0 : _a.filePaths.join(", ")) != null ? _b : "",
      total: session.total,
      answered: counts.answered,
      mastered: counts.mastered,
      almost: counts.almost,
      struggling: counts.struggling
    });
    const filePaths = (_c = this.config) == null ? void 0 : _c.filePaths;
    new SummaryModal(this.app, {
      fileBasename: this.displayName(),
      counts,
      total: session.total,
      failedWrites: this.failedWrites,
      onDone: () => {
        this.leaf.detach();
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
var import_obsidian6 = require("obsidian");
var DEFAULT_SETTINGS = {
  difficultyLabels: "Easy, Medium, Hard",
  masteredPasses: 2,
  shuffleByDefault: true,
  history: []
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
var OmniscientSettingTab = class extends import_obsidian6.PluginSettingTab {
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
        name: "Clear session history",
        desc: "Remove all recorded sessions from this device.",
        action: () => {
          void this.plugin.clearHistory();
          new import_obsidian6.Notice("Session history cleared.");
          this.update();
        }
      }
    ];
  }
};

// src/setupModal.ts
var import_obsidian7 = require("obsidian");
var STATUS_OPTIONS = {
  all: "All questions",
  new: "New",
  struggling: "Struggling",
  almost: "Almost there",
  "not-mastered": "Not mastered yet",
  mastered: "Mastered"
};
var SetupModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, filePaths, questionCount, fileCount, examReady, onStart) {
    super(app);
    this.plugin = plugin;
    this.filePaths = filePaths;
    this.questionCount = questionCount;
    this.fileCount = fileCount;
    this.examReady = examReady;
    this.onStart = onStart;
    this.statusFilter = "all";
    this.difficultyFilter = "all";
    this.shuffle = plugin.settings.shuffleByDefault;
    this.difficultyLabels = plugin.getDifficultyLabels();
  }
  onOpen() {
    try {
      this.render();
    } catch (error) {
      console.error("Omniscient: failed to render setup dialog", error);
      new import_obsidian7.Notice("Omniscient setup failed. See the developer console for details.");
      this.close();
    }
  }
  render() {
    const { contentEl } = this;
    this.setTitle("Quiz setup");
    new import_obsidian7.Setting(contentEl).setName("Questions").setDesc(
      `${this.questionCount} questions${this.fileCount > 1 ? ` across ${this.fileCount} files` : ""} \xB7 ${this.examReady} exam-ready`
    ).addDropdown((dropdown) => {
      for (const [value, label] of Object.entries(STATUS_OPTIONS)) {
        dropdown.addOption(value, label);
      }
      dropdown.setValue(this.statusFilter).onChange((value) => {
        this.statusFilter = value;
      });
    });
    if (this.difficultyLabels.length > 0) {
      new import_obsidian7.Setting(contentEl).setName("Difficulty").setDesc("Only include questions with this difficulty").addDropdown((dropdown) => {
        dropdown.addOption("all", "All difficulties");
        for (const label of this.difficultyLabels) {
          dropdown.addOption(label, label);
        }
        dropdown.setValue(this.difficultyFilter).onChange((value) => {
          this.difficultyFilter = value;
        });
      });
    }
    new import_obsidian7.Setting(contentEl).setName("Shuffle order").setDesc("Randomize the question order").addToggle((toggle) => {
      toggle.setValue(this.shuffle).onChange((value) => {
        this.shuffle = value;
      });
    });
    new import_obsidian7.Setting(contentEl).addButton((button) => {
      button.setButtonText("Start session").setCta().onClick(() => {
        this.close();
        this.onStart({
          filePaths: this.filePaths,
          shuffle: this.shuffle,
          statusFilter: this.statusFilter,
          difficultyFilter: this.difficultyFilter,
          masteredPasses: this.plugin.settings.masteredPasses
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

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

// src/main.ts
var OmniscientPlugin = class extends import_obsidian8.Plugin {
  constructor() {
    super(...arguments);
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
    /**
     * Config handed to the next quiz view that opens. View state is only
     * available after onOpen() in Obsidian, so the config is passed through
     * the plugin instead of view state.
     */
    this.pendingQuizConfig = null;
  }
  async onload() {
    try {
      await this.loadPersisted();
      this.registerView(QUIZ_VIEW_TYPE, (leaf) => new QuizView(leaf, this));
      this.addSettingTab(new OmniscientSettingTab(this.app, this));
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
      this.addRibbonIcon("target", "Start quiz", () => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === "md") {
          void this.startQuizFlow(file);
        } else {
          void this.pickQuizFile();
        }
      });
    } catch (error) {
      console.error("Omniscient: failed to load", error);
      new import_obsidian8.Notice("Omniscient failed to load. See the developer console for details.");
    }
  }
  getDifficultyLabels() {
    return parseDifficultyLabels(this.settings.difficultyLabels);
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
      new import_obsidian8.Notice("Open a Markdown file first, then run this command.");
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
    const prefix = `${folder.path}/`;
    const paths = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix)).map((file) => file.path);
    if (paths.length === 0) {
      new import_obsidian8.Notice("No Markdown files in this folder.");
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
      if (!(abstract instanceof import_obsidian8.TFile)) {
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
      new import_obsidian8.Notice("Could not read the selected file(s).");
      return;
    }
    if (blocks.length === 0) {
      new import_obsidian8.Notice("No questions found in the selected file(s).");
      return;
    }
    if (preset) {
      const config = {
        filePaths,
        shuffle: this.settings.shuffleByDefault,
        statusFilter: "all",
        difficultyFilter: "all",
        masteredPasses: this.settings.masteredPasses,
        ...preset
      };
      void this.openQuizView(config);
      return;
    }
    const summary = summarizeBlocks(blocks, this.settings.masteredPasses);
    new SetupModal(
      this.app,
      this,
      filePaths,
      blocks.length,
      foundFiles,
      summary.examReady,
      (config) => {
        void this.openQuizView(config);
      }
    ).open();
  }
  /**
   * Returns the config for a quiz view that is about to open, and clears
   * the slot. Returns null when the view is restored from a saved layout.
   */
  consumePendingQuizConfig() {
    const config = this.pendingQuizConfig;
    this.pendingQuizConfig = null;
    return config;
  }
  async openQuizView(config) {
    try {
      this.pendingQuizConfig = config;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.setViewState({ type: QUIZ_VIEW_TYPE, active: true });
      void this.app.workspace.revealLeaf(leaf);
    } catch (error) {
      this.pendingQuizConfig = null;
      console.error("Omniscient: failed to open quiz view", error);
      new import_obsidian8.Notice("Could not open the quiz view. See the developer console for details.");
    }
  }
  async showProgress(file) {
    let content;
    try {
      content = await this.app.vault.read(file);
    } catch (e) {
      new import_obsidian8.Notice("Could not read the selected file.");
      return;
    }
    const questions = parseQuestions(content, this.getDifficultyLabels()).questions;
    if (questions.length === 0) {
      new import_obsidian8.Notice(`No questions found in ${file.basename}.`);
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
      new import_obsidian8.Notice("Open a Markdown file first, then run this command.");
      return true;
    }
    void this.showProgress(file);
    return true;
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
      new import_obsidian8.Notice("No quiz files found in the vault.");
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
