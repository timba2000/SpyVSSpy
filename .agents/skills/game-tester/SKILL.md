---
name: game-tester
description: Automated test runner and game engine verification suite for Spy vs. Spy mechanics (inventory, traps, rooms, combat).
---

# Game Tester Skill

Use this skill to systematically verify the Spy vs. Spy game engine, mechanics, and rule enforcement.

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
   - `inventory.test.ts`: Verify briefcase requirement to hold multiple items.
   - `traps.test.ts`: Test all 5 trap types against defusal tools and naked triggers.
   - `room.test.ts`: Verify door graph transitions and boundary constraints.
   - `combat.test.ts`: Verify melee collision, damage, and angel death respawn.
   - `winCondition.test.ts`: Verify airport exit door check with all 4 items in briefcase.
