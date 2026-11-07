---
name: game-tester
description: Automated test runner and game engine verification suite for Midnight Snackdown mechanics (inventory, traps, rooms, combat, AI).
---

# Game Tester Skill

Use this skill to systematically verify the Midnight Snackdown game engine, mechanics, and rule enforcement.

## Verification Checklist

1. **Type Checking**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Headless Mechanics Tests**:
   ```powershell
   npm test
   ```
3. **Core Scenarios to Validate**:
   - `inventory.test.ts`: Basket rules and carrying limits.
   - `traps.test.ts`: All 5 trap types against the right tool, the wrong tool, and no tool.
   - `room.test.ts`: House layout, door links, loot placement and bounds.
   - `combat.test.ts`: Swat range, facing, damage and knockouts.
   - `engine.test.ts`: Door travel, double-sided door traps, the gate, clocks and end states.
   - `ai.test.ts`: Whole simulated matches, plus the stuck-AI regressions.
