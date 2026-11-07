/**
 * Raider Inventory Management.
 * Implements picnic basket carrying rules, trap storage, and tool selection.
 */

import { FEAST_ITEMS, LootType, ToolType, TrapType } from '../types';

export class Inventory {
  public hasBasket: boolean = false;
  public collectedItems: Set<LootType> = new Set();
  public heldItem?: LootType;
  public activeTool?: ToolType;
  public trapsAvailable: Record<TrapType, number>;

  constructor(initialTraps?: Partial<Record<TrapType, number>>) {
    this.trapsAvailable = {
      [TrapType.SNAP_TRAP]: initialTraps?.SNAP_TRAP ?? 2,
      [TrapType.GLUE_PAD]: initialTraps?.GLUE_PAD ?? 2,
      [TrapType.PEPPER_POOF]: initialTraps?.PEPPER_POOF ?? 2,
      [TrapType.MARBLE_SPILL]: initialTraps?.MARBLE_SPILL ?? 2,
      [TrapType.STATIC_MAT]: initialTraps?.STATIC_MAT ?? 2
    };
  }

  /**
   * Picks up a piece of loot according to the basket rules.
   * Without a basket a raider carries one item in their mouth, so taking another
   * drops the first; `droppedItem` tells the caller what to put on the floor.
   */
  public pickupItem(item: LootType): { success: boolean; droppedItem?: LootType } {
    if (item === LootType.BASKET) {
      this.hasBasket = true;
      // If we were carrying a single item, move it into the basket
      if (this.heldItem) {
        this.collectedItems.add(this.heldItem);
        this.heldItem = undefined;
      }
      return { success: true };
    }

    if (this.hasBasket) {
      this.collectedItems.add(item);
      return { success: true };
    }

    if (!this.heldItem) {
      this.heldItem = item;
      return { success: true };
    }

    const previousItem = this.heldItem;
    this.heldItem = item;
    return { success: true, droppedItem: previousItem };
  }

  /**
   * True when a piece of loot could be taken without dropping something else.
   */
  public canCarryWithoutDropping(item: LootType): boolean {
    return item === LootType.BASKET || this.hasBasket || !this.heldItem;
  }

  /**
   * Check if the basket is packed with all four dishes.
   */
  public hasFullFeast(): boolean {
    return this.hasBasket && FEAST_ITEMS.every((item) => this.collectedItems.has(item));
  }

  /**
   * True when the raider has anything their rival would want to take.
   */
  public isCarryingLoot(): boolean {
    return this.hasBasket || this.heldItem !== undefined;
  }

  /**
   * Set the tool currently in paw.
   */
  public setActiveTool(tool: ToolType | undefined): void {
    this.activeTool = tool;
  }

  /**
   * Check if the raider has a specific trap available.
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
   * Empties the raider's paws when they are knocked out.
   * Returns the loot to scatter on the room floor.
   */
  public dropAllLoot(): LootType[] {
    const dropped: LootType[] = [];

    if (this.hasBasket) {
      dropped.push(LootType.BASKET, ...this.collectedItems);
      this.collectedItems.clear();
      this.hasBasket = false;
    } else if (this.heldItem) {
      dropped.push(this.heldItem);
      this.heldItem = undefined;
    }

    return dropped;
  }
}
