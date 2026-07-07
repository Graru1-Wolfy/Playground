import { DRANGE, GRAVITY, MAXVEL, TICK, TICKGRAV } from "./constants.js";

export function getMaxVelTickFromStartZVel(vel: number): number {
  return Math.ceil(-(vel + MAXVEL) / TICKGRAV);
}

export function getZFromTick(vel: number, tick: number, height: number): number {
  const maxveltick = getMaxVelTickFromStartZVel(vel);
  const tick0 = tick < maxveltick ? tick : maxveltick - 1;
  let z = height + 0.5 * TICKGRAV * TICK * tick0 * tick0 + vel * TICK * tick0;
  if (tick >= maxveltick) {
    z -= MAXVEL * TICK * (tick - tick0);
  }
  return z;
}

export function getValidHeight(vel: number, height: number): number {
  const ticktop = Math.ceil(-vel / TICKGRAV);
  const maxzrel = ticktop >= 0 ? getZFromTick(vel, ticktop, 0) : 0.0;
  return Math.max(height, -maxzrel);
}

export function getLandTickFromStartZVel(height: number, vel: number): number {
  let tick0 = getMaxVelTickFromStartZVel(vel) - 1;
  if (tick0 === -1) tick0 = 0;
  const z0 = getZFromTick(vel, tick0, height);
  if (z0 <= 0.0) {
    return -(vel + Math.sqrt(vel * vel - 2.0 * GRAVITY * height)) / TICKGRAV;
  }
  return (
    height / (MAXVEL * TICK) +
    (1 + vel / MAXVEL) * tick0 +
    (0.5 * TICKGRAV / MAXVEL) * tick0 * tick0
  );
}

/** @returns 0 = no bounce, 1 = bounce, 2 = double bounce */
export function canBounce(
  height: number,
  vel: number,
  interval: readonly [number, number],
): number {
  const heightmax = getValidHeight(vel, height - interval[0]);
  const heightmin = getValidHeight(vel, height - interval[1]);

  const tickmax = Math.floor(getLandTickFromStartZVel(heightmax, vel));
  const tickmin = Math.ceil(getLandTickFromStartZVel(heightmin, vel));

  const b =
    (height - interval[0] >= heightmax || height - interval[1] >= heightmin) &&
    tickmax - tickmin >= 0.0;

  if (b) {
    const raw = -getZFromTick(vel, tickmin, 0) % 1;
    if (raw >= DRANGE[0] && raw <= DRANGE[1]) return 2;
  }
  return Number(b);
}
