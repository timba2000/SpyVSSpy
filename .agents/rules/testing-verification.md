# Testing & Verification Guidelines: Midnight Snackdown

## Testing Mandates

1. **Test Coverage Focus**:
   - **Room Navigation**: Door traversal, bounds, moving between adjacent rooms.
   - **Inventory Logic**: One item without the basket; everything fits with it.
   - **Traps**:
     - Setting a trap reduces trap inventory.
     - Searching trapped furniture or crossing a trapped door without the right tool springs it.
     - With the right tool the trap is cleared safely.
     - Door traps work from both sides.
   - **Combat**: Hit detection, health reduction, knockout, interrupted searches.
   - **Clocks**: Per-raider clocks, knockout penalties, falling asleep, the draw.
   - **Win Condition**: The gate opens for a full feast and refuses anything less.
   - **AI**: Whole simulated matches finish in a win, so a stuck AI fails the suite.

2. **Automated Execution**:
   - Tests run headless via Vitest: `npm test`.
   - Never rely solely on visual inspection when logic can be unit tested.
   - Anything visual is also checked in the running game.
