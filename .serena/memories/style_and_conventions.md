# Code Style & Conventions

- **Language:** TypeScript, ES modules, 2-space indentation
- **Semicolons:** Optional but consistent per package
- **Naming:**
  - React components: `PascalCase` (files: `ComponentName.tsx`)
  - Hooks: `useFoo`
  - Utility functions: `camelCase` (files: `featureName.ts`)
  - Constants: `SCREAMING_SNAKE_CASE`
- **Style:** Functional by default, avoid classes unless required
- **Tests:** Co-located (`*.test.ts` / `*.test.tsx`), use factories, no real credentials
- **Formatting:** ESLint + Prettier (`npm run lint`, `npm run format`)
- **Comments:** English, no emojis, don't explain obvious code
- **Security:** No secrets in code, use `.env.local`, never log credentials