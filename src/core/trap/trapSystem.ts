/**
 * Booby Trap Management & Resolution System.
 */

import { CounterItemType, SpyColor, TrapType, TRAP_COUNTER_MAP } from '../types';
import { DoorData, FurnitureData } from '../room/room';
import { Inventory } from '../spy/inventory';

export type TrapInteractResult =
  | { status: 'SAFE'; itemFound?: boolean }
  | { status: 'DEFUSED'; trapType: TrapType; toolUsed: CounterItemType }
  | { status: 'TRIGGERED'; trapType: TrapType; plantedBy: SpyColor };

export class TrapSystem {
  /**
   * Arm a furniture piece with a trap.
   */
  public static armFurniture(
    furniture: FurnitureData,
    trapType: TrapType,
    planterColor: SpyColor,
    inventory: Inventory
  ): boolean {
    // Only bomb, spring, and dynamite are furniture traps
    const allowed = [TrapType.BOMB, TrapType.SPRING, TrapType.DYNAMITE];
    if (!allowed.includes(trapType)) return false;

    // Cannot trap if already trapped
    if (furniture.armedTrap) return false;

    if (inventory.useTrap(trapType)) {
      furniture.armedTrap = {
        type: trapType,
        plantedBy: planterColor
      };
      return true;
    }
    return false;
  }

  /**
   * Arm a door with a trap (Acid bucket or Electrocution).
   */
  public static armDoor(
    door: DoorData,
    trapType: TrapType,
    planterColor: SpyColor,
    inventory: Inventory
  ): boolean {
    const allowed = [TrapType.ACID_BUCKET, TrapType.ELECTROCUTION];
    if (!allowed.includes(trapType)) return false;

    if (door.armedTrap) return false;

    if (inventory.useTrap(trapType)) {
      door.armedTrap = {
        type: trapType as TrapType.ACID_BUCKET | TrapType.ELECTROCUTION,
        plantedBy: planterColor
      };
      return true;
    }
    return false;
  }

  /**
   * Inspect and resolve interaction with furniture.
   */
  public static interactWithFurniture(furniture: FurnitureData, inventory: Inventory): TrapInteractResult {
    if (!furniture.armedTrap) {
      return { status: 'SAFE' };
    }

    const trapType = furniture.armedTrap.type;
    const requiredTool = TRAP_COUNTER_MAP[trapType];

    // Check if spy is holding the correct defusal tool
    if (inventory.activeTool === requiredTool) {
      furniture.armedTrap = undefined;
      return {
        status: 'DEFUSED',
        trapType,
        toolUsed: requiredTool
      };
    }

    // Trap springs!
    const planter = furniture.armedTrap.plantedBy;
    furniture.armedTrap = undefined; // trap consumed upon detonation
    return {
      status: 'TRIGGERED',
      trapType,
      plantedBy: planter
    };
  }

  /**
   * Inspect and resolve passing through a door.
   */
  public static traverseDoor(door: DoorData, inventory: Inventory): TrapInteractResult {
    if (!door.armedTrap) {
      return { status: 'SAFE' };
    }

    const trapType = door.armedTrap.type;
    const requiredTool = TRAP_COUNTER_MAP[trapType];

    if (inventory.activeTool === requiredTool) {
      door.armedTrap = undefined;
      return {
        status: 'DEFUSED',
        trapType,
        toolUsed: requiredTool
      };
    }

    const planter = door.armedTrap.plantedBy;
    door.armedTrap = undefined;
    return {
      status: 'TRIGGERED',
      trapType,
      plantedBy: planter
    };
  }
}
