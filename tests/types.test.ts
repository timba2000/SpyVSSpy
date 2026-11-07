import { describe, it, expect } from 'vitest';
import { DOOR_TRAPS, FURNITURE_TRAPS, TrapType, ToolType, TRAP_COUNTER_MAP } from '../src/core/types';

describe('Core Types & Rules', () => {
  it('maps every trap type to a valid tool', () => {
    expect(TRAP_COUNTER_MAP[TrapType.SNAP_TRAP]).toBe(ToolType.OVEN_MITT);
    expect(TRAP_COUNTER_MAP[TrapType.GLUE_PAD]).toBe(ToolType.COOKING_OIL);
    expect(TRAP_COUNTER_MAP[TrapType.PEPPER_POOF]).toBe(ToolType.CLOTHES_PEG);
    expect(TRAP_COUNTER_MAP[TrapType.MARBLE_SPILL]).toBe(ToolType.BROOM);
    expect(TRAP_COUNTER_MAP[TrapType.STATIC_MAT]).toBe(ToolType.RUBBER_BOOTS);
  });

  it('classes every trap as either a furniture trap or a door trap', () => {
    expect([...FURNITURE_TRAPS, ...DOOR_TRAPS].sort()).toEqual(Object.values(TrapType).sort());
  });
});
