import {
  ARANGE,
  EPSILON,
  LandType,
  OFFSET,
  TICK,
  WEAPONS,
  type WeaponName,
} from "./constants.js";
import { canBounce } from "./physics.js";
import { getVelFromAngle } from "./velocity.js";

export interface BounceInput {
  vel?: number;
  crouched?: boolean;
  ceiling?: boolean;
  offs?: number;
  weapon?: WeaponName;
  double?: boolean;
  /** When true, compute angle intervals instead of using `vel`. */
  ang?: boolean | number;
  text?: string;
  setup?: string[];
  speedo?: string;
}

export interface BounceResult extends Omit<BounceInput, "ang"> {
  double: boolean;
  ang: [number, number][] | [number, number];
}

export function checkBounce(
  height: number,
  bounce: BounceInput,
  land: LandType,
  teleheight = 1,
): number {
  let offs = 0;
  if (bounce.crouched) offs -= OFFSET.crouched;
  if (bounce.ceiling) offs -= OFFSET.ceiling;
  if (bounce.offs) offs += bounce.offs;

  if (land === LandType.CROUCHED) offs += OFFSET.crouched;
  height += offs + (bounce.ceiling ? -EPSILON : EPSILON);

  const interval: [number, number] = [
    land === LandType.JUMPBUG ? Math.max(0, teleheight - 283 * TICK) : teleheight,
    2,
  ];

  const vel = bounce.vel ?? 0;
  const b = canBounce(height, vel, interval);
  if (b === 2 && land === LandType.CROUCHED) return 1;
  return b;
}

export function getBounceAngles(
  height: number,
  bounce: BounceInput,
  land: LandType,
  teleheight = 1,
): [number, number][] | [number, number] {
  const angles: [number, number][] = [];
  const l = [0, 1];
  let step = 0.01;
  let ang = ARANGE[0];

  const canBounceAtAngle = (a: number): boolean => {
    const w = bounce.weapon ?? "Stock";
    const vel = getVelFromAngle(a, !!bounce.crouched, WEAPONS[w]);
    const b = checkBounce(height, { ...bounce, vel, weapon: w }, land, teleheight);
    return bounce.double ? b === 2 : b !== 0;
  };

  let hold: number | null = null;
  const pushAngle = (a: number) => {
    const rounded = Math.round(a * 1000) / 1000;
    if (hold === null) hold = rounded;
    else {
      angles.push([hold, rounded]);
      hold = null;
    }
  };

  while (!l[0]) {
    step = 0.01;
    if (canBounceAtAngle(ang + step - 0.01)) {
      l[0] = 1;
      pushAngle(ang + 0.01);
      while (l[1]) {
        if (ang > ARANGE[1]) break;
        if (canBounceAtAngle(ang + step)) step += 0.01;
        else {
          pushAngle(ang + step - 0.01);
          l[0] = 0;
          l[1] = 0;
          ang += step;
          break;
        }
      }
    } else if (ang < ARANGE[1]) ang += 0.01;
    else break;
    if (ang <= ARANGE[1]) l[1] = 1;
    if (ang > ARANGE[1] && angles.length < 2) return [];
  }

  angles.sort((a, b) => a[0] - a[1] - (b[0] - b[1]));

  if (bounce.ang && angles.length) {
    let result = angles[0];
    const goal = bounce.ang;
    if (goal !== -1) {
      const avg = (x: [number, number]) => (x[0] + x[1]) / 2;
      result = angles.reduce((prev, curr) =>
        Math.abs(avg(curr) - (goal as number)) < Math.abs(avg(prev) - (goal as number))
          ? curr
          : prev,
      );
    }
    return result;
  }

  return angles;
}

export function getBounces(
  height: number,
  bounces: BounceInput[],
  land: LandType,
  teleheight = 1,
): BounceResult[] {
  const res: BounceResult[] = [];
  for (const bounce of bounces) {
    let b = 0;
    let ang: [number, number][] | [number, number] = [];

    if (!bounce.ang) {
      b = checkBounce(height, bounce, land, teleheight);
    } else {
      ang = getBounceAngles(height, bounce, land, teleheight);
      if (ang.length) b = 1 + (bounce.double ? 1 : 0);
    }

    if (b) {
      res.push({ ...bounce, double: b === 2, ang });
    }
  }
  return res;
}
