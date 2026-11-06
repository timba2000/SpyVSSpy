import { describe, it, expect } from 'vitest';
import { createStandardEmbassy } from '../src/core/room/embassyLayout';
import { SecretItemType } from '../src/core/types';

describe('Embassy Room Architecture', () => {
  it('creates an interconnected 8-room embassy with an airport exit', () => {
    const embassy = createStandardEmbassy();
    expect(embassy.rooms.size).toBe(8);
    expect(embassy.airportExitRoomId).toBe('room_4');

    const exitRoom = embassy.getRoom('room_4');
    expect(exitRoom?.isAirportExit).toBe(true);
  });

  it('distributes all 5 escape items across embassy furniture', () => {
    const embassy = createStandardEmbassy();
    const foundItems: SecretItemType[] = [];

    for (const room of embassy.rooms.values()) {
      for (const furn of room.furniture) {
        if (furn.heldItem) {
          foundItems.push(furn.heldItem);
        }
      }
    }

    expect(foundItems).toHaveLength(5);
    expect(foundItems).toContain(SecretItemType.BRIEFCASE);
    expect(foundItems).toContain(SecretItemType.PASSPORT);
    expect(foundItems).toContain(SecretItemType.SECRET_PLANS);
    expect(foundItems).toContain(SecretItemType.MONEY);
    expect(foundItems).toContain(SecretItemType.KEY);
  });

  it('clamps coordinates to room boundaries', () => {
    const embassy = createStandardEmbassy();
    const room = embassy.getRoom('room_1')!;

    const clamped = room.clampPosition(-100, 500);
    expect(clamped.x).toBe(room.bounds.minX);
    expect(clamped.y).toBe(room.bounds.maxY);
  });

  it('manages ground items inside room', () => {
    const embassy = createStandardEmbassy();
    const room = embassy.getRoom('room_1')!;

    room.addGroundItem(SecretItemType.MONEY, 100, 100);
    expect(room.groundItems).toHaveLength(1);

    const picked = room.takeGroundItemAt(102, 101, 10);
    expect(picked?.item).toBe(SecretItemType.MONEY);
    expect(room.groundItems).toHaveLength(0);
  });
});
