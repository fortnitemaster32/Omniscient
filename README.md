# Omniscient

Quiz-and-recall study sessions for Obsidian, inspired by the **quiz-and-recall method** and **mega-problem sets** from *How to Be a Straight-A Student* by Cal Newport.

Keep all of your practice questions for a subject in one markdown file. Omniscient turns that file into a fast, keyboard-driven testing session: the question is shown, the answer stays hidden until you reveal it, and you grade yourself honestly. Every grade is written back to the file, so your notes *are* the progress tracker.

## How it works

The quiz-and-recall method works like this: answer from memory (never passively re-read), mark what you missed, review only those, and repeat until you complete a pass with no mistakes. Omniscient encodes exactly that loop:

1. **Run a session** on any file with `> [!Question]` callout blocks.
2. **Answer from memory** — the answer is hidden until you ask for it.
3. **Reveal the answer**, then self-grade: `Struggling`, `Almost`, or `Mastered`.
4. **Repeat with only the gaps** — the "Not mastered yet" filter gives you the next pass; keep going until you finish a session with nothing left to review.

## Question format

Any markdown file containing blockquote question/answer pairs. The callout style is recommended so Obsidian renders the blocks as nice foldable callouts. The literal word `Question` after the callout is the title shown in Obsidian; metadata follows after the pipes:

```markdown
## Calculus

> [!Question] Question | Hard | Mastered(2)

What is the maximum of this function?

$$
f(x) = x^{2} + 3 + \int_{0}^{x} x + 3 \, dx
$$

> [!Answer] Answer

The answer is...

---

> [!Question] Question | Medium | Almost

Explain what a derivative is and how to compute one.

> [!Answer] Answer

The derivative describes the rate of change...
```

- A question starts at `> [!Question]` (the title word and metadata are optional: `> [!Question]` alone works, and plain `> Question` is also recognized); everything until the next answer block is the question, everything after is the answer.
- LaTeX (`$$...$$`), code blocks, and nested callouts inside questions and answers are rendered normally.
- Questions without an answer are fine — the reveal will say so.
- One file can hold any number of questions; use headings to organize by topic.

### Status metadata

Status is stored **on the question line**, so progress is visible in the file itself:

| Token | Meaning |
| --- | --- |
| *(none)* | New — never graded |
| `Struggling` | Missed it last pass |
| `Almost` | Got it, but shaky |
| `Mastered(2)` | Answered correctly — the number is **consecutive** mastered passes |

Grading rules:

- `Mastered` increments the counter (`Mastered(1)`, `Mastered(2)`, ...). The counter resets if you ever grade it anything else.
- A question is **exam-ready** when its counter reaches the "Mastered passes" setting (default: 2).
- `Almost` and `Struggling` are also tracked, so "review only the gaps" is always one click away.

### Difficulty metadata

Difficulty is optional and configurable in settings (defaults: `Easy, Medium, Hard`):

```markdown
> [!Question] Question | Hard

...
```

Metadata tokens are read from the **end of the line** and rewritten in canonical order (`Difficulty | Status`). Anything unrecognized in the middle of the line is preserved verbatim, so prose like `> Question: explain X` keeps working.

## Usage

| Command | What it does |
| --- | --- |
| **Start quiz** | Runs a session on the active file |
| **Choose quiz file** | Picks any file in the vault that contains questions |
| **Start quiz from folder** | Runs one session over every Markdown file in a folder (and its subfolders) — the mega-problem set across chapters |
| **Show quiz progress** | Opens a per-file summary: exam-ready, mastered, almost, struggling, new, and counts by difficulty |

There is also a **🎯 ribbon icon** in the left sidebar that starts a quiz with one click (or lets you pick a file).

The setup dialog lets you:

- Filter by status: all / new / struggling / almost there / not mastered yet / mastered
- Filter by difficulty
- Toggle shuffling (on by default — never memorize order, only material)
- See the question count, file count, and how many are exam-ready before you start

### In-session keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` / `Enter` | Reveal the answer |
| `1` | Grade: struggling |
| `2` | Grade: almost |
| `3` | Grade: mastered |
| `S` | Skip — requeues the question at the end, ungraded |
| `U` | Undo the last grade (also restores the status in the file) |
| `Esc` | End the session |

Every grade is saved to the file immediately. If you edit the file during a session, the plugin detects it and skips writing to questions that changed — nothing gets corrupted.

### Finishing early is normal

Ending a session before all questions are answered is a first-class flow, not an error: hit `Esc` or the **End session** button whenever you run out of time. The summary shows how many questions remain unanswered, and those questions keep their current status — nothing is penalized. The session history counts only what you actually answered.

### Session history

Every finished session is recorded (date, file, counts). The settings tab shows a summary and your totals — you can watch the mastered percentage climb over time.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Difficulty labels | `Easy, Medium, Hard` | Comma-separated; recognized on question lines |
| Mastered passes | `2` | Consecutive mastered answers to be exam-ready |
| Shuffle questions | on | Randomize order at session start |

## Development

```bash
npm install
npm run dev      # watch mode build
npm run build    # production build (main.js)
npm test         # parser + session unit tests
npm run lint     # eslint (obsidianmd ruleset)
```

The parser (`src/parser.ts`) and session engine (`src/session.ts`) are pure TypeScript with no Obsidian dependencies and are covered by unit tests in `tests/`.

## License

MIT — see [LICENSE](LICENSE).
