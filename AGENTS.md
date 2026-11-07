# Midnight Snackdown: Agent Guidelines

Guidelines, architecture and conventions for AI agents and developers working on this codebase.

## 1. Project overview

Midnight Snackdown is an original split-screen game: two rival raccoons raid a sleeping house, racing to pack a picnic basket with a feast and escape through the garden gate while trapping and swatting each other.

The rules and tuning values live in [`docs/game-design-document.md`](docs/game-design-document.md). Update that document in the same change as any rule change, and keep it describing what the code does, with unbuilt ideas under its backlog heading.

**Keep the game original.** New characters, settings, art, audio and names must be our own. Do not model them on an existing game or comic, and do not describe the project as a recreation of one.

## 2. Architecture

```text
src/
├── core/        Pure, headless TypeScript engine (ZERO DOM or canvas dependency)
│   ├── engine.ts       Central game loop and tick updates (60 ticks per second)
│   ├── types.ts        Enums, rule tables and shared types
│   ├── room/           Room model and the house layout
│   ├── raider/         Raider state machine and inventory
│   ├── trap/           Setting, springing and clearing traps
│   ├── combat/         Paw-swat resolution
│   └── events/         Typed event emitter
├── renderer/    Canvas 2D presentation; all art is procedural
│   ├── splitScreen.ts      Side-by-side panes and the game-over overlay
│   ├── roomRenderer.ts     Walls, floors, doors, furniture, floor loot
│   ├── raiderRenderer.ts   Raccoon sprites and animations
│   ├── hudRenderer.ts      Status panel
│   └── visualEffects.ts    Particles and popups, tagged by room
├── input/
│   ├── keyboard.ts     Player controls
│   └── ai/rivalAI.ts   Computer-controlled raider
├── audio/gameAudio.ts  Synthesised sound effects
└── main.ts             Bootstraps engine, input, audio and renderer
```

### Golden rule: headless core

`src/core/` must stay decoupled from rendering and the browser. Game logic must be verifiable with unit tests, without a browser or a mocked canvas. Randomness is injected (`createHouse({ rng })`, `new RivalAI(engine, id, rng)`) so that matches can be reproduced.

### Rendering rules

- Rooms are drawn in logical 320x200 space, at the same scale on both axes.
- Each pane has a `viewer`. Hidden traps are drawn only for the raider who planted them.
- Effects are tagged with their room and drawn only in panes showing that room.

## 3. Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test`
- Type-check: `npm run typecheck`

## 4. Definition of done

1. `npm test` passes.
2. `npm run typecheck` passes.
3. New mechanics and bug fixes have tests in `tests/`. `tests/ai.test.ts` plays whole matches; keep it passing, because it catches the AI getting stuck.
4. Anything visual is checked in the running game.

## 5. Coding conventions

- Strict TypeScript, including `noUnusedLocals` and `noUnusedParameters`.
- Keep state transitions predictable and write JSDoc for non-obvious public methods.
- Keep changes focused on the task at hand.
