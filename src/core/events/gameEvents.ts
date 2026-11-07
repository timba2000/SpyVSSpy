/**
 * Strongly-typed event definitions and event emitter for core game events.
 */

import { RaiderId, TrapType, LootType, ToolType, Direction } from '../types';

export type KnockoutCause = 'TRAP' | 'COMBAT';

export interface GameEventPayloads {
  RAIDER_MOVED: { raider: RaiderId; x: number; y: number; direction: Direction };
  RAIDER_ENTERED_ROOM: { raider: RaiderId; fromRoomId: string; toRoomId: string; doorDirection: Direction };
  RAIDER_STARTED_SEARCH: { raider: RaiderId; furnitureId: string };
  RAIDER_FINISHED_SEARCH: { raider: RaiderId; furnitureId: string; lootFound?: LootType };
  LOOT_FOUND: { raider: RaiderId; item: LootType; storedInBasket: boolean };
  LOOT_DROPPED: { raider: RaiderId; item: LootType; roomId: string };
  TRAP_SET: { raider: RaiderId; trapType: TrapType; targetId: string; targetType: 'FURNITURE' | 'DOOR' };
  TRAP_SPRUNG: { victim: RaiderId; trapType: TrapType; targetId: string; planter: RaiderId };
  TRAP_CLEARED: { clearedBy: RaiderId; trapType: TrapType; targetId: string; toolUsed: ToolType };
  COMBAT_HIT: { attacker: RaiderId; target: RaiderId; damage: number; remainingHealth: number };
  RAIDER_KNOCKED_OUT: { victim: RaiderId; cause: KnockoutCause; by?: RaiderId; penaltySeconds: number };
  RAIDER_WOKE_UP: { raider: RaiderId; roomId: string; x: number; y: number };
  RAIDER_OUT_OF_TIME: { raider: RaiderId };
  GATE_REFUSED: { raider: RaiderId };
  MATCH_WON: { winner: RaiderId };
  TIME_UP: Record<string, never>;
  CLOCK_TICK: { raider: RaiderId; clockSeconds: number };
}

export type GameEventType = keyof GameEventPayloads;

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
