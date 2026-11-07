/**
 * Core type definitions for Midnight Snackdown.
 * Pure TypeScript definitions with zero renderer/DOM dependencies.
 */

export type RaiderId = 'RUSTY' | 'SOOT';

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

/** Door target for the garden gate, which leads out of the house rather than to a room. */
export const OUTSIDE = 'outside';

export enum FurnitureType {
  FRIDGE = 'FRIDGE',
  CUPBOARD = 'CUPBOARD',
  TABLE = 'TABLE',
  BIN = 'BIN',
  HAMPER = 'HAMPER'
}

export enum LootType {
  BASKET = 'BASKET',
  PIZZA = 'PIZZA',
  CHEESE = 'CHEESE',
  HONEY = 'HONEY',
  FISH = 'FISH'
}

/** The four dishes that must be in the basket before the garden gate will open. */
export const FEAST_ITEMS: readonly LootType[] = [LootType.PIZZA, LootType.CHEESE, LootType.HONEY, LootType.FISH];

export enum TrapType {
  SNAP_TRAP = 'SNAP_TRAP',
  GLUE_PAD = 'GLUE_PAD',
  PEPPER_POOF = 'PEPPER_POOF',
  MARBLE_SPILL = 'MARBLE_SPILL',
  STATIC_MAT = 'STATIC_MAT'
}

export enum ToolType {
  OVEN_MITT = 'OVEN_MITT',
  COOKING_OIL = 'COOKING_OIL',
  CLOTHES_PEG = 'CLOTHES_PEG',
  BROOM = 'BROOM',
  RUBBER_BOOTS = 'RUBBER_BOOTS'
}

/** Traps that can be hidden in furniture. */
export const FURNITURE_TRAPS: readonly TrapType[] = [TrapType.SNAP_TRAP, TrapType.GLUE_PAD, TrapType.PEPPER_POOF];

/** Traps that can be laid at a door. */
export const DOOR_TRAPS: readonly TrapType[] = [TrapType.MARBLE_SPILL, TrapType.STATIC_MAT];

/**
 * Mapping between traps and the tool required to clear them.
 */
export const TRAP_COUNTER_MAP: Record<TrapType, ToolType> = {
  [TrapType.SNAP_TRAP]: ToolType.OVEN_MITT,
  [TrapType.GLUE_PAD]: ToolType.COOKING_OIL,
  [TrapType.PEPPER_POOF]: ToolType.CLOTHES_PEG,
  [TrapType.MARBLE_SPILL]: ToolType.BROOM,
  [TrapType.STATIC_MAT]: ToolType.RUBBER_BOOTS
};

export type RaiderActionState =
  | 'IDLE'
  | 'WALKING'
  | 'SEARCHING'
  | 'ATTACKING'
  | 'HURT'
  | 'KNOCKED_OUT'
  | 'OUT_OF_TIME';
