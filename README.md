# 🕵️‍♂️ Spy vs. Spy (Recreation)

A modern, high-fidelity recreation of the classic 1984 split-screen action strategy game **Spy vs. Spy**, originally created by Mike Riedel for First Star Software and inspired by Antonio Prohías' legendary comic strip in *MAD Magazine*.

---

## 🎮 Game Concept & Rules

In **Spy vs. Spy**, two rival secret agents—**White Spy** and **Black Spy**—infiltrate a foreign embassy. Their mission is to locate secret items, sabotage each other with devious booby traps, engage in desperate close-quarters combat, and escape to the waiting airport runway before time runs out.

### 💼 Items to Escape
To successfully escape the embassy, a spy must find:
1. 🧳 **Briefcase** *(Essential: allows carrying multiple items)*
2. 🛂 **Passport**
3. 📜 **Secret Plans**
4. 💰 **Money**
5. 🔑 **Key**

### 💣 The Trap System & Counter-Measures (C64 Authentic)
Spies can set traps on furniture (safes, desks, paintings) and closed doors using their in-game **Trapulator**. Opening or searching a trapped object without the proper counter-item triggers an instant, hilarious knockout and drains 27 game seconds.

| Trap | Placed On | Fires When | Remedy | Remedy Fixture |
| :--- | :--- | :--- | :--- | :--- |
| **Bomb** | Any Furniture | Searched | 🪣 **Water Bucket** | Red Fire Box (Left Wall) |
| **Spring** | Any Furniture | Searched | ✂️ **Wire Cutters** | White Tool Box (Right Wall) |
| **Electrified Bucket** | Closed Doors | Door Opened | ☂️ **Umbrella** | Coat Rack (Floor / Corner) |
| **Gun with String** | Closed Doors | Door Opened | ✂️ **Scissors** | First Aid Kit (Back Wall) |
| **Time Bomb** | Room Floor | 15s after arming | *None* (Flee Room!) | N/A |

### 🥊 Combat, Knockouts & The Airport Guard
- **Combat Mode**: When both spies enter the same room, viewports align into melee combat. Any traps or remedies held in hand are destroyed; mission items and the briefcase scatter into room furniture!
- **Knockout**: Loser drops $-20$ points and clock continues ticking while unconscious; winner receives $+80$ points.
- **Airport Guard**: Guards the exit door; intercepts any spy lacking the full briefcase, boots them back into the room, and deducts $-80$ points.
- **Master Spec**: See [`docs/game-design-document.md`](docs/game-design-document.md) for complete technical formulas, AI IQ tiers, scoring ladders, and multi-storey rules.

---

## 🏗️ Architecture & Technology Stack

- **Platform**: Modern Web / TypeScript / Vite
- **Engine**: Headless Core Simulation (`src/core/`) — completely decoupled from graphics for deterministic updates and 100% headless testability.
- **Renderer**: HTML5 Canvas 2D / WebGL split-screen viewport manager with procedural pixel-art retro shaders.
- **Audio**: Web Audio API retro 8-bit sound synthesizers.
- **Testing**: Vitest for fast, automated headless test verification.

```text
SpyvsSpy/
├── .agents/                    # Antigravity agent configuration
│   ├── rules/                  # Architecture, code quality, and testing rules
│   │   ├── game-design.md
│   │   ├── game-architecture.md
│   │   ├── code-quality.md
│   │   └── testing-verification.md
│   └── skills/                 # Custom agent skills
│       └── game-tester/
│           └── SKILL.md
├── docs/                       # Detailed design documentation & diagrams
│   └── game-design-document.md
├── src/
│   ├── core/                   # Headless game simulation & state machine
│   ├── renderer/               # Split-screen renderer & canvas drawing
│   ├── input/                  # Keyboard, gamepad, and AI bot controls
│   ├── audio/                  # Retro sound synthesizer & sound effects
│   └── main.ts                 # Main bootstrap entry point
├── tests/                      # Automated headless unit tests
├── AGENTS.md                   # Core workspace guidelines for Antigravity
├── README.md                   # Project overview & roadmap
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript strict configuration
└── vite.config.ts              # Vite development & build configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm or pnpm

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```

### Running Automated Tests
```bash
npm test
```

---

## 🗺️ Roadmap

- [x] **Phase 0**: Project setup and Antigravity standards integration.
- [x] **Phase 1**: Core Engine & Data Structures (Room graph, Spies, Inventory, Traps, Win condition).
- [x] **Phase 2**: Headless Unit Test Suite (22 automated tests covering all game mechanics).
- [x] **Phase 3**: Canvas 2D Split-Screen Renderer & Retro Sprite Graphics (Simulvision top/bottom viewports).
- [x] **Phase 4**: Real-time Input (P1 keyboard controls + autonomous Black Spy AI bot).
- [x] **Phase 5**: Web Audio 8-bit sound effects & Trapulator HUD.
