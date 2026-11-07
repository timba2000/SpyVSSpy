import { describe, it, expect } from 'vitest';
import { RivalAI } from '../src/input/ai/rivalAI';
import { LootType, TrapType } from '../src/core/types';
import { newEngine, packFeast, seededRng, standAtDoor } from './helpers';

const TICKS_PER_MATCH = 180 * 60;

function play(seed: number, ticks: number = TICKS_PER_MATCH) {
  const engine = newEngine(seed);
  const ai = new RivalAI(engine, 'SOOT', seededRng(seed + 1000));
  for (let i = 0; i < ticks && !engine.isGameOver; i++) {
    ai.update();
    engine.tick();
  }
  return engine;
}

describe('Rival AI', () => {
  it('wins a whole match against an idle rival on every layout tried', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const engine = play(seed);
      expect(engine.winner, `seed ${seed}`).toBe('SOOT');
    }
  });

  it('is reproducible from a seed', () => {
    const a = play(11);
    const b = play(11);
    expect(a.tickCount).toBe(b.tickCount);
  });

  it('does not swap forever between floor loot and what it is carrying', () => {
    const engine = newEngine();
    const ai = new RivalAI(engine, 'SOOT', seededRng(5));
    const { soot } = engine;
    const room = engine.getRoom(soot.currentRoomId);

    soot.inventory.pickupItem(LootType.PIZZA);
    room.addGroundItem(LootType.FISH, soot.x, soot.y);

    for (let i = 0; i < 120; i++) {
      ai.update();
      engine.tick();
    }

    // It kept the pizza, left the fish, and moved on to other work.
    expect(soot.inventory.heldItem).toBe(LootType.PIZZA);
    expect(room.groundItems.map((gi) => gi.item)).toEqual([LootType.FISH]);
  });

  it('searches its starting room before leaving it, on every layout tried', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const engine = newEngine(seed);
      const ai = new RivalAI(engine, 'SOOT', seededRng(seed));
      const startRoom = engine.getRoom(engine.soot.currentRoomId);

      let left = false;
      for (let i = 0; i < TICKS_PER_MATCH && !left; i++) {
        ai.update();
        engine.tick();
        if (engine.soot.currentRoomId !== startRoom.id) left = true;
      }

      // Pieces it trapped itself are deliberately left for later.
      const skipped = startRoom.furniture.filter((f) => !f.searched && f.armedTrap?.plantedBy !== 'SOOT');
      expect(skipped, `seed ${seed}`).toEqual([]);
    }
  });

  it('heads to the gate as soon as the feast is packed, from any room', () => {
    for (const roomId of ['cellar', 'dining', 'lounge', 'laundry', 'garage', 'hall', 'pantry', 'porch']) {
      const engine = newEngine();
      const ai = new RivalAI(engine, 'SOOT', seededRng(9));
      packFeast(engine.soot);
      standAtDoor(engine.soot, roomId, 160, 120);

      for (let i = 0; i < 60 * 30 && !engine.isGameOver; i++) {
        ai.update();
        engine.tick();
      }

      expect(engine.winner, roomId).toBe('SOOT');
    }
  });

  it('chases and swats a rival who is carrying loot', () => {
    const engine = newEngine();
    const ai = new RivalAI(engine, 'SOOT', seededRng(3));
    const { rusty, soot } = engine;
    rusty.inventory.pickupItem(LootType.BASKET);
    rusty.currentRoomId = soot.currentRoomId;
    rusty.x = 260;
    rusty.y = 170;

    for (let i = 0; i < 600 && rusty.state !== 'KNOCKED_OUT'; i++) {
      ai.update();
      engine.tick();
    }

    expect(rusty.state).toBe('KNOCKED_OUT');
  });

  it('does not walk into its own door trap', () => {
    const engine = newEngine();
    const ai = new RivalAI(engine, 'SOOT', seededRng(2));
    const { soot } = engine;
    packFeast(soot);

    // Soot traps the only door it needs on the way from the hall to the porch
    standAtDoor(soot, 'hall', 280, 120);
    expect(engine.armTrap('SOOT', TrapType.MARBLE_SPILL)).toBe(true);

    for (let i = 0; i < 60 * 15 && !engine.isGameOver; i++) {
      ai.update();
      engine.tick();
      expect(soot.state).not.toBe('KNOCKED_OUT');
    }

    expect(engine.winner).toBe('SOOT');
  });

  it('sets traps during a match', () => {
    let trapsSet = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const engine = newEngine(seed);
      const ai = new RivalAI(engine, 'SOOT', seededRng(seed));
      engine.events.on('TRAP_SET', () => trapsSet++);
      for (let i = 0; i < TICKS_PER_MATCH && !engine.isGameOver; i++) {
        ai.update();
        engine.tick();
      }
    }
    expect(trapsSet).toBeGreaterThan(0);
  });
});
