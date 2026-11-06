/**
 * Spy Entity & State Machine.
 */

import { Direction, SpyActionState, SpyColor } from '../types';
import { Inventory } from './inventory';

export interface SpyMoveInput {
  dx: number;
  dy: number;
}

export class Spy {
  public readonly color: SpyColor;
  public currentRoomId: string;
  public x: number;
  public y: number;
  public facing: Direction = 'SOUTH';
  public health: number = 100;
  public readonly maxHealth: number = 100;
  public state: SpyActionState = 'IDLE';
  public inventory: Inventory;

  // Timers and action counters (in simulation ticks: 60 ticks = 1s)
  public respawnTimer: number = 0;
  public searchProgress: number = 0;
  public searchingFurnitureId?: string;
  public attackCooldown: number = 0;
  public hurtTimer: number = 0;
  public doorCooldown: number = 0;

  public readonly speed: number = 2.5;
  public readonly searchDurationTicks: number = 60; // 1 second search
  public readonly respawnDurationTicks: number = 300; // 5 seconds angel respawn

  constructor(color: SpyColor, startRoomId: string, startX: number, startY: number) {
    this.color = color;
    this.currentRoomId = startRoomId;
    this.x = startX;
    this.y = startY;
    this.inventory = new Inventory();
  }

  public isAlive(): boolean {
    return this.state !== 'DEAD_ANGEL';
  }

  public canAct(): boolean {
    return this.isAlive() && this.state !== 'HURT' && this.state !== 'SEARCHING';
  }

  public move(dx: number, dy: number): void {
    if (!this.canAct()) return;

    if (dx !== 0 || dy !== 0) {
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      this.state = 'WALKING';

      // Update facing direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.facing = dx > 0 ? 'EAST' : 'WEST';
      } else {
        this.facing = dy > 0 ? 'SOUTH' : 'NORTH';
      }
    } else if (this.state === 'WALKING') {
      this.state = 'IDLE';
    }
  }

  public startSearch(furnitureId: string): void {
    if (!this.canAct()) return;
    this.state = 'SEARCHING';
    this.searchingFurnitureId = furnitureId;
    this.searchProgress = 0;
  }

  public cancelSearch(): void {
    if (this.state === 'SEARCHING') {
      this.state = 'IDLE';
      this.searchingFurnitureId = undefined;
      this.searchProgress = 0;
    }
  }

  public attack(): boolean {
    if (!this.canAct() || this.attackCooldown > 0) return false;
    this.state = 'ATTACKING';
    this.attackCooldown = 20; // ~0.33 seconds cooldown
    return true;
  }

  public takeDamage(amount: number): boolean {
    if (!this.isAlive()) return false;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
      return true; // Fatal
    } else {
      this.state = 'HURT';
      this.hurtTimer = 15; // 0.25s hit reaction
      return false;
    }
  }

  public die(): void {
    this.health = 0;
    this.state = 'DEAD_ANGEL';
    this.respawnTimer = this.respawnDurationTicks;
    this.searchingFurnitureId = undefined;
    this.searchProgress = 0;
  }

  public respawn(roomId: string, x: number, y: number): void {
    this.currentRoomId = roomId;
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.state = 'IDLE';
    this.respawnTimer = 0;
    this.hurtTimer = 0;
    this.attackCooldown = 0;
    this.doorCooldown = 0;
  }

  /**
   * Fixed tick update (called at 60 FPS).
   */
  public update(): { searchCompleted?: string; respawnReady?: boolean } {
    let searchCompleted: string | undefined;
    let respawnReady = false;

    if (this.state === 'DEAD_ANGEL') {
      if (this.respawnTimer > 0) {
        this.respawnTimer--;
        if (this.respawnTimer === 0) {
          respawnReady = true;
        }
      }
      return { respawnReady };
    }

    if (this.hurtTimer > 0) {
      this.hurtTimer--;
      if (this.hurtTimer === 0) {
        this.state = 'IDLE';
      }
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
      if (this.attackCooldown === 0 && this.state === 'ATTACKING') {
        this.state = 'IDLE';
      }
    }

    if (this.doorCooldown > 0) {
      this.doorCooldown--;
    }

    if (this.state === 'SEARCHING') {
      this.searchProgress++;
      if (this.searchProgress >= this.searchDurationTicks) {
        searchCompleted = this.searchingFurnitureId;
        this.state = 'IDLE';
        this.searchingFurnitureId = undefined;
        this.searchProgress = 0;
      }
    }

    return { searchCompleted, respawnReady };
  }
}
