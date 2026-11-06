/**
 * Trapulator 2.0 - High-Fidelity Retro Espionage HUD.
 */

import { CounterItemType, SecretItemType, TrapType } from '../core/types';
import { Spy } from '../core/spy/spy';

export class HudRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    spy: Spy,
    remainingSeconds: number,
    x: number,
    y: number,
    width: number,
    height: number,
    tick: number = 0
  ): void {
    ctx.save();

    // 1. Brushed Metal / Espionage Console Frame
    const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, width, height);

    // Beveled borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x, y, width, 1); // top highlight

    const isWhite = spy.color === 'WHITE';

    // 2. Spy Avatar Portrait (Left)
    this.renderAvatar(ctx, isWhite, spy.state, x + 6, y + 4, height - 8);

    // 3. Spy Name & Health Bar
    const textStartX = x + 40;
    ctx.fillStyle = isWhite ? '#f8fafc' : '#ef4444';
    ctx.font = '900 11px "Courier New", monospace';
    ctx.fillText(isWhite ? 'WHITE SPY' : 'BLACK SPY', textStartX, y + 14);

    // Health Bar Gauge (Segmented Bar)
    const barX = textStartX;
    const barY = y + 18;
    const barW = 75;
    const barH = 7;
    const healthPercent = Math.max(0, spy.health / spy.maxHealth);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#475569';
    ctx.strokeRect(barX, barY, barW, barH);

    // Colored health fill
    const healthColor = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX + 1, barY + 1, (barW - 2) * healthPercent, barH - 2);

    // 4. Secret Escape Items Panel
    const itemsStartX = textStartX + barW + 16;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ITEMS:', itemsStartX, y + 14);

    const items = [
      { type: SecretItemType.BRIEFCASE, label: '💼', name: 'CASE' },
      { type: SecretItemType.PASSPORT, label: '🛂', name: 'PASS' },
      { type: SecretItemType.SECRET_PLANS, label: '📜', name: 'PLAN' },
      { type: SecretItemType.MONEY, label: '💰', name: 'CASH' },
      { type: SecretItemType.KEY, label: '🔑', name: 'KEY' }
    ];

    let iconX = itemsStartX + 42;
    for (const it of items) {
      const has =
        it.type === SecretItemType.BRIEFCASE
          ? spy.inventory.hasBriefcase
          : spy.inventory.collectedItems.has(it.type) || spy.inventory.heldSingleItem === it.type;

      // Slot border
      ctx.fillStyle = has ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(iconX - 2, y + 4, 20, 20);
      ctx.strokeStyle = has ? '#22c55e' : '#334155';
      ctx.strokeRect(iconX - 2, y + 4, 20, 20);

      ctx.fillStyle = has ? '#ffffff' : '#475569';
      ctx.font = '11px sans-serif';
      ctx.fillText(it.label, iconX, y + 18);

      iconX += 24;
    }

    // 5. Active Tool Display Badge
    const toolX = iconX + 14;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('TOOL:', toolX, y + 14);

    const toolBadgeX = toolX + 34;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(toolBadgeX, y + 4, 82, 20);
    ctx.strokeStyle = spy.inventory.activeTool ? '#38bdf8' : '#334155';
    ctx.strokeRect(toolBadgeX, y + 4, 82, 20);

    const toolName = spy.inventory.activeTool
      ? this.getToolShortName(spy.inventory.activeTool)
      : 'NONE [1-5]';
    ctx.fillStyle = spy.inventory.activeTool ? '#38bdf8' : '#64748b';
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillText(toolName, toolBadgeX + 6, y + 17);

    // 6. Trap Supplies Chips
    const trapX = toolBadgeX + 90;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('TRAPS:', trapX, y + 14);

    const bombCount = spy.inventory.trapsAvailable[TrapType.BOMB] ?? 0;
    const springCount = spy.inventory.trapsAvailable[TrapType.SPRING] ?? 0;
    ctx.fillStyle = bombCount > 0 ? '#ef4444' : '#475569';
    ctx.fillText(`💣x${bombCount}`, trapX + 42, y + 14);
    ctx.fillStyle = springCount > 0 ? '#f59e0b' : '#475569';
    ctx.fillText(`🌀x${springCount}`, trapX + 78, y + 14);

    // 7. Nixie / LED Digital Countdown Clock (Right)
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeStr = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const clockW = 86;
    const clockX = width - clockW - 10;
    ctx.fillStyle = '#050505';
    ctx.fillRect(clockX, y + 4, clockW, 20);
    ctx.strokeStyle = remainingSeconds <= 30 ? '#ef4444' : '#1e3a8a';
    ctx.strokeRect(clockX, y + 4, clockW, 20);

    // Blinking colon effect
    const isBlinking = remainingSeconds <= 30 && tick % 20 < 10;
    ctx.fillStyle = isBlinking ? '#f87171' : remainingSeconds <= 30 ? '#ef4444' : '#22c55e';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`⏱ ${timeStr}`, clockX + 6, y + 18);

    ctx.restore();
  }

  private static renderAvatar(
    ctx: CanvasRenderingContext2D,
    isWhite: boolean,
    state: string,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.save();

    // Portrait Box
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = isWhite ? '#f8fafc' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);

    const cx = x + size / 2;
    const cy = y + size / 2;
    const mainColor = isWhite ? '#ffffff' : '#0f172a';
    const accent = isWhite ? '#020617' : '#ffffff';

    if (state === 'DEAD_ANGEL') {
      // Angel Halo on Portrait
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 7, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Fedora
    ctx.fillStyle = mainColor;
    ctx.fillRect(cx - 8, cy - 4, 16, 3);
    ctx.fillRect(cx - 5, cy - 8, 10, 4);
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 5, cy - 5, 10, 1.5);

    // Beak
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 1);
    ctx.lineTo(cx + 8, cy + 2);
    ctx.lineTo(cx - 2, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.stroke();

    // Eye
    ctx.fillStyle = accent;
    ctx.fillRect(cx + 1, cy - 2, 2, 2);

    ctx.restore();
  }

  private static getToolShortName(tool: CounterItemType): string {
    switch (tool) {
      case CounterItemType.WATER_BUCKET:
        return '🪣 BUCKET';
      case CounterItemType.COAT_HANGER:
        return '🪝 HANGER';
      case CounterItemType.WIRE_CUTTERS:
        return '✂️ PLIERS';
      case CounterItemType.UMBRELLA:
        return '☂️ UMBRELLA';
      case CounterItemType.RUBBER_GLOVES:
        return '🧤 GLOVES';
      default:
        return 'NONE';
    }
  }
}
