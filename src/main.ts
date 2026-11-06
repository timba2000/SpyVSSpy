/**
 * Spy vs. Spy - Main Application Entry Point
 * Orchestrates Engine, Keyboard, AI, Audio, VFX, and Simulvision Split-Screen Viewports.
 */

import { GameEngine } from './core/engine';
import { SplitScreenRenderer } from './renderer/splitScreen';
import { KeyboardController } from './input/keyboard';
import { SpyAI } from './input/ai/spyAI';
import { RetroSoundSynth } from './audio/retroSynth';
import { VisualEffects } from './renderer/visualEffects';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Failed to locate game canvas element.');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to acquire 2D rendering context.');
    return;
  }

  // Initialize Core Systems
  const engine = new GameEngine();
  const keyboard = new KeyboardController(engine);
  const ai = new SpyAI(engine);
  const audio = new RetroSoundSynth();
  const vfx = new VisualEffects();

  // Attach Audio Feedback & Visual Effects to Engine Events
  engine.events.on('SPY_STARTED_SEARCH', () => audio.playSearch());

  engine.events.on('ITEM_FOUND', (payload) => {
    audio.playItemFound();
    const spy = engine.getSpy(payload.spy);
    vfx.addItemFound(spy.x, spy.y, payload.item.replace('_', ' '));
  });

  engine.events.on('TRAP_TRIGGERED', (payload) => {
    audio.playTrapSpring();
    const victim = engine.getSpy(payload.victim);
    vfx.addExplosion(victim.x, victim.y);
  });

  engine.events.on('TRAP_DEFUSED', (payload) => {
    audio.playDefuse();
    const defuser = engine.getSpy(payload.defuser);
    vfx.addDefused(defuser.x, defuser.y);
  });

  engine.events.on('COMBAT_HIT', (payload) => {
    audio.playHit();
    const target = engine.getSpy(payload.target);
    vfx.addCombatHit(target.x, target.y);
  });

  engine.events.on('SPY_KILLED', (payload) => {
    const victim = engine.getSpy(payload.victim);
    vfx.addAngelFeathers(victim.x, victim.y);
  });

  engine.events.on('MATCH_WON', () => audio.playWin());

  // Fullscreen Toggle
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      fullscreenBtn.textContent = document.fullscreenElement ? '🗗 Exit Fullscreen' : '⛶ Fullscreen';
    });
  }

  // Fade controls hint after 6 seconds of play, reappears on hover
  const hint = document.getElementById('controls-hint');
  if (hint) {
    setTimeout(() => {
      hint.style.opacity = '0.35';
    }, 6000);
  }

  let lastTime = performance.now();
  const timeStep = 1000 / 60; // 60 updates per second
  let accumulator = 0;
  let tickCounter = 0;

  // Main 60 FPS Game Loop
  function gameLoop(currentTime: number): void {
    const delta = currentTime - lastTime;
    lastTime = currentTime;
    accumulator += Math.min(delta, 100);

    // Fixed timestep updates
    while (accumulator >= timeStep) {
      keyboard.update();
      ai.update();
      engine.tick();
      vfx.update();
      accumulator -= timeStep;
      tickCounter++;
    }

    // Render dual split-screen viewports
    SplitScreenRenderer.render(ctx!, engine, vfx, canvas.width, canvas.height, tickCounter);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
  console.log('Spy vs. Spy: Visuals upgraded, running at 60 FPS.');
});
