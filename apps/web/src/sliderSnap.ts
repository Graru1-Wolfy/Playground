export interface RigidSliderOptions {
  min?: number;
  max?: number;
  step?: number;
  onSnap?: (value: number) => void;
}

export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  const safeStep = step > 0 ? step : 1;
  const steps = Math.round((value - min) / safeStep);
  const snapped = min + steps * safeStep;
  return Math.min(max, Math.max(min, snapped));
}

export function readSliderBounds(input: HTMLInputElement): { min: number; max: number; step: number } {
  return {
    min: Number(input.min),
    max: Number(input.max),
    step: Number(input.step) || 1,
  };
}

/** Snap range input to discrete steps on every input/change. */
export function bindRigidSlider(input: HTMLInputElement, options: RigidSliderOptions = {}): void {
  const bounds = readSliderBounds(input);
  const min = options.min ?? bounds.min;
  const max = options.max ?? bounds.max;
  const step = options.step ?? bounds.step;

  const apply = (): number => {
    const snapped = snapToStep(Number(input.value), min, max, step);
    const text = formatSnappedValue(snapped, step);
    if (input.value !== text) {
      input.value = text;
    }
    options.onSnap?.(snapped);
    return snapped;
  };

  input.addEventListener("input", apply);
  input.addEventListener("change", apply);
  apply();
}

function stepDecimals(step: number): number {
  if (step >= 1) return 0;
  const text = step.toString();
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function formatSnappedValue(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  const decimals = stepDecimals(step);
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

/** Trajectory preference weights: 0 (min) → 128 (max). */
export const TRAJECTORY_WEIGHT_MIN = 0;
export const TRAJECTORY_WEIGHT_MAX = 128;
export const TRAJECTORY_WEIGHT_STEP = 1;
