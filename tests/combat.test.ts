import { describe, it, expect } from 'vitest';
import { CombatSystem } from '../src/core/combat/combatSystem';
import { Raider } from '../src/core/raider/raider';

describe('Paw-Swat Combat System', () => {
  it('damages opponent when within range and facing them', () => {
    const attacker = new Raider('RUSTY', 'garage', 100, 100);
    const defender = new Raider('SOOT', 'garage', 120, 100);

    attacker.facing = 'EAST'; // Facing towards defender
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(true);
    expect(result.damageDealt).toBe(CombatSystem.ATTACK_DAMAGE);
    expect(defender.health).toBe(100 - CombatSystem.ATTACK_DAMAGE);
    expect(result.knockedOut).toBe(false);
  });

  it('fails attack when facing away', () => {
    const attacker = new Raider('RUSTY', 'garage', 100, 100);
    const defender = new Raider('SOOT', 'garage', 120, 100);

    attacker.facing = 'WEST'; // Facing away from defender
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(false);
    expect(defender.health).toBe(100);
  });

  it('fails attack when in different rooms', () => {
    const attacker = new Raider('RUSTY', 'garage', 100, 100);
    const defender = new Raider('SOOT', 'hall', 100, 100);

    attacker.facing = 'EAST';
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(false);
  });

  it('knocks out when health reaches 0', () => {
    const attacker = new Raider('RUSTY', 'garage', 100, 100);
    const defender = new Raider('SOOT', 'garage', 115, 100);
    defender.health = 20; // 1 hit away from a knockout

    attacker.facing = 'EAST';
    const result = CombatSystem.resolveAttack(attacker, defender);

    expect(result.hit).toBe(true);
    expect(result.knockedOut).toBe(true);
    expect(defender.health).toBe(0);
    expect(defender.state).toBe('KNOCKED_OUT');
  });

  it('interrupts a search when hit, leaving no stale search state', () => {
    const attacker = new Raider('RUSTY', 'garage', 100, 100);
    const defender = new Raider('SOOT', 'garage', 115, 100);
    defender.startSearch('furn_x');
    defender.update();

    attacker.facing = 'EAST';
    CombatSystem.resolveAttack(attacker, defender);

    expect(defender.state).toBe('HURT');
    expect(defender.searchingFurnitureId).toBeUndefined();
    expect(defender.searchProgress).toBe(0);
  });
});
