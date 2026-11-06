/**
 * Embassy Room & Furniture domain models.
 */

import { Direction, FurnitureType, SecretItemType, TrapType, SpyColor } from '../types';

export interface RoomBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface FurnitureData {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  heldItem?: SecretItemType;
  searched: boolean;
  armedTrap?: {
    type: TrapType;
    plantedBy: SpyColor;
  };
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
  armedTrap?: {
    type: TrapType.ACID_BUCKET | TrapType.ELECTROCUTION;
    plantedBy: SpyColor;
  };
}

export interface GroundItem {
  id: string;
  item: SecretItemType;
  x: number;
  y: number;
}

export class RoomInstance {
  public readonly id: string;
  public readonly name: string;
  public readonly isAirportExit: boolean;
  public readonly bounds: RoomBounds;
  public doors: DoorData[];
  public furniture: FurnitureData[];
  public groundItems: GroundItem[] = [];

  constructor(
    id: string,
    name: string,
    options: {
      bounds?: RoomBounds;
      doors?: DoorData[];
      furniture?: FurnitureData[];
      isAirportExit?: boolean;
    } = {}
  ) {
    this.id = id;
    this.name = name;
    this.isAirportExit = options.isAirportExit ?? false;
    this.bounds = options.bounds ?? { minX: 20, maxX: 300, minY: 50, maxY: 190 };
    this.doors = options.doors ?? [];
    this.furniture = options.furniture ?? [];
  }

  public getDoor(direction: Direction): DoorData | undefined {
    return this.doors.find((d) => d.direction === direction);
  }

  public getFurnitureAt(x: number, y: number, reachDistance: number = 25): FurnitureData | undefined {
    return this.furniture.find((f) => {
      const centerX = f.x + f.width / 2;
      const centerY = f.y + f.height / 2;
      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);
      return dx <= f.width / 2 + reachDistance && dy <= f.height / 2 + reachDistance;
    });
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

  public addGroundItem(item: SecretItemType, x: number, y: number): void {
    const id = `ground_${item}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.groundItems.push({ id, item, x, y });
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
