import { describe, it, expect } from 'vitest';
import { Inventory } from '../src/core/raider/inventory';
import { ToolType, LootType, TrapType } from '../src/core/types';

describe('Raider Inventory System', () => {
  it('allows carrying only one item without a basket', () => {
    const inv = new Inventory();
    expect(inv.hasBasket).toBe(false);

    const res1 = inv.pickupItem(LootType.PIZZA);
    expect(res1.success).toBe(true);
    expect(inv.heldItem).toBe(LootType.PIZZA);

    // Pick up fish: previous item is dropped
    const res2 = inv.pickupItem(LootType.FISH);
    expect(res2.success).toBe(true);
    expect(res2.droppedItem).toBe(LootType.PIZZA);
    expect(inv.heldItem).toBe(LootType.FISH);
  });

  it('collects all items once basket is acquired', () => {
    const inv = new Inventory();
    inv.pickupItem(LootType.PIZZA);

    // Find basket: pizza automatically goes into it
    inv.pickupItem(LootType.BASKET);
    expect(inv.hasBasket).toBe(true);
    expect(inv.heldItem).toBeUndefined();
    expect(inv.collectedItems.has(LootType.PIZZA)).toBe(true);

    inv.pickupItem(LootType.CHEESE);
    inv.pickupItem(LootType.FISH);
    expect(inv.hasFullFeast()).toBe(false);

    inv.pickupItem(LootType.HONEY);
    expect(inv.hasFullFeast()).toBe(true);
  });

  it('does not count a full feast without the basket', () => {
    const inv = new Inventory();
    [LootType.PIZZA, LootType.CHEESE, LootType.HONEY, LootType.FISH].forEach((item) => inv.collectedItems.add(item));
    expect(inv.hasFullFeast()).toBe(false);
  });

  it('knows which loot it can take without dropping something', () => {
    const inv = new Inventory();
    expect(inv.canCarryWithoutDropping(LootType.PIZZA)).toBe(true);

    inv.pickupItem(LootType.PIZZA);
    expect(inv.canCarryWithoutDropping(LootType.FISH)).toBe(false);
    expect(inv.canCarryWithoutDropping(LootType.BASKET)).toBe(true);

    inv.pickupItem(LootType.BASKET);
    expect(inv.canCarryWithoutDropping(LootType.FISH)).toBe(true);
  });

  it('manages traps and tools', () => {
    const inv = new Inventory({ SNAP_TRAP: 2 });
    expect(inv.hasTrap(TrapType.SNAP_TRAP)).toBe(true);

    expect(inv.useTrap(TrapType.SNAP_TRAP)).toBe(true);
    expect(inv.trapsAvailable[TrapType.SNAP_TRAP]).toBe(1);

    expect(inv.useTrap(TrapType.SNAP_TRAP)).toBe(true);
    expect(inv.hasTrap(TrapType.SNAP_TRAP)).toBe(false);
    expect(inv.useTrap(TrapType.SNAP_TRAP)).toBe(false);

    inv.setActiveTool(ToolType.BROOM);
    expect(inv.activeTool).toBe(ToolType.BROOM);
  });

  it('drops all loot when knocked out', () => {
    const inv = new Inventory();
    inv.pickupItem(LootType.BASKET);
    inv.pickupItem(LootType.PIZZA);
    inv.pickupItem(LootType.FISH);

    const dropped = inv.dropAllLoot();
    expect(dropped).toContain(LootType.BASKET);
    expect(dropped).toContain(LootType.PIZZA);
    expect(dropped).toContain(LootType.FISH);
    expect(inv.hasBasket).toBe(false);
    expect(inv.collectedItems.size).toBe(0);
  });
});
