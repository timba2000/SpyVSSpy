/**
 * Procedural 3D Perspective, Volumetric Lighting & Shading Utilities
 * Pure Canvas 2D implementation of 3D extruded geometry, perspective projection,
 * spherical/cylindrical PBR-style gradients, and ambient occlusion shadows.
 */

export interface Render3DSettings {
  /** Volumetric window moonbeams, light cones, and atmospheric dust motes */
  moonlightRays: boolean;
  /** 3D contact shadows, ambient occlusion corners, and floor specular reflections */
  shadowsAndReflections: boolean;
  /** 3D extrusion depth multiplier (0.7 = subtle, 1.0 = standard, 1.3 = deep diorama) */
  depthScale: number;
}

export const render3DSettings: Render3DSettings = {
  moonlightRays: true,
  shadowsAndReflections: true,
  depthScale: 1.0,
};

/** Central vanishing point in 320x200 logical room coordinates. */
export const ROOM_VP_X = 160;
export const ROOM_VP_Y = -130;

/**
 * Darkens (< 1) or brightens (> 1) a 6-digit hex color string.
 */
export function shadeHex(hex: string, factor: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, Math.round(((num >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((num >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((num & 0xff) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts a 6-digit hex color string into an rgba(...) string.
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Projects a point (x, y) toward or away from the room's 3D vanishing point.
 * `t > 0` moves toward the vanishing point (deeper/higher in 3D space).
 */
export function projectTowardVP(x: number, y: number, t: number): { x: number; y: number } {
  const scale = t * render3DSettings.depthScale;
  return {
    x: x + (ROOM_VP_X - x) * scale,
    y: y + (ROOM_VP_Y - y) * scale,
  };
}

/**
 * Computes the X coordinate where a perspective ray from (ROOM_VP_X, ROOM_VP_Y)
 * passing through (topX, topY) intersects the horizontal line y = targetY.
 */
export function projectFloorRayX(topX: number, topY: number, targetY: number): number {
  const dy = topY - ROOM_VP_Y;
  if (Math.abs(dy) < 0.001) return topX;
  const t = (targetY - ROOM_VP_Y) / dy;
  return ROOM_VP_X + (topX - ROOM_VP_X) * t;
}

/**
 * Draws a soft multi-stop elliptical ambient-occlusion contact shadow on the floor.
 */
export function drawContactShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.48
): void {
  if (!render3DSettings.shadowsAndReflections || rx <= 0 || ry <= 0) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  grad.addColorStop(0, `rgba(2, 6, 23, ${alpha})`);
  grad.addColorStop(0.55, `rgba(2, 6, 23, ${alpha * 0.55})`);
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface ExtrudedBox3DOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Depth factor (0.04 to 0.12 typical) toward the 3D vanishing point */
  depthFactor?: number;
  /** Base hex color of the box */
  baseColor: string;
  /** Optional override for top face hex color */
  topColor?: string;
  /** Optional override for side face hex color */
  sideColor?: string;
  /** Optional rim/specular highlight color */
  rimColor?: string;
  /** Draw floor contact shadow beneath the box */
  shadow?: boolean;
}

/**
 * Draws a 3D perspective-extruded box whose top and inner side faces converge
 * toward the room's central vanishing point, with vertical diffuse gradients
 * and 3D bevel highlights.
 */
export function drawExtrudedBox3D(
  ctx: CanvasRenderingContext2D,
  opts: ExtrudedBox3DOptions
): {
  backTopLeft: { x: number; y: number };
  backTopRight: { x: number; y: number };
  backBottomLeft: { x: number; y: number };
  backBottomRight: { x: number; y: number };
} {
  const {
    x,
    y,
    w,
    h,
    depthFactor = 0.055,
    baseColor,
    topColor,
    sideColor,
    rimColor = 'rgba(255, 255, 255, 0.22)',
    shadow = true,
  } = opts;

  const backTopLeft = projectTowardVP(x, y, depthFactor);
  const backTopRight = projectTowardVP(x + w, y, depthFactor);
  const backBottomLeft = projectTowardVP(x, y + h, depthFactor);
  const backBottomRight = projectTowardVP(x + w, y + h, depthFactor);

  if (shadow) {
    drawContactShadow(ctx, x + w / 2, y + h + 2, w * 0.62, Math.max(5, h * 0.16), 0.5);
  }

  // 1. Perspective Side Face (visible when object is left or right of room center)
  const centerX = x + w / 2;
  if (centerX < ROOM_VP_X - 8) {
    // Object is on the left -> right side face is visible
    ctx.fillStyle = sideColor ?? shadeHex(baseColor, 0.72);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(backTopRight.x, backTopRight.y);
    ctx.lineTo(backBottomRight.x, backBottomRight.y);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  } else if (centerX > ROOM_VP_X + 8) {
    // Object is on the right -> left side face is visible
    ctx.fillStyle = sideColor ?? shadeHex(baseColor, 0.76);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(backTopLeft.x, backTopLeft.y);
    ctx.lineTo(backBottomLeft.x, backBottomLeft.y);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Perspective Top Face
  const topGrad = ctx.createLinearGradient(x, backTopLeft.y, x, y);
  topGrad.addColorStop(0, topColor ? shadeHex(topColor, 0.9) : shadeHex(baseColor, 1.18));
  topGrad.addColorStop(1, topColor ?? shadeHex(baseColor, 1.35));
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.moveTo(backTopLeft.x, backTopLeft.y);
  ctx.lineTo(backTopRight.x, backTopRight.y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();

  // 3. Front Face with vertical 3D lighting gradient
  const frontGrad = ctx.createLinearGradient(x, y, x, y + h);
  frontGrad.addColorStop(0, shadeHex(baseColor, 1.08));
  frontGrad.addColorStop(0.65, baseColor);
  frontGrad.addColorStop(1, shadeHex(baseColor, 0.78));
  ctx.fillStyle = frontGrad;
  ctx.fillRect(x, y, w, h);

  // 4. 3D Specular Bevel Edge along front-top crease
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + w - 0.5, y + 0.5);
  ctx.stroke();

  // 5. Crisp dark outline around front face
  ctx.strokeStyle = shadeHex(baseColor, 0.42);
  ctx.lineWidth = 0.9;
  ctx.strokeRect(x, y, w, h);

  return { backTopLeft, backTopRight, backBottomLeft, backBottomRight };
}

/**
 * Draws a 3D vertically shaded cylinder with elliptical top & bottom caps and specular highlight.
 */
export function drawCylinder3D(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  capRy: number,
  baseColor: string,
  topColor?: string
): void {
  const rx = w / 2;
  const cx = x + rx;

  // Cylindrical body gradient (left core shadow -> lit side -> specular -> right shadow -> rim)
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0, shadeHex(baseColor, 0.62));
  bodyGrad.addColorStop(0.28, shadeHex(baseColor, 1.18));
  bodyGrad.addColorStop(0.42, shadeHex(baseColor, 1.38));
  bodyGrad.addColorStop(0.78, shadeHex(baseColor, 0.75));
  bodyGrad.addColorStop(1, shadeHex(baseColor, 0.92));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.ellipse(cx, y + h, rx, capRy, 0, Math.PI, 0, true);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();

  // Top elliptical cap
  const capGrad = ctx.createRadialGradient(cx - rx * 0.25, y - capRy * 0.25, 1, cx, y, rx);
  capGrad.addColorStop(0, topColor ? shadeHex(topColor, 1.25) : shadeHex(baseColor, 1.42));
  capGrad.addColorStop(1, topColor ?? shadeHex(baseColor, 0.88));
  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.ellipse(cx, y, rx, capRy, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, y, rx - 0.5, Math.max(1, capRy - 0.4), 0, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

/**
 * Draws a 3D shaded ellipsoid/sphere with off-center key light, core shadow, and rim light.
 */
export function drawSphere3D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  baseColor: string,
  options: {
    rotation?: number;
    lightColor?: string;
    darkColor?: string;
    rimColor?: string;
    lightOffsetX?: number;
    lightOffsetY?: number;
    specular?: boolean;
  } = {}
): void {
  const {
    rotation = 0,
    lightColor = shadeHex(baseColor, 1.38),
    darkColor = shadeHex(baseColor, 0.58),
    rimColor,
    lightOffsetX = -0.32,
    lightOffsetY = -0.35,
    specular = false,
  } = options;

  ctx.save();
  ctx.translate(cx, cy);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.scale(1, ry / rx);

  const grad = ctx.createRadialGradient(
    rx * lightOffsetX,
    rx * lightOffsetY,
    rx * 0.08,
    0,
    0,
    rx
  );
  grad.addColorStop(0, lightColor);
  grad.addColorStop(0.52, baseColor);
  grad.addColorStop(0.88, darkColor);
  grad.addColorStop(1, rimColor ?? shadeHex(baseColor, 0.72));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();

  if (specular) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(rx * lightOffsetX * 0.85, rx * lightOffsetY * 0.85, Math.max(1, rx * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a rounded rectangle path on the canvas context.
 */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
