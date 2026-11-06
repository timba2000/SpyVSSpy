# Code Quality & Standards — Spy vs. Spy

## Standards & Conventions

1. **TypeScript Idioms**:
   - Enable strict compiler options (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`).
   - Use `enum` or union string literals for fixed states (`SpyColor = 'WHITE' | 'BLACK'`, `TrapType`, `FurnitureType`).
   - Prefer explicit interface definitions for all state payloads and entity data.

2. **Error Handling & Invariants**:
   - Fail fast on invalid game state (e.g., trying to place a trap on non-existent furniture, attempting to open a door without a link).
   - Use typed Result patterns or descriptive errors instead of silent failures.

3. **Asset Handling**:
   - Keep asset loading centralized in `src/renderer/assets.ts` and `src/audio/soundBank.ts`.
   - Support procedural fallback graphics (vector-drawn retro shapes/sprites) so the game is always playable even before custom bitmap sprites are provided.

4. **Preservation**:
   - Never remove existing tests, comments, or docstrings unless explicitly asked.
