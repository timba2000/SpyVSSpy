import { describe, it, expect } from 'vitest';
import { Inventory } from '../src/core/spy/inventory';
import { CounterItemType, SecretItemType, TrapType } from '../src/core/types';

describe('Spy Inventory System', () => {
  it('allows holding only one secret item without a briefcase', () => {
    const inv = new Inventory();
    expect(inv.hasBriefcase).toBe(false);

    // Pick up passport
    const res1 = inv.pickupItem(SecretItemType.PASSPORT);
    expect(res1.success).toBe(true);
    expect(inv.heldSingleItem).toBe(SecretItemType.PASSPORT);

    // Pick up money: previous item is dropped
    const res2 = inv.pickupItem(SecretItemType.MONEY);
    expect(res2.success).toBe(true);
    expect(res2.droppedItem).toBe(SecretItemType.PASSPORT);
    expect(inv.heldSingleItem).toBe(SecretItemType.MONEY);
  });

  it('collects all items once briefcase is acquired', () => {
    const inv = new Inventory();
    // Start with passport
    inv.pickupItem(SecretItemType.PASSPORT);

    // Find briefcase: passport automatically stows into briefcase
    inv.pickupItem(SecretItemType.BRIEFCASE);
    expect(inv.hasBriefcase).toBe(true);
    expect(inv.heldSingleItem).toBeUndefined();
    expect(inv.collectedItems.has(SecretItemType.PASSPORT)).toBe(true);

    // Add remaining required items
    inv.pickupItem(SecretItemType.SECRET_PLANS);
    inv.pickupItem(SecretItemType.MONEY);
    expect(inv.hasAllEscapeItems()).toBe(false);

    inv.pickupItem(SecretItemType.KEY);
    expect(inv.hasAllEscapeItems()).toBe(true);
  });

  it('manages traps and counter tools', () => {
    const inv = new Inventory({ BOMB: 2 });
    expect(inv.hasTrap(TrapType.BOMB)).toBe(true);

    expect(inv.useTrap(TrapType.BOMB)).toBe(true);
    expect(inv.trapsAvailable[TrapType.BOMB]).toBe(1);

    expect(inv.useTrap(TrapType.BOMB)).toBe(true);
    expect(inv.hasTrap(TrapType.BOMB)).toBe(false);
    expect(inv.useTrap(TrapType.BOMB)).toBe(false);

    inv.setActiveTool(CounterItemType.UMBRELLA);
    expect(inv.activeTool).toBe(CounterItemType.UMBRELLA);
  });

  it('drops all items when spy dies', () => {
    const inv = new Inventory();
    inv.pickupItem(SecretItemType.BRIEFCASE);
    inv.pickupItem(SecretItemType.PASSPORT);
    inv.pickupItem(SecretItemType.MONEY);

    const dropped = inv.dropAllOnDeath();
    expect(dropped).toContain(SecretItemType.BRIEFCASE);
    expect(dropped).toContain(SecretItemType.PASSPORT);
    expect(dropped).toContain(SecretItemType.MONEY);
    expect(inv.hasBriefcase).toBe(false);
    expect(inv.collectedItems.size).toBe(0);
  });
});
