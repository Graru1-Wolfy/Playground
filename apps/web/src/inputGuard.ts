import { CEILING_GAP_MIN, CEILING_GAP_MAX, type BounceContext } from "./bounceEnv.js";
import { normalizeHeight } from "./height.js";

export interface ComputeGuardResult {
  valid: boolean;
  message: string;
  height?: number;
  rawHeight?: number;
}

function parseHeight(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: false, message: "Enter a target height to compute." };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, message: "Height must be a valid number." };
  }
  if (value < 0) {
    return { ok: false, message: "Height cannot be negative." };
  }
  return { ok: true, value };
}

function validateCeiling(ctx: BounceContext): string | null {
  if (ctx.ceilingGap === null) return null;
  if (!Number.isFinite(ctx.ceilingGap)) {
    return "Ceiling gap must be a valid number.";
  }
  if (ctx.ceilingGap < CEILING_GAP_MIN || ctx.ceilingGap > CEILING_GAP_MAX) {
    return `Ceiling gap must be ${CEILING_GAP_MIN}–${CEILING_GAP_MAX} ft.`;
  }
  return null;
}

/** Validate all inputs required before running a full compute pass. */
export function guardComputeInput(rawHeight: string, ctx: BounceContext): ComputeGuardResult {
  const parsed = parseHeight(rawHeight);
  if (!parsed.ok) {
    return { valid: false, message: parsed.message };
  }

  const ceilingError = validateCeiling(ctx);
  if (ceilingError) {
    return { valid: false, message: ceilingError };
  }

  try {
    const height = normalizeHeight(parsed.value);
    return {
      valid: true,
      message: "",
      height,
      rawHeight: parsed.value,
    };
  } catch {
    return { valid: false, message: "Could not normalize height." };
  }
}
