/**
 * Raider Status Panel - Modern 3D Tactile Dashboard
 * Renders 3D portrait bust, glossy cylindrical health bar, 3D beveled loot/tool/trap
 * slots with keycap badges, and a 3D recessed digital raid clock.
 */

import { LootType, ToolType, TrapType } from '../core/types';
import { Raider } from '../core/raider/raider';
import { RaiderRenderer, RAIDER_PALETTES } from './raiderRenderer';
import { roundedRectPath, shadeHex } from './render3d';

const RAIDER_NAMES = { RUSTY: 'RUSTY (YOU)', SOOT: 'SOOT (RIVAL AI)' } as const;

const LOOT_ICONS: { type: LootType; icon: string; label: string }[] = [
  { type: LootType.BASKET, icon: '🧺', label: 'Basket' },
  { type: LootType.PIZZA, icon: '🍕', label: 'Pizza' },
  { type: LootType.CHEESE, icon: '🧀', label: 'Cheese' },
  { type: LootType.HONEY, icon: '🍯', label: 'Honey' },
  { type: LootType.FISH, icon: '🐟', label: 'Fish' },
];

/** In key order: tool N clears trap N. */
const TOOL_ICONS: { type: ToolType; icon: string; key: string }[] = [
  { type: ToolType.OVEN_MITT, icon: '🧤', key: '1' },
  { type: ToolType.COOKING_OIL, icon: '🫒', key: '2' },
  { type: ToolType.CLOTHES_PEG, icon: '📎', key: '3' },
  { type: ToolType.BROOM, icon: '🧹', key: '4' },
  { type: ToolType.RUBBER_BOOTS, icon: '🥾', key: '5' },
];

const TRAP_ICONS: { type: TrapType; icon: string; key: string }[] = [
  { type: TrapType.SNAP_TRAP, icon: '🪤', key: '1' },
  { type: TrapType.GLUE_PAD, icon: '🍬', key: '2' },
  { type: TrapType.PEPPER_POOF, icon: '🌶️', key: '3' },
  { type: TrapType.MARBLE_SPILL, icon: '🔮', key: '4' },
  { type: TrapType.STATIC_MAT, icon: '⚡', key: '5' },
];

const SLOT = 29;
const SLOT_GAP = 3;
const LABEL_FONT = 'bold 10px "Trebuchet MS", sans-serif';
const HINT_FONT = '10px "Trebuchet MS", sans-serif';
const MUTED = '#94a3b8';

export class HudRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    raider: Raider,
    x: number,
    y: number,
    width: number,
    height: number,
    tick = 0
  ): void {
    const palette = RAIDER_PALETTES[raider.id];

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 1. 3D Brushed Slate Dashboard Chassis
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(0.18, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, width, height);

    // 3D Glowing Accent Bevel Strip along top edge
    const stripGrad = ctx.createLinearGradient(x, y, x + width, y);
    stripGrad.addColorStop(0, palette.bandana);
    stripGrad.addColorStop(0.5, palette.bandanaHighlight);
    stripGrad.addColorStop(1, palette.bandana);
    ctx.fillStyle = stripGrad;
    ctx.fillRect(x, y, width, 3);

    // Subtle bottom shadow below top strip
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x, y + 3, width, 2);

    // 2. 3D Recessed Portrait Medallion + 3D Character Bust
    this.renderPortraitFrame3D(ctx, raider, x + 10, y + 11, 58);

    // 3. Raider Name & 3D Glossy Cylindrical Health Tube
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
    ctx.fillText(RAIDER_NAMES[raider.id], x + 76, y + 26);

    const barX = x + 76;
    const barY = y + 33;
    const barW = 104;
    const barH = 11;
    const health = Math.max(0, Math.min(1, raider.health / raider.maxHealth));

    // Recessed health trough
    roundedRectPath(ctx, barX, barY, barW, barH, 5.5);
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3D Cylindrical Health Fill with top specular shine
    if (health > 0) {
      const fillW = Math.max(8, (barW - 2) * health);
      const baseCol = health > 0.5 ? '#22c55e' : health > 0.25 ? '#eab308' : '#ef4444';
      const hpGrad = ctx.createLinearGradient(barX, barY + 1, barX, barY + barH - 1);
      hpGrad.addColorStop(0, shadeHex(baseCol, 1.45));
      hpGrad.addColorStop(0.45, baseCol);
      hpGrad.addColorStop(1, shadeHex(baseCol, 0.58));

      roundedRectPath(ctx, barX + 1, barY + 1, fillW, barH - 2, 4.5);
      ctx.fillStyle = hpGrad;
      ctx.fill();

      // Glossy top reflection streak
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(barX + 4, barY + 2, Math.max(0, fillW - 8), 2);
    }

    // Status message
    const status = this.statusText(raider);
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.fillStyle = raider.inventory.hasFullFeast() ? '#4ade80' : '#cbd5e1';
    ctx.fillText(status, barX, y + 61);

    // 4. 3D Tactile Inventory Groups: LOOT, TOOL IN PAW, TRAPS
    const inv = raider.inventory;
    this.renderGroup(ctx, 'FEAST LOOT', 'Basket + 4 dishes', x + 190, y, LOOT_ICONS.length, (i, sx, sy) => {
      const { type, icon } = LOOT_ICONS[i];
      const hasInBasket = type === LootType.BASKET ? inv.hasBasket : inv.collectedItems.has(type);
      const heldLoose = inv.heldItem === type;
      const lit = hasInBasket || heldLoose;
      const border = hasInBasket ? '#22c55e' : heldLoose ? '#facc15' : undefined;
      this.renderSlot3D(ctx, sx, sy, icon, border, lit);
    });

    this.renderGroup(ctx, 'COUNTER-TOOL', 'Keys 1-5 (0 none)', x + 356, y, TOOL_ICONS.length, (i, sx, sy) => {
      const { type, icon, key } = TOOL_ICONS[i];
      const active = inv.activeTool === type;
      this.renderSlot3D(ctx, sx, sy, icon, active ? '#38bdf8' : undefined, active, key);
    });

    this.renderGroup(ctx, 'BOOBY TRAPS', 'Shift + 1-5', x + 522, y, TRAP_ICONS.length, (i, sx, sy) => {
      const { type, icon, key } = TRAP_ICONS[i];
      const count = inv.trapsAvailable[type];
      this.renderSlot3D(ctx, sx, sy, icon, count > 0 ? '#f97316' : undefined, count > 0, `S+${key}`);

      // 3D Count Pill in bottom-right corner
      ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
      ctx.fillStyle = count > 0 ? '#fde047' : '#475569';
      ctx.textAlign = 'right';
      ctx.fillText(`x${count}`, sx + SLOT - 2.5, sy + SLOT - 2.5);
      ctx.textAlign = 'left';
    });

    // 5. 3D Recessed Digital Raid Clock
    this.renderClock3D(ctx, raider.clockSeconds, x + width - 114, y + 16, tick);

    ctx.restore();
  }

  private static statusText(raider: Raider): string {
    switch (raider.state) {
      case 'KNOCKED_OUT':
        return '★ Seeing stars...';
      case 'OUT_OF_TIME':
        return '💤 Fast asleep';
      case 'SEARCHING':
        return '🔍 Rummaging...';
      default:
        if (raider.inventory.hasFullFeast()) {
          return '✨ Feast packed! Run to Porch Gate!';
        }
        if (raider.inventory.heldItem) {
          return `Carrying ${raider.inventory.heldItem} (need Basket!)`;
        }
        return `Basket: ${raider.inventory.collectedItems.size}/4 feast items`;
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
      drawSlot(i, x + i * (SLOT + SLOT_GAP), y + 21);
    }

    if (hint) {
      ctx.font = HINT_FONT;
      ctx.fillStyle = '#64748b';
      ctx.fillText(hint, x, y + 64);
    }
  }

  private static renderSlot3D(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    icon: string,
    accentColor: string | undefined,
    lit: boolean,
    keyBadge?: string
  ): void {
    // 1. 3D Keycap / Beveled Slot Base (extruded bottom lip)
    roundedRectPath(ctx, x, y + 2, SLOT, SLOT, 6);
    ctx.fillStyle = '#020617';
    ctx.fill();

    // 2. Main 3D Slot Surface
    const grad = ctx.createLinearGradient(x, y, x, y + SLOT);
    if (accentColor && lit) {
      grad.addColorStop(0, shadeHex(accentColor, 0.55));
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#334155');
      grad.addColorStop(1, '#1e293b');
    }
    roundedRectPath(ctx, x, y, SLOT, SLOT - 1, 6);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Top Bevel Specular Highlight & Border
    ctx.strokeStyle = accentColor ?? '#475569';
    ctx.lineWidth = accentColor ? 1.6 : 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 1);
    ctx.lineTo(x + SLOT - 4, y + 1);
    ctx.stroke();

    // 4. Icon
    ctx.save();
    ctx.globalAlpha = lit ? 1 : 0.32;
    ctx.font = '15px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + SLOT / 2, y + 20);
    ctx.restore();

    // 5. Optional Keybind Micro-Badge in top-left corner
    if (keyBadge) {
      ctx.font = 'bold 7.5px Consolas, monospace';
      ctx.fillStyle = lit ? '#cbd5e1' : '#64748b';
      ctx.fillText(keyBadge, x + 2.5, y + 8.5);
    }
  }

  private static renderClock3D(
    ctx: CanvasRenderingContext2D,
    seconds: number,
    x: number,
    y: number,
    tick: number
  ): void {
    const remaining = Math.max(0, seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const low = remaining <= 30;
    const w = 104;
    const h = 44;

    // 3D Recessed Bezel Frame
    roundedRectPath(ctx, x, y, w, h, 8);
    const bezelGrad = ctx.createLinearGradient(x, y, x, y + h);
    bezelGrad.addColorStop(0, '#020617');
    bezelGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bezelGrad;
    ctx.fill();

    ctx.strokeStyle = low ? '#ef4444' : '#475569';
    ctx.lineWidth = low ? 2 : 1.2;
    ctx.stroke();

    // Inner glass reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x + 3, y + 3, w - 6, h * 0.42);

    ctx.font = 'bold 8.5px "Trebuchet MS", sans-serif';
    ctx.fillStyle = low ? '#fca5a5' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('RAID CLOCK', x + w / 2, y + 12);

    ctx.fillStyle = low ? (tick % 30 < 15 ? '#fca5a5' : '#ef4444') : '#fde047';
    ctx.font = 'bold 22px Consolas, "Courier New", monospace';
    ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, x + w / 2, y + 35);
    ctx.textAlign = 'left';
  }

  private static renderPortraitFrame3D(
    ctx: CanvasRenderingContext2D,
    raider: Raider,
    x: number,
    y: number,
    size: number
  ): void {
    const palette = RAIDER_PALETTES[raider.id];

    // 3D Recessed Medallion Background
    roundedRectPath(ctx, x, y, size, size, 10);
    const bgGrad = ctx.createRadialGradient(
      x + size / 2,
      y + size / 2,
      4,
      x + size / 2,
      y + size / 2,
      size * 0.7
    );
    bgGrad.addColorStop(0, '#334155');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Clip to rounded portrait frame & render 3D Raccoon Bust
    ctx.save();
    roundedRectPath(ctx, x, y, size, size, 10);
    ctx.clip();
    RaiderRenderer.renderPortrait3D(ctx, raider, x + size / 2, y + size / 2 + 4, 2.2);
    ctx.restore();

    // 3D Metallic Bezel Rim
    roundedRectPath(ctx, x, y, size, size, 10);
    ctx.strokeStyle = palette.bandana;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
