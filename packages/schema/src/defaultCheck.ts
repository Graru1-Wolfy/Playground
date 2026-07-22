import {
  checkBounce,
  LandType,
  type BounceInput,
} from "@playground/engine-fast";

const DEFAULT_TYPES: { label: string; bounce: BounceInput }[] = [
  { label: "Walk", bounce: { vel: -6, text: "Walk" } },
  { label: "Crouch Walk", bounce: { vel: -6, crouched: true, text: "Crouch Walk" } },
  { label: "Jump", bounce: { vel: 283, text: "Jump" } },
  { label: "Crouch Jump", bounce: { vel: 289, text: "Crouch Jump" } },
  { label: "Ctap", bounce: { vel: 289, crouched: true, text: "Ctap" } },
  { label: "Ceilingsmash", bounce: { vel: -6, ceiling: true, text: "Ceilingsmash" } },
];

export interface DefaultCheckRow {
  label: string;
  uncrouched: number;
  crouched: number;
  jumpbug: number;
}

export interface BounceCheckOptions {
  teleheight?: number;
  ceilingGap?: number | null;
}

export function runDefaultChecks(height: number, options: BounceCheckOptions = {}): DefaultCheckRow[] {
  const teleheight = options.teleheight ?? 1;
  const ceilingGap = options.ceilingGap ?? null;

  return DEFAULT_TYPES.map(({ label, bounce }) => {
    const checkHeight =
      bounce.ceiling && ceilingGap !== null ? ceilingGap : height;
    return {
      label,
      uncrouched: checkBounce(checkHeight, bounce, LandType.UNCROUCHED, teleheight),
      crouched: checkBounce(checkHeight, bounce, LandType.CROUCHED, teleheight),
      jumpbug: checkBounce(checkHeight, bounce, LandType.JUMPBUG, teleheight),
    };
  });
}
