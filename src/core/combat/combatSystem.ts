/**
 * Close-Quarters Paw-Swat Combat Resolution.
 */

import { Raider } from '../raider/raider';

export interface CombatHitResult {
  hit: boolean;
  damageDealt: number;
  knockedOut: boolean;
  targetRemainingHealth: number;
}

export class CombatSystem {
  public static readonly ATTACK_RANGE: number = 32;
  public static readonly ATTACK_DAMAGE: number = 25;

  /**
   * Resolves a swat by attacker against defender if in the same room.
   */
  public static resolveAttack(attacker: Raider, defender: Raider): CombatHitResult {
    const miss: CombatHitResult = {
      hit: false,
      damageDealt: 0,
      knockedOut: false,
      targetRemainingHealth: defender.health
    };

    // Both must be awake and in the same room
    if (attacker.currentRoomId !== defender.currentRoomId || !attacker.isAwake() || !defender.isAwake()) {
      return miss;
    }

    // Check distance
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    if (Math.hypot(dx, dy) > this.ATTACK_RANGE) {
      return miss;
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
      return miss;
    }

    const knockedOut = defender.takeDamage(this.ATTACK_DAMAGE);
    return {
      hit: true,
      damageDealt: this.ATTACK_DAMAGE,
      knockedOut,
      targetRemainingHealth: defender.health
    };
  }
}
