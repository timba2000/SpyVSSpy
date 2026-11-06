/**
 * Core type definitions for Spy vs. Spy.
 * Pure TypeScript definitions with zero renderer/DOM dependencies.
 */

export type SpyColor = 'WHITE' | 'BLACK';

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

export enum FurnitureType {
  SAFE = 'SAFE',
  DESK = 'DESK',
  PAINTING = 'PAINTING',
  COAT_RACK = 'COAT_RACK',
  CABINET = 'CABINET'
}

export enum SecretItemType {
  BRIEFCASE = 'BRIEFCASE',
  PASSPORT = 'PASSPORT',
  SECRET_PLANS = 'SECRET_PLANS',
  MONEY = 'MONEY',
  KEY = 'KEY'
}

export enum TrapType {
  BOMB = 'BOMB',
  SPRING = 'SPRING',
  DYNAMITE = 'DYNAMITE',
  ACID_BUCKET = 'ACID_BUCKET',
  ELECTROCUTION = 'ELECTROCUTION'
}

export enum CounterItemType {
  WATER_BUCKET = 'WATER_BUCKET',
  COAT_HANGER = 'COAT_HANGER',
  WIRE_CUTTERS = 'WIRE_CUTTERS',
  UMBRELLA = 'UMBRELLA',
  RUBBER_GLOVES = 'RUBBER_GLOVES'
}

/**
 * Mapping between traps and the tool required to defuse them.
 */
export const TRAP_COUNTER_MAP: Record<TrapType, CounterItemType> = {
  [TrapType.BOMB]: CounterItemType.WATER_BUCKET,
  [TrapType.SPRING]: CounterItemType.COAT_HANGER,
  [TrapType.DYNAMITE]: CounterItemType.WIRE_CUTTERS,
  [TrapType.ACID_BUCKET]: CounterItemType.UMBRELLA,
  [TrapType.ELECTROCUTION]: CounterItemType.RUBBER_GLOVES
};

export interface Furniture {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  heldItem?: SecretItemType;
  armedTrap?: {
    type: TrapType;
    plantedBy: SpyColor;
  };
}

export interface Door {
  id: string;
  direction: Direction;
  targetRoomId: string;
  armedTrap?: {
    type: TrapType.ACID_BUCKET | TrapType.ELECTROCUTION;
    plantedBy: SpyColor;
  };
}

export interface Room {
  id: string;
  name: string;
  doors: Door[];
  furniture: Furniture[];
  isAirportExit?: boolean;
}

export interface SpyInventory {
  hasBriefcase: boolean;
  collectedItems: Set<SecretItemType>;
  activeTool?: CounterItemType;
  trapsAvailable: Record<TrapType, number>;
}

export type SpyActionState =
  | 'IDLE'
  | 'WALKING'
  | 'SEARCHING'
  | 'ATTACKING'
  | 'HURT'
  | 'DEAD_ANGEL';

export interface SpyState {
  color: SpyColor;
  currentRoomId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: SpyActionState;
  inventory: SpyInventory;
  respawnTimer: number;
}
