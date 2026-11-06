/**
 * Keyboard Input Handler for Spy vs. Spy.
 */

import { GameEngine } from '../core/engine';
import { CounterItemType, TrapType } from '../core/types';

export class KeyboardController {
  private engine: GameEngine;
  private keysPressed: Set<string> = new Set();

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysPressed.add(e.code);

      // Single-shot action keys
      if (e.code === 'Space' || e.code === 'KeyE') {
        this.engine.interactSpy('WHITE');
      } else if (e.code === 'KeyF' || e.code === 'KeyQ') {
        this.engine.attackSpy('WHITE');
      }

      // Trap planting (Shift + Digit)
      if (e.shiftKey) {
        if (e.code === 'Digit1') this.engine.armTrap('WHITE', TrapType.BOMB);
        if (e.code === 'Digit2') this.engine.armTrap('WHITE', TrapType.SPRING);
        if (e.code === 'Digit3') this.engine.armTrap('WHITE', TrapType.DYNAMITE);
        if (e.code === 'Digit4') this.engine.armTrap('WHITE', TrapType.ACID_BUCKET);
        if (e.code === 'Digit5') this.engine.armTrap('WHITE', TrapType.ELECTROCUTION);
      } else {
        // Tool selection (Digit)
        if (e.code === 'Digit1') this.engine.selectTool('WHITE', CounterItemType.WATER_BUCKET);
        if (e.code === 'Digit2') this.engine.selectTool('WHITE', CounterItemType.COAT_HANGER);
        if (e.code === 'Digit3') this.engine.selectTool('WHITE', CounterItemType.WIRE_CUTTERS);
        if (e.code === 'Digit4') this.engine.selectTool('WHITE', CounterItemType.UMBRELLA);
        if (e.code === 'Digit5') this.engine.selectTool('WHITE', CounterItemType.RUBBER_GLOVES);
        if (e.code === 'Digit0') this.engine.selectTool('WHITE', undefined);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
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

    if (dx !== 0 || dy !== 0) {
      this.engine.moveSpy('WHITE', dx, dy);
    }
  }
}
