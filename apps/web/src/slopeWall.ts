/** Slope + wall geometry (simplified from abounce). */

export const GROUND_NORMAL_MIN = 0.7;
export const HULL_WIDTH = 48;
export const DIST_EPSILON = 0.03125;

export interface SlopeWallInput {
  verticalHeight: number;
  /** Ground slope in degrees from horizontal (0 = flat). */
  slopeDeg: number;
  hasWall: boolean;
}

export function slopeNormalZ(slopeDeg: number): number {
  return Math.cos((slopeDeg * Math.PI) / 180);
}

export function isSlopeStandable(slopeDeg: number): boolean {
  return slopeDeg <= 0.001 || slopeNormalZ(slopeDeg) >= GROUND_NORMAL_MIN;
}

/** abounce-style GetWallZ for horizontal floor plane at `floorZ` against a vertical wall. */
export function getWallZ(floorZ: number, groundNz: number, wallDist: number): number {
  if (groundNz >= 0.999) return floorZ;
  const wallNormalX = Math.sqrt(Math.max(0, 1 - groundNz * groundNz));
  const surfaceNorm0 = wallNormalX;
  const surfaceNorm1 = groundNz;
  const len = Math.hypot(surfaceNorm0, surfaceNorm1);
  const n0 = surfaceNorm0 / len;
  const n1 = surfaceNorm1 / len;
  return (n0 / n1) * (floorZ / n0 - wallDist);
}

/**
 * Effective vertical bounce height on sloped ground, optionally with artificial wall at ground point.
 * Mirrors abounce trigger/floor height scaling along `ground.normal[2]`.
 */
export function effectiveBounceHeight(input: SlopeWallInput): number | null {
  const { verticalHeight, slopeDeg, hasWall } = input;
  if (!isSlopeStandable(slopeDeg)) return null;

  const nz = slopeNormalZ(slopeDeg);
  if (nz >= 0.999) return verticalHeight;

  const groundZ = 0;
  const floorZ = groundZ + verticalHeight + DIST_EPSILON;

  let bounceZ: number;
  if (hasWall) {
    const wallDist = -HULL_WIDTH / 2;
    bounceZ = getWallZ(floorZ, nz, wallDist);
    if (!Number.isFinite(bounceZ)) return null;
  } else {
    bounceZ = groundZ;
  }

  let height = floorZ - bounceZ;
  if (height < 0) return null;
  return height;
}

export function slopeWallSummary(input: SlopeWallInput, effective: number | null): string {
  if (!isSlopeStandable(input.slopeDeg)) {
    return `Ground slope ${Math.round(input.slopeDeg)}° — too steep to stand`;
  }
  if (effective === null) {
    return "No valid bounce height for this slope/wall combo";
  }
  const parts = [`Effective height: ${effective.toFixed(1)} ft`];
  if (input.slopeDeg > 0.5) parts.push(`slope ${Math.round(input.slopeDeg)}°`);
  if (input.hasWall) parts.push("wall");
  return parts.join(" · ");
}
