/**
 * Room Renderer - Modern 3D Cutaway Diorama
 * Renders the 8 rooms of the house in 3D perspective with extruded cutaway walls,
 * perspective-converging floors, volumetric window moonbeams, 3D doors & garden gate,
 * 3D volumetric furniture, and floating 3D loot.
 *
 * Logical coordinate space: 320 x 200.
 */

import { ArmedTrap, DoorData, FurnitureData, RoomInstance } from '../core/room/room';
import {
  FurnitureType,
  LootType,
  OUTSIDE,
  RaiderId,
  TrapType,
} from '../core/types';
import {
  drawContactShadow,
  drawCylinder3D,
  drawExtrudedBox3D,
  drawSphere3D,
  projectFloorRayX,
  projectTowardVP,
  render3DSettings,
  shadeHex,
} from './render3d';

const ROOM_WIDTH = 320;
const ROOM_HEIGHT = 200;

interface RoomPalette {
  wallMain: string;
  wallSide: string;
  wallCutaway: string;
  trim: string;
  floorMain: string;
  floorAlt: string;
  floorStyle: 'tile' | 'wood' | 'carpet' | 'concrete';
  rugColor?: string;
  windowX?: number;
}

const ROOM_PALETTES: Record<string, RoomPalette> = {
  // Garage - Moonlit concrete & utility brick/slate
  garage: {
    wallMain: '#334155',
    wallSide: '#1e293b',
    wallCutaway: '#64748b',
    trim: '#94a3b8',
    floorMain: '#475569',
    floorAlt: '#334155',
    floorStyle: 'concrete',
    windowX: 100,
  },
  // Hall - Classic olive manor walls, oak floorboards & crimson runner rug
  hall: {
    wallMain: '#365314',
    wallSide: '#1a2e05',
    wallCutaway: '#65a30d',
    trim: '#bef264',
    floorMain: '#693f23',
    floorAlt: '#4e2d16',
    floorStyle: 'wood',
    rugColor: '#7f1d1d',
    windowX: 192,
  },
  // Back Porch - Moonlit midnight timber & garden flagstone patio
  porch: {
    wallMain: '#1e293b',
    wallSide: '#0f172a',
    wallCutaway: '#475569',
    trim: '#64748b',
    floorMain: '#334155',
    floorAlt: '#1e293b',
    floorStyle: 'concrete',
    windowX: 100,
  },
  // Pantry - Warm terracotta & checkerboard ceramic tile
  pantry: {
    wallMain: '#7c2d12',
    wallSide: '#5b1f0c',
    wallCutaway: '#a16207',
    trim: '#fde68a',
    floorMain: '#475569',
    floorAlt: '#cbd5e1',
    floorStyle: 'tile',
    windowX: 192,
  },
  // Cellar - Deep cobblestone slate & cool cellar planks
  cellar: {
    wallMain: '#3b2f2f',
    wallSide: '#261c1c',
    wallCutaway: '#78716c',
    trim: '#a8a29e',
    floorMain: '#3f2e21',
    floorAlt: '#2e2016',
    floorStyle: 'wood',
  },
  // Dining Room - Rich burgundy wainscoting, polished walnut parquet & emerald rug
  dining: {
    wallMain: '#6b1d2f',
    wallSide: '#4c1120',
    wallCutaway: '#9f1239',
    trim: '#fcd34d',
    floorMain: '#5c341d',
    floorAlt: '#432310',
    floorStyle: 'wood',
    rugColor: '#065f46',
    windowX: 100,
  },
  // Lounge - Royal indigo & plush velvet carpet + golden trim
  lounge: {
    wallMain: '#1e3a8a',
    wallSide: '#172554',
    wallCutaway: '#3b82f6',
    trim: '#93c5fd',
    floorMain: '#581c87',
    floorAlt: '#3b0764',
    floorStyle: 'carpet',
    rugColor: '#881337',
    windowX: 192,
  },
  // Laundry - Deep teal utility glaze & slate checkerboard tile
  laundry: {
    wallMain: '#115e59',
    wallSide: '#042f2e',
    wallCutaway: '#14b8a6',
    trim: '#99f6e4',
    floorMain: '#334155',
    floorAlt: '#64748b',
    floorStyle: 'tile',
    windowX: 192,
  },
};

const DEFAULT_PALETTE: RoomPalette = ROOM_PALETTES.hall;

// Room interior bounds in 320x200 space
const WALL_LEFT = 22;
const WALL_RIGHT = ROOM_WIDTH - 22; // 298
const WALL_TOP = 8;
const FLOOR_TOP = 46;
const FLOOR_BOTTOM = ROOM_HEIGHT - 6; // 194

export class RoomRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    room: RoomInstance,
    viewer: RaiderId,
    tick = 0
  ): void {
    const palette = ROOM_PALETTES[room.id] ?? DEFAULT_PALETTE;

    // 1. 3D Cutaway Walls, Perspective Floor, Baseboards, Window & Moonbeams
    this.renderDioramaShell3D(ctx, palette, tick);

    // 2. Doors (North, West, East, South) & Garden Gate
    for (const door of room.doors) {
      if (door.targetRoomId === OUTSIDE) {
        this.renderGardenGate3D(ctx, door, tick);
      } else {
        this.renderDoor3D(ctx, door);
      }
      if (door.armedTrap) {
        this.renderTrap3D(ctx, door.armedTrap, viewer, door.x, door.y, tick);
      }
    }

    // 3. Depth-sorted 3D Furniture (back to front by y)
    const sortedFurniture = [...room.furniture].sort((a, b) => a.y - b.y);
    for (const furn of sortedFurniture) {
      this.renderFurniture3D(ctx, furn);
      if (furn.armedTrap) {
        this.renderTrap3D(
          ctx,
          furn.armedTrap,
          viewer,
          furn.x + furn.width / 2,
          furn.y + furn.height / 2,
          tick
        );
      }
    }

    // 4. Floating 3D Ground Loot
    room.groundItems.forEach((ground, idx) => {
      this.renderFloorLoot3D(ctx, ground.item, ground.x, ground.y, idx, tick);
    });
  }

  private static renderDioramaShell3D(
    ctx: CanvasRenderingContext2D,
    palette: RoomPalette,
    tick: number
  ): void {
    // Exterior abyss
    ctx.fillStyle = '#040711';
    ctx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    // --- 1. 3D PERSPECTIVE FLOOR ---
    const floorGrad = ctx.createLinearGradient(0, FLOOR_TOP, 0, FLOOR_BOTTOM);
    floorGrad.addColorStop(0, shadeHex(palette.floorMain, 0.78));
    floorGrad.addColorStop(0.45, palette.floorMain);
    floorGrad.addColorStop(1, shadeHex(palette.floorMain, 0.85));

    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, FLOOR_TOP);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM);
    ctx.lineTo(0, FLOOR_BOTTOM);
    ctx.closePath();
    ctx.fill();

    // Clip to floor trapezoid for perspective floor textures, rugs, and window light patches
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(WALL_LEFT, FLOOR_TOP);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM);
    ctx.lineTo(0, FLOOR_BOTTOM);
    ctx.closePath();
    ctx.clip();

    if (palette.floorStyle === 'tile') {
      this.renderPerspectiveTileFloor(ctx);
    } else if (palette.floorStyle === 'wood') {
      this.renderPerspectiveWoodFloor(ctx, palette);
    } else if (palette.floorStyle === 'carpet') {
      this.renderPerspectiveCarpetFloor(ctx, palette);
    } else {
      this.renderPerspectiveConcreteFloor(ctx);
    }

    // Optional 3D Perspective Area Rug (Dining Room, Hall, Lounge)
    if (palette.rugColor) {
      this.renderPerspectiveRug3D(ctx, palette.rugColor, palette.trim);
    }

    // Floor specular ceiling-light reflection pool
    if (render3DSettings.shadowsAndReflections) {
      const reflGrad = ctx.createRadialGradient(160, 114, 8, 160, 118, 115);
      reflGrad.addColorStop(0, 'rgba(254, 243, 199, 0.12)');
      reflGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.04)');
      reflGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = reflGrad;
      ctx.fillRect(0, FLOOR_TOP, ROOM_WIDTH, FLOOR_BOTTOM - FLOOR_TOP);

      // Floor contact shadow along back wall
      const backAO = ctx.createLinearGradient(0, FLOOR_TOP, 0, FLOOR_TOP + 16);
      backAO.addColorStop(0, 'rgba(2, 6, 23, 0.65)');
      backAO.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = backAO;
      ctx.fillRect(0, FLOOR_TOP, ROOM_WIDTH, 16);
    }

    ctx.restore();

    // --- 2. 3D BACK WALL ---
    const backWallGrad = ctx.createLinearGradient(0, WALL_TOP, 0, FLOOR_TOP);
    backWallGrad.addColorStop(0, shadeHex(palette.wallMain, 0.72));
    backWallGrad.addColorStop(0.5, palette.wallMain);
    backWallGrad.addColorStop(1, shadeHex(palette.wallMain, 0.62));
    ctx.fillStyle = backWallGrad;
    ctx.fillRect(WALL_LEFT, WALL_TOP, WALL_RIGHT - WALL_LEFT, FLOOR_TOP - WALL_TOP);

    // Subtle decorative wainscoting panels on back wall
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.8;
    for (let px = WALL_LEFT + 12; px < WALL_RIGHT - 18; px += 28) {
      ctx.strokeRect(px, WALL_TOP + 5, 20, FLOOR_TOP - WALL_TOP - 13);
    }

    // --- 3. 3D RECEDING LEFT & RIGHT WALLS ---
    const leftWallGrad = ctx.createLinearGradient(0, 0, WALL_LEFT, 0);
    leftWallGrad.addColorStop(0, shadeHex(palette.wallSide, 1.15));
    leftWallGrad.addColorStop(1, shadeHex(palette.wallSide, 0.72));
    ctx.fillStyle = leftWallGrad;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(WALL_LEFT, WALL_TOP);
    ctx.lineTo(WALL_LEFT, FLOOR_TOP);
    ctx.lineTo(0, FLOOR_BOTTOM);
    ctx.closePath();
    ctx.fill();

    const rightWallGrad = ctx.createLinearGradient(WALL_RIGHT, 0, ROOM_WIDTH, 0);
    rightWallGrad.addColorStop(0, shadeHex(palette.wallSide, 0.72));
    rightWallGrad.addColorStop(1, shadeHex(palette.wallSide, 1.15));
    ctx.fillStyle = rightWallGrad;
    ctx.beginPath();
    ctx.moveTo(ROOM_WIDTH, 4);
    ctx.lineTo(WALL_RIGHT, WALL_TOP);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM);
    ctx.closePath();
    ctx.fill();

    // --- 4. 3D WRAPPING BASEBOARD (SKIRTING) & DADO RAIL ---
    ctx.fillStyle = shadeHex(palette.trim, 0.45);
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_BOTTOM);
    ctx.lineTo(WALL_LEFT, FLOOR_TOP);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM - 6);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP - 4);
    ctx.lineTo(WALL_LEFT, FLOOR_TOP - 4);
    ctx.lineTo(0, FLOOR_BOTTOM - 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_BOTTOM - 6);
    ctx.lineTo(WALL_LEFT, FLOOR_TOP - 4);
    ctx.lineTo(WALL_RIGHT, FLOOR_TOP - 4);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM - 6);
    ctx.stroke();

    // Dado / chair rail wrapping all 3 walls
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 118);
    ctx.lineTo(WALL_LEFT, 30);
    ctx.lineTo(WALL_RIGHT, 30);
    ctx.lineTo(ROOM_WIDTH, 118);
    ctx.stroke();

    // Corner Ambient Occlusion vertical creases at (WALL_LEFT) and (WALL_RIGHT)
    if (render3DSettings.shadowsAndReflections) {
      const leftCornerAO = ctx.createLinearGradient(WALL_LEFT - 5, 0, WALL_LEFT + 7, 0);
      leftCornerAO.addColorStop(0, 'rgba(0,0,0,0)');
      leftCornerAO.addColorStop(0.45, 'rgba(2, 6, 23, 0.55)');
      leftCornerAO.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftCornerAO;
      ctx.fillRect(WALL_LEFT - 5, WALL_TOP, 12, FLOOR_TOP - WALL_TOP);

      const rightCornerAO = ctx.createLinearGradient(WALL_RIGHT - 7, 0, WALL_RIGHT + 5, 0);
      rightCornerAO.addColorStop(0, 'rgba(0,0,0,0)');
      rightCornerAO.addColorStop(0.55, 'rgba(2, 6, 23, 0.55)');
      rightCornerAO.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightCornerAO;
      ctx.fillRect(WALL_RIGHT - 7, WALL_TOP, 12, FLOOR_TOP - WALL_TOP);
    }

    // --- 5. 3D CUTAWAY WALL TOP CAPS & FOREGROUND SLAB ---
    const capGrad = ctx.createLinearGradient(0, 0, 0, WALL_TOP);
    capGrad.addColorStop(0, shadeHex(palette.wallCutaway, 0.65));
    capGrad.addColorStop(1, palette.wallCutaway);
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ROOM_WIDTH, 0);
    ctx.lineTo(WALL_RIGHT, WALL_TOP);
    ctx.lineTo(WALL_LEFT, WALL_TOP);
    ctx.closePath();
    ctx.fill();

    // Cutaway bottom rim (foreground floor slab thickness y: 194..200)
    const slabGrad = ctx.createLinearGradient(0, FLOOR_BOTTOM, 0, ROOM_HEIGHT);
    slabGrad.addColorStop(0, shadeHex(palette.floorMain, 0.55));
    slabGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = slabGrad;
    ctx.fillRect(0, FLOOR_BOTTOM, ROOM_WIDTH, ROOM_HEIGHT - FLOOR_BOTTOM);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_BOTTOM);
    ctx.lineTo(ROOM_WIDTH, FLOOR_BOTTOM);
    ctx.stroke();

    // --- 6. 3D RECESSED WINDOW & VOLUMETRIC MOONLIGHT ---
    if (palette.windowX !== undefined) {
      this.renderWindow3D(ctx, palette.windowX, 13, tick);
    }
  }

  private static renderPerspectiveTileFloor(ctx: CanvasRenderingContext2D): void {
    const cols = 12;
    const rows = 7;
    const topWidth = WALL_RIGHT - WALL_LEFT;

    for (let r = 0; r < rows; r++) {
      const t0 = Math.pow(r / rows, 1.28);
      const t1 = Math.pow((r + 1) / rows, 1.28);
      const y0 = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * t0;
      const y1 = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * t1;

      for (let c = 0; c < cols; c++) {
        const topX0 = WALL_LEFT + (c / cols) * topWidth;
        const topX1 = WALL_LEFT + ((c + 1) / cols) * topWidth;

        const x00 = projectFloorRayX(topX0, FLOOR_TOP, y0);
        const x10 = projectFloorRayX(topX1, FLOOR_TOP, y0);
        const x11 = projectFloorRayX(topX1, FLOOR_TOP, y1);
        const x01 = projectFloorRayX(topX0, FLOOR_TOP, y1);

        const isAlt = (r + c) % 2 === 0;
        ctx.fillStyle = isAlt
          ? 'rgba(241, 245, 249, 0.14)'
          : 'rgba(15, 23, 42, 0.24)';

        ctx.beginPath();
        ctx.moveTo(x00, y0);
        ctx.lineTo(x10, y0);
        ctx.lineTo(x11, y1);
        ctx.lineTo(x01, y1);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }

  private static renderPerspectiveWoodFloor(
    ctx: CanvasRenderingContext2D,
    palette: RoomPalette
  ): void {
    const planks = 14;
    const topWidth = WALL_RIGHT - WALL_LEFT;

    for (let p = 0; p < planks; p++) {
      const topX0 = WALL_LEFT + (p / planks) * topWidth;
      const topX1 = WALL_LEFT + ((p + 1) / planks) * topWidth;
      const botX0 = projectFloorRayX(topX0, FLOOR_TOP, FLOOR_BOTTOM);
      const botX1 = projectFloorRayX(topX1, FLOOR_TOP, FLOOR_BOTTOM);

      ctx.fillStyle =
        p % 2 === 0
          ? 'rgba(0, 0, 0, 0.12)'
          : p % 3 === 0
            ? 'rgba(255, 255, 255, 0.04)'
            : 'rgba(0, 0, 0, 0.04)';
      ctx.beginPath();
      ctx.moveTo(topX0, FLOOR_TOP);
      ctx.lineTo(topX1, FLOOR_TOP);
      ctx.lineTo(botX1, FLOOR_BOTTOM);
      ctx.lineTo(botX0, FLOOR_BOTTOM);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = shadeHex(palette.floorAlt, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(topX0, FLOOR_TOP);
      ctx.lineTo(botX0, FLOOR_BOTTOM);
      ctx.stroke();
    }

    const courses = 6;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.lineWidth = 0.8;
    for (let r = 1; r < courses; r++) {
      const t = Math.pow(r / courses, 1.25);
      const y = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * t;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ROOM_WIDTH, y);
      ctx.stroke();
    }
  }

  private static renderPerspectiveCarpetFloor(
    ctx: CanvasRenderingContext2D,
    palette: RoomPalette
  ): void {
    const y0 = FLOOR_TOP + 12;
    const y1 = FLOOR_BOTTOM - 14;
    const tl = projectFloorRayX(WALL_LEFT + 18, FLOOR_TOP, y0);
    const tr = projectFloorRayX(WALL_RIGHT - 18, FLOOR_TOP, y0);
    const bl = projectFloorRayX(WALL_LEFT + 18, FLOOR_TOP, y1);
    const br = projectFloorRayX(WALL_RIGHT - 18, FLOOR_TOP, y1);

    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tl, y0);
    ctx.lineTo(tr, y0);
    ctx.lineTo(br, y1);
    ctx.lineTo(bl, y1);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
  }

  private static renderPerspectiveConcreteFloor(ctx: CanvasRenderingContext2D): void {
    const cols = 6;
    const rows = 5;
    const topWidth = WALL_RIGHT - WALL_LEFT;

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
    ctx.lineWidth = 1.2;

    for (let r = 0; r < rows; r++) {
      const t0 = Math.pow(r / rows, 1.22);
      const t1 = Math.pow((r + 1) / rows, 1.22);
      const y0 = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * t0;
      const y1 = FLOOR_TOP + (FLOOR_BOTTOM - FLOOR_TOP) * t1;

      for (let c = 0; c < cols; c++) {
        const stagger = (r % 2) * 0.25;
        const topX0 = WALL_LEFT + ((c + stagger) / cols) * topWidth;
        const topX1 = WALL_LEFT + ((c + 1 + stagger) / cols) * topWidth;

        const x00 = projectFloorRayX(topX0, FLOOR_TOP, y0);
        const x10 = projectFloorRayX(topX1, FLOOR_TOP, y0);
        const x11 = projectFloorRayX(topX1, FLOOR_TOP, y1);
        const x01 = projectFloorRayX(topX0, FLOOR_TOP, y1);

        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.moveTo(x00, y0);
        ctx.lineTo(x10, y0);
        ctx.lineTo(x11, y1);
        ctx.lineTo(x01, y1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  private static renderPerspectiveRug3D(
    ctx: CanvasRenderingContext2D,
    rugColor: string,
    trimColor: string
  ): void {
    const yTop = 76;
    const yBot = 158;
    const topLeftX = projectFloorRayX(96, FLOOR_TOP, yTop);
    const topRightX = projectFloorRayX(224, FLOOR_TOP, yTop);
    const botLeftX = projectFloorRayX(96, FLOOR_TOP, yBot);
    const botRightX = projectFloorRayX(224, FLOOR_TOP, yBot);

    // 3D Rug thickness shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.moveTo(topLeftX - 1, yTop + 2);
    ctx.lineTo(topRightX + 1, yTop + 2);
    ctx.lineTo(botRightX + 2, yBot + 3);
    ctx.lineTo(botLeftX - 2, yBot + 3);
    ctx.closePath();
    ctx.fill();

    // Rug body
    const rugGrad = ctx.createLinearGradient(0, yTop, 0, yBot);
    rugGrad.addColorStop(0, shadeHex(rugColor, 0.85));
    rugGrad.addColorStop(0.5, rugColor);
    rugGrad.addColorStop(1, shadeHex(rugColor, 0.92));
    ctx.fillStyle = rugGrad;
    ctx.beginPath();
    ctx.moveTo(topLeftX, yTop);
    ctx.lineTo(topRightX, yTop);
    ctx.lineTo(botRightX, yBot);
    ctx.lineTo(botLeftX, yBot);
    ctx.closePath();
    ctx.fill();

    // Inner gold border
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(topLeftX + 6, yTop + 5);
    ctx.lineTo(topRightX - 6, yTop + 5);
    ctx.lineTo(botRightX - 8, yBot - 6);
    ctx.lineTo(botLeftX + 8, yBot - 6);
    ctx.closePath();
    ctx.stroke();

    // Center diamond medallion
    const midY = (yTop + yBot) / 2;
    ctx.fillStyle = 'rgba(254, 243, 199, 0.16)';
    ctx.beginPath();
    ctx.moveTo(160, yTop + 16);
    ctx.lineTo(192, midY);
    ctx.lineTo(160, yBot - 16);
    ctx.lineTo(128, midY);
    ctx.closePath();
    ctx.fill();
  }

  private static renderWindow3D(
    ctx: CanvasRenderingContext2D,
    wx: number,
    wy: number,
    tick: number
  ): void {
    const ww = 30;
    const wh = 22;

    // 1. Recessed 3D window frame shadow
    ctx.fillStyle = '#090d16';
    ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

    // 2. Night sky inside window
    const skyGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    skyGrad.addColorStop(0, '#09152b');
    skyGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(wx, wy, ww, wh);

    // 3. Glowing crescent moon & twinkling stars
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(wx + 21, wy + 6.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c1c38';
    ctx.beginPath();
    ctx.arc(wx + 19.5, wy + 5.5, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const twinkle = 0.5 + 0.5 * Math.sin(tick * 0.06);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + twinkle * 0.5})`;
    ctx.fillRect(wx + 6, wy + 5, 1.4, 1.4);
    ctx.fillRect(wx + 11, wy + 9, 1.2, 1.2);

    // 4. 3D Recessed side reveal & muntin bars
    ctx.fillStyle = '#334155';
    ctx.fillRect(wx, wy, 2, wh);
    ctx.fillRect(wx, wy, ww, 1.8);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();

    // 5. Protruding 3D Window Sill & drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(wx - 3, wy + wh, ww + 6, 2.2);

    // 6. Volumetric 3D Moonlight Rays & Floor Projection
    if (render3DSettings.moonlightRays) {
      ctx.save();
      const shiftX = wx < 160 ? 18 : -18;
      const beamGrad = ctx.createLinearGradient(wx + ww / 2, wy + wh, wx + ww / 2 + shiftX, 118);
      beamGrad.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
      beamGrad.addColorStop(0.55, 'rgba(186, 230, 253, 0.08)');
      beamGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(wx, wy + wh);
      ctx.lineTo(wx + ww, wy + wh);
      ctx.lineTo(wx + ww + shiftX + 16, 118);
      ctx.lineTo(wx + shiftX - 8, 118);
      ctx.closePath();
      ctx.fill();

      // Projected 4-pane moonlight patch on the floor
      ctx.fillStyle = 'rgba(186, 230, 253, 0.11)';
      const patchX = wx + shiftX * 0.55;
      ctx.beginPath();
      ctx.moveTo(patchX, 62);
      ctx.lineTo(patchX + ww + 5, 62);
      ctx.lineTo(patchX + ww + 14, 92);
      ctx.lineTo(patchX - 5, 92);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private static renderDoor3D(ctx: CanvasRenderingContext2D, door: DoorData): void {
    ctx.save();
    const dir = door.direction;

    if (dir === 'NORTH') {
      const dx = 142;
      const dy = 10;
      const dw = 36;
      const dh = FLOOR_TOP - dy;

      // 3D Outer Architrave / Lintel
      ctx.fillStyle = '#451a03';
      ctx.fillRect(dx - 4, dy - 3, dw + 8, dh + 3);

      // Overhanging 3D Lintel Top Cap
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.moveTo(dx - 6, dy - 3);
      ctx.lineTo(dx + dw + 6, dy - 3);
      ctx.lineTo(dx + dw + 4, dy);
      ctx.lineTo(dx - 4, dy);
      ctx.closePath();
      ctx.fill();

      // Recessed 3D Inner Jambs
      ctx.fillStyle = '#271001';
      ctx.fillRect(dx, dy, dw, dh);

      // Door Leaf with 3D wood gradient
      const leafGrad = ctx.createLinearGradient(dx + 2, dy + 2, dx + dw - 2, dy + dh);
      leafGrad.addColorStop(0, '#b45309');
      leafGrad.addColorStop(0.5, '#92400e');
      leafGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = leafGrad;
      ctx.fillRect(dx + 2, dy + 2, dw - 4, dh - 2);

      // 3D Recessed Door Panels
      ctx.fillStyle = '#652b0d';
      ctx.fillRect(dx + 5, dy + 5, 11, 11);
      ctx.fillRect(dx + 20, dy + 5, 11, 11);
      ctx.fillRect(dx + 5, dy + 19, 11, 12);
      ctx.fillRect(dx + 20, dy + 19, 11, 12);

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.25)';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(dx + 5, dy + 5, 11, 11);
      ctx.strokeRect(dx + 20, dy + 5, 11, 11);
      ctx.strokeRect(dx + 5, dy + 19, 11, 12);
      ctx.strokeRect(dx + 20, dy + 19, 11, 12);

      // 3D Spherical Brass Doorknob
      drawSphere3D(ctx, dx + dw - 6.5, dy + dh * 0.56, 2.5, 2.5, '#facc15', {
        specular: true,
      });

      // Warm light spill beneath door onto floor
      const spillGrad = ctx.createRadialGradient(160, FLOOR_TOP + 1, 2, 160, FLOOR_TOP + 5, 22);
      spillGrad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
      spillGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = spillGrad;
      ctx.fillRect(dx - 4, FLOOR_TOP, dw + 8, 12);
    } else if (dir === 'SOUTH') {
      const dx = 136;
      const dw = 48;

      // 3D Coir Welcome Mat on floor
      drawContactShadow(ctx, 160, 186, 27, 6, 0.45);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(dx + 4, 177);
      ctx.lineTo(dx + dw - 4, 177);
      ctx.lineTo(dx + dw, 188);
      ctx.lineTo(dx, 188);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 3D Brass/Oak Threshold Sill across the foreground cutaway wall
      const sillGrad = ctx.createLinearGradient(dx, 189, dx, 199);
      sillGrad.addColorStop(0, '#f59e0b');
      sillGrad.addColorStop(0.5, '#b45309');
      sillGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = sillGrad;
      ctx.fillRect(dx - 4, 189, dw + 8, 9);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(dx - 4, 189, dw + 8, 9);
    } else if (dir === 'WEST') {
      // True 3D perspective doorway set into the receding Left Wall (around y = 120)
      const yBackBot = 96;
      const yFrontBot = 144;
      const xBackBot = WALL_LEFT * (1 - (yBackBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
      const xFrontBot = WALL_LEFT * (1 - (yFrontBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
      const yBackTop = yBackBot - 44;
      const yFrontTop = yFrontBot - 52;

      // Recessed wall jamb thickness
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(xBackBot - 3, yBackTop - 2);
      ctx.lineTo(xBackBot + 2, yBackTop);
      ctx.lineTo(xBackBot + 2, yBackBot);
      ctx.lineTo(xFrontBot + 2, yFrontBot);
      ctx.lineTo(xFrontBot - 3, yFrontBot + 2);
      ctx.lineTo(xFrontBot - 3, yFrontTop);
      ctx.closePath();
      ctx.fill();

      // Perspective Door Leaf
      const doorGrad = ctx.createLinearGradient(0, yBackTop, xBackBot + 2, yFrontBot);
      doorGrad.addColorStop(0, '#b45309');
      doorGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = doorGrad;
      ctx.beginPath();
      ctx.moveTo(xBackBot + 1, yBackTop);
      ctx.lineTo(xBackBot + 1, yBackBot);
      ctx.lineTo(xFrontBot + 1, yFrontBot);
      ctx.lineTo(xFrontBot + 1, yFrontTop);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 3D Brass Knob in perspective
      const knobX = (xBackBot + xFrontBot) * 0.5 + 1;
      const knobY = (yBackBot + yFrontTop) * 0.5 + 4;
      drawSphere3D(ctx, knobX, knobY, 2.4, 2.8, '#facc15', { specular: true });
    } else if (dir === 'EAST') {
      // True 3D perspective doorway set into the receding Right Wall (around y = 120)
      const yBackBot = 96;
      const yFrontBot = 144;
      const xBackBot =
        WALL_RIGHT + (ROOM_WIDTH - WALL_RIGHT) * ((yBackBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
      const xFrontBot =
        WALL_RIGHT + (ROOM_WIDTH - WALL_RIGHT) * ((yFrontBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
      const yBackTop = yBackBot - 44;
      const yFrontTop = yFrontBot - 52;

      // Recessed wall jamb thickness
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(xBackBot + 3, yBackTop - 2);
      ctx.lineTo(xBackBot - 2, yBackTop);
      ctx.lineTo(xBackBot - 2, yBackBot);
      ctx.lineTo(xFrontBot - 2, yFrontBot);
      ctx.lineTo(xFrontBot + 3, yFrontBot + 2);
      ctx.lineTo(xFrontBot + 3, yFrontTop);
      ctx.closePath();
      ctx.fill();

      // Perspective Door Leaf
      const doorGrad = ctx.createLinearGradient(xBackBot - 2, yBackTop, ROOM_WIDTH, yFrontBot);
      doorGrad.addColorStop(0, '#78350f');
      doorGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = doorGrad;
      ctx.beginPath();
      ctx.moveTo(xBackBot - 1, yBackTop);
      ctx.lineTo(xBackBot - 1, yBackBot);
      ctx.lineTo(xFrontBot - 1, yFrontBot);
      ctx.lineTo(xFrontBot - 1, yFrontTop);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      // 3D Brass Knob in perspective
      const knobX = (xBackBot + xFrontBot) * 0.5 - 1;
      const knobY = (yBackBot + yFrontTop) * 0.5 + 4;
      drawSphere3D(ctx, knobX, knobY, 2.4, 2.8, '#facc15', { specular: true });
    }

    ctx.restore();
  }

  /**
   * Renders the 3D Wrought-Iron & Stone Garden Gate on the East wall of the Back Porch.
   */
  private static renderGardenGate3D(
    ctx: CanvasRenderingContext2D,
    door: DoorData,
    tick: number
  ): void {
    ctx.save();
    const yBackBot = 92;
    const yFrontBot = 148;
    const xBackBot =
      WALL_RIGHT + (ROOM_WIDTH - WALL_RIGHT) * ((yBackBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
    const xFrontBot =
      WALL_RIGHT + (ROOM_WIDTH - WALL_RIGHT) * ((yFrontBot - FLOOR_TOP) / (FLOOR_BOTTOM - FLOOR_TOP));
    const yBackTop = yBackBot - 48;
    const yFrontTop = yFrontBot - 56;

    // 1. Starry Night Garden Vista beyond the gate archway
    const vistaGrad = ctx.createLinearGradient(xBackBot - 4, yBackTop, ROOM_WIDTH, yFrontBot);
    vistaGrad.addColorStop(0, '#020617');
    vistaGrad.addColorStop(0.55, '#064e3b');
    vistaGrad.addColorStop(1, '#047857');
    ctx.fillStyle = vistaGrad;
    ctx.beginPath();
    ctx.moveTo(xBackBot - 2, yBackTop);
    ctx.lineTo(xBackBot - 2, yBackBot);
    ctx.lineTo(xFrontBot - 2, yFrontBot);
    ctx.lineTo(xFrontBot - 2, yFrontTop);
    ctx.closePath();
    ctx.fill();

    // 2. Emerald Moonlit Glow spilling onto the Porch floor
    const glowGrad = ctx.createRadialGradient(
      door.x - 6,
      door.y,
      3,
      door.x - 14,
      door.y,
      34
    );
    glowGrad.addColorStop(0, 'rgba(52, 211, 153, 0.35)');
    glowGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.12)');
    glowGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(door.x - 10, door.y, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 3D Extruded Stone Gate Pillars (Back & Front of the East Gate)
    drawExtrudedBox3D(ctx, {
      x: xBackBot - 7,
      y: yBackTop - 4,
      w: 9,
      h: yBackBot - yBackTop + 6,
      depthFactor: 0.04,
      baseColor: '#64748b',
      topColor: '#cbd5e1',
      sideColor: '#475569',
    });

    // 4. Perspective Wrought-Iron Bars & Gold Finials
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    const bars = 5;
    for (let i = 1; i <= bars; i++) {
      const t = i / (bars + 1);
      const bx = xBackBot + (xFrontBot - xBackBot) * t - 1;
      const byTop = yBackTop + (yFrontTop - yBackTop) * t + 4;
      const byBot = yBackBot + (yFrontBot - yBackBot) * t;
      ctx.beginPath();
      ctx.moveTo(bx, byTop);
      ctx.lineTo(bx, byBot);
      ctx.stroke();

      // Gold spear finial
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(bx, byTop - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front Stone Pillar (overlapping bars in foreground)
    drawExtrudedBox3D(ctx, {
      x: xFrontBot - 7,
      y: yFrontTop - 4,
      w: 9,
      h: yFrontBot - yFrontTop + 6,
      depthFactor: 0.04,
      baseColor: '#64748b',
      topColor: '#cbd5e1',
      sideColor: '#475569',
    });

    // 5. Glowing 3D Coach Lanterns atop both stone pillars
    const pulse = 0.85 + 0.15 * Math.sin(tick * 0.08);
    [
      { lx: xBackBot - 2.5, ly: yBackTop - 7 },
      { lx: xFrontBot - 2.5, ly: yFrontTop - 7 },
    ].forEach(({ lx, ly }) => {
      const halo = ctx.createRadialGradient(lx, ly, 1, lx, ly, 12 * pulse);
      halo.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
      halo.addColorStop(0.5, 'rgba(52, 211, 153, 0.3)');
      halo.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, 12, 0, Math.PI * 2);
      ctx.fill();

      drawSphere3D(ctx, lx, ly, 3, 3.4, '#fef08a', { specular: true });
    });

    // 6. Floating 3D "EXIT" Plaque beside the gate
    ctx.fillStyle = '#064e3b';
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1;
    ctx.fillRect(ROOM_WIDTH - 46, yBackTop - 16, 38, 10);
    ctx.strokeRect(ROOM_WIDTH - 46, yBackTop - 16, 38, 10);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 6.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT GATE', ROOM_WIDTH - 27, yBackTop - 9);

    ctx.restore();
  }

  private static renderFurniture3D(ctx: CanvasRenderingContext2D, furn: FurnitureData): void {
    ctx.save();
    const { x, y, width: w, height: h, searched } = furn;

    switch (furn.type) {
      case FurnitureType.FRIDGE: {
        // 3D Stainless/Enamel Refrigerator
        drawExtrudedBox3D(ctx, {
          x,
          y,
          w,
          h,
          depthFactor: 0.07,
          baseColor: '#e2e8f0',
          topColor: '#f8fafc',
          sideColor: '#94a3b8',
        });

        const splitY = y + Math.round(h * 0.36);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 1, splitY);
        ctx.lineTo(x + w - 1, splitY);
        ctx.stroke();

        // Bottom grille vents
        ctx.fillStyle = '#334155';
        ctx.fillRect(x + 3, y + h - 4, w - 6, 2.5);

        if (searched) {
          // Dark interior cavity + warm 3D fridge light
          const insideGrad = ctx.createLinearGradient(x + 3, splitY + 2, x + w - 3, y + h - 5);
          insideGrad.addColorStop(0, '#fef08a');
          insideGrad.addColorStop(1, '#ca8a04');
          ctx.fillStyle = insideGrad;
          ctx.fillRect(x + 3, splitY + 2, w - 6, h - (splitY - y) - 7);

          // Interior glass shelves
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 3, splitY + 8);
          ctx.lineTo(x + w - 3, splitY + 8);
          ctx.moveTo(x + 3, splitY + 14);
          ctx.lineTo(x + w - 3, splitY + 14);
          ctx.stroke();

          // 3D Swung-Open Fridge Door Leaf in perspective
          ctx.fillStyle = '#cbd5e1';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + w, splitY);
          ctx.lineTo(x + w + 11, splitY + 5);
          ctx.lineTo(x + w + 11, y + h - 1);
          ctx.lineTo(x + w, y + h - 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Warm fridge light cone spilled onto floor
          const lightCone = ctx.createRadialGradient(
            x + w / 2,
            y + h + 4,
            2,
            x + w / 2,
            y + h + 10,
            18
          );
          lightCone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          lightCone.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = lightCone;
          ctx.beginPath();
          ctx.ellipse(x + w / 2 + 3, y + h + 6, 18, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 3D Chrome Handles
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x + w - 6, y + 3, 2.2, splitY - y - 6);
          ctx.fillRect(x + w - 6, splitY + 3, 2.2, h - (splitY - y) - 9);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(x + w - 6.5, y + 3, 1.2, splitY - y - 6);
          ctx.fillRect(x + w - 6.5, splitY + 3, 1.2, h - (splitY - y) - 9);

          // Fridge magnets
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x + 5, y + 4, 3.5, 3.5);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 10, y + 6, 3, 3);
        }
        break;
      }

      case FurnitureType.CUPBOARD: {
        // 3D Hardwood Sideboard / Cupboard
        drawExtrudedBox3D(ctx, {
          x,
          y: y + 3,
          w,
          h: h - 3,
          depthFactor: 0.06,
          baseColor: '#92400e',
          topColor: '#b45309',
          sideColor: '#78350f',
        });

        // Overhanging 3D Butcher-Block Countertop
        drawExtrudedBox3D(ctx, {
          x: x - 2,
          y,
          w: w + 4,
          h: 5,
          depthFactor: 0.065,
          baseColor: '#fde68a',
          topColor: '#fef3c7',
          sideColor: '#d97706',
          shadow: false,
        });

        const midX = x + w / 2;

        if (searched) {
          ctx.fillStyle = '#271001';
          ctx.fillRect(x + 3, y + 7, w - 6, h - 10);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 3, y + Math.round(h * 0.55), w - 6, 2);

          // Left & Right 3D Swung-Open Cabinet Doors
          ctx.fillStyle = '#b45309';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 7);
          ctx.lineTo(x - 7, y + 12);
          ctx.lineTo(x - 7, y + h - 1);
          ctx.lineTo(x + 2, y + h - 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x + w - 2, y + 7);
          ctx.lineTo(x + w + 7, y + 12);
          ctx.lineTo(x + w + 7, y + h - 1);
          ctx.lineTo(x + w - 2, y + h - 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 3, y + 7, w / 2 - 4, h - 10);
          ctx.fillRect(midX + 1, y + 7, w / 2 - 4, h - 10);

          ctx.strokeStyle = 'rgba(253, 230, 138, 0.25)';
          ctx.lineWidth = 0.7;
          ctx.strokeRect(x + 3, y + 7, w / 2 - 4, h - 10);
          ctx.strokeRect(midX + 1, y + 7, w / 2 - 4, h - 10);

          drawSphere3D(ctx, midX - 3, y + h * 0.55, 1.8, 1.8, '#facc15', { specular: true });
          drawSphere3D(ctx, midX + 3, y + h * 0.55, 1.8, 1.8, '#facc15', { specular: true });
        }
        break;
      }

      case FurnitureType.TABLE: {
        const legW = 3.5;
        const backShift = projectTowardVP(x + w / 2, y, 0.055);
        const backOffsetY = backShift.y - y;

        drawContactShadow(ctx, x + w / 2, y + h, w * 0.58, 6, 0.42);

        // Back 2 cylindrical legs
        drawCylinder3D(ctx, x + 4, y + 4 + backOffsetY, legW, h - 6, 1.2, '#5c2d0c');
        drawCylinder3D(ctx, x + w - 4 - legW, y + 4 + backOffsetY, legW, h - 6, 1.2, '#5c2d0c');

        // Front 2 cylindrical legs
        drawCylinder3D(ctx, x + 2, y + 6, legW, h - 6, 1.2, '#9a3412');
        drawCylinder3D(ctx, x + w - 2 - legW, y + 6, legW, h - 6, 1.2, '#9a3412');

        // 3D Extruded Tabletop
        const topBox = drawExtrudedBox3D(ctx, {
          x,
          y,
          w,
          h: 6,
          depthFactor: 0.065,
          baseColor: '#c2410c',
          topColor: '#ea580c',
          sideColor: '#7c2d12',
          shadow: false,
        });

        // Decorative 3D Table Runner
        const runnerLeft = x + w * 0.34;
        const runnerRight = x + w * 0.66;
        const backRunnerLeft =
          topBox.backTopLeft.x + (topBox.backTopRight.x - topBox.backTopLeft.x) * 0.34;
        const backRunnerRight =
          topBox.backTopLeft.x + (topBox.backTopRight.x - topBox.backTopLeft.x) * 0.66;

        ctx.fillStyle = searched ? '#cbd5e1' : '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(backRunnerLeft, topBox.backTopLeft.y);
        ctx.lineTo(backRunnerRight, topBox.backTopRight.y);
        ctx.lineTo(runnerRight, y);
        ctx.lineTo(runnerLeft, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = searched ? '#94a3b8' : '#fde68a';
        ctx.beginPath();
        ctx.moveTo(runnerLeft, y);
        ctx.lineTo(runnerRight, y);
        ctx.lineTo(runnerRight + (searched ? 4 : 0), y + (searched ? 11 : 8));
        ctx.lineTo(runnerLeft - (searched ? 3 : 0), y + 8);
        ctx.closePath();
        ctx.fill();
        break;
      }

      case FurnitureType.BIN: {
        drawContactShadow(ctx, x + w / 2, y + h + 1, w * 0.65, 5, 0.5);

        const bodyY = y + 5;
        const bodyH = h - 7;
        drawCylinder3D(ctx, x + 2, bodyY, w - 4, bodyH, 3.5, '#64748b', '#334155');

        ctx.strokeStyle = 'rgba(248, 250, 252, 0.28)';
        ctx.lineWidth = 1;
        for (let rx = x + 5; rx <= x + w - 5; rx += 4) {
          ctx.beginPath();
          ctx.moveTo(rx, bodyY + 3);
          ctx.lineTo(rx, bodyY + bodyH - 2);
          ctx.stroke();
        }

        if (searched) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(x + w / 2, bodyY, (w - 4) / 2, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();

          drawSphere3D(ctx, x + w / 2 - 3, bodyY - 1, 3, 2.5, '#f8fafc');
          drawSphere3D(ctx, x + w / 2 + 3, bodyY, 2.5, 2.2, '#fde68a');

          ctx.save();
          ctx.translate(x + w + 4, y + h - 2);
          ctx.rotate(0.45);
          drawSphere3D(ctx, 0, 0, w * 0.45, 3.5, '#94a3b8', { specular: true });
          ctx.restore();
        } else {
          drawSphere3D(ctx, x + w / 2, bodyY - 0.5, w / 2, 4.2, '#94a3b8', {
            specular: true,
          });
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x + w / 2, bodyY - 3.5, 3, Math.PI, 0);
          ctx.stroke();
        }
        break;
      }

      case FurnitureType.HAMPER: {
        const box = drawExtrudedBox3D(ctx, {
          x,
          y: y + 3,
          w,
          h: h - 3,
          depthFactor: 0.055,
          baseColor: '#d97706',
          topColor: '#f59e0b',
          sideColor: '#92400e',
        });

        ctx.strokeStyle = 'rgba(69, 26, 3, 0.45)';
        ctx.lineWidth = 0.8;
        for (let wy = y + 7; wy < y + h - 2; wy += 4) {
          ctx.beginPath();
          ctx.moveTo(x + 2, wy);
          ctx.lineTo(x + w - 2, wy);
          ctx.stroke();
        }
        for (let wx = x + 5; wx < x + w - 2; wx += 5) {
          ctx.beginPath();
          ctx.moveTo(wx, y + 4);
          ctx.lineTo(wx, y + h - 2);
          ctx.stroke();
        }

        if (searched) {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.moveTo(box.backTopLeft.x, box.backTopLeft.y);
          ctx.lineTo(box.backTopRight.x, box.backTopRight.y);
          ctx.lineTo(box.backTopRight.x, box.backTopRight.y - 7);
          ctx.lineTo(box.backTopLeft.x, box.backTopLeft.y - 7);
          ctx.closePath();
          ctx.fill();

          drawSphere3D(ctx, x + w * 0.38, y + 4, 5, 3.5, '#38bdf8');
          drawSphere3D(ctx, x + w * 0.65, y + 5, 4.5, 4, '#f43f5e');
        } else {
          drawExtrudedBox3D(ctx, {
            x: x - 1,
            y: y + 1,
            w: w + 2,
            h: 3.5,
            depthFactor: 0.06,
            baseColor: '#fef3c7',
            topColor: '#ffffff',
            sideColor: '#fde68a',
            shadow: false,
          });
        }
        break;
      }
    }

    ctx.restore();
  }

  private static renderFloorLoot3D(
    ctx: CanvasRenderingContext2D,
    type: LootType,
    x: number,
    y: number,
    idx: number,
    tick: number
  ): void {
    ctx.save();
    const bob = Math.sin(tick * 0.09 + idx * 1.3) * 2.4;
    const drawY = y - 3 + bob;

    const shadowScale = 1 - bob * 0.06;
    drawContactShadow(ctx, x, y + 5, 9 * shadowScale, 4.2 * shadowScale, 0.55);

    const auraGrad = ctx.createRadialGradient(x, y + 2, 1, x, y + 2, 12);
    auraGrad.addColorStop(0, 'rgba(250, 204, 21, 0.38)');
    auraGrad.addColorStop(0.65, 'rgba(250, 204, 21, 0.12)');
    auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, drawY);

    switch (type) {
      case LootType.BASKET: {
        drawCylinder3D(ctx, -7, -3, 14, 7, 2.5, '#d97706', '#fef3c7');
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-7, -3, 14, 2);
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -3, 5.5, Math.PI, 0);
        ctx.stroke();
        break;
      }
      case LootType.PIZZA: {
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(7, 5);
        ctx.lineTo(-7, 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(0, -7.5);
        ctx.lineTo(6.5, 3.5);
        ctx.lineTo(-6.5, 3.5);
        ctx.closePath();
        ctx.fill();

        drawSphere3D(ctx, 0, 4, 6.8, 2.2, '#d97706', { specular: true });
        drawSphere3D(ctx, -1.8, 0.5, 1.8, 1.4, '#dc2626', { specular: true });
        drawSphere3D(ctx, 2, 1.5, 1.7, 1.3, '#dc2626', { specular: true });
        drawSphere3D(ctx, 0, -2.5, 1.5, 1.2, '#dc2626', { specular: true });
        break;
      }
      case LootType.CHEESE: {
        const frontGrad = ctx.createLinearGradient(-7, -1, 7, 5);
        frontGrad.addColorStop(0, '#eab308');
        frontGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = frontGrad;
        ctx.fillRect(-6.5, -1, 13, 6);

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-6.5, -1);
        ctx.lineTo(2, -6.5);
        ctx.lineTo(6.5, -1);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.arc(-2.5, 2, 1.5, 0, Math.PI * 2);
        ctx.arc(2.5, 1.5, 1.2, 0, Math.PI * 2);
        ctx.arc(0, -2.8, 1.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case LootType.HONEY: {
        drawSphere3D(ctx, 0, 1, 5.8, 5.2, '#f59e0b', {
          lightColor: '#fef08a',
          darkColor: '#b45309',
          specular: true,
        });
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-4, -0.5, 8, 3);
        drawCylinder3D(ctx, -4, -5.5, 8, 2.5, 1.4, '#fcd34d', '#fef08a');
        break;
      }
      case LootType.FISH: {
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(9.5, -4);
        ctx.lineTo(8.5, 0);
        ctx.lineTo(9.5, 4);
        ctx.closePath();
        ctx.fillStyle = '#0284c7';
        ctx.fill();

        drawSphere3D(ctx, -1, 0, 6.5, 3.8, '#38bdf8', {
          lightColor: '#e0f2fe',
          darkColor: '#0369a1',
          specular: true,
        });

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4.2, -0.8, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4.6, -1.3, 0.7, 0.7);
        break;
      }
    }

    ctx.restore();
  }

  private static renderTrap3D(
    ctx: CanvasRenderingContext2D,
    trap: ArmedTrap,
    viewer: RaiderId,
    x: number,
    y: number,
    tick: number
  ): void {
    // Hidden traps are only visible to the raider who planted them
    if (trap.plantedBy !== viewer) return;

    ctx.save();
    const pulse = 0.65 + 0.35 * Math.sin(tick * 0.15);

    ctx.strokeStyle = `rgba(248, 113, 113, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 10, 5, 0, 0, Math.PI * 2);
    ctx.stroke();

    const badgeY = y - 8 + Math.sin(tick * 0.12) * 1.5;
    drawSphere3D(ctx, x, badgeY, 6, 6, '#dc2626', {
      lightColor: '#fca5a5',
      darkColor: '#7f1d1d',
      specular: true,
    });

    const TRAP_SHORT: Record<TrapType, string> = {
      [TrapType.SNAP_TRAP]: '1',
      [TrapType.GLUE_PAD]: '2',
      [TrapType.PEPPER_POOF]: '3',
      [TrapType.MARBLE_SPILL]: '4',
      [TrapType.STATIC_MAT]: '5',
    };

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TRAP_SHORT[trap.type], x, badgeY + 0.5);
    ctx.restore();
  }
}
