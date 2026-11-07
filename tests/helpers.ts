import { GameEngine } from '../src/core/engine';
import { Raider } from '../src/core/raider/raider';
import { createHouse } from '../src/core/room/houseLayout';
import { FEAST_ITEMS, LootType } from '../src/core/types';

/** Small seeded generator (mulberry32) so that simulations are reproducible. */
export function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newEngine(seed: number = 1, matchDurationSeconds?: number): GameEngine {
  return new GameEngine({ house: createHouse({ rng: seededRng(seed) }), matchDurationSeconds });
}

export function packFeast(raider: Raider): void {
  raider.inventory.pickupItem(LootType.BASKET);
  FEAST_ITEMS.forEach((item) => raider.inventory.pickupItem(item));
}

export function runTicks(engine: GameEngine, ticks: number): void {
  for (let i = 0; i < ticks; i++) {
    engine.tick();
  }
}

/** Stands a raider at a door's approach, ready to walk through it on the next move. */
export function standAtDoor(raider: Raider, roomId: string, x: number, y: number): void {
  raider.currentRoomId = roomId;
  raider.x = x;
  raider.y = y;
  raider.doorCooldown = 0;
}
