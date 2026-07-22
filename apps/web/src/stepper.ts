import { snapToStep } from "./sliderSnap.js";

export interface StepperOptions {
  input: HTMLInputElement;
  decBtn: HTMLButtonElement;
  incBtn: HTMLButtonElement;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  readValue?: () => number;
  writeValue?: (value: number) => void;
  /** Live feedback on each step (including repeat). */
  onInput?: (value: number) => void;
  /** Fired when stepping stops (mouseup / touchend / single click). */
  onChange?: (value: number) => void;
  isDisabled?: () => boolean;
}

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 80;

export function stepValue(current: number, delta: number, min: number, max: number, step: number): number {
  return snapToStep(current + delta, min, max, step);
}

export function formatStepperValue(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  const decimals = step.toString().includes(".") ? step.toString().split(".")[1]!.length : 0;
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}

export function bindStepper(options: StepperOptions): () => void {
  const { input, decBtn, incBtn, min, max, step } = options;
  const format = options.format ?? ((value) => formatStepperValue(value, step));

  const read = (): number => {
    const raw = options.readValue?.() ?? Number(input.value);
    return snapToStep(raw, min, max, step);
  };

  const write = (value: number): void => {
    const snapped = snapToStep(value, min, max, step);
    if (options.writeValue) {
      options.writeValue(snapped);
    } else {
      input.value = format(snapped);
    }
  };

  const refreshButtons = (): void => {
    const disabled = options.isDisabled?.() ?? false;
    const value = read();
    decBtn.disabled = disabled || value <= min;
    incBtn.disabled = disabled || value >= max;
  };

  const apply = (value: number, commit: boolean): number => {
    const snapped = snapToStep(value, min, max, step);
    write(snapped);
    options.onInput?.(snapped);
    refreshButtons();
    if (commit) {
      options.onChange?.(snapped);
    }
    return snapped;
  };

  let repeatTimer: ReturnType<typeof setTimeout> | null = null;
  let repeatInterval: ReturnType<typeof setInterval> | null = null;

  const clearRepeat = (): void => {
    if (repeatTimer !== null) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
    if (repeatInterval !== null) {
      clearInterval(repeatInterval);
      repeatInterval = null;
    }
  };

  const bindHold = (btn: HTMLButtonElement, delta: number): void => {
    const stepOnce = (commit: boolean): void => {
      if (options.isDisabled?.()) return;
      apply(read() + delta, commit);
    };

    let committedOnUp = false;
    let startX = 0;
    let startY = 0;
    let moved = false;

    const startRepeat = (clientX: number, clientY: number): void => {
      if (btn.disabled) return;
      committedOnUp = false;
      moved = false;
      startX = clientX;
      startY = clientY;
      stepOnce(false);
      repeatTimer = setTimeout(() => {
        if (moved) return;
        repeatInterval = setInterval(() => stepOnce(false), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    };

    btn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      startRepeat(event.clientX, event.clientY);
    });

    btn.addEventListener("pointermove", (event) => {
      if (repeatTimer === null && repeatInterval === null) return;
      const dx = Math.abs(event.clientX - startX);
      const dy = Math.abs(event.clientY - startY);
      if (dx > 8 || dy > 8) {
        moved = true;
        clearRepeat();
      }
    });

    const stopRepeat = (): void => {
      if (moved) {
        clearRepeat();
        return;
      }
      if (repeatTimer !== null || repeatInterval !== null) {
        apply(read(), true);
        committedOnUp = true;
      }
      clearRepeat();
    };

    btn.addEventListener("pointerup", stopRepeat);
    btn.addEventListener("pointerleave", stopRepeat);
    btn.addEventListener("pointercancel", stopRepeat);

    btn.addEventListener("click", (event) => {
      if (committedOnUp) {
        committedOnUp = false;
        return;
      }
      if (moved) return;
      event.preventDefault();
      stepOnce(true);
    });
  };

  bindHold(decBtn, -step);
  bindHold(incBtn, step);

  apply(read(), false);

  return () => {
    clearRepeat();
  };
}

const CHEVRON_LEFT = `<svg class="icon stepper-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHEVRON_RIGHT = `<svg class="icon stepper-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export interface CreateStepperOptions {
  id?: string;
  className?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  inputId: string;
  decLabel: string;
  incLabel: string;
  hidden?: boolean;
}

export function createStepperElement(options: CreateStepperOptions): {
  root: HTMLElement;
  input: HTMLInputElement;
  decBtn: HTMLButtonElement;
  incBtn: HTMLButtonElement;
} {
  const root = document.createElement("div");
  root.className = `stepper${options.className ? ` ${options.className}` : ""}`;
  if (options.id) root.id = options.id;

  const decBtn = document.createElement("button");
  decBtn.type = "button";
  decBtn.className = "stepper-btn stepper-dec";
  decBtn.setAttribute("aria-label", options.decLabel);
  decBtn.innerHTML = CHEVRON_LEFT;

  const incBtn = document.createElement("button");
  incBtn.type = "button";
  incBtn.className = "stepper-btn stepper-inc";
  incBtn.setAttribute("aria-label", options.incLabel);
  incBtn.innerHTML = CHEVRON_RIGHT;

  const input = document.createElement("input");
  input.id = options.inputId;
  input.type = options.hidden === false ? "number" : "hidden";
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  input.value = formatStepperValue(options.value, options.step);
  if (input.type === "hidden") {
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
  }

  root.append(decBtn, incBtn, input);
  return { root, input, decBtn, incBtn };
}
