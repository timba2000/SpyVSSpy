/**
 * Raider Entity & State Machine.
 */

import { Direction, RaiderActionState, RaiderId } from '../types';
import { Inventory } from './inventory';

export class Raider {
  public readonly id: RaiderId;
  public currentRoomId: string;
  public x: number;
  public y: number;
  public facing: Direction = 'SOUTH';
  public health: number = 100;
  public readonly maxHealth: number = 100;
  public state: RaiderActionState = 'IDLE';
  public inventory: Inventory;
  /** Each raider has their own clock; penalties only cost the raider who earned them. */
  public clockSeconds: number;

  // Timers and action counters (in simulation ticks: 60 ticks = 1s)
  public wakeTimer: number = 0;
  public searchProgress: number = 0;
  public searchingFurnitureId?: string;
  public attackCooldown: number = 0;
  public hurtTimer: number = 0;
  public doorCooldown: number = 0;

  public readonly speed: number = 2.5;
  public readonly searchDurationTicks: number = 60; // 1 second search
  public readonly knockoutDurationTicks: number = 300; // 5 seconds seeing stars
  public readonly attackDurationTicks: number = 20; // ~0.33 seconds cooldown

  constructor(id: RaiderId, startRoomId: string, startX: number, startY: number, clockSeconds: number = 180) {
    this.id = id;
    this.currentRoomId = startRoomId;
    this.x = startX;
    this.y = startY;
    this.clockSeconds = clockSeconds;
    this.inventory = new Inventory();
  }

  /** False while knocked out or after the raider's clock has run out. */
  public isAwake(): boolean {
    return this.state !== 'KNOCKED_OUT' && this.state !== 'OUT_OF_TIME';
  }

  public canAct(): boolean {
    return this.isAwake() && this.state !== 'HURT' && this.state !== 'SEARCHING';
  }

  public move(dx: number, dy: number): void {
    if (!this.canAct()) return;

    if (dx !== 0 || dy !== 0) {
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      // Walking must not cut a paw swing short; update() ends it when the cooldown does.
      if (this.state !== 'ATTACKING') this.state = 'WALKING';
      this.faceAlong(dx, dy);
    } else if (this.state === 'WALKING') {
      this.state = 'IDLE';
    }
  }

  /** Turns to face along a vector, preferring the horizontal when it is the larger part. */
  public faceAlong(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'EAST' : 'WEST';
    } else {
      this.facing = dy > 0 ? 'SOUTH' : 'NORTH';
    }
  }

  public startSearch(furnitureId: string): void {
    if (!this.canAct()) return;
    this.state = 'SEARCHING';
    this.searchingFurnitureId = furnitureId;
    this.searchProgress = 0;
  }

  public cancelSearch(): void {
    this.searchingFurnitureId = undefined;
    this.searchProgress = 0;
    if (this.state === 'SEARCHING') {
      this.state = 'IDLE';
    }
  }

  public attack(): boolean {
    if (!this.canAct() || this.attackCooldown > 0) return false;
    this.state = 'ATTACKING';
    this.attackCooldown = this.attackDurationTicks;
    return true;
  }

  public takeDamage(amount: number): boolean {
    if (!this.isAwake()) return false;

    this.health = Math.max(0, this.health - amount);
    // A hit interrupts any search in progress.
    this.cancelSearch();
    if (this.health <= 0) {
      this.knockOut();
      return true; // Knockout
    }
    this.state = 'HURT';
    this.hurtTimer = 15; // 0.25s hit reaction
    return false;
  }

  public knockOut(): void {
    this.health = 0;
    this.state = 'KNOCKED_OUT';
    this.wakeTimer = this.knockoutDurationTicks;
    this.hurtTimer = 0;
    this.cancelSearch();
  }

  public wakeUp(roomId: string, x: number, y: number): void {
    this.currentRoomId = roomId;
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.state = 'IDLE';
    this.wakeTimer = 0;
    this.hurtTimer = 0;
    this.attackCooldown = 0;
    this.doorCooldown = 0;
  }

  /** The raider's clock has run out: they curl up and sleep for the rest of the match. */
  public runOutOfTime(): void {
    this.clockSeconds = 0;
    this.state = 'OUT_OF_TIME';
    this.wakeTimer = 0;
    this.hurtTimer = 0;
    this.cancelSearch();
  }

  /**
   * Fixed tick update (called at 60 FPS).
   */
  public update(): { searchCompleted?: string; wokeUp?: boolean } {
    if (this.state === 'OUT_OF_TIME') {
      return {};
    }

    if (this.state === 'KNOCKED_OUT') {
      if (this.wakeTimer > 0) {
        this.wakeTimer--;
        if (this.wakeTimer === 0) {
          return { wokeUp: true };
        }
      }
      return {};
    }

    let searchCompleted: string | undefined;

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

    return { searchCompleted };
  }
}
