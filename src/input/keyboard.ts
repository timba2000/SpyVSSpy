/**
 * Keyboard Input Handler for Midnight Snackdown.
 */

import { GameEngine } from '../core/engine';
import { RaiderId, ToolType, TrapType } from '../core/types';

/** Keys are listed so that a tool on digit N clears the trap on Shift + digit N. */
const DIGIT_TRAPS: Record<string, TrapType> = {
  Digit1: TrapType.SNAP_TRAP,
  Digit2: TrapType.GLUE_PAD,
  Digit3: TrapType.PEPPER_POOF,
  Digit4: TrapType.MARBLE_SPILL,
  Digit5: TrapType.STATIC_MAT
};

const DIGIT_TOOLS: Record<string, ToolType> = {
  Digit1: ToolType.OVEN_MITT,
  Digit2: ToolType.COOKING_OIL,
  Digit3: ToolType.CLOTHES_PEG,
  Digit4: ToolType.BROOM,
  Digit5: ToolType.RUBBER_BOOTS
};

const MOVEMENT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);
const ACTION_KEYS = new Set(['Space', 'KeyE', 'KeyF', 'KeyQ']);

export class KeyboardController {
  private engine: GameEngine;
  private raider: RaiderId;
  private keysPressed: Set<string> = new Set();

  constructor(engine: GameEngine, raider: RaiderId = 'RUSTY') {
    this.engine = engine;
    this.raider = raider;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Stop the browser acting on game keys, e.g. Space pressing a focused button.
      if (MOVEMENT_KEYS.has(e.code) || ACTION_KEYS.has(e.code)) {
        e.preventDefault();
      }

      this.keysPressed.add(e.code);

      // Everything below is single-shot, so ignore the OS key auto-repeat.
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'KeyE') {
        this.engine.interactRaider(this.raider);
      } else if (e.code === 'KeyF' || e.code === 'KeyQ') {
        this.engine.attackRaider(this.raider);
      }

      if (e.shiftKey) {
        const trap = DIGIT_TRAPS[e.code];
        if (trap) this.engine.armTrap(this.raider, trap);
      } else if (e.code === 'Digit0') {
        this.engine.selectTool(this.raider, undefined);
      } else {
        const tool = DIGIT_TOOLS[e.code];
        if (tool) this.engine.selectTool(this.raider, tool);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });

    // A key released while the window is unfocused never sends keyup; without this
    // the raider would keep walking after switching away and back.
    window.addEventListener('blur', () => {
      this.keysPressed.clear();
    });
  }

  public update(): void {
    let dx = 0;
    let dy = 0;

    if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW')) dy -= 1;
    if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS')) dy += 1;
    if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) dx -= 1;
    if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      // Normalize diagonal speed
      dx *= 0.7071;
      dy *= 0.7071;
    }

    // Sent even when zero: this is how the raider learns they have stopped walking.
    this.engine.moveRaider(this.raider, dx, dy);
  }
}
