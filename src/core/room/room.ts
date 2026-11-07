/**
 * Room & Furniture domain models.
 */

import { Direction, FurnitureType, LootType, TrapType, RaiderId } from '../types';

export interface RoomBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ArmedTrap {
  type: TrapType;
  plantedBy: RaiderId;
}

export interface FurnitureData {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  heldItem?: LootType;
  searched: boolean;
  armedTrap?: ArmedTrap;
}

export interface DoorData {
  id: string;
  direction: Direction;
  targetRoomId: string;
  targetDoorDirection: Direction;
  x: number;
  y: number;
  width: number;
  height: number;
  armedTrap?: ArmedTrap;
}

export interface GroundItem {
  id: string;
  item: LootType;
  x: number;
  y: number;
}

export class RoomInstance {
  public readonly id: string;
  public readonly name: string;
  public readonly isExitRoom: boolean;
  public readonly bounds: RoomBounds;
  public doors: DoorData[];
  public furniture: FurnitureData[];
  public groundItems: GroundItem[] = [];
  private nextGroundItemId: number = 1;

  constructor(
    id: string,
    name: string,
    options: {
      bounds?: RoomBounds;
      doors?: DoorData[];
      furniture?: FurnitureData[];
      isExitRoom?: boolean;
    } = {}
  ) {
    this.id = id;
    this.name = name;
    this.isExitRoom = options.isExitRoom ?? false;
    this.bounds = options.bounds ?? { minX: 20, maxX: 300, minY: 50, maxY: 190 };
    this.doors = options.doors ?? [];
    this.furniture = options.furniture ?? [];
  }

  public getDoor(direction: Direction): DoorData | undefined {
    return this.doors.find((d) => d.direction === direction);
  }

  /**
   * Returns the closest piece of furniture within reach, so a raider standing
   * between two pieces always interacts with the one they are next to.
   */
  public getFurnitureAt(x: number, y: number, reachDistance: number = 25): FurnitureData | undefined {
    let nearest: FurnitureData | undefined;
    let nearestDistance = Infinity;

    for (const f of this.furniture) {
      const dx = Math.abs(x - (f.x + f.width / 2));
      const dy = Math.abs(y - (f.y + f.height / 2));
      if (dx > f.width / 2 + reachDistance || dy > f.height / 2 + reachDistance) continue;

      const distance = Math.hypot(dx, dy);
      if (distance < nearestDistance) {
        nearest = f;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  public getDoorNear(x: number, y: number, reachDistance: number = 20): DoorData | undefined {
    return this.doors.find((d) => {
      const dx = Math.abs(x - d.x);
      const dy = Math.abs(y - d.y);
      return dx <= d.width / 2 + reachDistance && dy <= d.height / 2 + reachDistance;
    });
  }

  public clampPosition(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x)),
      y: Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y))
    };
  }

  public addGroundItem(item: LootType, x: number, y: number): void {
    const position = this.clampPosition(x, y);
    this.groundItems.push({ id: `ground_${this.id}_${this.nextGroundItemId++}`, item, ...position });
  }

  public takeGroundItemAt(x: number, y: number, pickupRadius: number = 20): GroundItem | undefined {
    const idx = this.groundItems.findIndex((gi) => {
      const dist = Math.hypot(gi.x - x, gi.y - y);
      return dist <= pickupRadius;
    });

    if (idx !== -1) {
      const [item] = this.groundItems.splice(idx, 1);
      return item;
    }
    return undefined;
  }
}
