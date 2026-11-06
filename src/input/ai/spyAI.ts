/**
 * Autonomous AI Bot Controller for Black Spy.
 */

import { GameEngine } from '../../core/engine';
import { TrapType, CounterItemType } from '../../core/types';
import { FurnitureData, DoorData } from '../../core/room/room';

export class SpyAI {
  private engine: GameEngine;
  private moveTimer: number = 0;
  private currentDir: { dx: number; dy: number } = { dx: 0, dy: 0 };
  private trapPlantTimer: number = 0;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  public update(): void {
    const blackSpy = this.engine.blackSpy;
    const whiteSpy = this.engine.whiteSpy;

    if (!blackSpy.canAct() || this.engine.isGameOver) return;

    const currentRoom = this.engine.getRoom(blackSpy.currentRoomId);

    // 1. Same-room combat reaction!
    if (whiteSpy.currentRoomId === blackSpy.currentRoomId && whiteSpy.isAlive()) {
      const dx = whiteSpy.x - blackSpy.x;
      const dy = whiteSpy.y - blackSpy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 30) {
        // Face opponent and attack!
        blackSpy.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'EAST' : 'WEST') : dy > 0 ? 'SOUTH' : 'NORTH';
        this.engine.attackSpy('BLACK');
        return;
      } else {
        // Chase opponent
        const ndx = dx / dist;
        const ndy = dy / dist;
        this.engine.moveSpy('BLACK', ndx, ndy);
        return;
      }
    }

    // 2. Check for ground items in room
    if (currentRoom.groundItems.length > 0) {
      const targetItem = currentRoom.groundItems[0];
      const dx = targetItem.x - blackSpy.x;
      const dy = targetItem.y - blackSpy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 15) {
        this.engine.interactSpy('BLACK');
        return;
      } else {
        this.engine.moveSpy('BLACK', dx / dist, dy / dist);
        return;
      }
    }

    // 3. Check for unsearched furniture in current room
    const unsearched = currentRoom.furniture.find((f: FurnitureData) => !f.searched);
    if (unsearched) {
      const centerX = unsearched.x + unsearched.width / 2;
      const centerY = unsearched.y + unsearched.height / 2;
      const dx = centerX - blackSpy.x;
      const dy = centerY - blackSpy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 22) {
        // Equip a defusal tool just in case
        blackSpy.inventory.setActiveTool(CounterItemType.WATER_BUCKET);
        this.engine.interactSpy('BLACK');
        return;
      } else {
        this.engine.moveSpy('BLACK', dx / dist, dy / dist);
        return;
      }
    }

    // 4. Occasionally arm traps
    this.trapPlantTimer++;
    if (this.trapPlantTimer > 300) {
      this.trapPlantTimer = 0;
      this.engine.armTrap('BLACK', TrapType.BOMB);
    }

    // 5. If has all escape items, head towards exit room (room_4)
    if (blackSpy.inventory.hasAllEscapeItems() && currentRoom.isAirportExit) {
      const exitDoor = currentRoom.doors.find((d: DoorData) => d.direction === 'EAST');
      if (exitDoor) {
        const dx = exitDoor.x - blackSpy.x;
        const dy = exitDoor.y - blackSpy.y;
        if (Math.hypot(dx, dy) <= 20) {
          this.engine.interactSpy('BLACK');
          return;
        } else {
          const len = Math.hypot(dx, dy) || 1;
          this.engine.moveSpy('BLACK', dx / len, dy / len);
          return;
        }
      }
    }

    // 6. Otherwise wander between doors to explore the embassy
    this.moveTimer++;
    if (this.moveTimer > 60 || (this.currentDir.dx === 0 && this.currentDir.dy === 0)) {
      this.moveTimer = 0;
      if (currentRoom.doors.length > 0) {
        const randomDoor = currentRoom.doors[Math.floor(Math.random() * currentRoom.doors.length)];
        const dx = randomDoor.x - blackSpy.x;
        const dy = randomDoor.y - blackSpy.y;
        const len = Math.hypot(dx, dy) || 1;
        this.currentDir = { dx: dx / len, dy: dy / len };
      }
    }

    this.engine.moveSpy('BLACK', this.currentDir.dx, this.currentDir.dy);
  }
}
