/**
 * Split-Screen Renderer: a pane per raider, side by side, each showing that raider's
 * 3D room diorama over their 3D tactile status panel. Rooms are drawn at a uniform scale.
 */

import { GameEngine } from '../core/engine';
import { RaiderId } from '../core/types';
import { RoomRenderer } from './roomRenderer';
import { RaiderRenderer, RAIDER_PALETTES } from './raiderRenderer';
import { HudRenderer } from './hudRenderer';
import { VisualEffects } from './visualEffects';
import { drawSphere3D, roundedRectPath } from './render3d';

const LOGICAL_W = 320;
const LOGICAL_H = 200;
const DIVIDER_W = 6;

export class SplitScreenRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    vfx: VisualEffects,
    width: number,
    height: number,
    tick = 0
  ): void {
    ctx.fillStyle = '#040711';
    ctx.fillRect(0, 0, width, height);

    const paneW = (width - DIVIDER_W) / 2;
    this.renderPane(ctx, engine, vfx, 'RUSTY', 0, paneW, height, tick);
    this.renderPane(ctx, engine, vfx, 'SOOT', paneW + DIVIDER_W, paneW, height, tick);

    // 3D Cylindrical Metallic Center Divider Pillar
    const divGrad = ctx.createLinearGradient(paneW, 0, paneW + DIVIDER_W, 0);
    divGrad.addColorStop(0, '#020617');
    divGrad.addColorStop(0.35, '#64748b');
    divGrad.addColorStop(0.55, '#94a3b8');
    divGrad.addColorStop(1, '#020617');
    ctx.fillStyle = divGrad;
    ctx.fillRect(paneW, 0, DIVIDER_W, height);

    if (engine.isGameOver) {
      this.renderGameOverOverlay3D(ctx, engine, width, height, tick);
    }
  }

  private static renderPane(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    vfx: VisualEffects,
    viewer: RaiderId,
    paneX: number,
    paneW: number,
    paneH: number,
    tick: number
  ): void {
    const scale = paneW / LOGICAL_W;
    const roomH = LOGICAL_H * scale;
    const raider = engine.getRaider(viewer);
    const rival = engine.getRival(viewer);
    const room = engine.getRoom(raider.currentRoomId);

    ctx.save();
    ctx.beginPath();
    ctx.rect(paneX, 0, paneW, roomH);
    ctx.clip();

    ctx.translate(paneX, 0);
    ctx.save();
    ctx.scale(scale, scale);

    RoomRenderer.render(ctx, room, viewer, tick);

    // Draw back to front so whoever is lower down the room overlaps the other
    const occupants = rival.currentRoomId === raider.currentRoomId ? [raider, rival] : [raider];
    occupants.sort((a, b) => a.y - b.y);
    for (const occupant of occupants) {
      RaiderRenderer.render(ctx, occupant, tick);
    }

    vfx.render(ctx, room.id);

    ctx.restore();

    this.renderRoomLabel3D(ctx, room.name, RAIDER_PALETTES[viewer].bandana);

    ctx.restore();

    HudRenderer.render(ctx, raider, paneX, roomH, paneW, paneH - roomH, tick);
  }

  private static renderRoomLabel3D(
    ctx: CanvasRenderingContext2D,
    roomName: string,
    accent: string
  ): void {
    ctx.save();
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    const padding = 14;
    const labelW = ctx.measureText(roomName.toUpperCase()).width + padding * 2;
    const x = 10;
    const y = 8;
    const h = 26;

    // 3D Drop Shadow
    roundedRectPath(ctx, x + 2, y + 3, labelW, h, 6);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fill();

    // 3D Beveled Plaque Body
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, 'rgba(30, 41, 59, 0.92)');
    bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
    roundedRectPath(ctx, x, y, labelW, h, 6);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brass rivets
    drawSphere3D(ctx, x + 5, y + h / 2, 2, 2, '#facc15', { specular: true });
    drawSphere3D(ctx, x + labelW - 5, y + h / 2, 2, 2, '#facc15', { specular: true });

    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.fillText(roomName.toUpperCase(), x + padding, y + h / 2 + 1);
    ctx.restore();
  }

  private static renderGameOverOverlay3D(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    width: number,
    height: number,
    tick: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    const cx = width / 2;
    const cy = height / 2;
    const accent = engine.winner ? RAIDER_PALETTES[engine.winner].bandana : '#94a3b8';

    if (engine.winner) {
      // 3D Shaded Celebration Confetti Spheres
      for (let i = 0; i < 36; i++) {
        const px = (i * 89) % width;
        const py = ((i * 53 + tick * (1.2 + (i % 3))) % (height + 24)) - 12;
        const col = i % 3 === 0 ? '#fde047' : i % 3 === 1 ? '#fb923c' : '#38bdf8';
        drawSphere3D(ctx, px, py, 4.5, 4.5, col, { specular: true });
      }
    }

    // 3D Extruded Victory Card Shadow
    roundedRectPath(ctx, cx - 326, cy - 92, 652, 196, 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fill();

    // 3D Beveled Victory Card
    const cardGrad = ctx.createLinearGradient(cx, cy - 98, cx, cy + 98);
    cardGrad.addColorStop(0, '#1e293b');
    cardGrad.addColorStop(1, '#090d16');
    roundedRectPath(ctx, cx - 330, cy - 98, 660, 196, 16);
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // 3D Extruded Title Text
    const title = engine.winner ? `${engine.winner} WINS THE FEAST!` : 'THE SUN IS UP!';
    ctx.font = '900 42px "Trebuchet MS", "Arial Black", sans-serif';
    ctx.fillStyle = '#020617';
    ctx.fillText(title, cx + 3, cy - 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(title, cx, cy - 21);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 19px "Trebuchet MS", sans-serif';
    ctx.fillText(
      engine.winner
        ? 'Escaped through the 3D garden gate with a full picnic basket!'
        : 'Both raiders nodded off before escaping. Nobody gets dinner!',
      cx,
      cy + 22
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    ctx.fillText('Press SPACE or click "New Raid" in Options to play again', cx, cy + 62);

    ctx.restore();
  }
}
