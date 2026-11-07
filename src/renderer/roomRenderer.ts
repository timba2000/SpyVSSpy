/**
 * Procedural room renderer: walls, floors, doors, furniture, and loot on the floor.
 */

import { FurnitureType, LootType, OUTSIDE, RaiderId, TrapType } from '../core/types';
import { ArmedTrap, DoorData, FurnitureData, RoomInstance } from '../core/room/room';
import { RAIDER_PALETTES } from './raiderRenderer';

type FloorStyle = 'boards' | 'tile' | 'carpet' | 'concrete';

interface RoomTheme {
  wall: string;
  wallAccent: string;
  floor: string;
  floorLine: string;
  style: FloorStyle;
}

const ROOM_THEMES: Record<string, RoomTheme> = {
  garage: { wall: '#3f4a55', wallAccent: '#556270', floor: '#5a6068', floorLine: '#4a4f56', style: 'concrete' },
  hall: { wall: '#6b5b45', wallAccent: '#80705a', floor: '#8a6a43', floorLine: '#6f5333', style: 'boards' },
  porch: { wall: '#4d6a57', wallAccent: '#5f7f6b', floor: '#7d6a4f', floorLine: '#65543d', style: 'boards' },
  pantry: { wall: '#b08d57', wallAccent: '#c4a26d', floor: '#a8a29e', floorLine: '#8f8985', style: 'tile' },
  cellar: { wall: '#4a3f3a', wallAccent: '#5c504a', floor: '#57504b', floorLine: '#47413d', style: 'concrete' },
  dining: { wall: '#7a3e48', wallAccent: '#8f4f5a', floor: '#8a5a36', floorLine: '#6f4628', style: 'boards' },
  lounge: { wall: '#3d5a80', wallAccent: '#4f6e96', floor: '#94775a', floorLine: '#a58a6d', style: 'carpet' },
  laundry: { wall: '#5f9ea0', wallAccent: '#74b1b3', floor: '#cbd5e1', floorLine: '#aab5c2', style: 'tile' }
};

const DEFAULT_THEME = ROOM_THEMES.hall;

const WALL_HEIGHT = 56;
const SIDE_WALL = 20;

export class RoomRenderer {
  /**
   * Renders a room in logical 320x200 space. Hidden traps are only drawn for the
   * raider who planted them: everyone else has to watch the other half of the screen.
   */
  public static render(ctx: CanvasRenderingContext2D, room: RoomInstance, viewer: RaiderId, tick: number = 0): void {
    ctx.save();

    this.renderShell(ctx, room);

    for (const door of room.doors) {
      this.renderDoor(ctx, door, tick);
      if (door.armedTrap?.plantedBy === viewer) {
        this.renderDoorTrap(ctx, door, door.armedTrap, tick);
      }
    }

    for (const furn of room.furniture) {
      this.renderFurniture(ctx, furn);
      if (furn.armedTrap?.plantedBy === viewer) {
        this.renderOwnTrapMarker(ctx, furn, viewer, tick);
      }
    }

    for (const groundItem of room.groundItems) {
      this.renderFloorLoot(ctx, groundItem.item, groundItem.x, groundItem.y, tick);
    }

    ctx.restore();
  }

  private static renderShell(ctx: CanvasRenderingContext2D, room: RoomInstance): void {
    const theme = ROOM_THEMES[room.id] ?? DEFAULT_THEME;
    const w = 320;
    const h = 200;

    // Back wall with a dado rail, moonlit by the window
    ctx.fillStyle = theme.wall;
    ctx.fillRect(0, 0, w, WALL_HEIGHT);
    ctx.fillStyle = theme.wallAccent;
    ctx.fillRect(0, 36, w, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, WALL_HEIGHT - 3, w, 3);

    if (!room.getDoor('NORTH')) {
      this.renderWindow(ctx, 142, 10);
    }

    // Floor
    ctx.fillStyle = theme.floor;
    ctx.fillRect(SIDE_WALL, WALL_HEIGHT, w - SIDE_WALL * 2, h - WALL_HEIGHT);
    ctx.save();
    ctx.beginPath();
    ctx.rect(SIDE_WALL, WALL_HEIGHT, w - SIDE_WALL * 2, h - WALL_HEIGHT);
    ctx.clip();
    this.renderFloorPattern(ctx, theme, w, h);

    // Night-time pool of moonlight
    const moonlight = ctx.createRadialGradient(160, 110, 10, 160, 120, 170);
    moonlight.addColorStop(0, 'rgba(191, 219, 254, 0.14)');
    moonlight.addColorStop(1, 'rgba(8, 10, 30, 0.42)');
    ctx.fillStyle = moonlight;
    ctx.fillRect(0, WALL_HEIGHT, w, h - WALL_HEIGHT);
    ctx.restore();

    // Side walls, shaded darker to read as receding
    ctx.fillStyle = theme.wall;
    for (const [outer, inner] of [
      [0, SIDE_WALL],
      [w, w - SIDE_WALL]
    ]) {
      ctx.beginPath();
      ctx.moveTo(outer, 0);
      ctx.lineTo(inner, WALL_HEIGHT);
      ctx.lineTo(inner, h);
      ctx.lineTo(outer, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, SIDE_WALL, h);
    ctx.fillRect(w - SIDE_WALL, 0, SIDE_WALL, h);

    // Room dimming from the top, to keep the sleeping house at night
    ctx.fillStyle = 'rgba(10, 12, 40, 0.28)';
    ctx.fillRect(0, 0, w, WALL_HEIGHT);
  }

  private static renderFloorPattern(ctx: CanvasRenderingContext2D, theme: RoomTheme, w: number, h: number): void {
    ctx.strokeStyle = theme.floorLine;
    ctx.fillStyle = theme.floorLine;
    ctx.lineWidth = 1;

    switch (theme.style) {
      case 'boards':
        for (let y = WALL_HEIGHT; y < h; y += 12) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          const offset = ((y - WALL_HEIGHT) / 12) % 2 === 0 ? 0 : 30;
          for (let x = SIDE_WALL + offset; x < w; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 12);
            ctx.stroke();
          }
        }
        break;
      case 'tile':
        for (let y = WALL_HEIGHT; y < h; y += 18) {
          for (let x = SIDE_WALL; x < w; x += 18) {
            if (((x - SIDE_WALL) / 18 + (y - WALL_HEIGHT) / 18) % 2 === 0) {
              ctx.fillRect(x, y, 18, 18);
            }
          }
        }
        break;
      case 'carpet':
        for (let y = WALL_HEIGHT + 3; y < h; y += 6) {
          for (let x = SIDE_WALL + ((y / 6) % 2) * 3; x < w; x += 6) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;
      case 'concrete':
        ctx.beginPath();
        ctx.moveTo(60, WALL_HEIGHT);
        ctx.lineTo(82, 110);
        ctx.lineTo(70, 160);
        ctx.moveTo(240, 90);
        ctx.lineTo(205, 130);
        ctx.lineTo(214, 200);
        ctx.stroke();
        for (let i = 0; i < 40; i++) {
          ctx.fillRect(SIDE_WALL + ((i * 67) % 280), WALL_HEIGHT + ((i * 41) % 144), 2, 1);
        }
        break;
    }
  }

  private static renderWindow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x - 2, y - 2, 40, 28);
    ctx.fillStyle = '#0f1b3d';
    ctx.fillRect(x, y, 36, 24);
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(x + 26, y + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f1b3d';
    ctx.beginPath();
    ctx.arc(x + 28, y + 7, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x + 17, y, 2, 24);
    ctx.fillRect(x, y + 11, 36, 2);
  }

  private static renderDoor(ctx: CanvasRenderingContext2D, door: DoorData, tick: number): void {
    if (door.targetRoomId === OUTSIDE) {
      this.renderGardenGate(ctx, door, tick);
      return;
    }

    const paint = '#a16207';
    const frame = '#fef3c7';
    const { x, y } = door;

    switch (door.direction) {
      case 'NORTH': {
        const dw = 32;
        const dh = 44;
        const dx = x - dw / 2;
        const dy = WALL_HEIGHT - dh;
        ctx.fillStyle = frame;
        ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);
        ctx.fillStyle = paint;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(dx + 5, dy + 5, dw - 10, 12);
        ctx.fillRect(dx + 5, dy + 22, dw - 10, 16);
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(dx + dw - 5, dy + 22, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'SOUTH': {
        // Doormat in the foreground, since the near wall is not drawn
        ctx.fillStyle = '#44403c';
        ctx.fillRect(x - 24, y - 2, 48, 11);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(x - 21, y, 42, 7);
        ctx.fillStyle = '#44403c';
        for (let i = -18; i <= 18; i += 6) {
          ctx.fillRect(x + i, y + 1, 2, 5);
        }
        break;
      }
      case 'WEST':
      case 'EAST': {
        const isWest = door.direction === 'WEST';
        const edge = isWest ? 4 : 302;
        ctx.fillStyle = frame;
        ctx.fillRect(edge - 1, y - 24, 16, 48);
        ctx.fillStyle = paint;
        ctx.fillRect(edge, y - 22, 14, 44);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(edge + 3, y - 18, 8, 14);
        ctx.fillRect(edge + 3, y, 8, 16);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(isWest ? edge + 11 : edge + 1, y - 2, 2, 4);
        break;
      }
    }
  }

  private static renderGardenGate(ctx: CanvasRenderingContext2D, door: DoorData, tick: number): void {
    const { y } = door;
    const edge = 300;

    // Picket gate, with night garden visible between the slats
    ctx.fillStyle = '#0f2a1d';
    ctx.fillRect(edge, y - 28, 20, 56);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(edge + 3, y + 18, 15, 10);

    ctx.fillStyle = '#f0fdf4';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(edge + 1 + i * 5, y - 26, 3, 52);
    }
    ctx.fillRect(edge, y - 16, 20, 3);
    ctx.fillRect(edge, y + 12, 20, 3);

    // Pulsing sign, on the floor side so it is never clipped
    const glow = 0.65 + Math.sin(tick * 0.08) * 0.35;
    ctx.fillStyle = `rgba(74, 222, 128, ${glow})`;
    ctx.fillRect(edge - 28, y - 44, 44, 13);
    ctx.fillStyle = '#052e16';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GARDEN', edge - 6, y - 34.5);
    ctx.textAlign = 'left';
  }

  /** Door traps, drawn only for their planter. */
  private static renderDoorTrap(ctx: CanvasRenderingContext2D, door: DoorData, trap: ArmedTrap, tick: number): void {
    const x = door.direction === 'WEST' ? door.x + 14 : door.direction === 'EAST' ? door.x - 14 : door.x;
    const y = door.direction === 'NORTH' ? door.y + 10 : door.direction === 'SOUTH' ? door.y - 10 : door.y + 8;

    if (trap.type === TrapType.MARBLE_SPILL) {
      const colors = ['#f43f5e', '#38bdf8', '#facc15', '#a78bfa', '#4ade80'];
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - 8 + i * 4, y + (i % 2) * 3, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 10, y - 3, 20, 7);
      if (tick % 12 < 7) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 7, y - 4);
        ctx.lineTo(x - 2, y);
        ctx.lineTo(x + 1, y - 4);
        ctx.lineTo(x + 7, y + 1);
        ctx.stroke();
      }
    }
  }

  private static renderOwnTrapMarker(
    ctx: CanvasRenderingContext2D,
    furn: FurnitureData,
    planter: RaiderId,
    tick: number
  ): void {
    const pulse = (Math.sin(tick * 0.2) + 1) * 0.5;
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.fillStyle = RAIDER_PALETTES[planter].bandana;
    ctx.beginPath();
    ctx.arc(furn.x + furn.width - 2, furn.y + 2, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private static renderFurniture(ctx: CanvasRenderingContext2D, furn: FurnitureData): void {
    const { x, y, width: w, height: h, type, searched } = furn;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 1, w / 2 + 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (type) {
      case FurnitureType.FRIDGE:
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x + 3, y - 4, w - 6, h + 4);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 3, y + 7, w - 6, 1.5);
        if (searched) {
          // Door swung open on a lit, empty interior
          ctx.fillStyle = '#fef9c3';
          ctx.fillRect(x + 5, y - 2, w - 10, 8);
          ctx.fillRect(x + 5, y + 10, w - 10, h - 12);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(x + w - 3, y - 4, 6, h + 4);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x + w - 8, y, 2, 5);
          ctx.fillRect(x + w - 8, y + 11, 2, 9);
        }
        break;

      case FurnitureType.CUPBOARD:
        ctx.fillStyle = '#92400e';
        ctx.fillRect(x, y, w, h - 4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x, y + h - 6, w, 2);
        if (searched) {
          ctx.fillStyle = '#1c1917';
          ctx.fillRect(x + 2, y + 2, w - 4, h - 10);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 2, y + (h - 10) / 2, w - 4, 1.5);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x - 5, y + 1, 5, h - 7);
          ctx.fillRect(x + w, y + 1, 5, h - 7);
        } else {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x + 2, y + 2, w / 2 - 3, h - 10);
          ctx.fillRect(x + w / 2 + 1, y + 2, w / 2 - 3, h - 10);
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(x + w / 2 - 3, y + h / 2 - 4, 1.5, 4);
          ctx.fillRect(x + w / 2 + 2, y + h / 2 - 4, 1.5, 4);
        }
        break;

      case FurnitureType.TABLE:
        // Tablecloth hides whatever is underneath until it is pulled aside
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(x + 3, y + 9, 4, h - 9);
        ctx.fillRect(x + w - 7, y + 9, 4, h - 9);
        ctx.fillStyle = '#fafaf9';
        ctx.fillRect(x, y, w, searched ? 7 : 15);
        ctx.fillStyle = '#dc2626';
        for (let i = 0; i < w; i += 8) {
          ctx.fillRect(x + i, y, 4, 4);
          ctx.fillRect(x + i + 4, y + 4, 4, 3);
        }
        if (searched) {
          ctx.fillStyle = '#fafaf9';
          ctx.beginPath();
          ctx.moveTo(x + w - 10, y + 7);
          ctx.lineTo(x + w + 3, y + 7);
          ctx.lineTo(x + w + 1, y + 22);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case FurnitureType.BIN:
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 6);
        ctx.lineTo(x + w - 3, y + 6);
        ctx.lineTo(x + w - 6, y + h);
        ctx.lineTo(x + 6, y + h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let i = 9; i < w - 8; i += 6) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + 8);
          ctx.lineTo(x + i, y + h - 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#64748b';
        if (searched) {
          // Lid knocked to the floor, rubbish on show
          ctx.fillStyle = '#a3a380';
          ctx.fillRect(x + 6, y + 3, 7, 4);
          ctx.fillRect(x + w - 15, y + 2, 9, 4);
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(x - 3, y + h - 1, 8, 2.5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + 5, w / 2 - 1, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + w / 2 - 3, y - 1, 6, 2);
        }
        break;

      case FurnitureType.HAMPER:
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(x + 3, y + 8, w - 6, h - 8);
        ctx.strokeStyle = '#a47148';
        ctx.lineWidth = 1;
        for (let row = y + 12; row < y + h; row += 5) {
          ctx.beginPath();
          ctx.moveTo(x + 3, row);
          ctx.lineTo(x + w - 3, row);
          ctx.stroke();
        }
        if (searched) {
          // Laundry pulled out over the side
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(x + 5, y + 4, 9, 6);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(x + 14, y + 3, 10, 7);
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(x + w - 4, y + 12, 7, 12);
        } else {
          ctx.fillStyle = '#b08968';
          ctx.fillRect(x + 1, y + 5, w - 2, 4);
        }
        break;
    }

    ctx.restore();
  }

  private static renderFloorLoot(ctx: CanvasRenderingContext2D, item: LootType, x: number, y: number, tick: number): void {
    ctx.save();

    const pulse = (Math.sin(tick * 0.15) + 1) * 0.5;
    ctx.fillStyle = `rgba(254, 240, 138, ${0.25 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 9 + pulse * 2, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y + Math.sin(tick * 0.1) * 1.5);
    this.drawLootIcon(ctx, item);

    ctx.restore();
  }

  private static drawLootIcon(ctx: CanvasRenderingContext2D, item: LootType): void {
    switch (item) {
      case LootType.BASKET:
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -1, 5, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-7, -1, 14, 7);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-7, -1, 14, 2);
        break;
      case LootType.PIZZA:
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(6, -4);
        ctx.lineTo(0, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-7, -6, 14, 2.5);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-1.5, -1, 1.3, 0, Math.PI * 2);
        ctx.arc(2, 1, 1.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      case LootType.CHEESE:
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(-7, 5);
        ctx.lineTo(7, 5);
        ctx.lineTo(7, -2);
        ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(-2, 2.5, 1.3, 0, Math.PI * 2);
        ctx.arc(3, 1.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      case LootType.HONEY:
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-5, -3, 10, 9);
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(-5, -6, 10, 3);
        ctx.fillStyle = '#fffbeb';
        ctx.fillRect(-3, 0, 6, 3);
        break;
      case LootType.FISH:
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath();
        ctx.ellipse(-1, 0, 6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(8, -3.5);
        ctx.lineTo(8, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0c4a6e';
        ctx.beginPath();
        ctx.arc(-4, -0.8, 0.9, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }
}
