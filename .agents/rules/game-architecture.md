# Architecture Rules: Midnight Snackdown

## Layered Architecture Constraints

1. **Strict Core Isolation**:
   - `src/core/` must not import anything from `src/renderer/`, `src/audio/`, `src/input/`, or DOM APIs (`document`, `window`, `HTMLCanvasElement`).
   - All coordinates in `src/core/` are logical game units, not screen pixels.

2. **Event-Driven Communication**:
   - Core talks to audio and effects through the typed events in `src/core/events/gameEvents.ts`.

3. **Deterministic State Updates**:
   - The game loop advances in fixed steps of 60 ticks per second.
   - Randomness is injected, so a match can be reproduced from a seed.

4. **Split-Screen Rendering Pipeline**:
   - The renderer draws one shared world into two side-by-side panes, one per raider.
   - Each pane has a viewer. Hidden traps are drawn only for their planter.
   - Effects are tagged with a room and drawn only in panes showing that room.
