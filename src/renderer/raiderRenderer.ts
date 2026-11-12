/**
 * Raider Renderer - Modern 3D Volumetric Raccoon Characters
 * Renders Rusty (cinnamon-amber raccoon in crimson bandana) and
 * Soot (charcoal-silver raccoon in cyan bandana) using 3D spherical
 * and cylindrical shading gradients, rim lighting, and articulated limbs.
 */

import { Raider } from '../core/raider/raider';
import { RaiderId } from '../core/types';
import { drawContactShadow, drawSphere3D, shadeHex } from './render3d';

export interface RaiderPalette {
  fur: string;
  furLight: string;
  furDark: string;
  belly: string;
  tailStripe: string;
  mask: string;
  cheek: string;
  bandana: string;
  bandanaHighlight: string;
  eyeGlow: string;
  rimLight: string;
}

export const RAIDER_PALETTES: Record<RaiderId, RaiderPalette> = {
  RUSTY: {
    fur: '#c2591a',
    furLight: '#f59e0b',
    furDark: '#6c2707',
    belly: '#fde68a',
    tailStripe: '#3b1304',
    mask: '#271105',
    cheek: '#fef3c7',
    bandana: '#dc2626',
    bandanaHighlight: '#fca5a5',
    eyeGlow: '#fef08a',
    rimLight: '#fde047',
  },
  SOOT: {
    fur: '#64748b',
    furLight: '#cbd5e1',
    furDark: '#1e293b',
    belly: '#e2e8f0',
    tailStripe: '#0f172a',
    mask: '#090d16',
    cheek: '#f1f5f9',
    bandana: '#0284c7',
    bandanaHighlight: '#7dd3fc',
    eyeGlow: '#bae6fd',
    rimLight: '#38bdf8',
  },
};

export class RaiderRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    raider: Raider,
    tick = 0
  ): void {
    const pal = RAIDER_PALETTES[raider.id];
    const isMoving = raider.state === 'WALKING';

    // Perspective scale slightly increases as raider walks toward the foreground (y: 46..190)
    const depthNorm = Math.max(0, Math.min(1, (raider.y - 46) / 144));
    const perspectiveScale = 0.88 + depthNorm * 0.2;

    const stride = isMoving ? Math.sin(tick * 0.38) * 2.6 : Math.sin(tick * 0.07) * 0.45;
    const bounce = isMoving ? Math.abs(Math.sin(tick * 0.38)) * 1.9 : Math.sin(tick * 0.07) * 0.35;
    const dir = raider.facing === 'WEST' ? -1 : 1;
    const lean = isMoving ? dir * 0.07 : 0;

    ctx.save();
    ctx.translate(raider.x, raider.y);
    ctx.scale(perspectiveScale, perspectiveScale);

    // 1. Soft 3D Ambient Occlusion Floor Shadow
    const isDown = raider.state === 'KNOCKED_OUT' || raider.state === 'OUT_OF_TIME';
    const shadowRadiusX = isDown ? 15 : 11.5;
    drawContactShadow(ctx, 0, 11.5, shadowRadiusX, 5.2, 0.58);

    // Subtle coloured player locator ring on floor
    ctx.strokeStyle =
      raider.id === 'RUSTY' ? 'rgba(245, 158, 11, 0.34)' : 'rgba(56, 189, 248, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 11.5, shadowRadiusX - 1, 4.2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Sleeping (Out of Time) State
    if (raider.state === 'OUT_OF_TIME') {
      this.renderSleeping3D(ctx, pal, tick);
      ctx.restore();
      return;
    }

    // 3. Knocked Out (Sprung Trap / Swatted) State
    if (raider.state === 'KNOCKED_OUT') {
      this.renderKnockedOut3D(ctx, pal, tick);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(0, -bounce);
    ctx.rotate(lean);

    // Hurt flash tint
    if (raider.state === 'HURT' && tick % 4 < 2) {
      ctx.filter = 'brightness(1.75)';
    }

    // --- A. 3D ARTICULATED RINGED TAIL (7 Shaded Spheres along a dynamic curve) ---
    const tailWag = Math.sin(tick * (isMoving ? 0.32 : 0.1)) * 2.8;
    for (let i = 6; i >= 0; i--) {
      const t = i / 6;
      const segX = -dir * (4.5 + t * 12.5);
      const segY = 4 - Math.sin(t * Math.PI * 0.85) * 6.5 + tailWag * t;
      const segR = 2.6 + Math.sin(t * Math.PI) * 2.4;
      const isDarkRing = i % 2 === 1;
      const ringColor = isDarkRing ? pal.tailStripe : pal.fur;

      drawSphere3D(ctx, segX, segY, segR, segR * 0.92, ringColor, {
        lightColor: isDarkRing ? shadeHex(pal.tailStripe, 1.6) : pal.furLight,
        darkColor: isDarkRing ? '#020617' : pal.furDark,
        rimColor: pal.rimLight,
      });
    }

    // --- B. 3D HIND LEGS & PAWS ---
    const leftLegY = 8.5 + stride * 0.7;
    const rightLegY = 8.5 - stride * 0.7;
    drawSphere3D(ctx, -3.6, leftLegY, 3.2, 2.5, pal.furDark, {
      lightColor: pal.fur,
      darkColor: '#090d16',
    });
    drawSphere3D(ctx, 3.6, rightLegY, 3.2, 2.5, pal.furDark, {
      lightColor: pal.fur,
      darkColor: '#090d16',
    });

    // --- C. 3D VOLUMETRIC TORSO & BELLY FUR ---
    drawSphere3D(ctx, 0, 2, 7.6, 8.2, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
      rimColor: pal.rimLight,
    });

    // Soft 3D Belly Patch
    drawSphere3D(ctx, dir * 1.4, 2.8, 4.6, 5.6, pal.belly, {
      lightColor: '#ffffff',
      darkColor: shadeHex(pal.belly, 0.72),
    });

    // --- D. PICNIC BASKET SLUNG ON BACK (if carried) ---
    if (raider.inventory.hasBasket) {
      ctx.save();
      ctx.translate(-dir * 4.5, -1.5);
      drawSphere3D(ctx, 0, 0, 4.8, 4.2, '#d97706', {
        lightColor: '#fcd34d',
        darkColor: '#78350f',
      });
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -2, 8, 1.5);
      ctx.restore();
    }

    // --- E. 3D KNOTTED BANDANA SCARF ---
    drawSphere3D(ctx, -dir * 5.2, -3.2, 2.8, 2.2, pal.bandana, {
      lightColor: pal.bandanaHighlight,
      darkColor: shadeHex(pal.bandana, 0.55),
    });
    drawSphere3D(ctx, 0, -3.4, 6.8, 2.6, pal.bandana, {
      lightColor: pal.bandanaHighlight,
      darkColor: shadeHex(pal.bandana, 0.55),
      specular: true,
    });

    // --- F. 3D ARMS & HELD ITEM / RUMMAGE MOTION ---
    const armSwing =
      raider.state === 'SEARCHING'
        ? Math.sin(tick * 0.75) * 3.5
        : raider.state === 'ATTACKING'
          ? -4
          : -stride * 0.65;

    // Back arm
    drawSphere3D(ctx, -dir * 4.2, 0.8 - armSwing * 0.5, 2.6, 3.2, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });

    // Front arm + Paw
    const frontArmX = dir * 5.2;
    const frontArmY = 0.8 + armSwing * 0.6;
    drawSphere3D(ctx, frontArmX, frontArmY, 2.8, 3.4, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });

    // If holding a counter-tool, render a 3D miniature tool badge in paw
    if (raider.inventory.activeTool) {
      drawSphere3D(ctx, frontArmX + dir * 2.5, frontArmY + 0.5, 2.6, 2.6, '#38bdf8', {
        lightColor: '#e0f2fe',
        darkColor: '#0369a1',
        specular: true,
      });
    }

    // --- G. 3D SCULPTED HEAD, EARS, MASK & SNOUT ---
    const headY = -8.5 + (raider.state === 'SEARCHING' ? 1.8 : 0);

    // 1. 3D Rounded Ears with Inner Conch
    [-5.4, 5.4].forEach((earX) => {
      drawSphere3D(ctx, earX, headY - 6.2, 3.4, 3.6, pal.furDark, {
        lightColor: pal.fur,
        darkColor: '#090d16',
      });
      drawSphere3D(ctx, earX, headY - 6.0, 1.8, 2.0, pal.cheek, {
        lightColor: '#ffffff',
        darkColor: shadeHex(pal.cheek, 0.7),
      });
    });

    // 2. Main 3D Cranium Sphere
    drawSphere3D(ctx, 0, headY, 8.2, 6.8, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
      rimColor: pal.rimLight,
    });

    // 3. 3D Fluffy Cheek Tufts (Left & Right)
    drawSphere3D(ctx, -5.8, headY + 1.8, 3.6, 2.8, pal.cheek, {
      lightColor: '#ffffff',
      darkColor: shadeHex(pal.cheek, 0.72),
    });
    drawSphere3D(ctx, 5.8, headY + 1.8, 3.6, 2.8, pal.cheek, {
      lightColor: '#ffffff',
      darkColor: shadeHex(pal.cheek, 0.72),
    });

    // 4. 3D Wrap-Around Bandit Mask
    drawSphere3D(ctx, dir * 0.8, headY - 0.3, 7.2, 3.1, pal.mask, {
      lightColor: shadeHex(pal.mask, 1.7),
      darkColor: '#020617',
    });

    // 5. Expressive 3D Eyes with Dual Specular Catchlights
    const eyeShift = dir * 1.4;
    [-2.7 + eyeShift, 2.7 + eyeShift].forEach((eyeX) => {
      drawSphere3D(ctx, eyeX, headY - 0.5, 2.1, 2.3, pal.eyeGlow, {
        lightColor: '#ffffff',
        darkColor: '#ca8a04',
      });
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(eyeX + dir * 0.45, headY - 0.4, 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX - 0.4, headY - 1.1, 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(eyeX + 0.3, headY + 0.2, 0.5, 0.5);
    });

    // 6. Protruding 3D Conical Snout & Glossy Wet Nose
    const snoutX = dir * 4.2;
    const snoutY = headY + 2.2;
    drawSphere3D(ctx, snoutX, snoutY, 3.6, 2.5, pal.cheek, {
      lightColor: '#ffffff',
      darkColor: shadeHex(pal.cheek, 0.7),
    });

    drawSphere3D(ctx, snoutX + dir * 2.4, snoutY - 0.4, 1.8, 1.5, '#1e293b', {
      lightColor: '#94a3b8',
      darkColor: '#020617',
      specular: true,
    });

    ctx.restore(); // end bounce/lean transform

    // --- H. 3D ACTION OVERLAYS (Rummaging / Volumetric Paw-Swat Slash) ---
    if (raider.state === 'SEARCHING') {
      const prog = Math.min(1, Math.max(0, raider.searchProgress / raider.searchDurationTicks));
      const barW = 24;
      const barH = 4.5;
      const bx = -barW / 2;
      const by = -24;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      const fillGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
      fillGrad.addColorStop(0, '#fef08a');
      fillGrad.addColorStop(1, '#eab308');
      ctx.fillStyle = fillGrad;
      ctx.fillRect(bx, by, barW * prog, barH);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 0.7;
      ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
    }

    if (raider.state === 'ATTACKING') {
      // 3D Volumetric Crescent Claw-Swipe Mesh
      ctx.save();
      const swatDx = raider.facing === 'WEST' ? -11 : raider.facing === 'EAST' ? 11 : 0;
      const swatDy = raider.facing === 'NORTH' ? -11 : raider.facing === 'SOUTH' ? 9 : -2;
      ctx.translate(swatDx, swatDy);
      if (raider.facing === 'WEST') ctx.scale(-1, 1);
      else if (raider.facing === 'NORTH') ctx.rotate(-Math.PI / 2);
      else if (raider.facing === 'SOUTH') ctx.rotate(Math.PI / 2);

      const slashGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 16);
      slashGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      slashGrad.addColorStop(0.55, 'rgba(254, 240, 138, 0.85)');
      slashGrad.addColorStop(0.85, 'rgba(249, 115, 22, 0.95)');
      slashGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = slashGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 15, -Math.PI * 0.48, Math.PI * 0.48);
      ctx.arc(-3, 0, 11, Math.PI * 0.42, -Math.PI * 0.42, true);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.3;
      [-3, 0, 3].forEach((offsetY, i) => {
        ctx.beginPath();
        ctx.arc(-1, offsetY, 11 + i * 1.5, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
      });

      ctx.restore();
    }

    ctx.restore();
  }

  private static renderKnockedOut3D(
    ctx: CanvasRenderingContext2D,
    pal: RaiderPalette,
    tick: number
  ): void {
    drawSphere3D(ctx, -3, 6, 10, 5.2, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });
    for (let i = 0; i < 4; i++) {
      drawSphere3D(
        ctx,
        -12 - i * 3,
        7 + (i % 2),
        2.8,
        2.2,
        i % 2 === 0 ? pal.fur : pal.tailStripe
      );
    }
    drawSphere3D(ctx, 6, 5, 6.8, 5.5, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });
    drawSphere3D(ctx, 6, 5, 4.8, 2.6, pal.mask);

    // 3D Orbiting Golden Stars Halo overhead
    for (let i = 0; i < 3; i++) {
      const angle = tick * 0.16 + (i * Math.PI * 2) / 3;
      const sx = Math.cos(angle) * 11;
      const sy = -6 + Math.sin(angle) * 3.8;
      drawSphere3D(ctx, sx, sy, 2.5, 2.5, '#facc15', {
        lightColor: '#ffffff',
        darkColor: '#b45309',
        specular: true,
      });
    }
  }

  private static renderSleeping3D(
    ctx: CanvasRenderingContext2D,
    pal: RaiderPalette,
    tick: number
  ): void {
    const breathe = Math.sin(tick * 0.06) * 0.6;
    drawSphere3D(ctx, -2, 6, 10.5, 5.5 + breathe, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });
    drawSphere3D(ctx, 5, 5.5, 6.5, 5.2, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });

    const zOffset = (tick * 0.35) % 16;
    ctx.fillStyle = '#bae6fd';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('Z', 6, -2 - zOffset * 0.6);
    ctx.font = 'bold 6px sans-serif';
    ctx.fillText('z', 11, -6 - zOffset * 0.8);
  }

  /**
   * Renders a 3D shaded character bust portrait for the HUD status card.
   */
  public static renderPortrait3D(
    ctx: CanvasRenderingContext2D,
    raider: Raider,
    cx: number,
    cy: number,
    scale = 2.1
  ): void {
    const pal = RAIDER_PALETTES[raider.id];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Shoulders & Bandana
    drawSphere3D(ctx, 0, 7.5, 8.5, 5.0, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
    });
    drawSphere3D(ctx, 0, 4.0, 7.0, 2.6, pal.bandana, {
      lightColor: pal.bandanaHighlight,
      darkColor: shadeHex(pal.bandana, 0.5),
      specular: true,
    });

    // Ears
    [-5.5, 5.5].forEach((ex) => {
      drawSphere3D(ctx, ex, -6.2, 3.2, 3.4, pal.furDark, {
        lightColor: pal.fur,
        darkColor: '#090d16',
      });
      drawSphere3D(ctx, ex, -6.0, 1.7, 1.9, pal.cheek);
    });

    // Head & Cheeks
    drawSphere3D(ctx, 0, -0.5, 8.0, 6.6, pal.fur, {
      lightColor: pal.furLight,
      darkColor: pal.furDark,
      rimColor: pal.rimLight,
    });
    drawSphere3D(ctx, -5.6, 1.2, 3.4, 2.6, pal.cheek);
    drawSphere3D(ctx, 5.6, 1.2, 3.4, 2.6, pal.cheek);

    // Mask & Eyes
    drawSphere3D(ctx, 0, -0.8, 6.8, 2.9, pal.mask);
    if (raider.isAwake()) {
      [-2.6, 2.6].forEach((ex) => {
        drawSphere3D(ctx, ex, -0.9, 1.9, 2.1, pal.eyeGlow, {
          lightColor: '#ffffff',
          darkColor: '#ca8a04',
        });
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.arc(ex, -0.8, 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 0.4, -1.4, 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4.2, -0.8);
      ctx.lineTo(-1.0, -0.8);
      ctx.moveTo(1.0, -0.8);
      ctx.lineTo(4.2, -0.8);
      ctx.stroke();
    }

    // Snout & Glossy Nose
    drawSphere3D(ctx, 0, 1.8, 3.4, 2.3, pal.cheek);
    drawSphere3D(ctx, 0, 1.1, 1.6, 1.3, '#1e293b', { specular: true });

    ctx.restore();
  }
}
