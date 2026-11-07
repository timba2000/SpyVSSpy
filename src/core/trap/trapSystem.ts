/**
 * Trap Management & Resolution System.
 */

import { DOOR_TRAPS, FURNITURE_TRAPS, RaiderId, ToolType, TrapType, TRAP_COUNTER_MAP } from '../types';
import { ArmedTrap, DoorData, FurnitureData } from '../room/room';
import { Inventory } from '../raider/inventory';

export type TrapInteractResult =
  | { status: 'SAFE' }
  | { status: 'CLEARED'; trapType: TrapType; toolUsed: ToolType }
  | { status: 'SPRUNG'; trapType: TrapType; plantedBy: RaiderId };

export class TrapSystem {
  /**
   * Hide a trap in a piece of furniture.
   */
  public static armFurniture(
    furniture: FurnitureData,
    trapType: TrapType,
    planter: RaiderId,
    inventory: Inventory
  ): boolean {
    if (!FURNITURE_TRAPS.includes(trapType)) return false;

    // Cannot trap if already trapped
    if (furniture.armedTrap) return false;

    if (inventory.useTrap(trapType)) {
      furniture.armedTrap = { type: trapType, plantedBy: planter };
      return true;
    }
    return false;
  }

  /**
   * Lay a trap at a door.
   */
  public static armDoor(door: DoorData, trapType: TrapType, planter: RaiderId, inventory: Inventory): boolean {
    if (!DOOR_TRAPS.includes(trapType)) return false;

    if (door.armedTrap) return false;

    if (inventory.useTrap(trapType)) {
      door.armedTrap = { type: trapType, plantedBy: planter };
      return true;
    }
    return false;
  }

  /**
   * Inspect and resolve interaction with furniture.
   */
  public static interactWithFurniture(furniture: FurnitureData, inventory: Inventory): TrapInteractResult {
    const result = this.resolve(furniture.armedTrap, inventory);
    if (result.status !== 'SAFE') furniture.armedTrap = undefined;
    return result;
  }

  /**
   * Inspect and resolve passing through a door.
   */
  public static traverseDoor(door: DoorData, inventory: Inventory): TrapInteractResult {
    const result = this.resolve(door.armedTrap, inventory);
    if (result.status !== 'SAFE') door.armedTrap = undefined;
    return result;
  }

  private static resolve(trap: ArmedTrap | undefined, inventory: Inventory): TrapInteractResult {
    if (!trap) {
      return { status: 'SAFE' };
    }

    const requiredTool = TRAP_COUNTER_MAP[trap.type];
    if (inventory.activeTool === requiredTool) {
      return { status: 'CLEARED', trapType: trap.type, toolUsed: requiredTool };
    }
    return { status: 'SPRUNG', trapType: trap.type, plantedBy: trap.plantedBy };
  }
}
