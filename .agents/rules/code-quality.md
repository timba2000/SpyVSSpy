# Code Quality & Standards: Midnight Snackdown

## Standards & Conventions

1. **TypeScript Idioms**:
   - Keep the strict compiler options in `tsconfig.json` on.
   - Use `enum` or union string literals for fixed states (`RaiderId`, `TrapType`, `FurnitureType`).
   - Prefer explicit interface definitions for all state payloads and entity data.

2. **Error Handling & Invariants**:
   - Fail fast on invalid game state, such as a lookup of a room that does not exist.
   - Normal gameplay refusals, such as a trap with no valid target, return a value rather than throwing.

3. **Assets**:
   - All art and sound are generated in code, so the game has no asset files to load.

4. **Preservation**:
   - Do not remove tests, comments, or docstrings unless the change calls for it.
