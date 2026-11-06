import { describe, it, expect } from 'vitest';
import { CombatSystem } from '../src/core/combat/combatSystem';
import { Spy } from '../src/core/spy/spy';

describe('Melee Combat System', () => {
  it('damages opponent when within range and facing them', () => {
    const attacker = new Spy('WHITE', 'room_1', 100, 100);
    const defender = new Spy('BLACK', 'room_1', 120, 100);

    attacker.facing = 'EAST'; // Facing towards defender
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(true);
    expect(result.damageDealt).toBe(CombatSystem.ATTACK_DAMAGE);
    expect(defender.health).toBe(100 - CombatSystem.ATTACK_DAMAGE);
    expect(result.fatal).toBe(false);
  });

  it('fails attack when facing away', () => {
    const attacker = new Spy('WHITE', 'room_1', 100, 100);
    const defender = new Spy('BLACK', 'room_1', 120, 100);

    attacker.facing = 'WEST'; // Facing away from defender
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(false);
    expect(defender.health).toBe(100);
  });

  it('fails attack when in different rooms', () => {
    const attacker = new Spy('WHITE', 'room_1', 100, 100);
    const defender = new Spy('BLACK', 'room_2', 100, 100);

    attacker.facing = 'EAST';
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(false);
  });

  it('triggers angel death when health reaches 0', () => {
    const attacker = new Spy('WHITE', 'room_1', 100, 100);
    const defender = new Spy('BLACK', 'room_1', 115, 100);
    defender.health = 20; // 1 hit away from death

    attacker.facing = 'EAST';
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(true);
    expect(result.fatal).toBe(true);
    expect(defender.health).toBe(0);
    expect(defender.state).toBe('DEAD_ANGEL');
  });
});
