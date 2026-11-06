# Testing & Verification Guidelines — Spy vs. Spy

## Testing Mandates

1. **Test Coverage Focus**:
   - **Room Navigation**: Door traversal, bounds collision, moving between adjacent rooms.
   - **Inventory Logic**: Single item limit without Briefcase; carrying up to 4 items + Key with Briefcase.
   - **Trap Setting & Springing**:
     - Setting trap reduces trap inventory.
     - Opening furniture with active trap and NO counter-measure triggers fatal trap event.
     - Opening furniture with active trap WITH proper counter-measure disarms the trap safely.
   - **Combat Resolution**:
     - Club hit detection, health reduction, death transition.
     - Angel respawn timer countdown and clock acceleration penalty.
   - **Win Condition**:
     - Arriving at exit door with Briefcase containing Passport, Secret Plans, Money, Key triggers victory.
     - Arriving without all items denies exit.

2. **Automated Execution**:
   - Tests run headless via Vitest: `npm test`.
   - Never rely solely on visual inspection when code logic can be tested unit-wise.
