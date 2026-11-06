/**
 * Close-Quarters Melee Combat Resolution.
 */

import { Spy } from '../spy/spy';

export interface CombatHitResult {
  hit: boolean;
  damageDealt: number;
  fatal: boolean;
  targetRemainingHealth: number;
}

export class CombatSystem {
  public static readonly ATTACK_RANGE: number = 32;
  public static readonly ATTACK_DAMAGE: number = 25;

  /**
   * Resolves an attack by attacker against defender if in the same room.
   */
  public static resolveAttack(attacker: Spy, defender: Spy): CombatHitResult {
    // Both must be alive and in the same room
    if (attacker.currentRoomId !== defender.currentRoomId || !attacker.isAlive() || !defender.isAlive()) {
      return { hit: false, damageDealt: 0, fatal: false, targetRemainingHealth: defender.health };
    }

    // Check distance
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.ATTACK_RANGE) {
      return { hit: false, damageDealt: 0, fatal: false, targetRemainingHealth: defender.health };
    }

    // Check facing direction alignment
    let isFacing = false;
    switch (attacker.facing) {
      case 'EAST':
        isFacing = dx >= -5; // Defender is roughly to the east
        break;
      case 'WEST':
        isFacing = dx <= 5;
        break;
      case 'SOUTH':
        isFacing = dy >= -5;
        break;
      case 'NORTH':
        isFacing = dy <= 5;
        break;
    }

    if (!isFacing) {
      return { hit: false, damageDealt: 0, fatal: false, targetRemainingHealth: defender.health };
    }

    const fatal = defender.takeDamage(this.ATTACK_DAMAGE);
    return {
      hit: true,
      damageDealt: this.ATTACK_DAMAGE,
      fatal,
      targetRemainingHealth: defender.health
    };
  }
}
