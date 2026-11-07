/**
 * Synthesised sound effects (Web Audio API). No audio files are needed.
 *
 * Browsers only allow audio after a user gesture, and sounds scheduled before that
 * pile up and play in a burst. The rival can trigger sounds before the player has
 * touched anything, so everything is silent until `unlock()` is called from one.
 */

export class GameAudio {
  private ctx?: AudioContext;

  /** Call from a user gesture (key press or click) to enable sound. */
  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private tone(
    frequency: number,
    options: { type?: OscillatorType; duration?: number; volume?: number; delay?: number; slideTo?: number } = {}
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const { type = 'triangle', duration = 0.1, volume = 0.1, delay = 0, slideTo } = options;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /** Papery scrabbling while rummaging through furniture. */
  public playRummage(): void {
    [0, 0.07, 0.15].forEach((delay, i) => {
      this.tone(300 + i * 90, { type: 'square', duration: 0.05, volume: 0.04, delay, slideTo: 180 });
    });
  }

  public playLootFound(): void {
    [392, 523.25, 587.33, 783.99].forEach((frequency, i) => {
      this.tone(frequency, { duration: 0.12, volume: 0.1, delay: i * 0.07 });
    });
  }

  public playSwat(): void {
    this.tone(420, { type: 'square', duration: 0.09, volume: 0.1, slideTo: 110 });
  }

  public playTrapSprung(): void {
    this.tone(620, { type: 'sawtooth', duration: 0.35, volume: 0.16, slideTo: 60 });
    this.tone(90, { type: 'square', duration: 0.25, volume: 0.1, delay: 0.05 });
  }

  public playTrapSet(): void {
    this.tone(700, { type: 'square', duration: 0.05, volume: 0.05 });
    this.tone(480, { type: 'square', duration: 0.06, volume: 0.05, delay: 0.06 });
  }

  public playTrapCleared(): void {
    this.tone(660, { type: 'sine', duration: 0.1, volume: 0.1 });
    this.tone(990, { type: 'sine', duration: 0.14, volume: 0.1, delay: 0.09 });
  }

  public playGateRefused(): void {
    this.tone(160, { type: 'square', duration: 0.14, volume: 0.08 });
    this.tone(120, { type: 'square', duration: 0.18, volume: 0.08, delay: 0.14 });
  }

  public playWin(): void {
    [523.25, 659.25, 587.33, 783.99, 1046.5].forEach((frequency, i) => {
      this.tone(frequency, { duration: 0.22, volume: 0.13, delay: i * 0.13 });
    });
  }

  public playTimeUp(): void {
    [392, 329.63, 261.63].forEach((frequency, i) => {
      this.tone(frequency, { duration: 0.32, volume: 0.12, delay: i * 0.24 });
    });
  }
}
