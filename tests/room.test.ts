import { describe, it, expect } from 'vitest';
import { createHouse, RUSTY_START_ROOM, SOOT_START_ROOM } from '../src/core/room/houseLayout';
import { LootType, OUTSIDE } from '../src/core/types';
import { seededRng } from './helpers';

describe('House Room Architecture', () => {
  it('creates an interconnected 8-room house with a garden exit', () => {
    const house = createHouse();
    expect(house.rooms.size).toBe(8);
    expect(house.exitRoomId).toBe('porch');

    const exitRoom = house.getRoom('porch');
    expect(exitRoom?.isExitRoom).toBe(true);
    expect(exitRoom?.doors.some((d) => d.targetRoomId === OUTSIDE)).toBe(true);
  });

  it('links every door to a matching door on the other side', () => {
    const house = createHouse();
    for (const room of house.rooms.values()) {
      for (const door of room.doors) {
        if (door.targetRoomId === OUTSIDE) continue;
        const otherSide = house.getRoom(door.targetRoomId)?.getDoor(door.targetDoorDirection);
        expect(otherSide?.targetRoomId, door.id).toBe(room.id);
        expect(otherSide?.targetDoorDirection, door.id).toBe(door.direction);
      }
    }
  });

  it('hides all 5 pieces of loot, one per room, never in a starting room', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const house = createHouse({ rng: seededRng(seed) });
      const found: LootType[] = [];

      for (const room of house.rooms.values()) {
        const inRoom = room.furniture.filter((f) => f.heldItem);
        expect(inRoom.length).toBeLessThanOrEqual(1);
        if (room.id === RUSTY_START_ROOM || room.id === SOOT_START_ROOM) {
          expect(inRoom).toHaveLength(0);
        }
        found.push(...inRoom.map((f) => f.heldItem!));
      }

      expect(found.sort()).toEqual(Object.values(LootType).sort());
    }
  });

  it('places loot reproducibly from a seed and differently across seeds', () => {
    const layout = (seed: number) =>
      [...createHouse({ rng: seededRng(seed) }).rooms.values()]
        .flatMap((room) => room.furniture)
        .filter((f) => f.heldItem)
        .map((f) => `${f.id}:${f.heldItem}`)
        .sort()
        .join();

    expect(layout(7)).toBe(layout(7));
    expect(new Set([1, 2, 3, 4, 5].map(layout)).size).toBeGreaterThan(1);
  });

  it('keeps every search spot reachable from inside the room bounds', () => {
    const house = createHouse();
    for (const room of house.rooms.values()) {
      for (const f of room.furniture) {
        const standing = room.clampPosition(f.x + f.width / 2, f.y + f.height / 2);
        expect(room.getFurnitureAt(standing.x, standing.y, 25)?.id, f.id).toBe(f.id);
      }
    }
  });

  it('returns the nearest furniture when two pieces are in reach', () => {
    const room = createHouse().getRoom('garage')!;
    const [a, b] = room.furniture;
    // Move two pieces close together, with the later one in the list nearer the raider.
    a.x = 100;
    a.y = 100;
    b.x = 150;
    b.y = 100;

    const nearB = room.getFurnitureAt(b.x + b.width / 2, b.y + b.height / 2, 40);
    expect(nearB?.id).toBe(b.id);
  });

  it('clamps coordinates to room boundaries', () => {
    const room = createHouse().getRoom('garage')!;

    const clamped = room.clampPosition(-100, 500);
    expect(clamped.x).toBe(room.bounds.minX);
    expect(clamped.y).toBe(room.bounds.maxY);
  });

  it('manages ground items inside room', () => {
    const room = createHouse().getRoom('garage')!;

    room.addGroundItem(LootType.FISH, 100, 100);
    expect(room.groundItems).toHaveLength(1);

    const picked = room.takeGroundItemAt(102, 101, 10);
    expect(picked?.item).toBe(LootType.FISH);
    expect(room.groundItems).toHaveLength(0);
  });

  it('never leaves dropped loot outside the room', () => {
    const room = createHouse().getRoom('garage')!;
    room.addGroundItem(LootType.FISH, 1000, -1000);
    expect(room.groundItems[0].x).toBe(room.bounds.maxX);
    expect(room.groundItems[0].y).toBe(room.bounds.minY);
  });
});
