/**
 * Strongly-typed event definitions and event emitter for core game events.
 */

import { SpyColor, TrapType, SecretItemType, CounterItemType, Direction } from '../types';

export type GameEventType =
  | 'SPY_MOVED'
  | 'SPY_ENTERED_ROOM'
  | 'SPY_STARTED_SEARCH'
  | 'SPY_FINISHED_SEARCH'
  | 'ITEM_FOUND'
  | 'ITEM_DROPPED'
  | 'TRAP_ARMED'
  | 'TRAP_TRIGGERED'
  | 'TRAP_DEFUSED'
  | 'COMBAT_HIT'
  | 'SPY_KILLED'
  | 'SPY_RESPAWNED'
  | 'MATCH_WON'
  | 'TIME_UP'
  | 'CLOCK_TICK';

export interface GameEventPayloads {
  SPY_MOVED: { spy: SpyColor; x: number; y: number; direction: Direction };
  SPY_ENTERED_ROOM: { spy: SpyColor; fromRoomId: string; toRoomId: string; doorDirection: Direction };
  SPY_STARTED_SEARCH: { spy: SpyColor; furnitureId: string };
  SPY_FINISHED_SEARCH: { spy: SpyColor; furnitureId: string; itemFound?: SecretItemType };
  ITEM_FOUND: { spy: SpyColor; item: SecretItemType; storedInBriefcase: boolean };
  ITEM_DROPPED: { spy: SpyColor; item: SecretItemType; roomId: string };
  TRAP_ARMED: { spy: SpyColor; trapType: TrapType; targetId: string; targetType: 'FURNITURE' | 'DOOR' };
  TRAP_TRIGGERED: { victim: SpyColor; trapType: TrapType; targetId: string; planter: SpyColor };
  TRAP_DEFUSED: { defuser: SpyColor; trapType: TrapType; targetId: string; toolUsed: CounterItemType };
  COMBAT_HIT: { attacker: SpyColor; target: SpyColor; damage: number; remainingHealth: number };
  SPY_KILLED: { victim: SpyColor; cause: 'TRAP' | 'COMBAT'; killer?: SpyColor; penaltySeconds: number };
  SPY_RESPAWNED: { spy: SpyColor; roomId: string; x: number; y: number };
  MATCH_WON: { winner: SpyColor; reason: 'AIRPORT_ESCAPE' | 'TIME_ADVANTAGE' };
  TIME_UP: { winner?: SpyColor; isTie: boolean };
  CLOCK_TICK: { remainingSeconds: number };
}

export type GameEventListener<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;

export class GameEventEmitter {
  private listeners: Map<GameEventType, Set<GameEventListener<any>>> = new Map();

  public on<T extends GameEventType>(event: T, listener: GameEventListener<T>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => this.off(event, listener);
  }

  public off<T extends GameEventType>(event: T, listener: GameEventListener<T>): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit<T extends GameEventType>(event: T, payload: GameEventPayloads[T]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(payload);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
