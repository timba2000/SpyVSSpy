/**
 * Visual Effects (VFX) & Comic Popups System for Spy vs. Spy.
 * Renders particles, comic hits ("POW!", "BOOM!"), item sparkles, and angel stardust.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'spark' | 'feather';
}

export interface ComicPopup {
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

export class VisualEffects {
  private particles: Particle[] = [];
  private popups: ComicPopup[] = [];

  public update(): void {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 0.6; // gentle float
      pop.life++;
      pop.alpha = Math.max(0, 1 - pop.life / pop.maxLife);
      if (pop.life < 8) {
        pop.scale = 0.5 + (pop.life / 8) * 0.7; // punch-in animation
      } else {
        pop.scale = 1.2;
      }
      if (pop.life >= pop.maxLife) {
        this.popups.splice(i, 1);
      }
    }
  }

  public addCombatHit(x: number, y: number): void {
    const hits = ['POW!', 'BAM!', 'WHACK!', 'SOCK!', 'CRACK!'];
    const text = hits[Math.floor(Math.random() * hits.length)];
    this.popups.push({
      x,
      y: y - 10,
      text,
      color: '#facc15',
      bgColor: '#dc2626',
      scale: 1,
      alpha: 1,
      life: 0,
      maxLife: 35,
      rotation: (Math.random() - 0.5) * 0.4
    });

    // Impact sparks
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.5 ? '#facc15' : '#ef4444',
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 10,
        shape: 'spark'
      });
    }
  }

  public addExplosion(x: number, y: number): void {
    this.popups.push({
      x,
      y: y - 15,
      text: 'BOOOOM!',
      color: '#ffffff',
      bgColor: '#ef4444',
      scale: 1.4,
      alpha: 1,
      life: 0,
      maxLife: 45,
      rotation: (Math.random() - 0.5) * 0.2
    });

    // Fire & smoke particles
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
      const isSmoke = Math.random() > 0.6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        color: isSmoke ? '#64748b' : Math.random() > 0.5 ? '#f97316' : '#facc15',
        size: isSmoke ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 25 + Math.random() * 20,
        shape: isSmoke ? 'circle' : 'spark'
      });
    }
  }

  public addItemFound(x: number, y: number, itemName: string): void {
    this.popups.push({
      x,
      y: y - 15,
      text: `FOUND: ${itemName}!`,
      color: '#ffffff',
      bgColor: '#0284c7',
      scale: 1.1,
      alpha: 1,
      life: 0,
      maxLife: 40,
      rotation: 0
    });

    // Golden sparkles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        color: Math.random() > 0.3 ? '#facc15' : '#38bdf8',
        size: 2 + Math.random() * 2,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 15,
        shape: 'spark'
      });
    }
  }

  public addDefused(x: number, y: number): void {
    this.popups.push({
      x,
      y: y - 12,
      text: 'DEFUSED!',
      color: '#ffffff',
      bgColor: '#16a34a',
      scale: 1.1,
      alpha: 1,
      life: 0,
      maxLife: 35,
      rotation: 0
    });
  }

  public addAngelFeathers(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * 0.6,
        vy: -0.5 - Math.random() * 0.8,
        color: '#e0f2fe',
        size: 3 + Math.random() * 2,
        alpha: 0.9,
        life: 0,
        maxLife: 45 + Math.random() * 20,
        shape: 'feather'
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Render particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'feather') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.4, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render comic text popups
    for (const pop of this.popups) {
      ctx.save();
      ctx.translate(pop.x, pop.y);
      ctx.rotate(pop.rotation);
      ctx.scale(pop.scale, pop.scale);
      ctx.globalAlpha = pop.alpha;

      ctx.font = '900 12px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(pop.text);
      const padX = 6;
      const padY = 3;
      const bgW = metrics.width + padX * 2;
      const bgH = 16 + padY * 2;

      // Comic burst / badge background
      ctx.fillStyle = pop.bgColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-bgW / 2, -bgH / 2, bgW, bgH, 4);
      ctx.fill();
      ctx.stroke();

      // Text with drop shadow
      ctx.fillStyle = '#000000';
      ctx.fillText(pop.text, 1, 1);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }
}
