/**
 * House Layout Builder for Midnight Snackdown.
 *
 * Eight rooms form a ring around an interior courtyard, so there are always two
 * routes between any pair of rooms and every door is a choke point worth trapping.
 * The raiders start in opposite corners, two rooms from the garden gate either way.
 *
 *   [Garage]  <-> [Hall]   <-> [Porch] --> garden gate
 *      ^                          ^
 *      v                          v
 *   [Laundry]    (courtyard)   [Pantry]
 *      ^                          ^
 *      v                          v
 *   [Lounge]  <-> [Dining] <-> [Cellar]
 */

import { Direction, FurnitureType, LootType, OUTSIDE } from '../types';
import { DoorData, FurnitureData, RoomInstance } from './room';

export const RUSTY_START_ROOM = 'garage';
export const SOOT_START_ROOM = 'cellar';
export const EXIT_ROOM = 'porch';

export interface HouseOptions {
  /** Random source for loot placement; inject a seeded one for reproducible matches. */
  rng?: () => number;
}

export class House {
  public rooms: Map<string, RoomInstance> = new Map();
  public exitRoomId: string = '';

  constructor(rooms: RoomInstance[], exitRoomId: string) {
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
    this.exitRoomId = exitRoomId;
  }

  public getRoom(id: string): RoomInstance | undefined {
    return this.rooms.get(id);
  }
}

interface DoorSpec {
  dir: Direction;
  target: string;
  targetDir: Direction;
}

interface RoomSpec {
  id: string;
  name: string;
  doors: DoorSpec[];
  /** Furniture for the slots: back wall left, back wall right, floor left, floor right. */
  furniture: [FurnitureType, FurnitureType, FurnitureType, FurnitureType];
}

const { FRIDGE, CUPBOARD, TABLE, BIN, HAMPER } = FurnitureType;

const ROOM_SPECS: RoomSpec[] = [
  {
    id: 'garage',
    name: 'Garage',
    doors: [
      { dir: 'EAST', target: 'hall', targetDir: 'WEST' },
      { dir: 'SOUTH', target: 'laundry', targetDir: 'NORTH' }
    ],
    furniture: [CUPBOARD, FRIDGE, BIN, TABLE]
  },
  {
    id: 'hall',
    name: 'Hall',
    doors: [
      { dir: 'WEST', target: 'garage', targetDir: 'EAST' },
      { dir: 'EAST', target: 'porch', targetDir: 'WEST' }
    ],
    furniture: [CUPBOARD, CUPBOARD, TABLE, HAMPER]
  },
  {
    id: 'porch',
    name: 'Back Porch',
    doors: [
      { dir: 'WEST', target: 'hall', targetDir: 'EAST' },
      { dir: 'SOUTH', target: 'pantry', targetDir: 'NORTH' },
      { dir: 'EAST', target: OUTSIDE, targetDir: 'WEST' }
    ],
    furniture: [FRIDGE, CUPBOARD, BIN, HAMPER]
  },
  {
    id: 'pantry',
    name: 'Pantry',
    doors: [
      { dir: 'NORTH', target: 'porch', targetDir: 'SOUTH' },
      { dir: 'SOUTH', target: 'cellar', targetDir: 'NORTH' }
    ],
    furniture: [CUPBOARD, FRIDGE, TABLE, BIN]
  },
  {
    id: 'cellar',
    name: 'Cellar',
    doors: [
      { dir: 'NORTH', target: 'pantry', targetDir: 'SOUTH' },
      { dir: 'WEST', target: 'dining', targetDir: 'EAST' }
    ],
    furniture: [FRIDGE, CUPBOARD, HAMPER, BIN]
  },
  {
    id: 'dining',
    name: 'Dining Room',
    doors: [
      { dir: 'EAST', target: 'cellar', targetDir: 'WEST' },
      { dir: 'WEST', target: 'lounge', targetDir: 'EAST' }
    ],
    furniture: [CUPBOARD, CUPBOARD, TABLE, BIN]
  },
  {
    id: 'lounge',
    name: 'Lounge',
    doors: [
      { dir: 'EAST', target: 'dining', targetDir: 'WEST' },
      { dir: 'NORTH', target: 'laundry', targetDir: 'SOUTH' }
    ],
    furniture: [CUPBOARD, FRIDGE, TABLE, HAMPER]
  },
  {
    id: 'laundry',
    name: 'Laundry',
    doors: [
      { dir: 'SOUTH', target: 'lounge', targetDir: 'NORTH' },
      { dir: 'NORTH', target: 'garage', targetDir: 'SOUTH' }
    ],
    furniture: [CUPBOARD, CUPBOARD, HAMPER, BIN]
  }
];

const DOOR_COORDINATES: Record<Direction, { x: number; y: number; width: number; height: number }> = {
  NORTH: { x: 160, y: 52, width: 32, height: 16 },
  SOUTH: { x: 160, y: 188, width: 32, height: 16 },
  WEST: { x: 22, y: 120, width: 16, height: 32 },
  EAST: { x: 298, y: 120, width: 16, height: 32 }
};

/** Footprints of the four furniture slots, clear of every door's approach. */
const FURNITURE_SLOTS: { x: number; y: number; width: number; height: number }[] = [
  { x: 50, y: 18, width: 34, height: 32 },
  { x: 232, y: 18, width: 34, height: 32 },
  { x: 62, y: 130, width: 44, height: 26 },
  { x: 216, y: 130, width: 34, height: 30 }
];

const LOOT_TO_HIDE: LootType[] = [LootType.BASKET, LootType.PIZZA, LootType.CHEESE, LootType.HONEY, LootType.FISH];

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createHouse(options: HouseOptions = {}): House {
  const rng = options.rng ?? Math.random;

  const rooms = ROOM_SPECS.map((spec) => {
    const doors: DoorData[] = spec.doors.map((conn) => ({
      id: `door_${spec.id}_${conn.dir}`,
      direction: conn.dir,
      targetRoomId: conn.target,
      targetDoorDirection: conn.targetDir,
      ...DOOR_COORDINATES[conn.dir]
    }));

    const furniture: FurnitureData[] = spec.furniture.map((type, slot) => ({
      id: `furn_${spec.id}_${slot}`,
      type,
      ...FURNITURE_SLOTS[slot],
      searched: false
    }));

    return new RoomInstance(spec.id, spec.name, { doors, furniture, isExitRoom: spec.id === EXIT_ROOM });
  });

  // Hide one piece of loot per room, never in a starting room, so neither raider
  // gets a head start on the basket.
  const hidingRooms = shuffled(
    rooms.filter((room) => room.id !== RUSTY_START_ROOM && room.id !== SOOT_START_ROOM),
    rng
  );
  LOOT_TO_HIDE.forEach((item, index) => {
    const room = hidingRooms[index];
    room.furniture[Math.floor(rng() * room.furniture.length)].heldItem = item;
  });

  return new House(rooms, EXIT_ROOM);
}
