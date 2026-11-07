/**
 * Midnight Snackdown - Main Application Entry Point
 * Orchestrates Engine, Keyboard, AI, Audio, VFX, and the Split-Screen Renderer.
 */

import { GameEngine } from './core/engine';
import { SplitScreenRenderer } from './renderer/splitScreen';
import { KeyboardController } from './input/keyboard';
import { RivalAI } from './input/ai/rivalAI';
import { GameAudio } from './audio/gameAudio';
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
  const keyboard = new KeyboardController(engine, 'RUSTY');
  const ai = new RivalAI(engine, 'SOOT');
  const audio = new GameAudio();
  const vfx = new VisualEffects();

  // Sound needs a user gesture; the game-over screen restarts on a fresh Space press.
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (engine.isGameOver && e.code === 'Space' && !e.repeat) {
      window.location.reload();
    }
  });
  window.addEventListener('pointerdown', () => audio.unlock());

  // Attach Audio Feedback & Visual Effects to Engine Events
  engine.events.on('RAIDER_STARTED_SEARCH', () => audio.playRummage());

  engine.events.on('LOOT_FOUND', (payload) => {
    audio.playLootFound();
    const raider = engine.getRaider(payload.raider);
    vfx.addLootFound(raider.currentRoomId, raider.x, raider.y, payload.item);
  });

  engine.events.on('TRAP_SET', () => audio.playTrapSet());

  engine.events.on('TRAP_SPRUNG', (payload) => {
    audio.playTrapSprung();
    const victim = engine.getRaider(payload.victim);
    vfx.addTrapSprung(victim.currentRoomId, victim.x, victim.y, payload.trapType);
  });

  engine.events.on('TRAP_CLEARED', (payload) => {
    audio.playTrapCleared();
    const raider = engine.getRaider(payload.clearedBy);
    vfx.addTrapCleared(raider.currentRoomId, raider.x, raider.y);
  });

  engine.events.on('COMBAT_HIT', (payload) => {
    audio.playSwat();
    const target = engine.getRaider(payload.target);
    vfx.addSwatHit(target.currentRoomId, target.x, target.y);
  });

  engine.events.on('RAIDER_KNOCKED_OUT', (payload) => {
    const victim = engine.getRaider(payload.victim);
    vfx.addKnockout(victim.currentRoomId, victim.x, victim.y);
  });

  engine.events.on('GATE_REFUSED', (payload) => {
    audio.playGateRefused();
    const raider = engine.getRaider(payload.raider);
    vfx.addGateRefused(raider.currentRoomId, raider.x, raider.y);
  });

  engine.events.on('MATCH_WON', () => audio.playWin());
  engine.events.on('TIME_UP', () => audio.playTimeUp());

  // Fullscreen Toggle
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      // Give focus back to the game so Space searches rather than re-pressing this button.
      fullscreenBtn.blur();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      fullscreenBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
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

    SplitScreenRenderer.render(ctx!, engine, vfx, canvas.width, canvas.height, tickCounter);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
