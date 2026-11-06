# Spy vs. Spy — Game Design & Mechanics Rules

## 1. Authoritative Reference
All game mechanics, timing values, scoring rules, and entity states must align with [`docs/game-design-document.md`](../../docs/game-design-document.md).

---

## 2. Core Pillars & Mechanics

### 1. Simultaneous Split-Screen ("Simulvision" & "Simulplay")
- Top viewport: White Spy (Player 1).
- Bottom viewport: Black Spy (Player 2 or AI).
- Both players act synchronously in a shared world. Viewing the opponent's pane to monitor trap placements is a core skill.
- When both spies occupy the same room, combat mode unifies visual focus.

### 2. The Five Traps & Remedies (C64 Authentic Spec)
| Trap | Placement | Fires When | Remedy | Remedy Fixture |
| :--- | :--- | :--- | :--- | :--- |
| **Bomb** | Any Furniture | Searched | 🪣 **Water Bucket** | Red Fire Box (Left Wall) |
| **Spring** | Any Furniture | Searched | ✂️ **Wire Cutters** | White Tool Box (Right Wall) |
| **Electrified Bucket** | Closed Doors | Door Opened | ☂️ **Umbrella** | Coat Rack (Floor / Corner) |
| **Gun with String** | Closed Doors | Door Opened | ✂️ **Scissors** | First Aid Kit (Back Wall) |
| **Time Bomb** | Room Floor | 15s after arming | *None* (Flee Room!) | N/A |

### 3. Inventory & The Briefcase Constraint
- **Single-Hand Limit**: Spies can carry only **one** item at a time (held in hand / white satchel).
- **The Briefcase**: The only container in the game; holds all 4 mission items (Passport, Money, Secret Plans, Key).
- Finding an item while already holding another loose item leaves the newly found item hidden in furniture.
- Spies can deliberately re-hide items in furniture.
- Entering combat destroys held traps and remedies; briefcase and mission items scatter into room furniture.

### 4. Close-Quarters Melee Combat
- Overhead Smash (Hold attack + Up/Down) vs. Body Jab (Hold attack + Left/Right).
- Approximately 7 solid strikes knock out an opponent.
- Doors remain functional during combat, allowing strategic retreats.

### 5. Airport Exit & The Guard
- One designated room houses the Airport Exit.
- The airport guard intercepts any spy missing required items, boots them back into the room, and inflicts a $-80$ point penalty.
- Arriving with the full briefcase triggers the plane getaway victory!

### 6. Clock Penalties & End States
- Springing a trap causes **7s real-time unconsciousness** plus a **20s deduction** from the victim's countdown timer ($27$s total).
- Placing a trap costs 5s of clock time ($+30$ score).
- A spy whose clock hits 0 is eliminated, but their planted traps remain live; the surviving spy plays on until escape or timeout.

### 7. In-Game Map & Scoring
- Trapulator Map reveals embassy layout and dots for rooms with missing items (costs $-70$ points).
- Scores determine rank titles at match completion (e.g. *Grand Master Spy* $\ge 5000$).
