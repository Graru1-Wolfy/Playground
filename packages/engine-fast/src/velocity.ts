import { PLAYER } from "./constants.js";

export function getVelFromAngle(
  angle: number,
  crouched: boolean,
  weapon: readonly [number, number],
): number {
  const p = crouched ? PLAYER.crouched : PLAYER.uncrouched;
  const [y, radius] = weapon;

  const ang = (angle * Math.PI) / 180;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);

  const l2 =
    (1 / (2 * p.u * cos + 3953 * sin) ** 2) *
      (((3953 * p.view + 4000 * p.u * cos) ** 2 +
        (-2 * y * (p.view - 2000 * sin)) ** 2 +
        (-2 * p.u * (p.view - 2000 * sin)) ** 2)) -
    p.view ** 2;

  return (
    ((900 *
      p.scale *
      (1 - Math.sqrt(l2 + 1) / (2 * radius))) *
      (p.height / 2 + 9)) /
    Math.sqrt(p.height ** 2 + 4 * l2 + 36 * p.height + 324)
  );
}
