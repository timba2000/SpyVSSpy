# Architecture Rules — Spy vs. Spy

## Layered Architecture Constraints

1. **Strict Core Isolation**:
   - `src/core/` must not import anything from `src/renderer/`, `src/audio/`, or DOM APIs (`document`, `window`, `HTMLCanvasElement`).
   - All coordinates and physics calculations in `src/core/` are in normalized game units, not screen pixels.

2. **Event-Driven Communication**:
   - Use strongly typed events for cross-boundary communication between `core` and `renderer/audio`:
     - `SpyEvent: "SPY_MOVED" | "SPY_ATTACKED" | "SPY_DAMAGED" | "SPY_DIED" | "SPY_RESPAWNED"`
     - `ItemEvent: "ITEM_PICKED" | "ITEM_DROPPED"`
     - `TrapEvent: "TRAP_SET" | "TRAP_TRIGGERED" | "TRAP_DEFUSED"`
     - `GameEvent: "ROOM_CHANGED" | "MATCH_WON" | "TIME_EXPIRED"`

3. **Deterministic State Updates**:
   - The core game loop updates via fixed time steps (e.g., 60 ticks per second: delta time = 1/60s).
   - This ensures gameplay reproducibility and enables easy replay recording or AI training.

4. **Split-Screen Rendering Pipeline**:
   - Render pipeline must treat Player 1 (White Spy) and Player 2 (Black Spy) as two viewports rendering the shared world state.
   - If both spies share the same room, combat overlays and dynamic framing should activate seamlessly.
