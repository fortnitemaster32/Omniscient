# Omniscient

Quiz-and-recall study sessions for Obsidian, inspired by the **quiz-and-recall method** and **mega-problem sets** from *How to Be a Straight-A Student* by Cal Newport.

Keep all of your practice questions for a subject in one markdown file (or a folder of them). Omniscient turns them into fast, keyboard-driven testing sessions: the question is shown, the answer stays hidden until you reveal it, and you grade yourself honestly. Every grade is written back to the file, so your notes *are* the progress tracker.

> https://community.obsidian.md/plugins/omniscient

## Requirements

- Obsidian **1.13.0 or later** (uses the declarative settings API)

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Installing

Once listed, Omniscient installs from the community plugin browser. For a manual install, download `omniscient-<version>.zip` from the latest release, extract it, and copy the `omniscient` folder into `<your vault>/.obsidian/plugins/`. Then enable the plugin in Settings → Community plugins and reload Obsidian.

## How it works

The quiz-and-recall method works like this: answer from memory (never passively re-read), mark what you missed, review only those, and repeat until you complete a pass with no mistakes. Omniscient encodes exactly that loop:

1. **Run a session** on any file with `> [!Question]` callout blocks.
2. **Answer from memory**: the answer is hidden until you ask for it.
3. **Reveal the answer**, then self-grade: `Struggling`, `Almost`, or `Mastered`.
4. **Repeat with only the gaps**: the "Not mastered yet" filter gives you the next pass; keep going until you finish a session with nothing left to review.

## Question format

Any markdown file containing blockquote question/answer pairs. The callout style is recommended so Obsidian renders the blocks as nice foldable callouts. The literal word `Question` after the callout is the title shown in Obsidian; metadata follows after the pipes:

```markdown
## Calculus

> [!Question] Question | Hard | Mastered(2)

What is the maximum of this function?

$$
f(x) = x^{2} + 3 + \int_{0}^{x} x + 3 \, dx
$$

> [!Success] Answer

The answer is...

---

> [!Question] Question | Medium | Almost

Explain what a derivative is and how to compute one.

> [!Success] Answer

The derivative describes the rate of change...
```

- A question starts at `> [!Question]` (the title word and metadata are optional: `> [!Question]` alone works, and plain `> Question` is also recognized); everything until the next answer block is the question, everything after is the answer. Answer blocks use `> [!Success]` (renders as Obsidian's green callout; `[!answer]` is accepted as an alias).
- LaTeX (`$$...$$`), code blocks, and nested callouts inside questions and answers are rendered normally.
- Questions without an answer are fine. The reveal will say so.
- One file can hold any number of questions; use headings to organize by topic.
- For multi-file subjects, a folder of question files is treated as one big mega-problem set (see "Start quiz from folder").
- A complete example quiz lives in `examples/calculus-quiz.md`.

### Status metadata

Status is stored **on the question line**, so progress is visible in the file itself:

| Token | Meaning |
| --- | --- |
| *(none)* | New, never graded |
| `Struggling` | Missed it last pass |
| `Almost` | Got it, but shaky |
| `Mastered(2)` | Answered correctly; the number is **consecutive** mastered passes |

Grading rules:

- `Mastered` increments the counter (`Mastered(1)`, `Mastered(2)`, ...). The counter resets if you ever grade it anything else.
- A question is **exam-ready** when its counter reaches the "Mastered passes" setting (default: 2).
- `Almost` and `Struggling` are also tracked, so "review only the gaps" is always one click away.
- **Undo** restores the previous status and counter, both in the session and in the file.

### Difficulty metadata

Difficulty is optional and configurable in settings (defaults: `Easy, Medium, Hard`):

```markdown
> [!Question] Question | Hard

...
```

Metadata tokens are read from the **end of the line** and rewritten in canonical order (`Difficulty | Status`). Anything unrecognized in the middle of the line is preserved verbatim, so prose like `> Question: explain X` keeps working.

## Usage

Commands (assign hotkeys in Settings → Hotkeys if you want them):

| Command | What it does |
| --- | --- |
| **Start quiz** | Runs a session on the active file |
| **Choose quiz file** | Picks any file in the vault that contains questions |
| **Start quiz from folder** | Runs one session over every Markdown file in a folder (and its subfolders), the mega-problem set across chapters |
| **Show quiz progress** | Opens a per-file summary: exam-ready, mastered, almost, struggling, new, and counts by difficulty |

There is also a **ribbon icon** (a target) in the left sidebar that starts a quiz with one click, or lets you pick a file when no file is active.

The setup dialog lets you:

- Filter by status: all / new / struggling / almost there / not mastered yet / mastered
- Filter by difficulty
- Toggle shuffling (on by default; never memorize order, only material)
- See the question count, file count, and how many are exam-ready before you start

### In-session keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` / `Enter` | Reveal the answer |
| `1` | Grade: struggling |
| `2` | Grade: almost |
| `3` | Grade: mastered |
| `S` | Skip; requeues the question at the end, ungraded |
| `U` | Undo the last grade (also restores the status in the file) |
| `Esc` | End the session |

Every grade is saved to the file immediately. If you edit the file during a session, the plugin detects it and skips writing to questions that changed. Nothing gets corrupted.

### Finishing early is normal

Ending a session before all questions are answered is a first-class flow, not an error: hit `Esc` or the **End session** button whenever you run out of time. The summary shows how many questions remain unanswered, and those questions keep their current status. Nothing is penalized. The session history counts only what you actually answered.

### Session history

Every finished session is recorded (date, file, counts), including partial ones. The settings tab shows a summary and your totals, so you can watch the mastered percentage climb over time.

## Troubleshooting

**The quiz view closes immediately or nothing happens when starting a session.**

1. Reload Obsidian (**Ctrl+R**) after installing or updating the plugin.
2. Make sure the active file is a Markdown file with at least one `> [!Question]` block.
3. Check the developer console for a red error starting with `Omniscient:`; any failure is reported there and as a notice.

**A grade did not change the file.**

The plugin writes statuses only to questions it can still find unchanged. If you edited a question's text or header during a session, that question is skipped (and counted in the summary) so your edits are never corrupted. Grade it again in the next session.

**Questions are missing from a session.**

Check the status filter and difficulty filter in the setup dialog, and that the file uses the format above. Lines indented 4+ spaces are treated as code, and question-like lines inside fenced code blocks are body text.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Difficulty labels | `Easy, Medium, Hard` | Comma-separated; recognized on question lines |
| Mastered passes | `2` | Consecutive mastered answers to be exam-ready |
| Shuffle questions | on | Randomize order at session start |

## Suggesting features

Have an idea for Omniscient? Open an issue on GitHub and describe what you would like it to do. Suggestions grounded in a credible source, such as peer-reviewed research or a popular book on studying, memory, or learning, tend to be considered faster: this plugin is itself built on the method from *How to Be a Straight-A Student*, and a source helps show that a feature genuinely supports the study technique rather than being a gimmick. A source is not required, but it does help.

## License

Licensed under the MIT license. See [LICENSE](LICENSE).

## Disclaimer

This plugin was built with the assistance of an AI coding agent.
