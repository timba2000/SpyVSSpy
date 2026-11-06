/**
 * Simulvision Split-Screen Viewport Manager.
 * Orchestrates dual perspective scaling, retro surveillance overlays, and visual effects.
 */

import { GameEngine } from '../core/engine';
import { RoomRenderer } from './roomRenderer';
import { SpyRenderer } from './spyRenderer';
import { HudRenderer } from './hudRenderer';
import { VisualEffects } from './visualEffects';

export class SplitScreenRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    vfx: VisualEffects,
    width: number,
    height: number,
    tick: number = 0
  ): void {
    const halfHeight = height / 2;
    const hudHeight = 28;
    const roomViewHeight = halfHeight - hudHeight - 2;

    const logicalW = 320;
    const logicalH = 200;
    const scaleX = width / logicalW;
    const scaleY = roomViewHeight / logicalH;

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // ==========================================
    // TOP VIEWPORT: Player 1 (White Spy)
    // ==========================================
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, roomViewHeight);
    ctx.clip();

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const whiteRoom = engine.getRoom(engine.whiteSpy.currentRoomId);
    RoomRenderer.render(ctx, whiteRoom, logicalW, logicalH, tick);

    // Draw White Spy
    SpyRenderer.render(ctx, engine.whiteSpy, tick);

    // If Black Spy is in same room, draw them too!
    if (engine.blackSpy.currentRoomId === engine.whiteSpy.currentRoomId) {
      SpyRenderer.render(ctx, engine.blackSpy, tick);
    }

    // Render VFX in White Viewport if occurring in White Spy's room
    vfx.render(ctx);

    ctx.restore();

    // Surveillance Camera HUD Overlay (Top-Left)
    this.renderCameraBanner(ctx, 'CAM 01 - WHITE SPY', whiteRoom.name, 12, 16, tick, '#38bdf8');

    ctx.restore();

    // White Spy Trapulator HUD
    HudRenderer.render(ctx, engine.whiteSpy, engine.remainingSeconds, 0, roomViewHeight, width, hudHeight, tick);

    // ==========================================
    // SPLIT DIVIDER BAR
    // ==========================================
    this.renderSplitDivider(ctx, width, halfHeight);

    // ==========================================
    // BOTTOM VIEWPORT: Player 2 / AI (Black Spy)
    // ==========================================
    const bottomRoomY = halfHeight + 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, bottomRoomY, width, roomViewHeight);
    ctx.clip();

    ctx.save();
    ctx.translate(0, bottomRoomY);
    ctx.scale(scaleX, scaleY);

    const blackRoom = engine.getRoom(engine.blackSpy.currentRoomId);
    RoomRenderer.render(ctx, blackRoom, logicalW, logicalH, tick);

    // Draw Black Spy
    SpyRenderer.render(ctx, engine.blackSpy, tick);

    // If White Spy is in same room, draw them too!
    if (engine.whiteSpy.currentRoomId === engine.blackSpy.currentRoomId) {
      SpyRenderer.render(ctx, engine.whiteSpy, tick);
    }

    // Render VFX in Black Viewport if occurring in Black Spy's room
    vfx.render(ctx);

    ctx.restore();

    // Surveillance Camera HUD Overlay (Bottom-Left)
    this.renderCameraBanner(ctx, 'CAM 02 - BLACK SPY', blackRoom.name, 12, bottomRoomY + 16, tick, '#ef4444');

    ctx.restore();

    // Black Spy Trapulator HUD
    HudRenderer.render(
      ctx,
      engine.blackSpy,
      engine.remainingSeconds,
      0,
      bottomRoomY + roomViewHeight,
      width,
      hudHeight,
      tick
    );

    // ==========================================
    // GAME OVER / VICTORY OVERLAY
    // ==========================================
    if (engine.isGameOver) {
      this.renderGameOverOverlay(ctx, engine, width, height, tick);
    }
  }

  /**
   * Surveillance Camera OSD text ("● REC CAM 01 | ROOM NAME").
   */
  private static renderCameraBanner(
    ctx: CanvasRenderingContext2D,
    camLabel: string,
    roomName: string,
    x: number,
    y: number,
    tick: number,
    color: string
  ): void {
    ctx.save();

    // Blinking Red REC Dot
    const blink = Math.sin(tick * 0.2) > 0;
    ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(x, y - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.fillText(`${camLabel} // ${roomName.toUpperCase()}`, x + 8, y);

    ctx.restore();
  }

  /**
   * Surveillance split console divider line with metallic bevel.
   */
  private static renderSplitDivider(ctx: CanvasRenderingContext2D, width: number, halfHeight: number): void {
    ctx.save();
    const divH = 4;
    const divY = halfHeight - divH / 2;

    const divGrad = ctx.createLinearGradient(0, divY, width, divY);
    divGrad.addColorStop(0, '#0284c7');
    divGrad.addColorStop(0.5, '#38bdf8');
    divGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = divGrad;
    ctx.fillRect(0, divY, width, divH);

    // Center MAD Magazine / Spy vs Spy Insignia badge
    const badgeW = 90;
    const badgeH = 14;
    const bx = width / 2 - badgeW / 2;
    const by = halfHeight - badgeH / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, by, badgeW, badgeH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, badgeW, badgeH);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 8px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SIMULVISION', width / 2, by + 10);

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
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';
    const cx = width / 2;
    const cy = height / 2;

    if (engine.winner) {
      const isWhite = engine.winner === 'WHITE';
      const winColor = isWhite ? '#f8fafc' : '#ef4444';

      // Confetti Sparkles
      for (let i = 0; i < 30; i++) {
        const seed = (i * 37 + tick) % 200;
        const px = (cx - 200) + ((i * 41) % 400);
        const py = (cy - 100) + seed;
        ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#38bdf8';
        ctx.fillRect(px, py, 3, 3);
      }

      // Banner Box
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 240, cy - 70, 480, 140);
      ctx.strokeStyle = winColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(cx - 240, cy - 70, 480, 140);

      ctx.fillStyle = winColor;
      ctx.font = '900 32px "Courier New", monospace';
      ctx.fillText(`🏆 ${engine.winner} SPY WINS! 🏆`, cx, cy - 20);

      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText('✈ Escaped the Embassy with all Secret Documents! ✈', cx, cy + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('Press [SPACE] or Reload to Infiltrate Again', cx, cy + 46);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = '900 30px "Courier New", monospace';
      ctx.fillText('⌛ TIME EXPIRED! ⌛', cx, cy - 15);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText('The Embassy Lockdown Triggered! Both Spies Caught!', cx, cy + 20);
    }

    ctx.restore();
  }
}
