/**
 * Embassy Layout Builder for Spy vs. Spy.
 * Creates interconnected room networks with distributed furniture and secret items.
 */

import { Direction, FurnitureType, SecretItemType } from '../types';
import { DoorData, FurnitureData, RoomInstance } from './room';

export interface EmbassyConfig {
  roomCount?: number;
  randomizeItems?: boolean;
}

export class Embassy {
  public rooms: Map<string, RoomInstance> = new Map();
  public airportExitRoomId: string = '';

  constructor(rooms: RoomInstance[], airportExitRoomId: string) {
    for (const room of rooms) {
      this.rooms.set(room.id, room);
    }
    this.airportExitRoomId = airportExitRoomId;
  }

  public getRoom(id: string): RoomInstance | undefined {
    return this.rooms.get(id);
  }
}

export function createStandardEmbassy(): Embassy {
  // A classic 8-room embassy layout (2 rows of 4 rooms)
  //
  // [Room 1] <-> [Room 2] <-> [Room 3] <-> [Room 4] (Airport Exit)
  //    ^            ^            ^            ^
  //    v            v            v            v
  // [Room 5] <-> [Room 6] <-> [Room 7] <-> [Room 8]

  const rooms: RoomInstance[] = [];

  const doorSpecs: { [key: string]: { dir: Direction; target: string; targetDir: Direction }[] } = {
    room_1: [
      { dir: 'EAST', target: 'room_2', targetDir: 'WEST' },
      { dir: 'SOUTH', target: 'room_5', targetDir: 'NORTH' }
    ],
    room_2: [
      { dir: 'WEST', target: 'room_1', targetDir: 'EAST' },
      { dir: 'EAST', target: 'room_3', targetDir: 'WEST' },
      { dir: 'SOUTH', target: 'room_6', targetDir: 'NORTH' }
    ],
    room_3: [
      { dir: 'WEST', target: 'room_2', targetDir: 'EAST' },
      { dir: 'EAST', target: 'room_4', targetDir: 'WEST' },
      { dir: 'SOUTH', target: 'room_7', targetDir: 'NORTH' }
    ],
    room_4: [
      { dir: 'WEST', target: 'room_3', targetDir: 'EAST' },
      { dir: 'SOUTH', target: 'room_8', targetDir: 'NORTH' },
      { dir: 'EAST', target: 'airport_runway', targetDir: 'WEST' }
    ],
    room_5: [
      { dir: 'NORTH', target: 'room_1', targetDir: 'SOUTH' },
      { dir: 'EAST', target: 'room_6', targetDir: 'WEST' }
    ],
    room_6: [
      { dir: 'NORTH', target: 'room_2', targetDir: 'SOUTH' },
      { dir: 'WEST', target: 'room_5', targetDir: 'EAST' },
      { dir: 'EAST', target: 'room_7', targetDir: 'WEST' }
    ],
    room_7: [
      { dir: 'NORTH', target: 'room_3', targetDir: 'SOUTH' },
      { dir: 'WEST', target: 'room_6', targetDir: 'EAST' },
      { dir: 'EAST', target: 'room_8', targetDir: 'WEST' }
    ],
    room_8: [
      { dir: 'NORTH', target: 'room_4', targetDir: 'SOUTH' },
      { dir: 'WEST', target: 'room_7', targetDir: 'EAST' }
    ]
  };

  const doorCoordinates: Record<Direction, { x: number; y: number; width: number; height: number }> = {
    NORTH: { x: 160, y: 52, width: 32, height: 16 },
    SOUTH: { x: 160, y: 188, width: 32, height: 16 },
    WEST: { x: 22, y: 120, width: 16, height: 32 },
    EAST: { x: 298, y: 120, width: 16, height: 32 }
  };

  for (let i = 1; i <= 8; i++) {
    const roomId = `room_${i}`;
    const isExit = roomId === 'room_4';

    const connections = doorSpecs[roomId] ?? [];
    const doors: DoorData[] = connections.map((conn) => {
      const coords = doorCoordinates[conn.dir];
      return {
        id: `door_${roomId}_${conn.dir}`,
        direction: conn.dir,
        targetRoomId: conn.target,
        targetDoorDirection: conn.targetDir,
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height
      };
    });

    // Provide distinct furniture pieces per room
    const furniture: FurnitureData[] = [
      {
        id: `furn_${roomId}_safe`,
        type: FurnitureType.SAFE,
        x: 60,
        y: 60,
        width: 24,
        height: 24,
        searched: false
      },
      {
        id: `furn_${roomId}_painting`,
        type: FurnitureType.PAINTING,
        x: 230,
        y: 55,
        width: 28,
        height: 20,
        searched: false
      },
      {
        id: `furn_${roomId}_desk`,
        type: FurnitureType.DESK,
        x: 90,
        y: 130,
        width: 36,
        height: 24,
        searched: false
      },
      {
        id: `furn_${roomId}_coat`,
        type: FurnitureType.COAT_RACK,
        x: 250,
        y: 120,
        width: 16,
        height: 32,
        searched: false
      }
    ];

    rooms.push(new RoomInstance(roomId, `Embassy Room ${i}`, { doors, furniture, isAirportExit: isExit }));
  }

  // Hide the 5 essential secret items in specific furniture pieces
  // Briefcase in Room 1 (safe)
  // Passport in Room 2 (desk)
  // Secret Plans in Room 3 (painting)
  // Money in Room 6 (safe)
  // Key in Room 7 (coat rack)
  const itemPlacements: { roomId: string; furnType: FurnitureType; item: SecretItemType }[] = [
    { roomId: 'room_1', furnType: FurnitureType.SAFE, item: SecretItemType.BRIEFCASE },
    { roomId: 'room_2', furnType: FurnitureType.DESK, item: SecretItemType.PASSPORT },
    { roomId: 'room_3', furnType: FurnitureType.PAINTING, item: SecretItemType.SECRET_PLANS },
    { roomId: 'room_6', furnType: FurnitureType.SAFE, item: SecretItemType.MONEY },
    { roomId: 'room_7', furnType: FurnitureType.COAT_RACK, item: SecretItemType.KEY }
  ];

  for (const placement of itemPlacements) {
    const room = rooms.find((r) => r.id === placement.roomId);
    if (room) {
      const furn = room.furniture.find((f) => f.type === placement.furnType);
      if (furn) {
        furn.heldItem = placement.item;
      }
    }
  }

  return new Embassy(rooms, 'room_4');
}
