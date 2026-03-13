# Repository Guidelines

These rules are binding for all AI coding agents (Claude Code).

## General Behavior

- Never read, modify, or reason about files inside `.git/`.
- When in doubt, stop and ask. Do NOT assume.
- You MUST follow all rules in this file.
- If a rule conflicts with user instructions, ask for clarification.
- Do NOT invent functionality.
- If uncertain, first inspect the existing code and documentation.
- Only use web search for well-defined, verifiable facts (APIs, specs, versions).
- Never guess behavior.
- You MUST use tmux for long-running, interactive, or stateful CLI tasks (dev servers, watchers, REPLs).
- Do NOT use tmux for one-off commands.
- You MUST ask clarifying questions if any requirement, interface, or behavior is ambiguous.
- Do NOT proceed with implementation until requirements are clear.
- Before concluding a task you MUST build and lint the project if applicable.
- If build or lint fails, report errors before proceeding.

## Coding Style & Naming Conventions

- Language: TypeScript throughout; 2-space indentation; semicolons optional but be consistent per package. Use ES modules.
- Naming: React components `PascalCase`, hooks `useFoo`, utility functions `camelCase`, constants `SCREAMING_SNAKE_CASE`.
- Files: React components `ComponentName.tsx`, modules `featureName.ts`.
- Formatting/Linting: run `npm run lint` (ESLint) and `npm run format` (Prettier) before pushing.
- Keep DTOs and DB schemas close to their consuming services.
- Use functional style by default.
- Avoid classes unless explicitly required (e.g. framework constraints).
- External libraries may be installed autonomously when needed for the implementation plan.
- Use English for all text files, code comments, and documentation.

## Testing Guidelines

- Place tests next to code (`*.test.ts` / `*.test.tsx`).
- Add regression tests for bugs before fixing.
- Data: use factories/helpers; avoid real credentials in fixtures.

## Commit & Pull Request Guidelines

- Adopt Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Keep commit messages imperative and scoped.
- Keep diffs focused; split API and UI changes when possible.

## Security & Configuration

- Do not commit secrets; use `.env.local` / `.env` entries or a local config file.
- Provide sample/example config files for others to copy.
- Never log passwords or credentials.

## Project Management

This project uses dual tracking via the `/task` and `/workflow` skills:

- **`/task`** — Issue management: create, start, done, sync between BACKLOG.md and GitHub Issues + Project Board.
- **`/workflow`** — Collaboration modes: bugs are fixed immediately (no confirmation needed), features require ticket alignment first.
- **Worklogs** — Every piece of work is tracked locally in `.claude/worklogs/<issue>.md`.
- **BACKLOG.md** — Local Kanban board (Backlog / Todo / In Progress / Done), always kept in sync with GitHub.

### Quick reference

| Action | Command |
|--------|---------|
| Show open tasks | `/task next` |
| Create a task | `/task create <title>` |
| Start working | `/task start <#issue>` |
| Mark done | `/task done <#issue>` |
| Full sync | `/task sync` |
| Status overview | `/task status` |
| Setup for new project | `/task setup` |

## Git Preferences

- Always use `git add .` (not selective staging).
- Commit autonomously after completing each issue/feature (Conventional Commits).
- Push to `main` after each commit.

## Output Rules

- Do not explain obvious code.
- Keep answers concise.
- No emojis in code comments.

## Context Management

- Minimize context usage.
- Avoid repeating rules, plans, or specifications.
- Prefer referencing files over restating their contents.
- Do NOT summarize files unless explicitly requested.
