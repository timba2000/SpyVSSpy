import { describe, it, expect } from 'vitest';
import { TrapSystem } from '../src/core/trap/trapSystem';
import { DOOR_TRAPS, FURNITURE_TRAPS, FurnitureType, ToolType, TrapType, TRAP_COUNTER_MAP } from '../src/core/types';
import { Inventory } from '../src/core/raider/inventory';
import { DoorData, FurnitureData } from '../src/core/room/room';

const makeFurniture = (): FurnitureData => ({
  id: 'furn_1',
  type: FurnitureType.FRIDGE,
  x: 50,
  y: 50,
  width: 24,
  height: 24,
  searched: false
});

const makeDoor = (): DoorData => ({
  id: 'door_north',
  direction: 'NORTH',
  targetRoomId: 'hall',
  targetDoorDirection: 'SOUTH',
  x: 160,
  y: 52,
  width: 32,
  height: 16
});

describe('Trap System', () => {
  it('arms furniture and springs when the right tool is missing', () => {
    const furniture = makeFurniture();

    const planterInv = new Inventory();
    const armed = TrapSystem.armFurniture(furniture, TrapType.SNAP_TRAP, 'SOOT', planterInv);
    expect(armed).toBe(true);
    expect(furniture.armedTrap?.type).toBe(TrapType.SNAP_TRAP);
    expect(furniture.armedTrap?.plantedBy).toBe('SOOT');

    const victimInv = new Inventory();
    const result = TrapSystem.interactWithFurniture(furniture, victimInv);

    expect(result.status).toBe('SPRUNG');
    if (result.status === 'SPRUNG') {
      expect(result.trapType).toBe(TrapType.SNAP_TRAP);
      expect(result.plantedBy).toBe('SOOT');
    }
    // Trap should now be cleared
    expect(furniture.armedTrap).toBeUndefined();
  });

  it('safely clears furniture trap when holding the correct tool', () => {
    const furniture = makeFurniture();
    TrapSystem.armFurniture(furniture, TrapType.GLUE_PAD, 'SOOT', new Inventory());

    const inv = new Inventory();
    inv.setActiveTool(ToolType.COOKING_OIL);

    const result = TrapSystem.interactWithFurniture(furniture, inv);
    expect(result.status).toBe('CLEARED');
    if (result.status === 'CLEARED') {
      expect(result.toolUsed).toBe(ToolType.COOKING_OIL);
    }
    expect(furniture.armedTrap).toBeUndefined();
  });

  it('springs when holding the wrong tool', () => {
    const furniture = makeFurniture();
    TrapSystem.armFurniture(furniture, TrapType.GLUE_PAD, 'SOOT', new Inventory());

    const inv = new Inventory();
    inv.setActiveTool(ToolType.BROOM);
    expect(TrapSystem.interactWithFurniture(furniture, inv).status).toBe('SPRUNG');
  });

  it('handles door traps (marble spill & broom)', () => {
    const door = makeDoor();
    const planterInv = new Inventory();
    const armed = TrapSystem.armDoor(door, TrapType.MARBLE_SPILL, 'SOOT', planterInv);
    expect(armed).toBe(true);

    // Victim without a broom
    const victimInv = new Inventory();
    const failResult = TrapSystem.traverseDoor(door, victimInv);
    expect(failResult.status).toBe('SPRUNG');

    // Re-arm and test with the broom
    TrapSystem.armDoor(door, TrapType.MARBLE_SPILL, 'SOOT', planterInv);
    victimInv.setActiveTool(ToolType.BROOM);
    const successResult = TrapSystem.traverseDoor(door, victimInv);
    expect(successResult.status).toBe('CLEARED');
  });

  it('clears every furniture trap with its own tool', () => {
    for (const trap of FURNITURE_TRAPS) {
      const furniture = makeFurniture();
      TrapSystem.armFurniture(furniture, trap, 'SOOT', new Inventory());
      const inv = new Inventory();
      inv.setActiveTool(TRAP_COUNTER_MAP[trap]);
      expect(TrapSystem.interactWithFurniture(furniture, inv).status, trap).toBe('CLEARED');
    }
  });

  it('clears every door trap with its own tool', () => {
    for (const trap of DOOR_TRAPS) {
      const door = makeDoor();
      TrapSystem.armDoor(door, trap, 'SOOT', new Inventory());
      const inv = new Inventory();
      inv.setActiveTool(TRAP_COUNTER_MAP[trap]);
      expect(TrapSystem.traverseDoor(door, inv).status, trap).toBe('CLEARED');
    }
  });

  it('refuses a trap on the wrong kind of target, without using it up', () => {
    const inv = new Inventory();
    expect(TrapSystem.armDoor(makeDoor(), TrapType.SNAP_TRAP, 'SOOT', inv)).toBe(false);
    expect(TrapSystem.armFurniture(makeFurniture(), TrapType.STATIC_MAT, 'SOOT', inv)).toBe(false);
    expect(inv.trapsAvailable[TrapType.SNAP_TRAP]).toBe(2);
    expect(inv.trapsAvailable[TrapType.STATIC_MAT]).toBe(2);
  });

  it('refuses a second trap on the same target, without using it up', () => {
    const furniture = makeFurniture();
    const inv = new Inventory();
    TrapSystem.armFurniture(furniture, TrapType.SNAP_TRAP, 'SOOT', inv);
    expect(TrapSystem.armFurniture(furniture, TrapType.GLUE_PAD, 'SOOT', inv)).toBe(false);
    expect(inv.trapsAvailable[TrapType.GLUE_PAD]).toBe(2);
  });
});
