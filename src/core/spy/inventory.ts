/**
 * Spy Inventory Management.
 * Implements briefcase carrying rules, trap storage, and defusal tool selection.
 */

import { CounterItemType, SecretItemType, TrapType } from '../types';

export class Inventory {
  public hasBriefcase: boolean = false;
  public collectedItems: Set<SecretItemType> = new Set();
  public heldSingleItem?: SecretItemType;
  public activeTool?: CounterItemType;
  public trapsAvailable: Record<TrapType, number>;

  constructor(initialTraps?: Partial<Record<TrapType, number>>) {
    this.trapsAvailable = {
      [TrapType.BOMB]: initialTraps?.BOMB ?? 2,
      [TrapType.SPRING]: initialTraps?.SPRING ?? 2,
      [TrapType.DYNAMITE]: initialTraps?.DYNAMITE ?? 2,
      [TrapType.ACID_BUCKET]: initialTraps?.ACID_BUCKET ?? 2,
      [TrapType.ELECTROCUTION]: initialTraps?.ELECTROCUTION ?? 2
    };
  }

  /**
   * Attempts to pick up a secret item according to briefcase rules.
   * Returns true if successfully stored/held, or false if hands are full without a briefcase.
   */
  public pickupItem(item: SecretItemType): { success: boolean; droppedItem?: SecretItemType } {
    if (item === SecretItemType.BRIEFCASE) {
      this.hasBriefcase = true;
      // If we were holding a single item, move it into the briefcase
      if (this.heldSingleItem) {
        this.collectedItems.add(this.heldSingleItem);
        this.heldSingleItem = undefined;
      }
      return { success: true };
    }

    if (this.hasBriefcase) {
      this.collectedItems.add(item);
      return { success: true };
    }

    // Without briefcase, can only hold 1 item.
    if (!this.heldSingleItem) {
      this.heldSingleItem = item;
      return { success: true };
    }

    // Hands are full: swap the current item with the new one
    const previousItem = this.heldSingleItem;
    this.heldSingleItem = item;
    return { success: true, droppedItem: previousItem };
  }

  /**
   * Check if all 4 required secret items plus the key are held inside the briefcase.
   */
  public hasAllEscapeItems(): boolean {
    if (!this.hasBriefcase) return false;

    const required = [
      SecretItemType.PASSPORT,
      SecretItemType.SECRET_PLANS,
      SecretItemType.MONEY,
      SecretItemType.KEY
    ];

    return required.every((item) => this.collectedItems.has(item));
  }

  /**
   * Set active counter tool from Trapulator.
   */
  public setActiveTool(tool: CounterItemType | undefined): void {
    this.activeTool = tool;
  }

  /**
   * Check if the spy has a specific trap available.
   */
  public hasTrap(type: TrapType): boolean {
    return (this.trapsAvailable[type] ?? 0) > 0;
  }

  /**
   * Consume one trap for planting.
   */
  public useTrap(type: TrapType): boolean {
    if (this.hasTrap(type)) {
      this.trapsAvailable[type]--;
      return true;
    }
    return false;
  }

  /**
   * Drops items upon death.
   * Returns an array of items to scatter on the room floor.
   */
  public dropAllOnDeath(): SecretItemType[] {
    const dropped: SecretItemType[] = [];

    if (this.hasBriefcase) {
      dropped.push(SecretItemType.BRIEFCASE);
      for (const item of this.collectedItems) {
        dropped.push(item);
      }
      this.collectedItems.clear();
      this.hasBriefcase = false;
    } else if (this.heldSingleItem) {
      dropped.push(this.heldSingleItem);
      this.heldSingleItem = undefined;
    }

    return dropped;
  }
}
