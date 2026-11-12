/**
 * Visual Effects: 3D shaded particles and 3D extruded comic popups,
 * each tagged with the room it happened in so only panes viewing that room draw it.
 */

import { LootType, TrapType } from '../core/types';
import { drawSphere3D, roundedRectPath, shadeHex } from './render3d';

interface Particle {
  roomId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Popup {
  roomId: string;
  x: number;
  y: number;
  text: string;
  color: string;
  bgColor: string;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
}

const TRAP_POPUPS: Record<TrapType, { text: string; bgColor: string; colors: string[] }> = {
  [TrapType.SNAP_TRAP]: { text: 'SNAP!', bgColor: '#b91c1c', colors: ['#d6d3d1', '#78716c', '#fafaf9'] },
  [TrapType.GLUE_PAD]: { text: 'STUCK!', bgColor: '#a16207', colors: ['#fef3c7', '#fde68a', '#fcd34d'] },
  [TrapType.PEPPER_POOF]: { text: 'ACHOO!', bgColor: '#c2410c', colors: ['#7f1d1d', '#292524', '#ef4444'] },
  [TrapType.MARBLE_SPILL]: { text: 'WHOOPS!', bgColor: '#6d28d9', colors: ['#f43f5e', '#38bdf8', '#facc15', '#4ade80'] },
  [TrapType.STATIC_MAT]: { text: 'ZZZAP!', bgColor: '#0369a1', colors: ['#fde047', '#bae6fd', '#ffffff'] },
};

export const LOOT_NAMES: Record<LootType, string> = {
  [LootType.BASKET]: 'BASKET',
  [LootType.PIZZA]: 'PIZZA',
  [LootType.CHEESE]: 'CHEESE',
  [LootType.HONEY]: 'HONEY',
  [LootType.FISH]: 'FISH',
};

export class VisualEffects {
  private particles: Particle[] = [];
  private popups: Popup[] = [];

  public update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // subtle 3D gravity arc
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 0.48;
      pop.life++;
      pop.alpha = Math.max(0, 1 - pop.life / pop.maxLife);
      pop.scale = pop.life < 8 ? 0.5 + (pop.life / 8) * 0.62 : 1.12;
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
      }
    }
  }

  private addPopup(
    roomId: string,
    x: number,
    y: number,
    text: string,
    bgColor: string,
    maxLife: number
  ): void {
    this.popups.push({
      roomId,
      x,
      y,
      text,
      color: '#ffffff',
      bgColor,
      scale: 0.5,
      alpha: 1,
      life: 0,
      maxLife,
      rotation: (Math.random() - 0.5) * 0.22,
    });
  }

  private addBurst(
    roomId: string,
    x: number,
    y: number,
    colors: string[],
    count: number,
    speed: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        roomId,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 0.45,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.4 + Math.random() * 2.2,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 18,
      });
    }
  }

  public addSwatHit(roomId: string, x: number, y: number): void {
    const hits = ['SWAT!', 'THWAP!', 'BONK!', 'WHAP!'];
    this.addPopup(roomId, x, y - 12, hits[Math.floor(Math.random() * hits.length)], '#be123c', 32);
    this.addBurst(roomId, x, y, ['#fde047', '#fb923c', '#ffffff'], 12, 2.5);
  }

  public addTrapSprung(roomId: string, x: number, y: number, trap: TrapType): void {
    const look = TRAP_POPUPS[trap];
    this.addPopup(roomId, x, y - 16, look.text, look.bgColor, 45);
    this.addBurst(roomId, x, y, look.colors, 26, 3);
  }

  public addLootFound(roomId: string, x: number, y: number, item: LootType): void {
    this.addPopup(roomId, x, y - 16, `${LOOT_NAMES[item]}!`, '#15803d', 40);
    this.addBurst(roomId, x, y, ['#fde047', '#bbf7d0', '#ffffff'], 16, 1.9);
  }

  public addTrapCleared(roomId: string, x: number, y: number): void {
    this.addPopup(roomId, x, y - 14, 'CLEARED!', '#0e7490', 35);
    this.addBurst(roomId, x, y, ['#38bdf8', '#e0f2fe'], 10, 1.6);
  }

  public addGateRefused(roomId: string, x: number, y: number): void {
    this.addPopup(roomId, x - 36, y - 16, 'FEAST NOT PACKED!', '#7c2d12', 45);
  }

  public addKnockout(roomId: string, x: number, y: number): void {
    this.addBurst(roomId, x, y - 4, ['#fde047', '#fef9c3'], 10, 1.2);
  }

  /** Draws only the 3D particles & popups happening in the given room. */
  public render(ctx: CanvasRenderingContext2D, roomId: string): void {
    ctx.save();

    for (const p of this.particles) {
      if (p.roomId !== roomId) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      drawSphere3D(ctx, p.x, p.y, p.size, p.size, p.color, {
        lightColor: '#ffffff',
        darkColor: shadeHex(p.color, 0.55),
      });
      ctx.restore();
    }

    for (const pop of this.popups) {
      if (pop.roomId !== roomId) continue;
      ctx.save();
      ctx.translate(pop.x, pop.y);
      ctx.rotate(pop.rotation);
      ctx.scale(pop.scale, pop.scale);
      ctx.globalAlpha = pop.alpha;

      ctx.font = '900 9px "Trebuchet MS", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const bgW = ctx.measureText(pop.text).width + 12;
      const bgH = 16;

      // 3D Extruded Badge Shadow Lip
      roundedRectPath(ctx, -bgW / 2 + 1, -bgH / 2 + 2.2, bgW, bgH, 7);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fill();

      // 3D Gradient Badge Body
      const badgeGrad = ctx.createLinearGradient(0, -bgH / 2, 0, bgH / 2);
      badgeGrad.addColorStop(0, shadeHex(pop.bgColor, 1.28));
      badgeGrad.addColorStop(1, shadeHex(pop.bgColor, 0.78));
      roundedRectPath(ctx, -bgW / 2, -bgH / 2, bgW, bgH, 7);
      ctx.fillStyle = badgeGrad;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // 3D Text Drop Shadow + Main Text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillText(pop.text, 0.6, 1.2);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0.5);

      ctx.restore();
    }

    ctx.restore();
  }
}
