import { describe, it, expect, vi } from 'vitest';
import { LootType, ToolType, TrapType } from '../src/core/types';
import { RUSTY_START_ROOM, SOOT_START_ROOM } from '../src/core/room/houseLayout';
import { newEngine, packFeast, runTicks, standAtDoor } from './helpers';

describe('GameEngine Integration & Simulation', () => {
  it('initializes match with 180s clocks and raiders in start rooms', () => {
    const engine = newEngine();
    expect(engine.rusty.clockSeconds).toBe(180);
    expect(engine.soot.clockSeconds).toBe(180);
    expect(engine.rusty.currentRoomId).toBe(RUSTY_START_ROOM);
    expect(engine.soot.currentRoomId).toBe(SOOT_START_ROOM);
    expect(engine.isGameOver).toBe(false);
  });

  it('updates both clocks each 60 ticks', () => {
    const engine = newEngine();
    const tickListener = vi.fn();
    engine.events.on('CLOCK_TICK', tickListener);

    runTicks(engine, 60);

    expect(engine.rusty.clockSeconds).toBe(179);
    expect(engine.soot.clockSeconds).toBe(179);
    expect(tickListener).toHaveBeenCalledWith({ raider: 'RUSTY', clockSeconds: 179 });
  });

  it('lets a raider search furniture and take the loot inside', () => {
    const engine = newEngine();
    const rusty = engine.rusty;
    const fridge = engine.getRoom('garage').furniture[1];
    fridge.heldItem = LootType.BASKET;

    rusty.x = fridge.x + fridge.width / 2;
    rusty.y = 50;

    engine.interactRaider('RUSTY');
    expect(rusty.state).toBe('SEARCHING');

    runTicks(engine, 60);

    expect(rusty.state).toBe('IDLE');
    expect(rusty.inventory.hasBasket).toBe(true);
    expect(fridge.searched).toBe(true);
    expect(fridge.heldItem).toBeUndefined();
  });

  it('applies time penalty and wake-up cycle when a raider is knocked out', () => {
    const engine = newEngine();
    const knockoutListener = vi.fn();
    const wakeListener = vi.fn();

    engine.events.on('RAIDER_KNOCKED_OUT', knockoutListener);
    engine.events.on('RAIDER_WOKE_UP', wakeListener);

    const initialTime = engine.rusty.clockSeconds;
    engine.knockOutRaider(engine.rusty, 'COMBAT', 'SOOT');

    expect(engine.rusty.state).toBe('KNOCKED_OUT');
    expect(engine.rusty.clockSeconds).toBe(initialTime - engine.KNOCKOUT_TIME_PENALTY_SECONDS);
    expect(knockoutListener).toHaveBeenCalled();

    // Fast-forward wake-up ticks (300 ticks = 5 seconds)
    runTicks(engine, 300);

    expect(engine.rusty.state).toBe('IDLE');
    expect(engine.rusty.health).toBe(100);
    expect(wakeListener).toHaveBeenCalled();
  });

  it('only charges the knockout penalty to the raider who was knocked out', () => {
    const engine = newEngine();
    engine.knockOutRaider(engine.rusty, 'COMBAT', 'SOOT');
    expect(engine.soot.clockSeconds).toBe(180);
  });

  it('triggers MATCH_WON when a raider leaves with the full feast using the action key', () => {
    const engine = newEngine();
    const rusty = engine.rusty;
    const winListener = vi.fn();
    engine.events.on('MATCH_WON', winListener);

    packFeast(rusty);
    expect(rusty.inventory.hasFullFeast()).toBe(true);

    standAtDoor(rusty, 'porch', 295, 120);
    engine.interactRaider('RUSTY');

    expect(engine.isGameOver).toBe(true);
    expect(engine.winner).toBe('RUSTY');
    expect(winListener).toHaveBeenCalledWith({ winner: 'RUSTY' });
  });

  it('triggers MATCH_WON when a raider walks out with the full feast', () => {
    const engine = newEngine();
    packFeast(engine.rusty);
    standAtDoor(engine.rusty, 'porch', 290, 120);

    engine.moveRaider('RUSTY', 1, 0);

    expect(engine.winner).toBe('RUSTY');
  });

  it('refuses the gate without the full feast and keeps the raider in the room', () => {
    const engine = newEngine();
    const refused = vi.fn();
    engine.events.on('GATE_REFUSED', refused);
    standAtDoor(engine.rusty, 'porch', 299, 120);

    engine.moveRaider('RUSTY', 1, 0);

    expect(engine.isGameOver).toBe(false);
    expect(refused).toHaveBeenCalledTimes(1);
    expect(engine.rusty.currentRoomId).toBe('porch');
    expect(engine.rusty.x).toBeLessThanOrEqual(engine.getRoom('porch').bounds.maxX);

    // Pushing against the gate does not repeat the refusal every tick
    engine.moveRaider('RUSTY', 1, 0);
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it('never lets a raider walk through the wall at a refused gate', () => {
    const engine = newEngine();
    standAtDoor(engine.rusty, 'porch', 290, 120);

    for (let i = 0; i < 120; i++) {
      engine.moveRaider('RUSTY', 1, 0);
      engine.tick();
      expect(engine.rusty.x).toBeLessThanOrEqual(engine.getRoom('porch').bounds.maxX);
    }
  });

  it('does not let the action key bypass a trap on the gate', () => {
    const engine = newEngine();
    const planter = engine.soot;
    standAtDoor(planter, 'porch', 295, 120);
    expect(engine.armTrap('SOOT', TrapType.MARBLE_SPILL)).toBe(true);

    packFeast(engine.rusty);
    standAtDoor(engine.rusty, 'porch', 295, 120);
    engine.interactRaider('RUSTY');

    expect(engine.isGameOver).toBe(false);
    expect(engine.rusty.state).toBe('KNOCKED_OUT');
  });

  it('arms furniture with a trap and knocks out a victim who searches it', () => {
    const engine = newEngine();
    const { rusty, soot } = engine;
    const fridge = engine.getRoom('garage').furniture[1];
    const x = fridge.x + fridge.width / 2;

    soot.currentRoomId = 'garage';
    soot.x = x;
    soot.y = 50;

    expect(engine.armTrap('SOOT', TrapType.SNAP_TRAP)).toBe(true);

    rusty.x = x;
    rusty.y = 50;

    engine.interactRaider('RUSTY');
    runTicks(engine, 60);

    expect(rusty.state).toBe('KNOCKED_OUT');
  });

  it('smoothly transitions through doors without getting stuck or retriggering', () => {
    const engine = newEngine();
    const rusty = engine.rusty;

    // The garage has an East door leading to the hall at x: 298, y: 120
    rusty.x = 285;
    rusty.y = 120;

    engine.moveRaider('RUSTY', 1, 0);

    expect(rusty.currentRoomId).toBe('hall');
    expect(rusty.doorCooldown).toBeGreaterThan(0);
    // Positioned safely away from the west door (bounds.minX + 35 = 55)
    expect(rusty.x).toBe(55);

    // Walking further east keeps the raider in the hall
    engine.moveRaider('RUSTY', 1, 0);
    expect(rusty.currentRoomId).toBe('hall');
    expect(rusty.x).toBeGreaterThan(55);
  });

  it('springs a door trap on a raider coming from the other side', () => {
    const engine = newEngine();
    const { rusty, soot } = engine;

    // Soot lays the trap on the hall side of the garage/hall door
    standAtDoor(soot, 'hall', 40, 120);
    expect(engine.armTrap('SOOT', TrapType.STATIC_MAT)).toBe(true);

    // Rusty walks into the same door from the garage
    standAtDoor(rusty, 'garage', 285, 120);
    engine.moveRaider('RUSTY', 1, 0);

    expect(rusty.state).toBe('KNOCKED_OUT');
    expect(rusty.currentRoomId).toBe('garage');
  });

  it('removes a door trap from both sides once it has gone off', () => {
    const engine = newEngine();
    const { rusty, soot } = engine;
    standAtDoor(soot, 'hall', 40, 120);
    engine.armTrap('SOOT', TrapType.STATIC_MAT);

    rusty.inventory.setActiveTool(ToolType.RUBBER_BOOTS);
    standAtDoor(rusty, 'garage', 285, 120);
    engine.moveRaider('RUSTY', 1, 0);

    expect(rusty.currentRoomId).toBe('hall');
    expect(engine.getRoom('garage').getDoor('EAST')?.armedTrap).toBeUndefined();
    expect(engine.getRoom('hall').getDoor('WEST')?.armedTrap).toBeUndefined();
  });

  it('returns to idle when the raider stops moving', () => {
    const engine = newEngine();
    engine.moveRaider('RUSTY', 1, 0);
    expect(engine.rusty.state).toBe('WALKING');

    engine.moveRaider('RUSTY', 0, 0);
    expect(engine.rusty.state).toBe('IDLE');
  });

  it('does not emit movement events for a raider standing still', () => {
    const engine = newEngine();
    const moved = vi.fn();
    engine.events.on('RAIDER_MOVED', moved);
    engine.moveRaider('RUSTY', 0, 0);
    expect(moved).not.toHaveBeenCalled();
  });

  it('keeps a swat going while the raider walks', () => {
    const engine = newEngine();
    engine.attackRaider('RUSTY');
    engine.moveRaider('RUSTY', 1, 0);
    expect(engine.rusty.state).toBe('ATTACKING');

    runTicks(engine, engine.rusty.attackDurationTicks);
    expect(engine.rusty.state).toBe('IDLE');
  });

  it('turns to face the rival when swatting', () => {
    const engine = newEngine();
    const { rusty, soot } = engine;
    soot.currentRoomId = rusty.currentRoomId;
    rusty.x = 100;
    rusty.y = 100;
    soot.x = 80;
    soot.y = 100;
    rusty.facing = 'EAST';

    engine.attackRaider('RUSTY');

    expect(rusty.facing).toBe('WEST');
    expect(soot.health).toBeLessThan(100);
  });

  it('scatters loot at separate spots inside the room on a knockout', () => {
    const engine = newEngine();
    const rusty = engine.rusty;
    packFeast(rusty);
    rusty.x = 20;
    rusty.y = 50;

    engine.knockOutRaider(rusty, 'TRAP', 'SOOT');

    const room = engine.getRoom(rusty.currentRoomId);
    expect(room.groundItems).toHaveLength(5);
    expect(new Set(room.groundItems.map((gi) => `${gi.x},${gi.y}`)).size).toBeGreaterThan(1);
    for (const gi of room.groundItems) {
      expect(gi.x).toBeGreaterThanOrEqual(room.bounds.minX);
      expect(gi.y).toBeGreaterThanOrEqual(room.bounds.minY);
    }
  });
});

describe('Clocks & End States', () => {
  it('puts a raider to sleep when their clock runs out while the rival plays on', () => {
    const engine = newEngine();
    const outOfTime = vi.fn();
    engine.events.on('RAIDER_OUT_OF_TIME', outOfTime);
    engine.rusty.clockSeconds = 1;

    runTicks(engine, 60);

    expect(engine.rusty.state).toBe('OUT_OF_TIME');
    expect(outOfTime).toHaveBeenCalledWith({ raider: 'RUSTY' });
    expect(engine.isGameOver).toBe(false);
    expect(engine.soot.clockSeconds).toBe(179);
  });

  it('leaves a sleeping raider loot and traps behind for the rival', () => {
    const engine = newEngine();
    const { rusty, soot } = engine;
    rusty.inventory.pickupItem(LootType.BASKET);
    const fridge = engine.getRoom('garage').furniture[1];
    rusty.x = fridge.x + fridge.width / 2;
    rusty.y = 50;
    engine.armTrap('RUSTY', TrapType.SNAP_TRAP);
    rusty.clockSeconds = 1;

    runTicks(engine, 60);

    expect(engine.getRoom('garage').groundItems.map((gi) => gi.item)).toContain(LootType.BASKET);
    expect(fridge.armedTrap?.plantedBy).toBe('RUSTY');

    // The match can still be won by the raider who is left
    packFeast(soot);
    standAtDoor(soot, 'porch', 290, 120);
    engine.moveRaider('SOOT', 1, 0);
    expect(engine.winner).toBe('SOOT');
  });

  it('keeps a sleeping raider asleep and unable to act', () => {
    const engine = newEngine();
    engine.rusty.clockSeconds = 1;
    runTicks(engine, 60);

    engine.moveRaider('RUSTY', 1, 0);
    engine.attackRaider('RUSTY');
    expect(engine.rusty.state).toBe('OUT_OF_TIME');

    runTicks(engine, 600);
    expect(engine.rusty.state).toBe('OUT_OF_TIME');
    expect(engine.rusty.clockSeconds).toBe(0);
  });

  it('ends in a draw when both clocks have run out', () => {
    const engine = newEngine(1, 2);
    const timeUp = vi.fn();
    engine.events.on('TIME_UP', timeUp);

    runTicks(engine, 120);

    expect(engine.isGameOver).toBe(true);
    expect(engine.winner).toBeUndefined();
    expect(timeUp).toHaveBeenCalledTimes(1);
  });

  it('never shows a negative clock, and a knockout at low time ends that raider at once', () => {
    const engine = newEngine();
    engine.rusty.clockSeconds = 5;

    engine.knockOutRaider(engine.rusty, 'TRAP', 'SOOT');

    expect(engine.rusty.clockSeconds).toBe(0);
    expect(engine.rusty.state).toBe('OUT_OF_TIME');
    runTicks(engine, 120);
    expect(engine.rusty.clockSeconds).toBe(0);
  });
});
