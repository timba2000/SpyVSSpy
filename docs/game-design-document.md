# Spy vs. Spy (1984) — Master Game Specification & System Design

**Author / Maintainer:** @Tim Barnes  
**Date:** November 7, 2026  
**Status:** Unified Authoritative Reference for Engine, Gameplay & Visual Presentation  
**Target Platform:** Modern Web (TypeScript / Canvas 2D / Web Audio / Vitest)

---

## 1. Executive Summary & Historical Lineage

*Spy vs. Spy* is a real-time, simultaneous two-spy action strategy game originally created in 1984 by Mike Riedel for First Star Software (published on the Commodore 64, Atari 8-bit, Apple II, and later ported to the NES, Master System, and Amiga). It is inspired by Antonio Prohías' legendary comic strip in *MAD Magazine*.

The game pioneered two foundational conventions:
- **Simulvision**: Continuous, synchronous split-screen showing both spies independently in their respective rooms.
- **Simulplay**: Both human or AI players act in real-time within a shared world state, observing each other’s viewports to spy on trap placements and strategies.

### Modern Rebuild Philosophy
This recreation faithfully implements the original 1984 C64 / NES mechanics and rules, resolving historical ambiguities and exploits while delivering a high-fidelity visual and audio presentation.

---

## 2. Core Game Loop & Victory Conditions

Both spies (**White Spy** and **Black Spy**) infiltrate an embassy building starting in the same room, positioned a few paces apart, with identical countdown clocks.

```
[Start in Room 1] 
       │
       ▼
[Search Furniture] ──────► [Find Briefcase + 4 Secret Items]
       │                                 │
       ▼                                 ▼
[Plant Booby Traps]                [Equip Remedies to Disarm Rival Traps]
       │                                 │
       ▼                                 ▼
[Combat on Encounter]             [Carry All 4 Items in Held Briefcase]
       │                                 │
       ▼                                 ▼
[Knockout / Steal Dropped Items]   [Reach Airport Exit Door]
                                         │
                                         ▼
                             [Guard Verification & Escape]
```

### End States & Victory
| Outcome | Trigger Condition | Result |
| :--- | :--- | :--- |
| **Outright Escape** | Spy exits through the marked Airport Exit holding the **Briefcase containing all 4 items** (Passport, Money, Plans, Key). | **Instant Victory** for that spy. Plane takeoff animation, followed by score summary and rank title. |
| **Clock Expiration (One Spy)** | One spy's countdown timer reaches `00:00`. | That spy is **eliminated** (knocked out permanently). The surviving spy continues playing alone. All traps planted by the dead spy remain armed and lethal. |
| **Clock Expiration (Both Spies)** | The second spy's countdown timer reaches `00:00`. | **Game Over**. Embassy lockdown triggers. Victory is awarded to the spy with the higher accumulated score. |
| **Training Mode Escape** | Spy exits holding the **Briefcase plus any 1 secret item** (onboarding mode). | Victory with training rank. |

> [!IMPORTANT]
> The two countdown clocks run independently and can never expire on the exact same tick. One spy always outlives the other.

---

## 3. Embassy World Model & Multi-Storey Navigation

The embassy is an interconnected network of rooms arranged on a grid, with single or multi-storey layouts depending on difficulty.

### Room Geometry (Pseudo-3D Isometric View)
- **Dimensions**: Logical space is $320 \times 200$ coordinate units.
- **Surfaces**:
  - **Back Wall** ($y = 0 \dots 56$): Houses North doors, wall paintings, safes, first-aid kits, and ceiling lamps.
  - **Left Receding Wall** ($x = 0 \dots 20$): Houses West doors and red fire boxes.
  - **Right Receding Wall** ($x = 300 \dots 320$): Houses East doors and white tool boxes.
  - **Floor Plane** ($y = 56 \dots 200$): Polished hardwood parquet with perspective depth, holding South doors, desks, filing cabinets, coat racks, and rugs.

### Multi-Storey Features
- **Ladders**: Interacting lowers/raises a ladder; tapping Up/Down causes the spy to climb between floors automatically.
- **Floor Holes**: Hidden beneath rugs. Interacting lifts the rug; stepping onto an open hole drops the spy to the lower storey.

---

## 4. Furniture, Fixtures & Remedy Supply

Every room features searchable furniture and dedicated, fixed wall fixtures:

### Searchable Furniture (Item & Trap Mounts)
Furniture items contain either **nothing**, one of the **mission items / briefcase**, or a **planted trap**:
1. **Steel Safe**: Heavy wall/floor safe with combination dial.
2. **Baroque Painting**: Gilded wall picture frame.
3. **Executive Desk**: Mahogany desk with pull-out drawers and banker's lamp.
4. **Filing Cabinet / TV**: Storage cabinet with drawers.

### Fixed Remedy Fixtures (Always in Fixed Positions)
To encourage spatial mastery, remedies appear in predictable, consistent wall fixtures:

| Fixture | Wall Position | Remedy Provided | Defuses |
| :--- | :--- | :--- | :--- |
| **Red Fire Box** | Left Wall | 🪣 **Water Bucket** | Bomb |
| **White Tool Box** | Right Wall | ✂️ **Wire Cutters** | Spring |
| **Coat Rack** | Floor / Corner | ☂️ **Umbrella** | Electrified Water Bucket |
| **First Aid Kit** | Back Wall | ✂️ **Scissors** | Gun with String |

> [!NOTE]
> Mission items (Passport, Money, Plans, Key) and the Briefcase are **never** hidden in remedy fixtures.

---

## 5. Items, Inventory & Briefcase Rules

### Carrying Capacity & The Hand Slot
- **The Single-Hand Constraint**: A spy has only **one hand slot**. Without a briefcase, a spy carries a single item in a white shoulder satchel.
- **The Briefcase**: The only container item in the game. When held, it allows carrying all 4 mission items simultaneously.
- **Item Discovery**:
  - If a spy searches furniture while holding a loose item, the newly discovered item stays hidden inside the furniture.
  - If holding the briefcase, found mission items automatically pack directly into the briefcase.
- **Re-hiding**: Spies can deliberately place held items back into any searched furniture to conceal them from the rival.
- **Combat Drop Rule**: When entering a room where a fight starts, **traps and remedies held in hand are destroyed**. The briefcase and collected items scatter into random furniture within that room for the victor to search and claim.

---

## 6. The Trapulator, Booby Traps & Defusal System

Spies access the **Trapulator** by pressing the action button twice or clicking the Trapulator panel.

### The 5 Traps & Counter-Measures

| Trap | Placed On | Trigger Action | Remedy | Remedy Fixture | Effect / Animation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bomb** | Any Furniture | Searching furniture | 🪣 **Water Bucket** | Red Fire Box (Left Wall) | Explosion, fiery cloud, victim blackened |
| **Spring** | Any Furniture | Searching furniture | ✂️ **Wire Cutters** | White Tool Box (Right Wall) | Giant boxing-glove spring knocks spy flying |
| **Electrified Bucket** | Closed Doors | Opening door | ☂️ **Umbrella** | Coat Rack (Floor) | Acid/water dumps from doorframe |
| **Gun with String** | Closed Doors | Opening door | ✂️ **Scissors** | First Aid Kit (Back Wall) | Tripwire fires pistol blast |
| **Time Bomb** | Room Floor | 15s after arming | *None* (Flee room!) | N/A | Ticking explosive hits all occupants in room |

### Placement Mechanics
1. Select trap icon from Trapulator $\rightarrow$ spy holds the trap in hand.
2. Move in range of target furniture or door (room flashes white when in range).
3. Press action button $\rightarrow$ trap arms, 3 audio beeps sound, time placement cost is deducted from spy's clock, and spy receives $+30$ points.
4. **Gun with String (Two-Stage)**: Drop gun anywhere in room, pull string across room, and tie to closed door.

### Trigger Penalties
- **Unconscious Time**: 7 seconds of real-time lockout.
- **Clock Penalty**: An immediate **20-second deduction** from the victim's countdown clock ($27$ seconds total penalty).
- **Score Impact**: Victim loses $-80$ points; rival gains $+80$ points.
- **Self-Triggering**: A spy who forgets their own trap triggers it with the same knockout and score penalty.

### Disarming
Searching trapped furniture or opening a trapped door **while holding the active matching remedy** safely neutralizes the trap and awards $+40$ points.

---

## 7. Hand-to-Hand Melee Combat System

When both spies enter the same room, Simulvision focuses into **Combat Mode**:

```
[Both Spies in Room] ──► [Pane Unifies / Combat View Active]
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        [Overhead Smash]                     [Jab]
    (Hold Fire + Up/Down)            (Hold Fire + Left/Right)
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                       [Damage & Stagger]
                                │
                                ▼
                     [~7 Hits: Knockout!]
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
[Loser: Unconscious (-20 pts)]            [Winner: +80 pts & Free Rein]
[Clock Continues to Drain]                [Search Room for Dropped Loot]
```

### Combat Controls & Balancing
- **Overhead Smash**: High damage strike targeting the head.
- **Body Jab**: Fast horizontal strike targeting the torso.
- **Auto-Face**: Pressing attack automatically pivots the spy to face the rival.
- **Fleeing**: Doors remain functional; a losing spy can retreat through open doors (unless booby-trapped!).
- **Exploit Prevention**: Incorporates attack recovery frames and diminishing returns on repeated spamming.

---

## 8. Airport Exit, The Guard & Escape Sequence

- Exactly **one room** contains the Airport Exit door (defaulting to the furthest room from the start).
- **The Airport Guard**:
  - If a spy approaches the exit without the full briefcase (missing any of the 4 items), the guard kicks them back into the room, inflicting an **$-80$ point penalty**.
  - If the spy holds the briefcase containing the **Passport, Money, Secret Plans, and Key**, the guard salutes and permits entry!
- **Victory Animation**: The winning spy strolls onto the tarmac, snickers at the camera, boards the twin-prop getaway plane, and takes off into the sunset.

---

## 9. Time System, Penalties, Knockouts & Clocks

Time is the ultimate currency in *Spy vs. Spy*:

| Action / Event | Real-Time Out of Play | Clock Deduction | Score Delta |
| :--- | :--- | :--- | :--- |
| **Springing a Booby Trap** | 7 seconds | 20 seconds | $-80$ pts (victim) / $+80$ pts (planter) |
| **Combat Knockout** | 5 seconds | 15 seconds | $-20$ pts (loser) / $+80$ pts (winner) |
| **Arming a Trap** | 0 seconds | 5 seconds (placement cost) | $+30$ pts |
| **Disarming a Trap** | 0 seconds | 0 seconds | $+40$ pts |
| **Stealing Rival's Item** | 0 seconds | 0 seconds | $+60$ pts |
| **Consulting In-Game Map**| 0 seconds | 0 seconds | $-70$ pts |
| **Kicked by Airport Guard**| 0 seconds | 0 seconds | $-80$ pts |

---

## 10. Scoring System & Rank Title Ladder

At match conclusion, the final score determines the spy's operational rank:

| Rank Title | Score Threshold | Evaluation |
| :--- | :--- | :--- |
| **Grand Master Spy** | $\ge 5,000$ pts | Flawless espionage, heavy trap yield, clean escape |
| **Senior Infiltrator** | $3,500 - 4,999$ pts | Efficient collector with strong combat control |
| **Double Agent** | $2,000 - 3,499$ pts | Balanced play, moderate trap disarm rate |
| **Field Operative** | $1,000 - 1,999$ pts | Survivalist; relied on rival mistakes |
| **Novice Mole** | $0 - 999$ pts | Survived but suffered multiple knockouts |
| **Clouseau Bungler** | $< 0$ pts | Triggered own traps, beaten repeatedly |

---

## 11. In-Game Map & Breadcrumb Navigation

- **The Trapulator Map**:
  - Displays the grid of embassy rooms.
  - Current room blinks.
  - Visited rooms are filled solid.
  - Rooms holding uncollected mission items are marked with dots (without revealing which item).
  - Never reveals the rival spy's location.
  - Costs **$-70$ points** per activation.
- **Breadcrumb Trail (Lower Difficulties)**:
  - Displays an OSD strip showing the sequence of doors/ladders used up to 9 rooms deep.

---

## 12. Game Options, Difficulties & Setup

| Parameter | Options | Description |
| :--- | :--- | :--- |
| **Players** | `1 Player` (vs AI) or `2 Players` (Local Split-Screen) | Control White Spy vs Black Spy |
| **Difficulty Level** | `Level 1` through `Level 8` | Dictates embassy size (from 6 rooms up to 30+ rooms, multi-floor storeys) |
| **Computer IQ** | `Trainee`, `Operative`, `Mastermind` | Configures AI trap memory, search pathfinding, and combat reflexes |
| **Airport Exit** | `Revealed` or `Hidden Until End` | When hidden, the exit door appears as a standard door until all items are found |
| **Game Mode** | `Standard Mission` or `Training Mode` | Training requires Briefcase + 1 item to escape |

---

## 13. Computer Opponent (AI) Heuristics

The autonomous Black Spy AI operates on a state machine with 4 prioritized behaviors:

```
                  ┌──────────────────────────────┐
                  │ 1. Can Escape to Airport?    │──► Path to Airport Exit Door
                  └──────────────┬───────────────┘
                                 │ No
                  ┌──────────────▼──────────────┐
                  │ 2. Rival Holds Briefcase?   │──► Intercept & Engage Combat
                  └──────────────┬───────────────┘
                                 │ No
                  ┌──────────────▼──────────────┐
                  │ 3. Uncollected Items Nearby?│──► Nearest-First Room Search
                  └──────────────┬───────────────┘
                                 │ No
                  ┌──────────────▼──────────────┐
                  │ 4. Patrol & Harass Route    │──► Plant Choke Point Traps
                  └─────────────────────────────┘
```

- **Fair-Play Knowledge Model**: The AI only acts upon what has entered its viewport or shared combat rooms.
- **IQ Scaling**:
  - *Trainee*: Forgets observed traps; searches rooms in random order; slow combat reaction.
  - *Mastermind*: Perfect trap memory; searches via Dijkstra optimal paths; fetches remedies before entering suspect rooms; executes timed overhead smashes and body jabs.

---

## 14. Controls & Input Mapping

| Action | Player 1 (Keyboard) | Player 2 (Keyboard) | Gamepad (P1 / P2) |
| :--- | :--- | :--- | :--- |
| **Movement** | WASD or Arrow Keys | Numpad 8, 4, 5, 6 | D-Pad / Left Stick |
| **Interact / Search** | Space / E | Numpad 0 / Enter | A Button (Cross) |
| **Melee Attack** | F / Q | Numpad Period / Right Ctrl | X Button (Square) |
| **Open Trapulator** | Double-Tap Action | Double-Tap Action | Y Button (Triangle) |
| **Equip Remedy [1-5]** | Digits 1 – 5 (0: Unequip) | Keys 6 – 0 | Shoulder Buttons (L1/R1) |
| **Plant Trap [1-5]** | Shift + Digits 1 – 5 | Shift + Keys 6 – 0 | Triggers (L2/R2) |
| **Toggle Fullscreen** | F11 / Button on UI | F11 | Select / View |

---

## 15. Audio, Animation & Presentation Language

- **Visual Palette**: Traps in high-contrast black silhouettes; remedies in vibrant primary colors for split-second readability.
- **Audio Cues**:
  - Proximity chime when near searchable furniture.
  - 3 high-pitch beeps when arming traps.
  - Audible ticking during Time Bomb countdowns.
  - Comic slapstick impacts (*POW!*, *BAM!*, *BOOM!*).
  - Melodic fanfare upon airport takeoff.

---

## 16. System Architecture & Frame Tick Order

The engine enforces a strict headless simulation loop running at 60 FPS:

```text
src/
├── core/                         # Pure Headless Engine (Zero DOM/Canvas dependencies)
│   ├── engine.ts                 # Master 60fps tick simulation & match state
│   ├── types.ts                  # Type invariants, enums, interfaces
│   ├── room/
│   │   ├── room.ts               # Room bounds, doors, furniture containers
│   │   └── embassyLayout.ts      # Procedural embassy room generation & item distribution
│   ├── spy/
│   │   ├── spy.ts                # Spy state machine, motion, cooldowns, knockouts
│   │   └── inventory.ts          # Briefcase capacity, single-satchel limits, remedy slots
│   ├── trap/
│   │   └── trapSystem.ts         # Trap arming, defusal resolution, trigger events
│   ├── combat/
│   │   └── combatSystem.ts       # Hitboxes, facing angles, overhead/jab damage resolution
│   └── events/
│       └── gameEvents.ts         # Strongly-typed event emitter bus
├── renderer/                     # Presentation Layer (Canvas 2D / Visuals)
│   ├── splitScreen.ts            # Viewport scaling & surveillance monitor overlay
│   ├── roomRenderer.ts           # 2.5D perspective walls, hardwood parquet, 3D doors
│   ├── spyRenderer.ts            # Animated 4-way spy sprites, walking cycles, death angel
│   ├── hudRenderer.ts            # Trapulator 2.0, LED countdown clock, inventory slots
│   └── visualEffects.ts          # Comic popups ("POW!"), explosions, spark particles
├── input/
│   ├── keyboard.ts               # Player 1 & Player 2 keyboard controllers
│   └── ai/
│       └── spyAI.ts              # Autonomous bot controller with IQ heuristics
├── audio/
│   └── retroSynth.ts             # Web Audio API 8-bit sound synthesizer
└── main.ts                       # Entry point bootstrapping core engine and renderer
```

### Tick Execution Order (Every 1/60s)
1. **Clock Countdown**: Decrement active clocks; verify timeout elimination.
2. **Input Ingestion**: Process player key states and AI behavioral decisions.
3. **Movement & Collision**: Update positions, boundary checks, and door traversal with clearance offsets.
4. **Action Resolution**: Process furniture searches, item pickups, and trap triggers.
5. **Melee Combat Check**: Detect shared-room presence; resolve attacks and staggers.
6. **Victory Evaluation**: Check airport exit conditions for full briefcase delivery.
7. **Event Emission & Render**: Broadcast state updates to audio synth, VFX particle manager, and split-screen renderers.

---

## 17. Calibration Values & Design Invariants

- **Starting Countdown**: 180 seconds ($3:00$).
- **Trap Placement Time Cost**: 5 seconds deducted from setter's clock.
- **Trap Springing Penalty**: 7 seconds real-time unconsciousness + 20 seconds off clock.
- **Combat Hits to Knockout**: 7 solid strikes (15 damage per hit against 100 max health).
- **Health Regeneration**: 1 HP recovered every 2 seconds out of combat.
- **Door Clearance Buffer**: 35 coordinate units past doorframe into room center.
- **Door Cooldown**: 30 simulation ticks ($0.5$s) before reverse traversal is permitted.
