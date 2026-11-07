/**
 * Raider status panel: portrait, health, loot, tools, traps and clock.
 */

import { LootType, ToolType, TrapType } from '../core/types';
import { Raider } from '../core/raider/raider';
import { RAIDER_PALETTES } from './raiderRenderer';

const RAIDER_NAMES = { RUSTY: 'RUSTY', SOOT: 'SOOT' } as const;

const LOOT_ICONS: { type: LootType; icon: string }[] = [
  { type: LootType.BASKET, icon: '🧺' },
  { type: LootType.PIZZA, icon: '🍕' },
  { type: LootType.CHEESE, icon: '🧀' },
  { type: LootType.HONEY, icon: '🍯' },
  { type: LootType.FISH, icon: '🐟' }
];

/** In key order: tool N clears trap N. */
const TOOL_ICONS: { type: ToolType; icon: string }[] = [
  { type: ToolType.OVEN_MITT, icon: '🧤' },
  { type: ToolType.COOKING_OIL, icon: '🫒' },
  { type: ToolType.CLOTHES_PEG, icon: '📎' },
  { type: ToolType.BROOM, icon: '🧹' },
  { type: ToolType.RUBBER_BOOTS, icon: '🥾' }
];

const TRAP_ICONS: { type: TrapType; icon: string }[] = [
  { type: TrapType.SNAP_TRAP, icon: '🪤' },
  { type: TrapType.GLUE_PAD, icon: '🍬' },
  { type: TrapType.PEPPER_POOF, icon: '🌶️' },
  { type: TrapType.MARBLE_SPILL, icon: '🔮' },
  { type: TrapType.STATIC_MAT, icon: '⚡' }
];

const SLOT = 28;
const SLOT_GAP = 2;
const LABEL_FONT = 'bold 10px "Trebuchet MS", sans-serif';
const HINT_FONT = '10px "Trebuchet MS", sans-serif';
const MUTED = '#a8a29e';

export class HudRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    raider: Raider,
    x: number,
    y: number,
    width: number,
    height: number,
    tick: number = 0
  ): void {
    const palette = RAIDER_PALETTES[raider.id];

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = palette.bandana;
    ctx.fillRect(x, y, width, 2);

    this.renderPortrait(ctx, raider, x + 10, y + 12, 56);

    // Name and health
    ctx.fillStyle = '#fafaf9';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillText(RAIDER_NAMES[raider.id], x + 76, y + 28);

    const barX = x + 76;
    const barY = y + 36;
    const barW = 100;
    const health = raider.health / raider.maxHealth;
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(barX, barY, barW, 9);
    ctx.fillStyle = health > 0.5 ? '#22c55e' : health > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * health, 7);

    ctx.font = HINT_FONT;
    ctx.fillStyle = MUTED;
    ctx.fillText(this.statusText(raider), barX, y + 60);

    // Loot, tools and traps
    const inv = raider.inventory;
    this.renderGroup(ctx, 'LOOT', '', x + 192, y, LOOT_ICONS.length, (i, sx, sy) => {
      const { type, icon } = LOOT_ICONS[i];
      const has = type === LootType.BASKET ? inv.hasBasket : inv.collectedItems.has(type) || inv.heldItem === type;
      this.renderSlot(ctx, sx, sy, icon, has ? '#22c55e' : undefined, has);
    });

    this.renderGroup(ctx, 'TOOL IN PAW', 'keys 1-5, 0 none', x + 352, y, TOOL_ICONS.length, (i, sx, sy) => {
      const { type, icon } = TOOL_ICONS[i];
      const active = inv.activeTool === type;
      this.renderSlot(ctx, sx, sy, icon, active ? '#38bdf8' : undefined, active);
    });

    this.renderGroup(ctx, 'TRAPS', 'Shift + 1-5', x + 512, y, TRAP_ICONS.length, (i, sx, sy) => {
      const { type, icon } = TRAP_ICONS[i];
      const count = inv.trapsAvailable[type];
      this.renderSlot(ctx, sx, sy, icon, undefined, count > 0);
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.fillStyle = count > 0 ? '#fde68a' : '#57534e';
      ctx.textAlign = 'right';
      ctx.fillText(String(count), sx + SLOT - 2, sy + SLOT - 2);
      ctx.textAlign = 'left';
    });

    this.renderClock(ctx, raider.clockSeconds, x + width - 118, y + 22, tick);

    ctx.restore();
  }

  private static statusText(raider: Raider): string {
    switch (raider.state) {
      case 'KNOCKED_OUT':
        return 'Seeing stars...';
      case 'OUT_OF_TIME':
        return 'Fast asleep';
      case 'SEARCHING':
        return 'Rummaging...';
      default:
        return raider.inventory.hasFullFeast() ? 'Feast packed: get to the gate!' : '';
    }
  }

  private static renderGroup(
    ctx: CanvasRenderingContext2D,
    label: string,
    hint: string,
    x: number,
    y: number,
    count: number,
    drawSlot: (index: number, slotX: number, slotY: number) => void
  ): void {
    ctx.font = LABEL_FONT;
    ctx.fillStyle = MUTED;
    ctx.fillText(label, x, y + 16);

    for (let i = 0; i < count; i++) {
      drawSlot(i, x + i * (SLOT + SLOT_GAP), y + 22);
    }

    if (hint) {
      ctx.font = HINT_FONT;
      ctx.fillStyle = '#78716c';
      ctx.fillText(hint, x, y + 66);
    }
  }

  private static renderSlot(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    icon: string,
    borderColor: string | undefined,
    lit: boolean
  ): void {
    ctx.fillStyle = borderColor ? 'rgba(255, 255, 255, 0.12)' : '#292524';
    ctx.fillRect(x, y, SLOT, SLOT);
    ctx.strokeStyle = borderColor ?? '#44403c';
    ctx.lineWidth = borderColor ? 2 : 1;
    ctx.strokeRect(x, y, SLOT, SLOT);

    ctx.globalAlpha = lit ? 1 : 0.32;
    ctx.font = '15px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + SLOT / 2, y + 20);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  private static renderClock(ctx: CanvasRenderingContext2D, seconds: number, x: number, y: number, tick: number): void {
    const remaining = Math.max(0, seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const low = remaining <= 30;

    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(x, y, 108, 36);
    ctx.strokeStyle = low ? '#ef4444' : '#44403c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, 108, 36);

    ctx.fillStyle = low ? (tick % 30 < 15 ? '#fca5a5' : '#ef4444') : '#fde68a';
    ctx.font = 'bold 24px Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, x + 54, y + 26);
    ctx.textAlign = 'left';
  }

  private static renderPortrait(ctx: CanvasRenderingContext2D, raider: Raider, x: number, y: number, size: number): void {
    const palette = RAIDER_PALETTES[raider.id];
    const cx = x + size / 2;
    const cy = y + size / 2 + 3;

    ctx.fillStyle = '#292524';
    ctx.fillRect(x, y, size, size);

    // Ears, head, mask and muzzle
    ctx.fillStyle = palette.fur;
    ctx.beginPath();
    ctx.arc(cx - 15, cy - 15, 7, 0, Math.PI * 2);
    ctx.arc(cx + 15, cy - 15, 7, 0, Math.PI * 2);
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.furDark;
    ctx.beginPath();
    ctx.ellipse(cx - 9, cy - 3, 9, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 9, cy - 3, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 9, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 2.8, 0, Math.PI * 2);
    ctx.fill();

    if (raider.isAwake()) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 9, cy - 3, 3, 0, Math.PI * 2);
      ctx.arc(cx + 9, cy - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 13, cy - 3);
      ctx.lineTo(cx - 5, cy - 3);
      ctx.moveTo(cx + 5, cy - 3);
      ctx.lineTo(cx + 13, cy - 3);
      ctx.stroke();
    }
  }
}
