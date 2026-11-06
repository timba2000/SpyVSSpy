/**
 * Headless Core Game Engine for Spy vs. Spy.
 * Manages simulation loop, embassy state, spies, traps, and victory conditions.
 */

import { CounterItemType, Direction, SpyColor, TrapType } from './types';
import { Embassy, createStandardEmbassy } from './room/embassyLayout';
import { RoomInstance } from './room/room';
import { Spy } from './spy/spy';
import { GameEventEmitter } from './events/gameEvents';
import { TrapSystem } from './trap/trapSystem';
import { CombatSystem } from './combat/combatSystem';

export interface GameEngineOptions {
  matchDurationSeconds?: number;
  embassy?: Embassy;
}

export class GameEngine {
  public embassy: Embassy;
  public whiteSpy: Spy;
  public blackSpy: Spy;
  public events: GameEventEmitter;

  public matchDurationSeconds: number;
  public remainingSeconds: number;
  public tickCount: number = 0;
  public isGameOver: boolean = false;
  public winner?: SpyColor;

  public readonly DEATH_TIME_PENALTY_SECONDS = 15; // Clock penalty on death

  constructor(options: GameEngineOptions = {}) {
    this.embassy = options.embassy ?? createStandardEmbassy();
    this.events = new GameEventEmitter();
    this.matchDurationSeconds = options.matchDurationSeconds ?? 180;
    this.remainingSeconds = this.matchDurationSeconds;

    // White Spy starts in room_1, Black Spy in room_8
    this.whiteSpy = new Spy('WHITE', 'room_1', 100, 100);
    this.blackSpy = new Spy('BLACK', 'room_8', 200, 100);
  }

  public getSpy(color: SpyColor): Spy {
    return color === 'WHITE' ? this.whiteSpy : this.blackSpy;
  }

  public getOpponent(color: SpyColor): Spy {
    return color === 'WHITE' ? this.blackSpy : this.whiteSpy;
  }

  public getRoom(roomId: string): RoomInstance {
    const room = this.embassy.getRoom(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }
    return room;
  }

  /**
   * Move spy by direction vector (dx, dy).
   */
  public moveSpy(color: SpyColor, dx: number, dy: number): void {
    if (this.isGameOver) return;

    const spy = this.getSpy(color);
    if (!spy.canAct()) return;

    const currentRoom = this.getRoom(spy.currentRoomId);
    spy.move(dx, dy);

    // Check if moving through a door (with door cooldown & directional intent check)
    if (spy.doorCooldown === 0) {
      const door = currentRoom.getDoorNear(spy.x, spy.y, 16);
      if (door) {
        const movingTowardsDoor =
          (door.direction === 'NORTH' && dy < 0) ||
          (door.direction === 'SOUTH' && dy > 0) ||
          (door.direction === 'WEST' && dx < 0) ||
          (door.direction === 'EAST' && dx > 0);

        if (movingTowardsDoor) {
          this.transitionRoom(spy, currentRoom, door.targetRoomId, door.direction);
          return;
        }
      }
    }

    // Otherwise clamp within room bounds
    const clamped = currentRoom.clampPosition(spy.x, spy.y);
    spy.x = clamped.x;
    spy.y = clamped.y;

    this.events.emit('SPY_MOVED', {
      spy: color,
      x: spy.x,
      y: spy.y,
      direction: spy.facing
    });
  }

  /**
   * Door transition logic with trap verification.
   */
  private transitionRoom(spy: Spy, fromRoom: RoomInstance, toRoomId: string, doorDir: Direction): void {
    const door = fromRoom.getDoor(doorDir);
    if (!door) return;

    // Check if door is trapped
    const trapResult = TrapSystem.traverseDoor(door, spy.inventory);
    if (trapResult.status === 'TRIGGERED') {
      this.events.emit('TRAP_TRIGGERED', {
        victim: spy.color,
        trapType: trapResult.trapType,
        targetId: door.id,
        planter: trapResult.plantedBy
      });
      this.killSpy(spy, 'TRAP', trapResult.plantedBy);
      return;
    } else if (trapResult.status === 'DEFUSED') {
      this.events.emit('TRAP_DEFUSED', {
        defuser: spy.color,
        trapType: trapResult.trapType,
        targetId: door.id,
        toolUsed: trapResult.toolUsed
      });
    }

    // Handle airport exit
    if (toRoomId === 'airport_runway') {
      if (spy.inventory.hasAllEscapeItems()) {
        this.triggerWin(spy.color, 'AIRPORT_ESCAPE');
      }
      return;
    }

    const toRoom = this.getRoom(toRoomId);
    spy.currentRoomId = toRoomId;
    spy.doorCooldown = 30; // 0.5s cooldown so you don't instantly retrigger!

    // Spawn spy well inside the room away from the opposite door threshold
    switch (doorDir) {
      case 'NORTH':
        spy.x = 160;
        spy.y = toRoom.bounds.maxY - 35;
        spy.facing = 'NORTH';
        break;
      case 'SOUTH':
        spy.x = 160;
        spy.y = toRoom.bounds.minY + 35;
        spy.facing = 'SOUTH';
        break;
      case 'WEST':
        spy.x = toRoom.bounds.maxX - 35;
        spy.y = 120;
        spy.facing = 'WEST';
        break;
      case 'EAST':
        spy.x = toRoom.bounds.minX + 35;
        spy.y = 120;
        spy.facing = 'EAST';
        break;
    }

    this.events.emit('SPY_ENTERED_ROOM', {
      spy: spy.color,
      fromRoomId: fromRoom.id,
      toRoomId: toRoom.id,
      doorDirection: doorDir
    });
  }

  /**
   * Action key pressed: pickup ground item, search furniture, or escape through airport exit.
   */
  public interactSpy(color: SpyColor): void {
    if (this.isGameOver) return;
    const spy = this.getSpy(color);
    if (!spy.canAct()) return;

    const room = this.getRoom(spy.currentRoomId);

    // 1. Check ground items first
    const groundItem = room.takeGroundItemAt(spy.x, spy.y, 25);
    if (groundItem) {
      const res = spy.inventory.pickupItem(groundItem.item);
      if (res.droppedItem) {
        room.addGroundItem(res.droppedItem, spy.x, spy.y);
      }
      this.events.emit('ITEM_FOUND', {
        spy: color,
        item: groundItem.item,
        storedInBriefcase: spy.inventory.hasBriefcase
      });
      return;
    }

    // 2. Check airport exit escape
    if (room.isAirportExit) {
      const exitDoor = room.getDoorNear(spy.x, spy.y, 30);
      if (exitDoor && exitDoor.direction === 'EAST') {
        if (spy.inventory.hasAllEscapeItems()) {
          this.triggerWin(color, 'AIRPORT_ESCAPE');
          return;
        }
      }
    }

    // 3. Check furniture interaction
    const furn = room.getFurnitureAt(spy.x, spy.y, 25);
    if (furn) {
      spy.startSearch(furn.id);
      this.events.emit('SPY_STARTED_SEARCH', {
        spy: color,
        furnitureId: furn.id
      });
    }
  }

  /**
   * Arm nearby furniture or door with a trap from inventory.
   */
  public armTrap(color: SpyColor, trapType: TrapType): boolean {
    if (this.isGameOver) return false;
    const spy = this.getSpy(color);
    if (!spy.canAct()) return false;

    const room = this.getRoom(spy.currentRoomId);

    // Try furniture first
    const furn = room.getFurnitureAt(spy.x, spy.y, 30);
    if (furn) {
      const success = TrapSystem.armFurniture(furn, trapType, color, spy.inventory);
      if (success) {
        this.events.emit('TRAP_ARMED', {
          spy: color,
          trapType,
          targetId: furn.id,
          targetType: 'FURNITURE'
        });
        return true;
      }
    }

    // Try door
    const door = room.getDoorNear(spy.x, spy.y, 30);
    if (door) {
      const success = TrapSystem.armDoor(door, trapType, color, spy.inventory);
      if (success) {
        this.events.emit('TRAP_ARMED', {
          spy: color,
          trapType,
          targetId: door.id,
          targetType: 'DOOR'
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Set active defusal counter-measure tool.
   */
  public selectTool(color: SpyColor, tool?: CounterItemType): void {
    const spy = this.getSpy(color);
    spy.inventory.setActiveTool(tool);
  }

  /**
   * Attack action (club/baton).
   */
  public attackSpy(color: SpyColor): void {
    if (this.isGameOver) return;
    const attacker = this.getSpy(color);
    if (!attacker.attack()) return;

    const defender = this.getOpponent(color);
    const combatResult = CombatSystem.resolveAttack(attacker, defender);

    if (combatResult.hit) {
      this.events.emit('COMBAT_HIT', {
        attacker: color,
        target: defender.color,
        damage: combatResult.damageDealt,
        remainingHealth: combatResult.targetRemainingHealth
      });

      if (combatResult.fatal) {
        this.killSpy(defender, 'COMBAT', color);
      }
    }
  }

  /**
   * Kill spy: drop items in room, apply clock acceleration penalty, turn into angel.
   */
  public killSpy(victim: Spy, cause: 'TRAP' | 'COMBAT', killer?: SpyColor): void {
    victim.die();

    // Drop items in current room
    const currentRoom = this.getRoom(victim.currentRoomId);
    const droppedItems = victim.inventory.dropAllOnDeath();
    for (const item of droppedItems) {
      currentRoom.addGroundItem(item, victim.x, victim.y);
      this.events.emit('ITEM_DROPPED', {
        spy: victim.color,
        item,
        roomId: currentRoom.id
      });
    }

    // Apply countdown timer penalty
    this.remainingSeconds = Math.max(0, this.remainingSeconds - this.DEATH_TIME_PENALTY_SECONDS);

    this.events.emit('SPY_KILLED', {
      victim: victim.color,
      cause,
      killer,
      penaltySeconds: this.DEATH_TIME_PENALTY_SECONDS
    });
  }

  private triggerWin(winner: SpyColor, reason: 'AIRPORT_ESCAPE' | 'TIME_ADVANTAGE'): void {
    this.isGameOver = true;
    this.winner = winner;
    this.events.emit('MATCH_WON', { winner, reason });
  }

  /**
   * Fixed tick simulation step (60 FPS).
   */
  public tick(): void {
    if (this.isGameOver) return;

    this.tickCount++;

    // 1-second countdown clock step
    if (this.tickCount % 60 === 0) {
      this.remainingSeconds--;
      this.events.emit('CLOCK_TICK', { remainingSeconds: this.remainingSeconds });

      if (this.remainingSeconds <= 0) {
        this.isGameOver = true;
        this.events.emit('TIME_UP', { isTie: true });
        return;
      }
    }

    // Update both spies
    for (const spy of [this.whiteSpy, this.blackSpy]) {
      const updateResult = spy.update();

      // Check search completion
      if (updateResult.searchCompleted) {
        this.finishSearch(spy, updateResult.searchCompleted);
      }

      // Check respawn ready
      if (updateResult.respawnReady) {
        const respawnRoomId = spy.color === 'WHITE' ? 'room_1' : 'room_8';
        spy.respawn(respawnRoomId, 160, 120);
        this.events.emit('SPY_RESPAWNED', {
          spy: spy.color,
          roomId: respawnRoomId,
          x: 160,
          y: 120
        });
      }
    }
  }

  private finishSearch(spy: Spy, furnitureId: string): void {
    const room = this.getRoom(spy.currentRoomId);
    const furn = room.furniture.find((f) => f.id === furnitureId);
    if (!furn) return;

    // Check for trap spring or defusal
    const trapResult = TrapSystem.interactWithFurniture(furn, spy.inventory);
    if (trapResult.status === 'TRIGGERED') {
      this.events.emit('TRAP_TRIGGERED', {
        victim: spy.color,
        trapType: trapResult.trapType,
        targetId: furn.id,
        planter: trapResult.plantedBy
      });
      this.killSpy(spy, 'TRAP', trapResult.plantedBy);
      return;
    } else if (trapResult.status === 'DEFUSED') {
      this.events.emit('TRAP_DEFUSED', {
        defuser: spy.color,
        trapType: trapResult.trapType,
        targetId: furn.id,
        toolUsed: trapResult.toolUsed
      });
    }

    // Reveal item if present
    furn.searched = true;
    if (furn.heldItem) {
      const item = furn.heldItem;
      furn.heldItem = undefined;
      const res = spy.inventory.pickupItem(item);
      if (res.droppedItem) {
        room.addGroundItem(res.droppedItem, spy.x, spy.y);
      }
      this.events.emit('ITEM_FOUND', {
        spy: spy.color,
        item,
        storedInBriefcase: spy.inventory.hasBriefcase
      });
      this.events.emit('SPY_FINISHED_SEARCH', {
        spy: spy.color,
        furnitureId: furn.id,
        itemFound: item
      });
    } else {
      this.events.emit('SPY_FINISHED_SEARCH', {
        spy: spy.color,
        furnitureId: furn.id
      });
    }
  }
}
