/** TF2 tick and movement constants (bcheck parity). */
export const TICK = 0.015;
export const GRAVITY = -800.0;
export const TICKGRAV = TICK * GRAVITY;
export const MAXVEL = 3500.0;
export const EPSILON = 0.03125;

export const OFFSET = {
  crouched: 20,
  ceiling: 82,
} as const;

/** Double-bhop fractional landing window. */
export const DRANGE: readonly [number, number] = [0.705078, 0.999999];

/** Pitch sweep range for angle-based lookups (degrees). */
export const ARANGE: readonly [number, number] = [40, 89];

export const PLAYER = {
  uncrouched: { height: 82, view: 68, u: -3, scale: 1 },
  crouched: { height: 62, view: 45, u: 8, scale: 82 / 55 },
} as const;

export type WeaponName = keyof typeof WEAPONS;

/** Launcher [right offset, RJ radius]. */
export const WEAPONS = {
  Stock: [12, 121] as const,
  Original: [0, 121] as const,
  Mangler: [8, 121] as const,
  "Mangler Charged": [8, 160.9299926757812] as const,
};

export enum LandType {
  UNCROUCHED = 0,
  CROUCHED = 1,
  JUMPBUG = 2,
}
