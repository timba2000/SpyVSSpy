import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../src/core/engine';
import { SecretItemType, TrapType } from '../src/core/types';

describe('GameEngine Integration & Simulation', () => {
  it('initializes match with 180s countdown and spies in start rooms', () => {
    const engine = new GameEngine();
    expect(engine.remainingSeconds).toBe(180);
    expect(engine.whiteSpy.currentRoomId).toBe('room_1');
    expect(engine.blackSpy.currentRoomId).toBe('room_8');
    expect(engine.isGameOver).toBe(false);
  });

  it('updates countdown clock each 60 ticks', () => {
    const engine = new GameEngine();
    const tickListener = vi.fn();
    engine.events.on('CLOCK_TICK', tickListener);

    // 60 ticks = 1 second elapsed
    for (let i = 0; i < 60; i++) {
      engine.tick();
    }

    expect(engine.remainingSeconds).toBe(179);
    expect(tickListener).toHaveBeenCalledWith({ remainingSeconds: 179 });
  });

  it('allows white spy to search safe in room_1 and acquire Briefcase', () => {
    const engine = new GameEngine();
    const whiteSpy = engine.whiteSpy;

    // Move white spy near safe (safe is at x: 60, y: 60 in room_1)
    whiteSpy.x = 60;
    whiteSpy.y = 60;

    engine.interactSpy('WHITE');
    expect(whiteSpy.state).toBe('SEARCHING');

    // Simulate search duration (60 ticks)
    for (let i = 0; i < 60; i++) {
      engine.tick();
    }

    expect(whiteSpy.state).toBe('IDLE');
    expect(whiteSpy.inventory.hasBriefcase).toBe(true);
  });

  it('applies time penalty and respawn cycle when a spy is killed', () => {
    const engine = new GameEngine();
    const killListener = vi.fn();
    const respawnListener = vi.fn();

    engine.events.on('SPY_KILLED', killListener);
    engine.events.on('SPY_RESPAWNED', respawnListener);

    const initialTime = engine.remainingSeconds;
    engine.killSpy(engine.whiteSpy, 'COMBAT', 'BLACK');

    expect(engine.whiteSpy.state).toBe('DEAD_ANGEL');
    expect(engine.remainingSeconds).toBe(initialTime - engine.DEATH_TIME_PENALTY_SECONDS);
    expect(killListener).toHaveBeenCalled();

    // Fast-forward respawn ticks (300 ticks = 5 seconds)
    for (let i = 0; i < 300; i++) {
      engine.tick();
    }

    expect(engine.whiteSpy.state).toBe('IDLE');
    expect(engine.whiteSpy.health).toBe(100);
    expect(respawnListener).toHaveBeenCalled();
  });

  it('triggers MATCH_WON when spy escapes with all required items at airport exit door', () => {
    const engine = new GameEngine();
    const whiteSpy = engine.whiteSpy;
    const winListener = vi.fn();
    engine.events.on('MATCH_WON', winListener);

    // Give white spy the complete set
    whiteSpy.inventory.pickupItem(SecretItemType.BRIEFCASE);
    whiteSpy.inventory.pickupItem(SecretItemType.PASSPORT);
    whiteSpy.inventory.pickupItem(SecretItemType.SECRET_PLANS);
    whiteSpy.inventory.pickupItem(SecretItemType.MONEY);
    whiteSpy.inventory.pickupItem(SecretItemType.KEY);

    expect(whiteSpy.inventory.hasAllEscapeItems()).toBe(true);

    // Move to airport exit room (room_4) near east door
    whiteSpy.currentRoomId = 'room_4';
    whiteSpy.x = 295;
    whiteSpy.y = 120;

    engine.interactSpy('WHITE');

    expect(engine.isGameOver).toBe(true);
    expect(engine.winner).toBe('WHITE');
    expect(winListener).toHaveBeenCalledWith({
      winner: 'WHITE',
      reason: 'AIRPORT_ESCAPE'
    });
  });

  it('arms furniture with bomb and kills victim when triggered', () => {
    const engine = new GameEngine();
    const blackSpy = engine.blackSpy;
    const whiteSpy = engine.whiteSpy;

    // Black spy in room_1 near safe (x: 60, y: 60)
    blackSpy.currentRoomId = 'room_1';
    blackSpy.x = 60;
    blackSpy.y = 60;

    const armed = engine.armTrap('BLACK', TrapType.BOMB);
    expect(armed).toBe(true);

    // White spy enters room_1 and searches the safe
    whiteSpy.currentRoomId = 'room_1';
    whiteSpy.x = 60;
    whiteSpy.y = 60;

    engine.interactSpy('WHITE');
    // Complete search
    for (let i = 0; i < 60; i++) {
      engine.tick();
    }

    expect(whiteSpy.state).toBe('DEAD_ANGEL');
  });

  it('smoothly transitions through doors without getting stuck or retriggering', () => {
    const engine = new GameEngine();
    const whiteSpy = engine.whiteSpy;

    // Room 1 has an East door leading to Room 2 at x: 298, y: 120
    expect(whiteSpy.currentRoomId).toBe('room_1');
    whiteSpy.x = 285;
    whiteSpy.y = 120;

    // Walk east into the door
    engine.moveSpy('WHITE', 1, 0);

    // Spy should now be in room_2
    expect(whiteSpy.currentRoomId).toBe('room_2');
    expect(whiteSpy.doorCooldown).toBeGreaterThan(0);
    // Positioned safely away from the west door (bounds.minX + 35 = 55)
    expect(whiteSpy.x).toBe(55);

    // Next tick: walking further east into room 2 should keep spy in room 2
    engine.moveSpy('WHITE', 1, 0);
    expect(whiteSpy.currentRoomId).toBe('room_2');
    expect(whiteSpy.x).toBeGreaterThan(55);
  });
});
