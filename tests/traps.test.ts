import { describe, it, expect } from 'vitest';
import { TrapSystem } from '../src/core/trap/trapSystem';
import { CounterItemType, FurnitureType, TrapType } from '../src/core/types';
import { Inventory } from '../src/core/spy/inventory';
import { DoorData, FurnitureData } from '../src/core/room/room';

describe('Booby Trap System', () => {
  it('arms furniture and triggers when defusal tool is missing', () => {
    const furniture: FurnitureData = {
      id: 'furn_1',
      type: FurnitureType.SAFE,
      x: 50,
      y: 50,
      width: 24,
      height: 24,
      searched: false
    };

    const blackSpyInv = new Inventory();
    const armed = TrapSystem.armFurniture(furniture, TrapType.BOMB, 'BLACK', blackSpyInv);
    expect(armed).toBe(true);
    expect(furniture.armedTrap?.type).toBe(TrapType.BOMB);
    expect(furniture.armedTrap?.plantedBy).toBe('BLACK');

    // White spy searches without tool
    const whiteSpyInv = new Inventory();
    const result = TrapSystem.interactWithFurniture(furniture, whiteSpyInv);

    expect(result.status).toBe('TRIGGERED');
    if (result.status === 'TRIGGERED') {
      expect(result.trapType).toBe(TrapType.BOMB);
      expect(result.plantedBy).toBe('BLACK');
    }
    // Trap should now be cleared
    expect(furniture.armedTrap).toBeUndefined();
  });

  it('safely defuses furniture trap when holding correct counter-measure', () => {
    const furniture: FurnitureData = {
      id: 'furn_safe',
      type: FurnitureType.SAFE,
      x: 50,
      y: 50,
      width: 24,
      height: 24,
      searched: false
    };

    const planterInv = new Inventory();
    TrapSystem.armFurniture(furniture, TrapType.SPRING, 'BLACK', planterInv);

    // White spy holds Coat Hanger (defuser for Spring)
    const whiteSpyInv = new Inventory();
    whiteSpyInv.setActiveTool(CounterItemType.COAT_HANGER);

    const result = TrapSystem.interactWithFurniture(furniture, whiteSpyInv);
    expect(result.status).toBe('DEFUSED');
    if (result.status === 'DEFUSED') {
      expect(result.toolUsed).toBe(CounterItemType.COAT_HANGER);
    }
    expect(furniture.armedTrap).toBeUndefined();
  });

  it('handles door traps (acid bucket & umbrella)', () => {
    const door: DoorData = {
      id: 'door_north',
      direction: 'NORTH',
      targetRoomId: 'room_2',
      targetDoorDirection: 'SOUTH',
      x: 160,
      y: 52,
      width: 32,
      height: 16
    };

    const planterInv = new Inventory();
    const armed = TrapSystem.armDoor(door, TrapType.ACID_BUCKET, 'BLACK', planterInv);
    expect(armed).toBe(true);

    // Victim without umbrella
    const victimInv = new Inventory();
    const failResult = TrapSystem.traverseDoor(door, victimInv);
    expect(failResult.status).toBe('TRIGGERED');

    // Re-arm and test with Umbrella
    TrapSystem.armDoor(door, TrapType.ACID_BUCKET, 'BLACK', planterInv);
    victimInv.setActiveTool(CounterItemType.UMBRELLA);
    const successResult = TrapSystem.traverseDoor(door, victimInv);
    expect(successResult.status).toBe('DEFUSED');
  });
});
