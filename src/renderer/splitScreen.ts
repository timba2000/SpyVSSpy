/**
 * Split-Screen Renderer: a pane per raider, side by side, each showing that raider's
 * room over their status panel. Rooms are drawn at a uniform scale.
 */

import { GameEngine } from '../core/engine';
import { RaiderId } from '../core/types';
import { RoomRenderer } from './roomRenderer';
import { RaiderRenderer, RAIDER_PALETTES } from './raiderRenderer';
import { HudRenderer } from './hudRenderer';
import { VisualEffects } from './visualEffects';

const LOGICAL_W = 320;
const LOGICAL_H = 200;
const DIVIDER_W = 4;

export class SplitScreenRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    vfx: VisualEffects,
    width: number,
    height: number,
    tick: number = 0
  ): void {
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, width, height);

    const paneW = (width - DIVIDER_W) / 2;
    this.renderPane(ctx, engine, vfx, 'RUSTY', 0, paneW, height, tick);
    this.renderPane(ctx, engine, vfx, 'SOOT', paneW + DIVIDER_W, paneW, height, tick);

    if (engine.isGameOver) {
      this.renderGameOverOverlay(ctx, engine, width, height, tick);
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

    this.renderRoomLabel(ctx, room.name, RAIDER_PALETTES[viewer].bandana);

    ctx.restore();

    HudRenderer.render(ctx, raider, paneX, roomH, paneW, paneH - roomH, tick);
  }

  private static renderRoomLabel(ctx: CanvasRenderingContext2D, roomName: string, accent: string): void {
    ctx.save();
    ctx.font = 'bold 15px "Trebuchet MS", sans-serif';
    const padding = 10;
    const labelW = ctx.measureText(roomName).width + padding * 2;

    ctx.fillStyle = 'rgba(12, 10, 9, 0.72)';
    ctx.fillRect(0, 0, labelW, 26);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 26, labelW, 2);
    ctx.fillStyle = '#fafaf9';
    ctx.textBaseline = 'middle';
    ctx.fillText(roomName, padding, 14);
    ctx.restore();
  }

  private static renderGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    width: number,
    height: number,
    tick: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 9, 0.8)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    const cx = width / 2;
    const cy = height / 2;
    const accent = engine.winner ? RAIDER_PALETTES[engine.winner].bandana : '#94a3b8';

    if (engine.winner) {
      // Falling crumbs
      for (let i = 0; i < 40; i++) {
        const px = (i * 83) % width;
        const py = ((i * 47 + tick * (1 + (i % 3))) % (height + 20)) - 10;
        ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#fb923c';
        ctx.fillRect(px, py, 5, 5);
      }
    }

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(cx - 320, cy - 90, 640, 180);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 320, cy - 90, 640, 180);

    ctx.fillStyle = '#fafaf9';
    ctx.font = '900 44px "Trebuchet MS", "Arial Black", sans-serif';
    ctx.fillText(engine.winner ? `${engine.winner} WINS THE FEAST!` : 'THE SUN IS UP!', cx, cy - 18);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 19px "Trebuchet MS", sans-serif';
    ctx.fillText(
      engine.winner ? 'Out through the garden gate with a full basket.' : 'Both raiders nodded off. Nobody gets dinner.',
      cx,
      cy + 22
    );

    ctx.fillStyle = '#a8a29e';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.fillText('Press Space to raid again', cx, cy + 58);

    ctx.restore();
  }
}
