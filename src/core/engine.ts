/**
 * Headless Core Game Engine for Midnight Snackdown.
 * Manages simulation loop, house state, raiders, traps, and victory conditions.
 */

import { DOOR_TRAPS, Direction, OUTSIDE, RaiderId, ToolType, TrapType } from './types';
import { House, RUSTY_START_ROOM, SOOT_START_ROOM, createHouse } from './room/houseLayout';
import { DoorData, RoomInstance } from './room/room';
import { Raider } from './raider/raider';
import { GameEventEmitter, KnockoutCause } from './events/gameEvents';
import { TrapSystem } from './trap/trapSystem';
import { CombatSystem } from './combat/combatSystem';

export interface GameEngineOptions {
  matchDurationSeconds?: number;
  house?: House;
}

export class GameEngine {
  public house: House;
  public rusty: Raider;
  public soot: Raider;
  public events: GameEventEmitter;

  public matchDurationSeconds: number;
  public tickCount: number = 0;
  public isGameOver: boolean = false;
  public winner?: RaiderId;

  public readonly KNOCKOUT_TIME_PENALTY_SECONDS = 15; // Off the victim's clock
  public readonly DOOR_COOLDOWN_TICKS = 30; // 0.5s so a raider cannot instantly re-trigger a door

  constructor(options: GameEngineOptions = {}) {
    this.house = options.house ?? createHouse();
    this.events = new GameEventEmitter();
    this.matchDurationSeconds = options.matchDurationSeconds ?? 180;

    this.rusty = new Raider('RUSTY', RUSTY_START_ROOM, 100, 100, this.matchDurationSeconds);
    this.soot = new Raider('SOOT', SOOT_START_ROOM, 200, 100, this.matchDurationSeconds);
  }

  public getRaider(id: RaiderId): Raider {
    return id === 'RUSTY' ? this.rusty : this.soot;
  }

  public getRival(id: RaiderId): Raider {
    return id === 'RUSTY' ? this.soot : this.rusty;
  }

  public getRoom(roomId: string): RoomInstance {
    const room = this.house.getRoom(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }
    return room;
  }

  /**
   * Move raider by direction vector (dx, dy). A zero vector means they stopped walking.
   */
  public moveRaider(id: RaiderId, dx: number, dy: number): void {
    if (this.isGameOver) return;

    const raider = this.getRaider(id);
    if (!raider.canAct()) return;

    raider.move(dx, dy);
    if (dx === 0 && dy === 0) return;

    // Clamp first so that no path out of this method can leave a raider inside a wall.
    const currentRoom = this.getRoom(raider.currentRoomId);
    const clamped = currentRoom.clampPosition(raider.x, raider.y);
    raider.x = clamped.x;
    raider.y = clamped.y;

    // Check if moving through a door (with door cooldown & directional intent check)
    if (raider.doorCooldown === 0) {
      const door = currentRoom.getDoorNear(raider.x, raider.y, 16);
      if (door) {
        const movingTowardsDoor =
          (door.direction === 'NORTH' && dy < 0) ||
          (door.direction === 'SOUTH' && dy > 0) ||
          (door.direction === 'WEST' && dx < 0) ||
          (door.direction === 'EAST' && dx > 0);

        if (movingTowardsDoor) {
          this.passThroughDoor(raider, currentRoom, door);
          return;
        }
      }
    }

    this.events.emit('RAIDER_MOVED', {
      raider: id,
      x: raider.x,
      y: raider.y,
      direction: raider.facing
    });
  }

  /**
   * Door transition logic with trap verification.
   */
  private passThroughDoor(raider: Raider, fromRoom: RoomInstance, door: DoorData): void {
    // Check if door is trapped
    const trapResult = TrapSystem.traverseDoor(door, raider.inventory);
    if (trapResult.status !== 'SAFE') {
      // A trap at a door catches raiders coming from either side, so it is gone from both.
      const otherSide = this.getOtherSideOfDoor(door);
      if (otherSide) otherSide.armedTrap = undefined;
    }

    if (trapResult.status === 'SPRUNG') {
      this.events.emit('TRAP_SPRUNG', {
        victim: raider.id,
        trapType: trapResult.trapType,
        targetId: door.id,
        planter: trapResult.plantedBy
      });
      this.knockOutRaider(raider, 'TRAP', trapResult.plantedBy);
      return;
    } else if (trapResult.status === 'CLEARED') {
      this.events.emit('TRAP_CLEARED', {
        clearedBy: raider.id,
        trapType: trapResult.trapType,
        targetId: door.id,
        toolUsed: trapResult.toolUsed
      });
    }

    // The garden gate only opens for a full feast
    if (door.targetRoomId === OUTSIDE) {
      if (raider.inventory.hasFullFeast()) {
        this.triggerWin(raider.id);
      } else {
        raider.doorCooldown = this.DOOR_COOLDOWN_TICKS;
        this.events.emit('GATE_REFUSED', { raider: raider.id });
      }
      return;
    }

    const toRoom = this.getRoom(door.targetRoomId);
    raider.currentRoomId = toRoom.id;
    raider.doorCooldown = this.DOOR_COOLDOWN_TICKS;
    this.placeInsideDoorway(raider, toRoom, door.direction);

    this.events.emit('RAIDER_ENTERED_ROOM', {
      raider: raider.id,
      fromRoomId: fromRoom.id,
      toRoomId: toRoom.id,
      doorDirection: door.direction
    });
  }

  /** Puts a raider well inside the room, away from the threshold they came through. */
  private placeInsideDoorway(raider: Raider, toRoom: RoomInstance, doorDir: Direction): void {
    raider.facing = doorDir;
    switch (doorDir) {
      case 'NORTH':
        raider.x = 160;
        raider.y = toRoom.bounds.maxY - 35;
        break;
      case 'SOUTH':
        raider.x = 160;
        raider.y = toRoom.bounds.minY + 35;
        break;
      case 'WEST':
        raider.x = toRoom.bounds.maxX - 35;
        raider.y = 120;
        break;
      case 'EAST':
        raider.x = toRoom.bounds.minX + 35;
        raider.y = 120;
        break;
    }
  }

  /** Each doorway is stored once per room; this finds the matching record next door. */
  private getOtherSideOfDoor(door: DoorData): DoorData | undefined {
    return this.house.getRoom(door.targetRoomId)?.getDoor(door.targetDoorDirection);
  }

  /**
   * Action key pressed: pick up floor loot, leave through the gate, or search furniture.
   */
  public interactRaider(id: RaiderId): void {
    if (this.isGameOver) return;
    const raider = this.getRaider(id);
    if (!raider.canAct()) return;

    const room = this.getRoom(raider.currentRoomId);

    // 1. Check floor loot first
    const groundItem = room.takeGroundItemAt(raider.x, raider.y, 25);
    if (groundItem) {
      const res = raider.inventory.pickupItem(groundItem.item);
      if (res.droppedItem) {
        room.addGroundItem(res.droppedItem, raider.x, raider.y);
      }
      this.events.emit('LOOT_FOUND', {
        raider: id,
        item: groundItem.item,
        storedInBasket: raider.inventory.hasBasket
      });
      return;
    }

    // 2. Leave through the garden gate. This uses the same door logic as walking
    //    through it, so a trap at the gate cannot be side-stepped with the action key.
    if (room.isExitRoom && raider.inventory.hasFullFeast()) {
      const door = room.getDoorNear(raider.x, raider.y, 30);
      if (door?.targetRoomId === OUTSIDE) {
        this.passThroughDoor(raider, room, door);
        return;
      }
    }

    // 3. Check furniture interaction
    const furn = room.getFurnitureAt(raider.x, raider.y, 25);
    if (furn) {
      raider.startSearch(furn.id);
      this.events.emit('RAIDER_STARTED_SEARCH', {
        raider: id,
        furnitureId: furn.id
      });
    }
  }

  /**
   * Hide a trap in nearby furniture or lay it at a nearby door.
   */
  public armTrap(id: RaiderId, trapType: TrapType): boolean {
    if (this.isGameOver) return false;
    const raider = this.getRaider(id);
    if (!raider.canAct()) return false;

    const room = this.getRoom(raider.currentRoomId);

    if (DOOR_TRAPS.includes(trapType)) {
      const door = room.getDoorNear(raider.x, raider.y, 30);
      if (!door || !TrapSystem.armDoor(door, trapType, id, raider.inventory)) return false;

      const otherSide = this.getOtherSideOfDoor(door);
      if (otherSide) otherSide.armedTrap = { ...door.armedTrap! };

      this.events.emit('TRAP_SET', { raider: id, trapType, targetId: door.id, targetType: 'DOOR' });
      return true;
    }

    const furn = room.getFurnitureAt(raider.x, raider.y, 30);
    if (!furn || !TrapSystem.armFurniture(furn, trapType, id, raider.inventory)) return false;

    this.events.emit('TRAP_SET', { raider: id, trapType, targetId: furn.id, targetType: 'FURNITURE' });
    return true;
  }

  /**
   * Set the tool the raider has in paw.
   */
  public selectTool(id: RaiderId, tool?: ToolType): void {
    this.getRaider(id).inventory.setActiveTool(tool);
  }

  /**
   * Paw-swat action. Turns to face a rival in the same room first, so that a swat
   * never misses just because of the direction the raider last walked in.
   */
  public attackRaider(id: RaiderId): void {
    if (this.isGameOver) return;
    const attacker = this.getRaider(id);
    if (!attacker.attack()) return;

    const defender = this.getRival(id);
    if (defender.currentRoomId === attacker.currentRoomId && defender.isAwake()) {
      attacker.faceAlong(defender.x - attacker.x, defender.y - attacker.y);
    }

    const combatResult = CombatSystem.resolveAttack(attacker, defender);

    if (combatResult.hit) {
      this.events.emit('COMBAT_HIT', {
        attacker: id,
        target: defender.id,
        damage: combatResult.damageDealt,
        remainingHealth: combatResult.targetRemainingHealth
      });

      if (combatResult.knockedOut) {
        this.knockOutRaider(defender, 'COMBAT', id);
      }
    }
  }

  /**
   * Knock a raider out: scatter their loot and take the penalty off their own clock.
   */
  public knockOutRaider(victim: Raider, cause: KnockoutCause, by?: RaiderId): void {
    victim.knockOut();
    this.scatterLoot(victim);

    const penaltySeconds = this.KNOCKOUT_TIME_PENALTY_SECONDS;
    victim.clockSeconds = Math.max(0, victim.clockSeconds - penaltySeconds);

    this.events.emit('RAIDER_KNOCKED_OUT', { victim: victim.id, cause, by, penaltySeconds });

    if (victim.clockSeconds === 0) {
      this.runRaiderOutOfTime(victim);
    }
  }

  /** Spreads dropped loot in a small circle so each piece can be seen and picked up. */
  private scatterLoot(raider: Raider): void {
    const room = this.getRoom(raider.currentRoomId);
    const dropped = raider.inventory.dropAllLoot();

    dropped.forEach((item, index) => {
      const angle = (index / dropped.length) * Math.PI * 2;
      const spread = dropped.length > 1 ? 14 : 0;
      room.addGroundItem(item, raider.x + Math.cos(angle) * spread, raider.y + Math.sin(angle) * spread);
      this.events.emit('LOOT_DROPPED', { raider: raider.id, item, roomId: room.id });
    });
  }

  /**
   * A raider whose clock hits zero sleeps for the rest of the match, leaving their
   * loot behind and their traps armed. The match only ends when both are asleep.
   */
  private runRaiderOutOfTime(raider: Raider): void {
    raider.runOutOfTime();
    this.scatterLoot(raider);
    this.events.emit('RAIDER_OUT_OF_TIME', { raider: raider.id });

    if (this.getRival(raider.id).state === 'OUT_OF_TIME') {
      this.isGameOver = true;
      this.events.emit('TIME_UP', {});
    }
  }

  private triggerWin(winner: RaiderId): void {
    this.isGameOver = true;
    this.winner = winner;
    this.events.emit('MATCH_WON', { winner });
  }

  /**
   * Fixed tick simulation step (60 FPS).
   */
  public tick(): void {
    if (this.isGameOver) return;

    this.tickCount++;

    // 1-second countdown step for each raider still in the match
    if (this.tickCount % 60 === 0) {
      for (const raider of [this.rusty, this.soot]) {
        if (raider.state === 'OUT_OF_TIME') continue;

        raider.clockSeconds--;
        this.events.emit('CLOCK_TICK', { raider: raider.id, clockSeconds: raider.clockSeconds });

        if (raider.clockSeconds <= 0) {
          this.runRaiderOutOfTime(raider);
        }
      }
      if (this.isGameOver) return;
    }

    // Update both raiders
    for (const raider of [this.rusty, this.soot]) {
      const updateResult = raider.update();

      // Check search completion
      if (updateResult.searchCompleted) {
        this.finishSearch(raider, updateResult.searchCompleted);
      }

      // Check wake-up
      if (updateResult.wokeUp) {
        const roomId = raider.id === 'RUSTY' ? RUSTY_START_ROOM : SOOT_START_ROOM;
        raider.wakeUp(roomId, 160, 120);
        this.events.emit('RAIDER_WOKE_UP', { raider: raider.id, roomId, x: 160, y: 120 });
      }
    }
  }

  private finishSearch(raider: Raider, furnitureId: string): void {
    const room = this.getRoom(raider.currentRoomId);
    const furn = room.furniture.find((f) => f.id === furnitureId);
    if (!furn) return;

    // Check for a trap being sprung or cleared
    const trapResult = TrapSystem.interactWithFurniture(furn, raider.inventory);
    if (trapResult.status === 'SPRUNG') {
      this.events.emit('TRAP_SPRUNG', {
        victim: raider.id,
        trapType: trapResult.trapType,
        targetId: furn.id,
        planter: trapResult.plantedBy
      });
      this.knockOutRaider(raider, 'TRAP', trapResult.plantedBy);
      return;
    } else if (trapResult.status === 'CLEARED') {
      this.events.emit('TRAP_CLEARED', {
        clearedBy: raider.id,
        trapType: trapResult.trapType,
        targetId: furn.id,
        toolUsed: trapResult.toolUsed
      });
    }

    // Reveal loot if present
    furn.searched = true;
    const item = furn.heldItem;
    if (item) {
      furn.heldItem = undefined;
      const res = raider.inventory.pickupItem(item);
      if (res.droppedItem) {
        room.addGroundItem(res.droppedItem, raider.x, raider.y);
      }
      this.events.emit('LOOT_FOUND', {
        raider: raider.id,
        item,
        storedInBasket: raider.inventory.hasBasket
      });
    }
    this.events.emit('RAIDER_FINISHED_SEARCH', {
      raider: raider.id,
      furnitureId: furn.id,
      lootFound: item
    });
  }
}
