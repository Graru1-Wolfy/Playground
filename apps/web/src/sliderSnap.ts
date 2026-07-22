export interface RigidSliderOptions {
  min?: number;
  max?: number;
  step?: number;
  /** Live feedback while dragging (does not rewrite the thumb). */
  onInput?: (value: number) => void;
  /** Fired when the value is committed (change / pointer release). */
  onSnap?: (value: number) => void;
}

export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  const safeStep = step > 0 ? step : 1;
  const steps = Math.round((value - min) / safeStep);
  let snapped = min + steps * safeStep;
  snapped = Math.min(max, Math.max(min, snapped));
  if (safeStep < 1) {
    snapped = Number(snapped.toFixed(stepDecimals(safeStep)));
  }
  return snapped;
}

export function readSliderBounds(input: HTMLInputElement): { min: number; max: number; step: number } {
  return {
    min: Number(input.min),
    max: Number(input.max),
    step: Number(input.step) || 1,
  };
}

/** Snap range input to discrete steps; commit on change, live onInput while dragging. */
export function bindRigidSlider(input: HTMLInputElement, options: RigidSliderOptions = {}): void {
  const bounds = readSliderBounds(input);
  const min = options.min ?? bounds.min;
  const max = options.max ?? bounds.max;
  const step = options.step ?? bounds.step;

  const readSnapped = (): number => snapToStep(Number(input.value), min, max, step);

  const commit = (fireCallback: boolean): number => {
    const snapped = readSnapped();
    const text = formatSnappedValue(snapped, step);
    if (input.value !== text) {
      input.value = text;
    }
    if (fireCallback) {
      options.onSnap?.(snapped);
    }
    return snapped;
  };

  input.addEventListener("input", () => {
    options.onInput?.(readSnapped());
  });

  input.addEventListener("change", () => {
    commit(true);
  });

  commit(false);
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
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/** Trajectory preference weights: 0 (min) → 128 (max). */
export const TRAJECTORY_WEIGHT_MIN = 0;
export const TRAJECTORY_WEIGHT_MAX = 128;
export const TRAJECTORY_WEIGHT_STEP = 1;
