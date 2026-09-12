# Omniscient

Quiz-and-recall study sessions for Obsidian, inspired by the **quiz-and-recall method** and **mega-problem sets** from *How to Be a Straight-A Student* by Cal Newport.

Keep your practice questions in one markdown file (or a folder of them). Omniscient turns them into fast, keyboard-driven sessions: the question is shown, the answer stays hidden until you reveal it, and you grade yourself honestly. Every grade is written back to the file, so your notes *are* the progress tracker.

If Omniscient is useful to you, please [star it on GitHub](https://github.com/fortnitemaster32/Omniscient).

## Install

- **Community browser:** search for Omniscient, or use the [plugin page](https://community.obsidian.md/plugins/omniscient), in Settings → Community plugins → Browse.
- **Manual:** download `omniscient-<version>.zip` from the [latest release](https://github.com/fortnitemaster32/Omniscient/releases/latest), extract it, copy the `omniscient` folder into `<your vault>/.obsidian/plugins/`, then enable the plugin and reload Obsidian.

Requires Obsidian **1.13.0 or later** (declarative settings). See [CHANGELOG.md](CHANGELOG.md) for release history.

## How it works

Answer from memory (never passively re-read), mark what you missed, review only those, and repeat until a full pass has no mistakes:

1. **Run a session** on any file with `> [!Question]` callout blocks.
2. **Answer from memory**: the answer stays hidden until you ask for it.
3. **Reveal the answer, then self-grade:** `Struggling`, `Almost`, or `Mastered`.
4. **Repeat with only the gaps:** the **Not mastered yet** filter gives you the next pass until everything is exam-ready.

## Question format

Any markdown file with blockquote question/answer pairs:

```markdown
## Calculus

> [!Question] Question | Hard | Mastered(2)

What is the maximum of this function?

> [!Success] Answer

The answer is...

> [!Hint]
> Optional note about what you missed last time.

> [!Question] Question | Medium | Almost

Explain what a derivative is.

> [!Success] Answer

The derivative describes the rate of change...
```

- A question starts at `> [!Question]`; everything until the next answer block is the question. `> [!Success]` (or `[!answer]`) starts the answer. Plain `> Question` and `> Answer` also work, and the title word and metadata are optional.
- LaTeX, code blocks, and nested callouts render normally. Questions without an answer are fine.
- Headings group questions into sections you can filter by, and a folder of files works as one mega-problem set. A complete example lives in [`examples/calculus-quiz.md`](examples/calculus-quiz.md).

### Status and difficulty

Status is stored **on the question line**, so progress is visible in the file itself:

| Token | Meaning |
| --- | --- |
| *(none)* | New, never graded |
| `Struggling` | Missed it last pass |
| `Almost` | Got it, but shaky |
| `Mastered(2)` | Answered correctly; the number counts **consecutive** mastered passes |

`Mastered` increments the counter, and the counter resets if you grade anything else. A question is **exam-ready** when the counter reaches the **Mastered passes** setting (default 2). **Undo** restores the previous status in the session and in the file.

Difficulty is optional and configurable (defaults to `Easy, Medium, Hard`): `> [!Question] Question | Hard`. Metadata is read from the end of the line and rewritten in canonical order (`Difficulty | Status`); unrecognized prose in the middle is preserved.

### Hints

A hint is a note attached to one question, added from the session with **Add hint** or `N` and stored as a `> [!Hint]` callout after the answer. Hints stay hidden until you press `H` or click **Show hint**, so they remind you of a past mistake without spoiling a fresh attempt. One hint per question; **Edit hint** (`N`) changes or removes it. Hints never interfere with grade writes.

## Usage

Run **Show usage guide** for a tour of the format and commands (it also appears once on first load). The guide and the settings tab can create a sample quiz file with headings, statuses, and hints.

| Command | What it does |
| --- | --- |
| **Start quiz** | Runs a session on the active file |
| **Choose quiz file** | Picks any file in the vault that contains questions |
| **Start quiz from folder** | One session over every question file in a folder tree, the mega-problem set across chapters |
| **Show quiz progress** | Per-file summary: exam-ready, mastered, almost, struggling, new, and by difficulty |
| **Show usage guide** | Reopens the in-app introduction |

The brain ribbon icon starts a quiz for the active note, or opens the file picker when no file is active.

The setup dialog filters by status (defaults to **Not mastered yet**), difficulty, and section, from a searchable heading tree with per-section counts. It also toggles shuffling and shows a live question and exam-ready count.

### In-session keys

| Key | Action |
| --- | --- |
| `Space` / `Enter` | Reveal the answer |
| `1` / `2` / `3` | Grade: struggling / almost / mastered |
| `H` | Show or hide the hint |
| `N` | Add or edit the hint |
| `S` | Skip; requeues the question ungraded |
| `U` | Undo the last grade |
| `Esc` | End the session |

Each question shows its number in the file (`Question 7 of 42`); numbering is display only. Grades are saved immediately, and questions edited mid-session are skipped and counted instead of corrupted. Ending early is normal: the summary shows what remains, and those questions keep their status. Session history (date, file, counts) is kept in the settings tab.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Difficulty labels | `Easy, Medium, Hard` | Comma-separated; recognized on question lines |
| Mastered passes | `2` | Consecutive mastered answers to be exam-ready |
| Shuffle questions | on | Randomize order at session start |

## Troubleshooting

- **Nothing happens when starting a session:** reload Obsidian, make sure the active file is a markdown file with a `> [!Question]` block, and check the developer console for errors starting with `Omniscient:`.
- **A grade did not change the file:** the question was edited mid-session, so the write was skipped and counted in the summary. Grade it again next session.
- **Questions are missing:** check the status, difficulty, and section filters. Lines indented 4+ spaces, and question-like lines inside code fences, are not quiz content.

## Suggesting features

Have an idea for Omniscient? Open an issue on GitHub and describe what you would like it to do. Suggestions grounded in a credible source, such as peer-reviewed research or a popular book on studying, memory, or learning, tend to be considered faster: this plugin is itself built on the method from *How to Be a Straight-A Student*, and a source helps show that a feature genuinely supports the study technique rather than being a gimmick. A source is not required, but it does help.

## License

Licensed under the MIT license. See [LICENSE](LICENSE).

## Disclaimer

This plugin was built with the assistance of an AI coding agent.
