# Midnight Snackdown

Two rival raccoons, **Rusty** and **Soot**, break into a sleeping house to steal dinner. Each races to find a picnic basket and pack it with a four-dish feast, then get out through the garden gate. Along the way they booby-trap the furniture and doorways, and swat each other whenever they meet.

The screen is split down the middle, one pane per raccoon, and you can always see both. Watching what your rival is up to is half the game.

## How to play

You play Rusty (left pane). Soot is computer-controlled.

| Action | Keys |
| :--- | :--- |
| Move | WASD or arrow keys |
| Rummage through furniture, grab floor loot | Space or E |
| Swat | F or Q |
| Choose the tool in your paw | 1 to 5 (0 for none) |
| Set a trap | Shift + 1 to 5 |

### The feast

Find the **picnic basket** 🧺 and four dishes: **pizza** 🍕, **cheese** 🧀, **honey** 🍯 and **fish** 🐟. Without the basket you can only carry one thing in your mouth, and picking up another drops the first.

The garden gate is at the far side of the Back Porch and opens only for a full basket. Loot is hidden in a different place every match.

### Traps and tools

Each raccoon starts with two of each trap, and only the planter can see where theirs are. Hold the matching tool to clear a trap safely. A trap catches anyone who sets it off, including the raccoon who planted it.

| Key | Trap | Set on | Cleared with |
| :--- | :--- | :--- | :--- |
| 1 | Snap Trap 🪤 | Furniture | Oven Mitt 🧤 |
| 2 | Glue Pad 🍬 | Furniture | Cooking Oil 🫒 |
| 3 | Pepper Poof 🌶️ | Furniture | Clothes Peg 📎 |
| 4 | Marble Spill 🔮 | Doors | Broom 🧹 |
| 5 | Static Mat ⚡ | Doors | Rubber Boots 🥾 |

### Knockouts and clocks

Four swats, or one sprung trap, knock a raccoon out for 5 seconds. They drop everything they carry on the spot, lose 15 seconds off their own clock, and wake up back in their starting room.

Each raccoon has their own 3-minute clock. At zero they fall asleep for the rest of the match, leaving their loot behind and their traps armed, and the other plays on alone. If both fall asleep, the sun comes up and nobody gets dinner.

## Getting started

Requires Node.js 18 or newer.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run typecheck
```

## Architecture

TypeScript, Vite and Canvas 2D, with no runtime dependencies. All art and sound are generated in code.

```text
src/
├── core/        Headless game simulation (no DOM or canvas)
│   ├── engine.ts       60 tick-per-second match loop and rules
│   ├── room/           Rooms, doors, furniture, house layout
│   ├── raider/         Raider state machine and inventory
│   ├── trap/           Setting, springing and clearing traps
│   ├── combat/         Paw-swat resolution
│   └── events/         Typed event bus for audio and effects
├── renderer/    Procedural drawing, split screen, status panels
├── input/       Keyboard controller and the rival AI
├── audio/       Synthesised sound effects (Web Audio)
└── main.ts      Wires everything together
tests/           Headless Vitest suite
docs/            Game design document
```

See [`docs/game-design-document.md`](docs/game-design-document.md) for the rules and tuning values, and [`AGENTS.md`](AGENTS.md) for contributor conventions.
