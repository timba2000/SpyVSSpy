/**
 * High-Fidelity Animated Sprite Renderer for White Spy and Black Spy.
 * Features 4-directional poses, animated walking cycles, combat baton swings, and angelic ascension.
 */

import { SpyColor } from '../core/types';
import { Spy } from '../core/spy/spy';

export class SpyRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    spy: Spy,
    tick: number = 0
  ): void {
    const { x, y, color, facing, state, hurtTimer, respawnTimer, attackCooldown } = spy;

    ctx.save();

    // 1. Dead Angel Form
    if (state === 'DEAD_ANGEL') {
      this.renderAngel(ctx, x, y, respawnTimer, color, tick);
      ctx.restore();
      return;
    }

    // 2. Hurt Flicker Reaction
    if (state === 'HURT' && Math.floor(hurtTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // 3. Dynamic Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walking Cycle Offset
    const isWalking = state === 'WALKING';
    const walkPhase = isWalking ? Math.sin(tick * 0.35) : 0;
    const coatSway = isWalking ? Math.cos(tick * 0.35) * 2 : 0;
    const bobY = isWalking ? Math.abs(Math.sin(tick * 0.35)) * -2 : 0;

    // Palette Configuration
    const isWhite = color === 'WHITE';
    const coatColor = isWhite ? '#f8fafc' : '#09090b';
    const coatShade = isWhite ? '#cbd5e1' : '#18181b';
    const accentColor = isWhite ? '#020617' : '#f8fafc';
    const skinColor = isWhite ? '#f8fafc' : '#09090b';
    const gloveColor = '#1e293b';

    ctx.translate(x, y + bobY);

    // 4. Render Spy by Facing Direction
    switch (facing) {
      case 'SOUTH':
        this.renderFacingSouth(ctx, coatColor, coatShade, accentColor, gloveColor, walkPhase, state, attackCooldown);
        break;
      case 'NORTH':
        this.renderFacingNorth(ctx, coatColor, coatShade, accentColor, walkPhase);
        break;
      case 'EAST':
        this.renderProfile(ctx, 1, coatColor, coatShade, accentColor, skinColor, gloveColor, walkPhase, coatSway, state, attackCooldown);
        break;
      case 'WEST':
        this.renderProfile(ctx, -1, coatColor, coatShade, accentColor, skinColor, gloveColor, walkPhase, coatSway, state, attackCooldown);
        break;
    }

    // 5. Searching Animation Indicator
    if (state === 'SEARCHING') {
      const searchBob = Math.sin(tick * 0.4) * 2;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🔍', -6, -26 + searchBob);
    }

    ctx.restore();
  }

  /**
   * Classic Side Profile (Iconic Antonio Prohías Mad Magazine Silhouette).
   */
  private static renderProfile(
    ctx: CanvasRenderingContext2D,
    dir: number, // 1 = East, -1 = West
    coat: string,
    coatShade: string,
    accent: string,
    skin: string,
    glove: string,
    walkPhase: number,
    coatSway: number,
    state: string,
    attackCooldown: number
  ): void {
    // --- Animated Legs ---
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;

    // Back leg
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-walkPhase * 6, 17);
    ctx.stroke();

    // Front leg
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(walkPhase * 6, 17);
    ctx.stroke();

    // Black Shoes
    ctx.fillStyle = '#000000';
    ctx.fillRect(-walkPhase * 6 + (dir > 0 ? -2 : -4), 16, 6, 3);
    ctx.fillRect(walkPhase * 6 + (dir > 0 ? -2 : -4), 16, 6, 3);

    // --- Trenchcoat Body ---
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-dir * 6, -2);
    ctx.lineTo(dir * 5, -2);
    ctx.lineTo(dir * 8, 12);
    ctx.lineTo(-dir * 8 + coatSway, 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trenchcoat Belt & Buckle
    ctx.fillStyle = coatShade;
    ctx.fillRect(-dir * 7, 5, 14, 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(dir * 2, 4.5, 3, 3);

    // --- Head, Long Beak & Grin ---
    // Skull
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Iconic Razor Sharp Beak
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(dir * 14, -5);
    ctx.lineTo(0, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grin Line on Beak
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dir * 2, -5);
    ctx.lineTo(dir * 11, -5.5);
    ctx.stroke();

    // Eyes / Shaded Glasses
    ctx.fillStyle = accent;
    ctx.fillRect(dir * 2, -8, 3, 2);

    // --- Fedora Hat ---
    // Angled Brim
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(dir * 2, -10, 13, 3.5, dir * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();

    // Crown
    ctx.fillStyle = coat;
    ctx.fillRect(-6, -17, 12, 7);
    ctx.strokeRect(-6, -17, 12, 7);

    // Hat Band
    ctx.fillStyle = accent;
    ctx.fillRect(-6, -13, 12, 2.5);

    // --- Arms, Club / Baton Attack ---
    if (state === 'ATTACKING') {
      // Swung attack arm
      const swingProgress = (20 - attackCooldown) / 20;
      const angle = -0.5 + swingProgress * 1.8;

      ctx.save();
      ctx.translate(dir * 3, 2);
      ctx.rotate(dir * angle);

      // Nightstick / Club
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, -3, dir * 18, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(dir * 14, -3, dir * 4, 4);

      // Glove
      ctx.fillStyle = glove;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Motion swoosh speed line
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -0.6, 0.6);
      ctx.stroke();

      ctx.restore();
    } else {
      // Idle / Running Arm
      ctx.fillStyle = glove;
      ctx.beginPath();
      ctx.arc(dir * 4 - walkPhase * 4, 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Front Facing (South).
   */
  private static renderFacingSouth(
    ctx: CanvasRenderingContext2D,
    coat: string,
    coatShade: string,
    accent: string,
    glove: string,
    walkPhase: number,
    state: string,
    attackCooldown: number
  ): void {
    // Legs
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-4, 16 + walkPhase * 2);
    ctx.moveTo(4, 10);
    ctx.lineTo(4, 16 - walkPhase * 2);
    ctx.stroke();

    // Trenchcoat Body (Wide A-line coat)
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(6, -2);
    ctx.lineTo(10, 12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Belt & Buckle
    ctx.fillStyle = coatShade;
    ctx.fillRect(-8, 5, 16, 2.5);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1.5, 4.5, 3, 3.5);

    // Double Breasted Buttons & Lapels
    ctx.fillStyle = accent;
    ctx.fillRect(-3, 1, 2, 2);
    ctx.fillRect(1, 1, 2, 2);
    ctx.fillRect(-3, 6, 2, 2);
    ctx.fillRect(1, 6, 2, 2);

    // Front Beak pointing down
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.lineTo(0, 0);
    ctx.lineTo(4, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fedora Hat Frontal
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(0, -10, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillRect(-6, -17, 12, 7);
    ctx.strokeRect(-6, -17, 12, 7);
    ctx.fillStyle = accent;
    ctx.fillRect(-6, -13, 12, 2.5);

    // Hands / Club
    if (state === 'ATTACKING') {
      const swing = Math.sin((20 - attackCooldown) * 0.3) * 6;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, -4 + swing, 4, 16);
    } else {
      ctx.fillStyle = glove;
      ctx.beginPath();
      ctx.arc(-8, 6, 2.5, 0, Math.PI * 2);
      ctx.arc(8, 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Back Facing (North).
   */
  private static renderFacingNorth(
    ctx: CanvasRenderingContext2D,
    coat: string,
    coatShade: string,
    accent: string,
    walkPhase: number
  ): void {
    // Legs
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, 10);
    ctx.lineTo(-4, 16 + walkPhase * 2);
    ctx.moveTo(4, 10);
    ctx.lineTo(4, 16 - walkPhase * 2);
    ctx.stroke();

    // Coat Back
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(6, -2);
    ctx.lineTo(10, 12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center seam & belt
    ctx.fillStyle = coatShade;
    ctx.fillRect(-8, 5, 16, 2.5);

    // Hat Back
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.ellipse(0, -10, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillRect(-6, -17, 12, 7);
    ctx.strokeRect(-6, -17, 12, 7);
    ctx.fillStyle = accent;
    ctx.fillRect(-6, -13, 12, 2.5);
  }

  /**
   * Ethereal Angel Ascension Form with Flapping Wings & Golden Harp.
   */
  private static renderAngel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    respawnTimer: number,
    color: SpyColor,
    tick: number
  ): void {
    // Ascend upwards as cooldown counts down
    const floatProgress = (300 - respawnTimer) / 300;
    const currentY = y - floatProgress * 55;

    // Wing flap oscillation
    const wingFlap = Math.sin(tick * 0.25) * 0.35;

    ctx.save();
    ctx.translate(x, currentY);

    // Glowing Angelic Aura
    const haloGlow = ctx.createRadialGradient(0, -10, 4, 0, -10, 26);
    haloGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    haloGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = haloGlow;
    ctx.beginPath();
    ctx.arc(0, -10, 26, 0, Math.PI * 2);
    ctx.fill();

    // Golden Halo
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, -22, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Flapping Feathered Wings
    ctx.fillStyle = '#e0f2fe';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;

    // Left Wing
    ctx.save();
    ctx.translate(-8, -8);
    ctx.rotate(-0.35 + wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Right Wing
    ctx.save();
    ctx.translate(8, -8);
    ctx.rotate(0.35 - wingFlap);
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // White Angelic Robe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(6, -12);
    ctx.lineTo(11, 10);
    ctx.lineTo(-11, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    // Head with Spy Beak
    const skin = color === 'WHITE' ? '#ffffff' : '#0f172a';
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    // Tiny smiling beak
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(8, -14);
    ctx.lineTo(0, -12);
    ctx.closePath();
    ctx.fill();

    // Golden Harp
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(7, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(13, 6);
    ctx.stroke();

    // Harp Strings
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 0.8;
    for (let s = 3; s <= 9; s += 2) {
      ctx.beginPath();
      ctx.moveTo(s, -5);
      ctx.lineTo(s, 5);
      ctx.stroke();
    }

    ctx.restore();
  }
}
