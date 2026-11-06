# Spy vs. Spy — Agent Guidelines & Project Standards

Welcome to the **Spy vs. Spy** project repository! This document establishes the guidelines, architectural patterns, and conventions for AI agents and developers working on this codebase.

---

## 1. Project Overview & Objective

The goal of this project is to create a faithful, high-fidelity recreation of the classic 1984 split-screen action strategy game **Spy vs. Spy** (originally developed by Mike Riedel for First Star Software, based on Antonio Prohías' MAD Magazine comic strip).

### Core Mechanics to Recreate:
All mechanics and rules are defined in the master specification at [`docs/game-design-document.md`](docs/game-design-document.md).
1. **Simultaneous Split-Screen ("Simulvision" & "Simulplay")**:
   - Continuous top/bottom split screen displaying White Spy and Black Spy independently in their respective rooms.
   - Spies monitor each other's viewports to track trap placements and strategic movement.
   - In-game status bar ("Trapulator") showing inventory slots, active remedy, trap counters, and countdown clock.
2. **Room Navigation & Furniture Search**:
   - An embassy consisting of interconnected rooms with doors, plus multi-storey ladders and rug-covered floor holes.
   - Searchable furniture (safes, desks, paintings, coat racks, cabinets) holding mission items or booby traps.
   - Fixed remedy fixtures on walls (Red Fire Box = Water Bucket, White Tool Box = Wire Cutters, Coat Rack = Umbrella, First Aid Kit = Scissors).
3. **Secret Items & Victory Condition**:
   - 4 required items: **Passport**, **Secret Plans**, **Money**, and **Key**.
   - 1 carrier item: **Briefcase** (without it, a spy carries a single item in a satchel; items found while carrying another loose item remain hidden).
   - Exit door guarded by the Airport Guard: refuses entry and penalizes incomplete spies ($-80$ pts); permits escape with full briefcase for outright victory.
4. **Trap System & Counter-Measures (C64 Authentic Spec)**:
   - Spies arm furniture and doors via the Trapulator:
     - **Bomb** (defused by: *Water Bucket* from Red Fire Box)
     - **Spring** (defused by: *Wire Cutters* from White Tool Box)
     - **Electrified Water Bucket** above doors (countered by: *Umbrella* from Coat Rack)
     - **Gun with String** across doors (countered by: *Scissors* from First Aid Kit)
     - **Time Bomb** (dropped on floor; 15s detonation; unblockable, flee room!)
   - Springing a trap causes a 7-second unconscious knockout and deducts 20 seconds from the victim's clock ($27$s total penalty).
5. **Combat & Knockouts**:
   - Entering the same room switches to unified combat mode with clubs. Traps and remedies in hand are destroyed; briefcase and items scatter into room furniture.
   - Overhead Smash vs. Body Jab with recovery frames and auto-facing.
   - When knocked out, loser suffers clock deduction ($-20$ pts) and turns into an ascending angel before respawning; winner gains $+80$ pts and loots the room.
6. **Scoring, Clocks & End States**:
   - Independent countdown clocks. If one spy's clock hits zero, they are eliminated while their planted traps remain active.
   - Final score awards rank titles (*Grand Master Spy*, etc.). Full briefcase escape wins outright.

---

## 2. Architecture & Design Principles

To ensure maintainability, testability, and modularity, the codebase strictly adheres to the following separation of concerns:

```text
src/
├── core/               # Pure, headless TypeScript game engine (ZERO DOM or Canvas dependency)
│   ├── engine.ts       # Central game loop and tick updates (60fps simulation)
│   ├── room/           # Room graph, layout definitions, door connections, furniture
│   ├── spy/            # Spy state (position, health, inventory, state machine, respawn)
│   ├── trap/           # Trap definitions, trap armed states, counter-measure checks
│   ├── items/          # Secret items (Briefcase, Passport, Plans, Money, Key)
│   ├── combat/         # Melee combat resolution, hitboxes, health depletion
│   └── events/         # Event emitter for game actions (item_found, trap_sprung, spy_killed)
├── renderer/           # Visual presentation layer (HTML5 Canvas 2D / WebGL)
│   ├── splitScreen.ts  # Viewport management for Player 1 & Player 2 / AI
│   ├── roomRenderer.ts # Drawing room perspective, walls, doors, furniture
│   ├── spyRenderer.ts  # Sprite animation (walking, searching, combat, death angel)
│   ├── hudRenderer.ts  # Trapulator, inventory icons, countdown clock
│   └── assets.ts       # Sprite and texture loader
├── input/              # Input abstraction layer
│   ├── keyboard.ts     # Configurable keybindings for P1 & P2
│   ├── gamepad.ts      # Gamepad API support
│   └── ai/             # AI bot controller (patrol, search, trap-setting heuristics)
├── audio/              # Sound effects and music using Web Audio API / synth
└── main.ts             # Entry point bootstrapping core engine and renderer
```

### Golden Rule: Headless Core Game Engine
- The `src/core/` module must remain completely decoupled from rendering and browser DOM.
- Any game logic (trap triggering, collision, inventory, room transitions, combat damage) must be fully verifiable via automated unit tests without launching a browser or mocking HTML5 Canvas.

---

## 3. Development & Verification Workflow

### Command Standards:
- Build: `npm run build`
- Dev Server: `npm run dev`
- Tests: `npm test` or `npx vitest run`
- Lint/Typecheck: `npx tsc --noEmit`

### Verification First:
Before marking any feature as completed:
1. Run automated unit tests (`npm test`).
2. Run TypeScript strict type checks (`npx tsc --noEmit`).
3. Verify that new mechanics (e.g. trap triggering, item carrying logic) have corresponding test suites in `tests/`.

---

## 4. Coding Conventions

- **Strict TypeScript**: `noImplicitAny: true`, `strictNullChecks: true`.
- **Pure Functions & Immutability where appropriate**: Keep state transitions predictable.
- **Documentation & Comments**: Preserve existing comments and write JSDoc comments for public class methods and interface declarations.
- **Atomic Commits & Changes**: Keep changes minimal and laser-focused on the task at hand.
