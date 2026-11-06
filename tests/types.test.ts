import { describe, it, expect } from 'vitest';
import { TrapType, CounterItemType, TRAP_COUNTER_MAP } from '../src/core/types';

describe('Spy vs Spy Core Types & Rules', () => {
  it('maps every trap type to a valid counter-measure tool', () => {
    expect(TRAP_COUNTER_MAP[TrapType.BOMB]).toBe(CounterItemType.WATER_BUCKET);
    expect(TRAP_COUNTER_MAP[TrapType.SPRING]).toBe(CounterItemType.COAT_HANGER);
    expect(TRAP_COUNTER_MAP[TrapType.DYNAMITE]).toBe(CounterItemType.WIRE_CUTTERS);
    expect(TRAP_COUNTER_MAP[TrapType.ACID_BUCKET]).toBe(CounterItemType.UMBRELLA);
    expect(TRAP_COUNTER_MAP[TrapType.ELECTROCUTION]).toBe(CounterItemType.RUBBER_GLOVES);
  });
});
