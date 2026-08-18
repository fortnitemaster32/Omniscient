# Changelog

All notable changes to Omniscient are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-08-16

### Changed

- The setup dialog defaults to the **Not mastered yet** status filter, matching the book's review loop (whole set first, then only the gaps until everything is exam-ready)

### Added

- In-app usage guide: shows once on first run and covers the question format, commands, and grading; reopen it any time with the **Show usage guide** command or the Usage guide button in settings
- **Create sample file** action (in the usage guide and the settings tab) adds a sample quiz note to your vault
- A brain icon (from Obsidian's built-in icon library) for the ribbon button and the quiz view tab

## [0.1.1] - 2026-08-16

### Changed

- Release workflow packages a single-folder zip (`omniscient-<version>.zip`) for manual installs
- Build provenance attaches automatically once the repository is public
- README documents the feature-suggestion policy (GitHub Issues; sources such as peer-reviewed research or popular books are welcome)

### Fixed

- Callout types like `[!questionable]` or `[!success-story]` are no longer mistaken for quiz headers
- Grades lost to mid-session edits are now counted in the summary instead of failing silently
- Corrupt session history entries in `data.json` no longer crash the settings tab
- Fenced code blocks (` ``` ` and ` ~~~ `) anywhere in a file are never treated as quiz content, even before the first question
- Concurrent quiz opens can no longer leave a stale config behind after a failed view open
- Settings writes are serialized so simultaneous sessions cannot interleave saves
- File selection scans the vault with bounded concurrency instead of reading every Markdown file at once

### Security

- Release assets are packaged from the tagged commit; the versions.json update on main happens only after publishing

## [0.1.0] - 2026-08-16

Initial release.

### Added

- Quiz-and-recall sessions over `> [!Question]` / `> [!Success]` callout pairs in markdown files (the answer callout renders green; `[!answer]` is accepted as an alias)
- Self-grading with three statuses, stored on the question line: `Struggling`, `Almost`, `Mastered(n)` where `n` is the number of consecutive mastered passes
- Optional difficulty metadata (`Easy`, `Medium`, `Hard` by default, configurable)
- Status filters (all / new / struggling / almost there / not mastered yet / mastered), difficulty filter, and shuffling
- Keyboard-driven session view: `Space`/`Enter` reveals the answer, `1`/`2`/`3` grade, `S` skips, `U` undoes, `Esc` ends
- Skip (requeues a question ungraded) and undo (restores the previous status in the session and in the file)
- Finishing a session early is a first-class flow; the summary shows how many questions remain
- Multi-file sessions: "Start quiz from folder" merges every question file in a folder tree, writing each status back to its own source file
- "Show quiz progress" report: exam-ready, mastered, almost, struggling, new, and per-difficulty counts
- Session history with mastery percentages in settings
- LaTeX, code blocks, and nested callouts render inside questions and answers
- Safe write-back: questions edited mid-session are detected and skipped, never corrupted
- Ribbon icon for one-click quiz start

### Requirements

- Obsidian 1.13.0 or later (declarative settings)
