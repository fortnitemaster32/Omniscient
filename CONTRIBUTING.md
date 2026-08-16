# Contributing to Omniscient

Thanks for considering a contribution. This project is small and focused, so please open an issue or discussion first for anything larger than a typo fix.

## Development setup

```bash
npm install
npm run dev      # watch mode build
npm run build    # production build (main.js)
npm test         # parser + session unit tests
npm run lint     # eslint with the obsidianmd ruleset
```

Run `npm run check` (build + lint + test) before opening a pull request. All three must pass.

## Code layout

- `src/parser.ts` — markdown parsing. Pure TypeScript, no Obsidian imports, unit-tested.
- `src/session.ts` — session state machine (filter, shuffle, grade, skip, undo). Pure TypeScript, unit-tested.
- `src/quizView.ts` — the session view.
- `src/main.ts` — plugin entry point, commands, persistence.
- `tests/parser.test.ts` — unit tests for parser and session.

## Conventions

- UI strings in sentence case; no emojis.
- Use Obsidian CSS variables, scope styles to `omniscient-` containers, and never use `!important`.
- Keep interactive elements keyboard accessible with visible focus and at least 44x44px touch targets.
- New parser or session behavior must come with unit tests.

## Releasing

Maintainers: push a tag matching `[0-9]+.[0-9]+.[0-9]+`; the release workflow builds, updates `versions.json`, attaches the release assets with build provenance, and creates the GitHub release.

## License

By contributing you agree that your changes are licensed under the MIT license (see [LICENSE](LICENSE)).
