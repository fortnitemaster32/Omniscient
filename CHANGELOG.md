# Changelog

All notable changes to Omniscient are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2025-08-16

Initial release.

### Added

- Quiz-and-recall sessions over `> [!Question]` / `> [!Answer]` callout pairs in markdown files
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
