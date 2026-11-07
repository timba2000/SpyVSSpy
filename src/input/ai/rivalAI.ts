/**
 * Autonomous AI Controller for the rival raider.
 *
 * Priorities each tick: swat a rival in reach, leave once the feast is packed, chase a
 * rival carrying loot, grab usable floor loot, search furniture, then roam. Rooms are
 * reached by breadth-first search over the door graph. Like a human player it can see
 * both halves of the screen, so it knows what has been searched and what is on the
 * floor, but it does not know where unfound loot is or what the rival's traps are.
 */

import { GameEngine } from '../../core/engine';
import { DOOR_TRAPS, FURNITURE_TRAPS, OUTSIDE, RaiderId, ToolType, TrapType, TRAP_COUNTER_MAP } from '../../core/types';
import { DoorData, FurnitureData, RoomInstance } from '../../core/room/room';
import { Raider } from '../../core/raider/raider';

const TRAP_INTERVAL_TICKS = 480; // At most one trap every 8 seconds
const ATTACK_REACH = 30;
const SEARCH_REACH = 22;
const PICKUP_REACH = 24; // Generous, because loot spilled by a door trap lies near the door
const DOOR_TRAP_REACH = 30;

export class RivalAI {
  private engine: GameEngine;
  private id: RaiderId;
  private rng: () => number;
  private trapTimer: number = TRAP_INTERVAL_TICKS;
  private roamDoor?: DoorData;

  constructor(engine: GameEngine, id: RaiderId = 'SOOT', rng: () => number = Math.random) {
    this.engine = engine;
    this.id = id;
    this.rng = rng;
  }

  public update(): void {
    const me = this.engine.getRaider(this.id);
    const rival = this.engine.getRival(this.id);

    if (!me.canAct() || this.engine.isGameOver) return;

    if (this.trapTimer > 0) this.trapTimer--;

    const room = this.engine.getRoom(me.currentRoomId);
    const rivalHere = rival.currentRoomId === me.currentRoomId && rival.isAwake();

    // 1. Swat a rival in reach
    if (rivalHere && Math.hypot(rival.x - me.x, rival.y - me.y) <= ATTACK_REACH) {
      this.engine.attackRaider(this.id);
      return;
    }

    // 2. Feast packed: head for the garden gate
    if (me.inventory.hasFullFeast()) {
      this.travelTo(me, room, this.engine.house.exitRoomId);
      return;
    }

    // 3. Chase a rival who is carrying loot, since knocking them out spills it
    if (rivalHere && rival.inventory.isCarryingLoot()) {
      this.walkTowards(me, rival.x, rival.y);
      return;
    }

    // 4. Grab floor loot it can use. Loot that would only swap with what it is already
    //    carrying is left alone; otherwise it would swap back and forth forever.
    const usable = room.groundItems.find((gi) => me.inventory.canCarryWithoutDropping(gi.item));
    if (usable) {
      if (Math.hypot(usable.x - me.x, usable.y - me.y) <= PICKUP_REACH) {
        this.engine.interactRaider(this.id);
      } else {
        this.walkTowards(me, usable.x, usable.y);
      }
      return;
    }

    // 5. Search furniture in this room
    const target = this.pickFurniture(room);
    if (target) {
      this.searchOrApproach(me, target);
      return;
    }

    // 6. Travel to the nearest room with something still to do
    const nextRoom = this.nearestRoomWith((candidate) => this.roomHasWork(me, candidate), me.currentRoomId);
    if (nextRoom) {
      this.travelTo(me, room, nextRoom);
      return;
    }

    // 7. Everything else is in the rival's paws: hunt them down, or roam if they are asleep
    if (rival.isAwake() && rival.inventory.isCarryingLoot()) {
      this.travelTo(me, room, rival.currentRoomId);
      return;
    }
    this.roam(me, room);
  }

  /** Unsearched furniture, leaving its own trapped pieces until there is nothing else. */
  private pickFurniture(room: RoomInstance): FurnitureData | undefined {
    const unsearched = room.furniture.filter((f) => !f.searched);
    return unsearched.find((f) => f.armedTrap?.plantedBy !== this.id) ?? unsearched[0];
  }

  private roomHasWork(me: Raider, room: RoomInstance): boolean {
    return (
      room.furniture.some((f) => !f.searched) ||
      room.groundItems.some((gi) => me.inventory.canCarryWithoutDropping(gi.item))
    );
  }

  private searchOrApproach(me: Raider, target: FurnitureData): void {
    const centerX = target.x + target.width / 2;
    const centerY = target.y + target.height / 2;

    if (Math.hypot(centerX - me.x, centerY - me.y) > SEARCH_REACH) {
      // Line up sideways first, then walk straight in. A diagonal towards back-wall
      // furniture can cross a door's approach and carry it out of the room by accident.
      if (Math.abs(centerX - me.x) > me.speed) {
        this.walkTowards(me, centerX, me.y);
      } else {
        this.walkTowards(me, me.x, centerY);
      }
      return;
    }

    // Sometimes booby-trap a piece on the way past instead of opening it.
    if (this.trapTimer === 0 && !target.armedTrap && this.tryArm(FURNITURE_TRAPS)) {
      return;
    }

    // It knows what it planted itself; otherwise it has to guess which tool to hold.
    const tool = target.armedTrap?.plantedBy === this.id ? TRAP_COUNTER_MAP[target.armedTrap.type] : this.guessTool(FURNITURE_TRAPS);
    this.engine.selectTool(this.id, tool);
    this.engine.interactRaider(this.id);
  }

  private guessTool(traps: readonly TrapType[]): ToolType {
    return TRAP_COUNTER_MAP[traps[Math.floor(this.rng() * traps.length)]];
  }

  private tryArm(traps: readonly TrapType[]): boolean {
    const me = this.engine.getRaider(this.id);
    const available = traps.filter((t) => me.inventory.hasTrap(t));
    if (available.length === 0) return false;

    const armed = this.engine.armTrap(this.id, available[Math.floor(this.rng() * available.length)]);
    if (armed) this.trapTimer = TRAP_INTERVAL_TICKS;
    return armed;
  }

  /** Breadth-first search out from a room, returning the nearest room that matches. */
  private nearestRoomWith(matches: (room: RoomInstance) => boolean, fromRoomId: string): string | undefined {
    const seen = new Set([fromRoomId]);
    const queue = [fromRoomId];

    while (queue.length > 0) {
      const current = this.engine.getRoom(queue.shift()!);
      if (current.id !== fromRoomId && matches(current)) return current.id;

      for (const door of current.doors) {
        if (door.targetRoomId !== OUTSIDE && !seen.has(door.targetRoomId)) {
          seen.add(door.targetRoomId);
          queue.push(door.targetRoomId);
        }
      }
    }
    return undefined;
  }

  /** Picks the door in this room that starts a shortest route to the target room. */
  private doorTowards(room: RoomInstance, targetRoomId: string): DoorData | undefined {
    const distances = new Map([[targetRoomId, 0]]);
    const queue = [targetRoomId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const distance = distances.get(currentId)!;
      for (const door of this.engine.getRoom(currentId).doors) {
        if (door.targetRoomId !== OUTSIDE && !distances.has(door.targetRoomId)) {
          distances.set(door.targetRoomId, distance + 1);
          queue.push(door.targetRoomId);
        }
      }
    }

    let best: DoorData | undefined;
    let bestDistance = Infinity;
    for (const door of room.doors) {
      const distance = distances.get(door.targetRoomId) ?? Infinity;
      if (distance < bestDistance) {
        best = door;
        bestDistance = distance;
      }
    }
    return best;
  }

  private travelTo(me: Raider, room: RoomInstance, targetRoomId: string): void {
    if (room.id === targetRoomId) {
      // Already there: only the gate is worth walking to.
      const gate = room.doors.find((d) => d.targetRoomId === OUTSIDE);
      if (gate && me.inventory.hasFullFeast()) this.walkThroughDoor(me, room, gate);
      return;
    }

    const door = this.doorTowards(room, targetRoomId);
    if (door) this.walkThroughDoor(me, room, door);
  }

  private walkThroughDoor(me: Raider, room: RoomInstance, door: DoorData): void {
    const nearDoor = Math.abs(me.x - door.x) <= door.width / 2 + DOOR_TRAP_REACH && Math.abs(me.y - door.y) <= door.height / 2 + DOOR_TRAP_REACH;

    if (nearDoor) {
      // Mine the door on the way past, except the gate it is about to need.
      if (this.trapTimer === 0 && !door.armedTrap && door.targetRoomId !== OUTSIDE && this.tryArm(DOOR_TRAPS)) {
        return;
      }
      // It knows its own traps. Otherwise it settles on one door tool as a guess,
      // rather than re-guessing every tick until it happens to be right.
      const holdingDoorTool = DOOR_TRAPS.some((t) => TRAP_COUNTER_MAP[t] === me.inventory.activeTool);
      if (door.armedTrap?.plantedBy === this.id) {
        this.engine.selectTool(this.id, TRAP_COUNTER_MAP[door.armedTrap.type]);
      } else if (!holdingDoorTool) {
        this.engine.selectTool(this.id, this.guessTool(DOOR_TRAPS));
      }
    }

    // Aim past the wall: the engine only opens a door for a raider moving into it,
    // and aiming at the door itself stalls when standing level with its centre.
    const { minX, maxX, minY, maxY } = room.bounds;
    switch (door.direction) {
      case 'NORTH':
        this.walkTowards(me, door.x, minY - 40);
        break;
      case 'SOUTH':
        this.walkTowards(me, door.x, maxY + 40);
        break;
      case 'WEST':
        this.walkTowards(me, minX - 40, door.y);
        break;
      case 'EAST':
        this.walkTowards(me, maxX + 40, door.y);
        break;
    }
  }

  private roam(me: Raider, room: RoomInstance): void {
    const walkable = room.doors.filter((d) => d.targetRoomId !== OUTSIDE);
    if (!this.roamDoor || !walkable.includes(this.roamDoor)) {
      this.roamDoor = walkable[Math.floor(this.rng() * walkable.length)];
    }
    if (this.roamDoor) this.walkThroughDoor(me, room, this.roamDoor);
  }

  private walkTowards(me: Raider, x: number, y: number): void {
    const dx = x - me.x;
    const dy = y - me.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      this.engine.moveRaider(this.id, dx / distance, dy / distance);
    }
  }
}
