/**
 * High-Fidelity 2D/2.5D Room, Furniture, and Embassy Environment Renderer.
 */

import { FurnitureType, SecretItemType, TrapType } from '../core/types';
import { DoorData, FurnitureData, RoomInstance } from '../core/room/room';

export class RoomRenderer {
  /**
   * Renders the room environment within the given viewport area.
   * Assumes context is already transformed / scaled to logical 320x200 space.
   */
  public static render(
    ctx: CanvasRenderingContext2D,
    room: RoomInstance,
    viewportW: number = 320,
    viewportH: number = 200,
    animationTick: number = 0
  ): void {
    ctx.save();

    // 1. Draw 2.5D Room Enclosure (Walls & Parquet Floor)
    this.renderRoomShell(ctx, viewportW, viewportH, room.id);

    // 2. Draw Doors (North, South, East, West) with 3D Architraves
    for (const door of room.doors) {
      this.renderDoor(ctx, door, room.isAirportExit && door.direction === 'EAST', animationTick);
    }

    // 3. Draw Furniture with Depth, Highlights & Open/Searched States
    for (const furn of room.furniture) {
      this.renderFurniture(ctx, furn, animationTick);
    }

    // 4. Draw Dropped Ground Items with Pulsing Halo
    for (const groundItem of room.groundItems) {
      this.renderGroundItem(ctx, groundItem.item, groundItem.x, groundItem.y, animationTick);
    }

    ctx.restore();
  }

  /**
   * Renders the walls, wainscoting, crown molding, and parquet floor with perspective.
   */
  private static renderRoomShell(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    roomId: string
  ): void {
    const wallHeight = 56;
    const sideWallWidth = 20;

    // Room tint variation based on room number for distinct visual identity
    const roomNum = parseInt(roomId.replace('room_', '')) || 1;
    const wallColors = [
      { top: '#1e293b', wainscot: '#0f172a', trim: '#334155' }, // Navy
      { top: '#27272a', wainscot: '#18181b', trim: '#3f3f46' }, // Charcoal
      { top: '#1c1917', wainscot: '#292524', trim: '#44403c' }, // Warm Umber
      { top: '#142823', wainscot: '#0a1714', trim: '#1e3a33' }, // British Racing Green
      { top: '#2e1065', wainscot: '#1e0847', trim: '#3b0764' }, // Royal Plum
      { top: '#31101e', wainscot: '#1f0712', trim: '#4c1d34' }, // Velvet Crimson
      { top: '#172554', wainscot: '#0f172a', trim: '#1e3a8a' }, // Embassy Blue
      { top: '#1e293b', wainscot: '#0f172a', trim: '#334155' }  // Airport Grey
    ];
    const palette = wallColors[(roomNum - 1) % wallColors.length];

    // --- Back Wall ---
    ctx.fillStyle = palette.top;
    ctx.fillRect(0, 0, w, wallHeight);

    // Wall Wallpaper Stripes / Damask Texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = 0; x < w; x += 12) {
      ctx.fillRect(x, 0, 6, wallHeight - 14);
    }

    // Crown Molding at Ceiling
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(0, 3, w, 2);

    // Picture Rail Trim
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 18, w, 2);

    // Wainscoting / Wood Paneling (lower back wall)
    ctx.fillStyle = palette.wainscot;
    ctx.fillRect(0, wallHeight - 14, w, 14);
    ctx.fillStyle = palette.trim;
    ctx.fillRect(0, wallHeight - 14, w, 2);

    // Baseboard Skirting
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, wallHeight - 4, w, 4);

    // --- Side Walls (Receding Perspective) ---
    // Left Wall
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(sideWallWidth, wallHeight);
    ctx.lineTo(sideWallWidth, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Right Wall
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w - sideWallWidth, wallHeight);
    ctx.lineTo(w - sideWallWidth, h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // --- Floor (Polished Parquet Hardwood) ---
    const floorY = wallHeight;
    const floorH = h - floorY;

    // Floor Base Gradient (warm embassy wood)
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#78350f');
    floorGrad.addColorStop(0.5, '#92400e');
    floorGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(sideWallWidth, floorY, w - sideWallWidth * 2, floorH);

    // Parquet Checker / Isometric Floor Planks
    ctx.save();
    ctx.beginPath();
    ctx.rect(sideWallWidth, floorY, w - sideWallWidth * 2, floorH);
    ctx.clip();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;

    // Horizontal plank lines (perspective compression)
    for (let y = floorY; y <= h; y += 14) {
      ctx.beginPath();
      ctx.moveTo(sideWallWidth, y);
      ctx.lineTo(w - sideWallWidth, y);
      ctx.stroke();
    }

    // Alternating vertical wood joints
    for (let x = sideWallWidth; x <= w - sideWallWidth; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Ambient Room Lighting Cone from ceiling
    const lampGlow = ctx.createRadialGradient(w / 2, floorY + 40, 10, w / 2, floorY + 60, 150);
    lampGlow.addColorStop(0, 'rgba(254, 240, 138, 0.12)');
    lampGlow.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(sideWallWidth, floorY, w - sideWallWidth * 2, floorH);

    ctx.restore();
  }

  /**
   * Renders detailed 3D doors with frames, brass knobs, and trap indicators.
   */
  private static renderDoor(
    ctx: CanvasRenderingContext2D,
    door: DoorData,
    isAirportExit: boolean,
    animationTick: number
  ): void {
    const { x, y, direction, armedTrap } = door;

    ctx.save();

    if (isAirportExit) {
      this.renderAirportExitDoor(ctx, x, y, animationTick);
      ctx.restore();
      return;
    }

    const hasAcid = armedTrap?.type === TrapType.ACID_BUCKET;
    const hasElectro = armedTrap?.type === TrapType.ELECTROCUTION;

    switch (direction) {
      case 'NORTH': {
        // Door in Back Wall (Centered at x: 160, y: 52)
        const dw = 34;
        const dh = 38;
        const dx = x - dw / 2;
        const dy = y - dh + 6;

        // Recessed Wall Shadow
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(dx - 3, dy - 3, dw + 6, dh + 3);

        // Mahogany Door Frame
        ctx.fillStyle = '#451a03';
        ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 2);

        // Wood Door Body
        const doorGrad = ctx.createLinearGradient(dx, dy, dx + dw, dy);
        doorGrad.addColorStop(0, '#78350f');
        doorGrad.addColorStop(0.5, '#92400e');
        doorGrad.addColorStop(1, '#5e2405');
        ctx.fillStyle = doorGrad;
        ctx.fillRect(dx, dy, dw, dh);

        // Inset Panels
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx + 4, dy + 4, dw / 2 - 6, dh / 2 - 6);
        ctx.strokeRect(dx + dw / 2 + 2, dy + 4, dw / 2 - 6, dh / 2 - 6);
        ctx.strokeRect(dx + 4, dy + dh / 2 + 2, dw / 2 - 6, dh / 2 - 6);
        ctx.strokeRect(dx + dw / 2 + 2, dy + dh / 2 + 2, dw / 2 - 6, dh / 2 - 6);

        // Brass Doorknob
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(dx + dw - 6, dy + dh / 2 + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Trap: Acid Bucket above Door Frame
        if (hasAcid) {
          this.renderAcidBucket(ctx, x, dy - 8, animationTick);
        }
        // Trap: Electrocution Sparks on Handle
        if (hasElectro) {
          this.renderElectroSparks(ctx, dx + dw - 6, dy + dh / 2 + 2, animationTick);
        }
        break;
      }

      case 'SOUTH': {
        // Doorway Threshold in Foreground (x: 160, y: 188)
        const dw = 40;
        const dh = 10;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(x - dw / 2 - 2, y - 4, dw + 4, dh);
        // Brass Carpet Trim / Door Sill
        ctx.fillStyle = '#b45309';
        ctx.fillRect(x - dw / 2, y - 2, dw, 5);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - dw / 2 + 2, y - 1, dw - 4, 2);

        if (hasAcid) this.renderAcidBucket(ctx, x, y - 16, animationTick);
        if (hasElectro) this.renderElectroSparks(ctx, x, y, animationTick);
        break;
      }

      case 'WEST': {
        // Door in Left Wall (x: 22, y: 120)
        const dw = 14;
        const dh = 40;
        const dx = x - dw / 2;
        const dy = y - dh / 2;

        // Door frame angled in perspective
        ctx.fillStyle = '#451a03';
        ctx.fillRect(dx - 2, dy - 2, dw + 2, dh + 4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(dx, dy, dw, dh);

        // Perspective door panels
        ctx.strokeStyle = '#270e02';
        ctx.strokeRect(dx + 2, dy + 4, dw - 4, dh / 2 - 6);
        ctx.strokeRect(dx + 2, dy + dh / 2 + 2, dw - 4, dh / 2 - 6);

        // Brass Handle
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(dx + dw - 4, dy + dh / 2 - 2, 3, 5);

        if (hasAcid) this.renderAcidBucket(ctx, x, dy - 8, animationTick);
        if (hasElectro) this.renderElectroSparks(ctx, dx + dw - 3, dy + dh / 2, animationTick);
        break;
      }

      case 'EAST': {
        // Door in Right Wall (x: 298, y: 120)
        const dw = 14;
        const dh = 40;
        const dx = x - dw / 2;
        const dy = y - dh / 2;

        ctx.fillStyle = '#451a03';
        ctx.fillRect(dx, dy - 2, dw + 2, dh + 4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(dx, dy, dw, dh);

        ctx.strokeStyle = '#270e02';
        ctx.strokeRect(dx + 2, dy + 4, dw - 4, dh / 2 - 6);
        ctx.strokeRect(dx + 2, dy + dh / 2 + 2, dw - 4, dh / 2 - 6);

        // Brass Handle
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(dx + 1, dy + dh / 2 - 2, 3, 5);

        if (hasAcid) this.renderAcidBucket(ctx, x, dy - 8, animationTick);
        if (hasElectro) this.renderElectroSparks(ctx, dx + 2, dy + dh / 2, animationTick);
        break;
      }
    }

    ctx.restore();
  }

  /**
   * Renders the Airport Runway Exit Door with neon sign, glass window, and waiting airplane!
   */
  private static renderAirportExitDoor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    animationTick: number
  ): void {
    const dw = 18;
    const dh = 46;
    const dx = x - dw / 2;
    const dy = y - dh / 2;

    // Glowing Exit Arch
    ctx.fillStyle = '#065f46';
    ctx.fillRect(dx - 4, dy - 4, dw + 6, dh + 8);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx - 4, dy - 4, dw + 6, dh + 8);

    // Glass Window looking out to Runway tarmac at night
    const glassGrad = ctx.createLinearGradient(dx, dy, dx + dw, dy);
    glassGrad.addColorStop(0, '#020617');
    glassGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(dx, dy, dw, dh);

    // Blinking Runway beacon light (outside through window)
    const blink = Math.sin(animationTick * 0.15) > 0;
    ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(dx + 8, dy + 14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Propeller airplane silhouette in distance
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(dx + 4, dy + 18, 10, 3); // wings
    ctx.fillRect(dx + 7, dy + 14, 3, 10); // fuselage

    // Glowing Neon "GATE 1 / AIRPORT" overhead plaque
    ctx.fillStyle = '#022c22';
    ctx.fillRect(dx - 22, dy - 18, 38, 12);
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(dx - 22, dy - 18, 38, 12);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('EXIT ✈', dx - 20, dy - 9);
  }

  private static renderAcidBucket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tick: number
  ): void {
    // Metal Pail
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 4, y + 7);
    ctx.lineTo(x - 4, y + 7);
    ctx.closePath();
    ctx.fill();

    // Toxic green liquid rim
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x - 4, y, 8, 2);

    // Acid Drip
    const dripY = (tick % 30) / 4;
    ctx.beginPath();
    ctx.arc(x, y + 8 + dripY, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private static renderElectroSparks(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tick: number
  ): void {
    if (tick % 6 > 2) return; // Flickering spark effect
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 3);
    ctx.lineTo(x + 2, y - 1);
    ctx.lineTo(x - 1, y + 2);
    ctx.lineTo(x + 3, y + 4);
    ctx.stroke();
  }

  /**
   * Renders detailed 2.5D furniture with drop shadows, material highlights, and search states.
   */
  private static renderFurniture(
    ctx: CanvasRenderingContext2D,
    furn: FurnitureData,
    tick: number
  ): void {
    const { x, y, width: w, height: h, type, searched } = furn;

    ctx.save();

    // 1. Drop Shadow under furniture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 2, w / 2 + 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (type) {
      case FurnitureType.SAFE: {
        // --- Heavy Steel Wall/Floor Safe ---
        // Beveled Steel Box
        const safeGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        safeGrad.addColorStop(0, '#64748b');
        safeGrad.addColorStop(0.5, '#475569');
        safeGrad.addColorStop(1, '#334155');
        ctx.fillStyle = safeGrad;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x, y, w, h);

        // Corner Rivet Bolts
        ctx.fillStyle = '#cbd5e1';
        [
          [x + 3, y + 3],
          [x + w - 4, y + 3],
          [x + 3, y + h - 4],
          [x + w - 4, y + h - 4]
        ].forEach(([rx, ry]) => {
          ctx.beginPath();
          ctx.arc(rx, ry, 1, 0, Math.PI * 2);
          ctx.fill();
        });

        if (searched) {
          // Open Safe Door (swung left showing dark interior)
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
          // Swung Door
          ctx.fillStyle = '#475569';
          ctx.fillRect(x - 8, y + 2, 8, h - 4);
          ctx.strokeStyle = '#94a3b8';
          ctx.strokeRect(x - 8, y + 2, 8, h - 4);
        } else {
          // Chrome Combination Dial Wheel
          const cx = x + w / 2;
          const cy = y + h / 2;
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Dial Knob Center
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();

          // Heavy Turn Handle
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx + 6, cy - 2);
          ctx.lineTo(cx + 6, cy + 4);
          ctx.stroke();
        }
        break;
      }

      case FurnitureType.PAINTING: {
        // --- Ornate Baroque Wall Painting ---
        ctx.save();
        if (searched) {
          // Crooked tilted angle when searched!
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate(0.12);
          ctx.translate(-(x + w / 2), -(y + h / 2));
        }

        // Gilded Gold Frame
        ctx.fillStyle = '#b45309';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // Canvas Area
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

        // Spy Parody Portrait (Alfred E. Neuman / Spy caricature)
        const px = x + w / 2;
        const py = y + h / 2;
        ctx.fillStyle = '#fde047'; // Portrait background
        ctx.fillRect(x + 5, y + 5, w - 10, h - 10);

        // Iconic Spy Profile Silhouette in Painting
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(px, py - 1, 4, 0, Math.PI * 2); // head
        ctx.moveTo(px, py);
        ctx.lineTo(px + 6, py + 1); // beak
        ctx.lineTo(px, py + 2);
        ctx.closePath();
        ctx.fill();
        // Fedora in painting
        ctx.fillRect(px - 5, py - 5, 10, 2);
        ctx.fillRect(px - 3, py - 8, 6, 3);

        ctx.restore();
        break;
      }

      case FurnitureType.DESK: {
        // --- Executive Mahogany Desk with Brass Lamp ---
        // Desk Top
        const deskGrad = ctx.createLinearGradient(x, y, x + w, y);
        deskGrad.addColorStop(0, '#9a3412');
        deskGrad.addColorStop(0.5, '#c2410c');
        deskGrad.addColorStop(1, '#7c2d12');
        ctx.fillStyle = deskGrad;
        ctx.fillRect(x, y, w, 8);

        // Desk Pedestals (Left & Right legs)
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(x + 2, y + 8, 10, h - 8);
        ctx.fillRect(x + w - 12, y + 8, 10, h - 8);

        // Drawers with Brass Handles
        ctx.fillStyle = '#431407';
        ctx.fillRect(x + 3, y + 10, 8, 5);
        ctx.fillRect(x + 3, y + 17, 8, 5);
        ctx.fillRect(x + w - 11, y + 10, 8, 5);
        ctx.fillRect(x + w - 11, y + 17, 8, 5);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 6, y + 12, 2, 1);
        ctx.fillRect(x + 6, y + 19, 2, 1);
        ctx.fillRect(x + w - 8, y + 12, 2, 1);
        ctx.fillRect(x + w - 8, y + 19, 2, 1);

        if (searched) {
          // Pulled out drawer
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(x + w - 14, y + 12, 12, 6);
        }

        // Green Banker's Lamp on top
        ctx.fillStyle = '#15803d';
        ctx.fillRect(x + 4, y - 6, 7, 3);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x + 7, y - 3, 1, 3);

        // Telephone on desk
        ctx.fillStyle = '#18181b';
        ctx.fillRect(x + w - 10, y - 3, 6, 4);
        break;
      }

      case FurnitureType.COAT_RACK: {
        // --- Victorian Turned Wood Coat Rack ---
        // Pole
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x + w / 2 - 2, y, 4, h);

        // Base 4-legged stand
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w / 2, y + h - 6);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();

        // Curved Brass Hooks at Top
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x + w / 2 - 5, y + 4, 3, Math.PI, Math.PI * 2);
        ctx.arc(x + w / 2 + 5, y + 4, 3, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Hanging Trenchcoat
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 1, y + 7);
        ctx.lineTo(x + w / 2 - 7, y + 18);
        ctx.lineTo(x + w / 2 + 2, y + 19);
        ctx.closePath();
        ctx.fill();

        // Top Fedora
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + w / 2 - 6, y - 4, 12, 2);
        ctx.fillRect(x + w / 2 - 4, y - 8, 8, 4);
        break;
      }

      default:
        ctx.fillStyle = '#475569';
        ctx.fillRect(x, y, w, h);
        break;
    }

    // Trapped subtle hint: tiny red booby-trap indicator if armed
    if (furn.armedTrap) {
      const pulse = (Math.sin(tick * 0.2) + 1) * 0.5;
      ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(x + w - 2, y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders dropped secret items with glowing pedestals.
   */
  private static renderGroundItem(
    ctx: CanvasRenderingContext2D,
    item: SecretItemType,
    x: number,
    y: number,
    tick: number
  ): void {
    ctx.save();

    // Floating bob motion
    const bobY = Math.sin(tick * 0.1) * 2;
    const itemY = y + bobY;

    // Glowing Halo Pedestal
    const pulse = (Math.sin(tick * 0.15) + 1) * 0.5;
    ctx.fillStyle = `rgba(250, 204, 21, ${0.25 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 9 + pulse * 2, 4 + pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (item) {
      case SecretItemType.BRIEFCASE:
        // Mini Leather Briefcase
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 6, itemY - 4, 12, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x - 2, itemY - 6, 4, 2); // handle
        ctx.fillRect(x - 4, itemY - 1, 2, 2); // brass clasps
        ctx.fillRect(x + 2, itemY - 1, 2, 2);
        break;

      case SecretItemType.PASSPORT:
        // Navy Passport
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(x - 4, itemY - 5, 8, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x - 2, itemY - 2, 4, 4); // gold crest
        break;

      case SecretItemType.SECRET_PLANS:
        // Rolled Blueprint
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(x - 6, itemY - 3, 12, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 1, itemY - 3, 2, 6); // red ribbon
        break;

      case SecretItemType.MONEY:
        // Cash Stack
        ctx.fillStyle = '#15803d';
        ctx.fillRect(x - 5, itemY - 3, 10, 6);
        ctx.fillStyle = '#bbf7d0';
        ctx.fillRect(x - 2, itemY - 1, 4, 2); // currency band
        break;

      case SecretItemType.KEY:
        // Brass Skeleton Key
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x - 3, itemY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x, itemY - 1, 6, 2);
        ctx.fillRect(x + 4, itemY + 1, 2, 2);
        break;
    }

    ctx.restore();
  }
}
