/**
 * Procedural raccoon sprites: 4-way poses, walk cycle, paw swats, and knockouts.
 */

import { Direction, RaiderId } from '../core/types';
import { Raider } from '../core/raider/raider';

export interface RaiderPalette {
  fur: string;
  furDark: string;
  belly: string;
  bandana: string;
}

export const RAIDER_PALETTES: Record<RaiderId, RaiderPalette> = {
  RUSTY: { fur: '#c8743a', furDark: '#5b2c12', belly: '#f1d3ad', bandana: '#e11d48' },
  SOOT: { fur: '#8492a8', furDark: '#2a3142', belly: '#d9dfe9', bandana: '#14b8a6' }
};

export class RaiderRenderer {
  public static render(ctx: CanvasRenderingContext2D, raider: Raider, tick: number = 0): void {
    const { x, y, facing, state, hurtTimer } = raider;
    const palette = RAIDER_PALETTES[raider.id];

    ctx.save();

    if (state === 'KNOCKED_OUT') {
      this.renderFlat(ctx, x, y, palette, tick, 'stars');
      ctx.restore();
      return;
    }
    if (state === 'OUT_OF_TIME') {
      this.renderFlat(ctx, x, y, palette, tick, 'zzz');
      ctx.restore();
      return;
    }

    if (state === 'HURT' && Math.floor(hurtTimer / 3) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const walking = state === 'WALKING';
    const stride = walking ? Math.sin(tick * 0.4) : 0;
    const bob = walking ? Math.abs(Math.sin(tick * 0.4)) * -1.5 : 0;

    ctx.translate(x, y + bob);

    const swing = state === 'ATTACKING' ? 1 - raider.attackCooldown / raider.attackDurationTicks : undefined;

    if (facing === 'EAST' || facing === 'WEST') {
      this.renderProfile(ctx, facing === 'EAST' ? 1 : -1, palette, stride, tick, swing);
    } else {
      this.renderFrontOrBack(ctx, facing, palette, stride, tick, swing);
    }

    if (state === 'SEARCHING') {
      this.renderSearchProgress(ctx, raider.searchProgress / raider.searchDurationTicks, tick);
    }

    ctx.restore();
  }

  /** Ringed tail, drawn as segments that alternate between light and dark. */
  private static renderTail(
    ctx: CanvasRenderingContext2D,
    baseX: number,
    baseY: number,
    dirX: number,
    palette: RaiderPalette,
    tick: number
  ): void {
    const wag = Math.sin(tick * 0.15) * 2;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? palette.fur : palette.furDark;
      ctx.beginPath();
      ctx.arc(baseX + dirX * i * 3.2, baseY - i * 2 + (wag * i) / 4, 3.6 - i * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static renderProfile(
    ctx: CanvasRenderingContext2D,
    dir: number,
    palette: RaiderPalette,
    stride: number,
    tick: number,
    swing?: number
  ): void {
    this.renderTail(ctx, -dir * 8, 8, -dir, palette, tick);

    // Four stubby legs
    ctx.fillStyle = palette.furDark;
    ctx.fillRect(-7 + stride * 2, 9, 4, 6);
    ctx.fillRect(3 - stride * 2, 9, 4, 6);

    // Round body and belly
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.ellipse(dir * 2, 7, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bandana
    ctx.fillStyle = palette.bandana;
    ctx.fillRect(dir > 0 ? 1 : -9, -3, 8, 3);

    // Head, ears and pointed snout
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.arc(dir * 5, -8, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dir * 1, -14, 2.6, 0, Math.PI * 2);
    ctx.arc(dir * 8, -14, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.moveTo(dir * 8, -9);
    ctx.lineTo(dir * 15, -6);
    ctx.lineTo(dir * 8, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(dir * 15, -6, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Bandit mask with a bright eye
    ctx.fillStyle = palette.furDark;
    ctx.beginPath();
    ctx.ellipse(dir * 6, -9, 5.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dir * 7.5, -9, 1.4, 0, Math.PI * 2);
    ctx.fill();

    this.renderPaw(ctx, dir, palette, swing);
  }

  private static renderFrontOrBack(
    ctx: CanvasRenderingContext2D,
    facing: Direction,
    palette: RaiderPalette,
    stride: number,
    tick: number,
    swing?: number
  ): void {
    const isFront = facing === 'SOUTH';

    if (isFront) this.renderTail(ctx, 8, 9, 1, palette, tick);

    // Legs
    ctx.fillStyle = palette.furDark;
    ctx.fillRect(-7, 9 + stride, 5, 6);
    ctx.fillRect(2, 9 - stride, 5, 6);

    // Body
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.ellipse(0, 3, 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (isFront) {
      ctx.fillStyle = palette.belly;
      ctx.beginPath();
      ctx.ellipse(0, 5, 5.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bandana
    ctx.fillStyle = palette.bandana;
    ctx.fillRect(-6, -4, 12, 3);

    // Head and ears
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.arc(0, -9, 8, 0, Math.PI * 2);
    ctx.arc(-6, -15, 3, 0, Math.PI * 2);
    ctx.arc(6, -15, 3, 0, Math.PI * 2);
    ctx.fill();

    if (isFront) {
      // Mask, eyes, muzzle
      ctx.fillStyle = palette.furDark;
      ctx.beginPath();
      ctx.ellipse(-3.8, -10, 3.6, 2.6, 0, 0, Math.PI * 2);
      ctx.ellipse(3.8, -10, 3.6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.8, -10, 1.4, 0, Math.PI * 2);
      ctx.arc(3.8, -10, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.belly;
      ctx.beginPath();
      ctx.ellipse(0, -5.5, 3.6, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, -6.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      this.renderTail(ctx, 0, 9, 0.8, palette, tick);
    }

    this.renderPaw(ctx, isFront ? 1 : -1, palette, swing);
  }

  /** A forepaw at rest, or sweeping through an arc with a claw trail while swatting. */
  private static renderPaw(ctx: CanvasRenderingContext2D, dir: number, palette: RaiderPalette, swing?: number): void {
    if (swing === undefined) return;

    const angle = -1.1 + swing * 2.2;
    const pawX = dir * (6 + Math.cos(angle) * 11);
    const pawY = Math.sin(angle) * 11;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    for (const radius of [13, 16]) {
      ctx.beginPath();
      if (dir > 0) ctx.arc(dir * 6, 0, radius, -1.1, angle);
      else ctx.arc(dir * 6, 0, radius, Math.PI + 1.1, Math.PI - angle, true);
      ctx.stroke();
    }

    ctx.fillStyle = palette.furDark;
    ctx.beginPath();
    ctx.arc(pawX, pawY, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private static renderSearchProgress(ctx: CanvasRenderingContext2D, progress: number, tick: number): void {
    const wobble = Math.sin(tick * 0.5) * 1.5;
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', wobble, -24);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-12, -22, 24, 3);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-12, -22, 24 * progress, 3);
  }

  /** Flat on its back with its paws in the air. */
  private static renderFlat(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    palette: RaiderPalette,
    tick: number,
    effect: 'stars' | 'zzz'
  ): void {
    ctx.translate(x, y + 8);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 18, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 === 0 ? palette.fur : palette.furDark;
      ctx.beginPath();
      ctx.arc(-12 - i * 3, 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.ellipse(-1, 1, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.ellipse(-1, -1, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.furDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-7, -10);
    ctx.moveTo(3, -4);
    ctx.lineTo(4, -10);
    ctx.stroke();

    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.arc(12, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.furDark;
    ctx.beginPath();
    ctx.ellipse(13, -1, 4.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crossed-out eyes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(12, -2.5);
    ctx.lineTo(14.5, 0.5);
    ctx.moveTo(14.5, -2.5);
    ctx.lineTo(12, 0.5);
    ctx.stroke();

    if (effect === 'stars') {
      ctx.fillStyle = '#fde047';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const angle = tick * 0.12 + (i * Math.PI * 2) / 3;
        ctx.fillText('★', 12 + Math.cos(angle) * 10, -9 + Math.sin(angle) * 3);
      }
    } else {
      ctx.fillStyle = '#bfdbfe';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      const drift = (tick % 90) / 90;
      ctx.globalAlpha = 1 - drift;
      ctx.fillText('z z', 14 + drift * 5, -9 - drift * 11);
    }
  }
}
