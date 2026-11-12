/**
 * Midnight Snackdown - Main Application Entry Point
 * Orchestrates Engine, Keyboard, AI, Audio, VFX, 3D Split-Screen Renderer,
 * and the Interactive Instructions & Options Modal.
 */

import { GameEngine } from './core/engine';
import { SplitScreenRenderer } from './renderer/splitScreen';
import { KeyboardController } from './input/keyboard';
import { RivalAI } from './input/ai/rivalAI';
import { GameAudio } from './audio/gameAudio';
import { VisualEffects } from './renderer/visualEffects';
import { render3DSettings } from './renderer/render3d';

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

  let matchDurationSeconds = 180;
  let engine = new GameEngine({ matchDurationSeconds });
  const keyboard = new KeyboardController(engine, 'RUSTY');
  let ai = new RivalAI(engine, 'SOOT');
  const audio = new GameAudio();
  let vfx = new VisualEffects();
  let isPaused = false;

  function bindEngineEvents(activeEngine: GameEngine): void {
    activeEngine.events.on('RAIDER_STARTED_SEARCH', () => audio.playRummage());

    activeEngine.events.on('LOOT_FOUND', (payload) => {
      audio.playLootFound();
      const raider = activeEngine.getRaider(payload.raider);
      vfx.addLootFound(raider.currentRoomId, raider.x, raider.y, payload.item);
    });

    activeEngine.events.on('TRAP_SET', () => audio.playTrapSet());

    activeEngine.events.on('TRAP_SPRUNG', (payload) => {
      audio.playTrapSprung();
      const victim = activeEngine.getRaider(payload.victim);
      vfx.addTrapSprung(victim.currentRoomId, victim.x, victim.y, payload.trapType);
    });

    activeEngine.events.on('TRAP_CLEARED', (payload) => {
      audio.playTrapCleared();
      const raider = activeEngine.getRaider(payload.clearedBy);
      vfx.addTrapCleared(raider.currentRoomId, raider.x, raider.y);
    });

    activeEngine.events.on('COMBAT_HIT', (payload) => {
      audio.playSwat();
      const target = activeEngine.getRaider(payload.target);
      vfx.addSwatHit(target.currentRoomId, target.x, target.y);
    });

    activeEngine.events.on('RAIDER_KNOCKED_OUT', (payload) => {
      const victim = activeEngine.getRaider(payload.victim);
      vfx.addKnockout(victim.currentRoomId, victim.x, victim.y);
    });

    activeEngine.events.on('GATE_REFUSED', (payload) => {
      audio.playGateRefused();
      const raider = activeEngine.getRaider(payload.raider);
      vfx.addGateRefused(raider.currentRoomId, raider.x, raider.y);
    });

    activeEngine.events.on('MATCH_WON', () => audio.playWin());
    activeEngine.events.on('TIME_UP', () => audio.playTimeUp());
  }

  bindEngineEvents(engine);

  function startNewRaid(): void {
    engine = new GameEngine({ matchDurationSeconds });
    ai = new RivalAI(engine, 'SOOT');
    vfx = new VisualEffects();
    keyboard.setEngine(engine);
    bindEngineEvents(engine);
  }

  // --- Instructions & Options Modal Controller ---
  const modalOverlay = document.getElementById('modal-overlay');
  const instructionsBtn = document.getElementById('instructions-btn');
  const optionsBtn = document.getElementById('options-btn');
  const tabBtnInstructions = document.getElementById('tab-btn-instructions');
  const tabBtnOptions = document.getElementById('tab-btn-options');
  const panelInstructions = document.getElementById('panel-instructions');
  const panelOptions = document.getElementById('panel-options');
  const closeBtn = document.getElementById('modal-close-btn');
  const resumeFooterBtn = document.getElementById('modal-resume-footer-btn');

  function switchTab(tab: 'instructions' | 'options'): void {
    const isInst = tab === 'instructions';
    tabBtnInstructions?.classList.toggle('active', isInst);
    tabBtnOptions?.classList.toggle('active', !isInst);
    panelInstructions?.classList.toggle('active', isInst);
    panelOptions?.classList.toggle('active', !isInst);
  }

  function openModal(tab: 'instructions' | 'options'): void {
    switchTab(tab);
    modalOverlay?.classList.add('open');
    isPaused = true;
    keyboard.setEnabled(false);
  }

  function closeModal(): void {
    modalOverlay?.classList.remove('open');
    isPaused = false;
    keyboard.setEnabled(true);
  }

  instructionsBtn?.addEventListener('click', () => {
    instructionsBtn.blur();
    if (modalOverlay?.classList.contains('open') && panelInstructions?.classList.contains('active')) {
      closeModal();
    } else {
      openModal('instructions');
    }
  });

  optionsBtn?.addEventListener('click', () => {
    optionsBtn.blur();
    if (modalOverlay?.classList.contains('open') && panelOptions?.classList.contains('active')) {
      closeModal();
    } else {
      openModal('options');
    }
  });

  tabBtnInstructions?.addEventListener('click', () => switchTab('instructions'));
  tabBtnOptions?.addEventListener('click', () => switchTab('options'));
  closeBtn?.addEventListener('click', closeModal);
  resumeFooterBtn?.addEventListener('click', closeModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // --- Wire Options Controls ---
  const soundEnabledInput = document.getElementById('opt-sound-enabled') as HTMLInputElement | null;
  const volumeInput = document.getElementById('opt-volume') as HTMLInputElement | null;
  const volumeLabel = document.getElementById('opt-volume-label');
  const testSoundBtn = document.getElementById('opt-test-sound');
  const moonlightInput = document.getElementById('opt-moonlight') as HTMLInputElement | null;
  const shadowsInput = document.getElementById('opt-shadows') as HTMLInputElement | null;
  const depthScaleSelect = document.getElementById('opt-depth-scale') as HTMLSelectElement | null;
  const showHintInput = document.getElementById('opt-show-hint') as HTMLInputElement | null;
  const matchDurationSelect = document.getElementById('opt-match-duration') as HTMLSelectElement | null;
  const newRaidBtn = document.getElementById('opt-new-raid-btn');
  const hint = document.getElementById('controls-hint');

  soundEnabledInput?.addEventListener('change', () => {
    audio.muted = !soundEnabledInput.checked;
  });

  volumeInput?.addEventListener('input', () => {
    const val = Number(volumeInput.value);
    audio.masterVolume = val / 100;
    if (volumeLabel) volumeLabel.textContent = `${val}%`;
  });

  testSoundBtn?.addEventListener('click', () => {
    audio.unlock();
    audio.playLootFound();
  });

  moonlightInput?.addEventListener('change', () => {
    render3DSettings.moonlightRays = moonlightInput.checked;
  });

  shadowsInput?.addEventListener('change', () => {
    render3DSettings.shadowsAndReflections = shadowsInput.checked;
  });

  depthScaleSelect?.addEventListener('change', () => {
    render3DSettings.depthScale = Number(depthScaleSelect.value) || 1.0;
  });

  showHintInput?.addEventListener('change', () => {
    if (hint) {
      hint.style.display = showHintInput.checked ? 'block' : 'none';
    }
  });

  matchDurationSelect?.addEventListener('change', () => {
    matchDurationSeconds = Number(matchDurationSelect.value) || 180;
  });

  newRaidBtn?.addEventListener('click', () => {
    startNewRaid();
    closeModal();
  });

  // Global keyboard shortcuts for audio unlock, game-over restart, and Instructions/Options modal
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (e.repeat) return;

    if (e.code === 'Escape') {
      if (modalOverlay?.classList.contains('open')) {
        closeModal();
      } else {
        openModal('options');
      }
      return;
    }

    if (e.code === 'KeyI' || e.code === 'KeyH') {
      if (modalOverlay?.classList.contains('open') && panelInstructions?.classList.contains('active')) {
        closeModal();
      } else {
        openModal('instructions');
      }
      return;
    }

    if (e.code === 'KeyO') {
      if (modalOverlay?.classList.contains('open') && panelOptions?.classList.contains('active')) {
        closeModal();
      } else {
        openModal('options');
      }
      return;
    }

    if (!isPaused && engine.isGameOver && e.code === 'Space') {
      startNewRaid();
    }
  });

  window.addEventListener('pointerdown', () => audio.unlock());

  // Fullscreen Toggle
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      fullscreenBtn.blur();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      fullscreenBtn.textContent = document.fullscreenElement ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
    });
  }

  // Fade controls hint after 6 seconds of play, reappears on hover
  if (hint) {
    setTimeout(() => {
      hint.style.opacity = '0.4';
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

    if (!isPaused) {
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
    }

    SplitScreenRenderer.render(ctx!, engine, vfx, canvas.width, canvas.height, tickCounter);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
});
