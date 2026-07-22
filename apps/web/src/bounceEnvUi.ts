import {
  CEILING_GAP_MAX,
  CEILING_GAP_MIN,
  clampCeiling,
  clampTele,
  formatTeleheight,
  loadBounceContext,
  saveBounceContext,
  TELEHEIGHT_MAX,
  TELEHEIGHT_MIN,
  TELEHEIGHT_STEP,
  type BounceContext,
} from "./bounceEnv.js";
import { bindRigidSlider } from "./sliderSnap.js";
import { el } from "./ui.js";
import { bindStepper } from "./stepper.js";
import { syncEnvCompactSummary } from "./envSummary.js";

function ceilingEnabled(): boolean {
  return el<HTMLInputElement>("ceiling-slider").disabled === false;
}

export function readBounceContextFromDom(): BounceContext {
  const teleheight = clampTele(Number(el<HTMLInputElement>("teleport-slider").value));
  const ceilingGap = ceilingEnabled()
    ? clampCeiling(Number(el<HTMLInputElement>("ceiling-slider").value))
    : null;
  return { teleheight, ceilingGap };
}

export function syncBounceContextToDom(ctx = loadBounceContext()): void {
  const teleSlider = el<HTMLInputElement>("teleport-slider");
  teleSlider.value = formatTeleheight(ctx.teleheight);
  syncTeleportDisplay(ctx.teleheight);

  const ceilingSlider = el<HTMLInputElement>("ceiling-slider");
  const enabled = ctx.ceilingGap !== null;
  const gap = ctx.ceilingGap ?? 82;
  ceilingSlider.disabled = !enabled;
  ceilingSlider.value = String(gap);
  syncCeilingDisplay(gap, enabled);

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-tele]")) {
    btn.classList.toggle("chip-active", Number(btn.dataset.tele) === ctx.teleheight);
  }
  syncCeilingChips(gap, enabled);
  refreshEnvSummary();
}

export function syncTeleportDisplay(value: number): void {
  const text = formatTeleheight(value);
  el<HTMLOutputElement>("teleport-display").textContent = text;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-tele]")) {
    btn.classList.toggle("chip-active", Number(btn.dataset.tele) === value);
  }
  refreshEnvSummary();
}

function syncCeilingChips(value: number, enabled: boolean): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-ceiling]")) {
    const off = btn.dataset.ceiling === "off";
    btn.disabled = !enabled && !off;
    if (off) {
      btn.classList.toggle("chip-active", !enabled);
    } else {
      btn.disabled = !enabled;
      btn.classList.toggle("chip-active", enabled && Number(btn.dataset.ceiling) === value);
    }
  }
}

export function syncCeilingDisplay(value: number, enabled: boolean): void {
  el<HTMLOutputElement>("ceiling-display").textContent = enabled ? String(value) : "off";
  el<HTMLInputElement>("ceiling-slider").disabled = !enabled;
  syncCeilingChips(value, enabled);
  refreshEnvSummary();
}

function refreshEnvSummary(): void {
  const height = Number(el<HTMLSpanElement>("height-display").textContent) || 64;
  syncEnvCompactSummary(height, readBounceContextFromDom());
}

function setCeilingEnabled(enabled: boolean, gap = 82): void {
  const slider = el<HTMLInputElement>("ceiling-slider");
  slider.disabled = !enabled;
  if (enabled) {
    slider.value = String(clampCeiling(gap));
  }
  syncCeilingDisplay(enabled ? clampCeiling(Number(slider.value)) : gap, enabled);
}

export function persistBounceContext(ctx: BounceContext): void {
  saveBounceContext(ctx);
}

export function bindBounceEnvControls(onChange: () => void): void {
  syncBounceContextToDom();

  bindStepper({
    input: el<HTMLInputElement>("teleport-slider"),
    decBtn: el<HTMLButtonElement>("tele-dec"),
    incBtn: el<HTMLButtonElement>("tele-inc"),
    min: TELEHEIGHT_MIN,
    max: TELEHEIGHT_MAX,
    step: TELEHEIGHT_STEP,
    format: formatTeleheight,
    onInput: (teleheight) => {
      syncTeleportDisplay(teleheight);
    },
    onChange: (teleheight) => {
      syncTeleportDisplay(teleheight);
      persistBounceContext(readBounceContextFromDom());
      onChange();
    },
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-tele]")) {
    btn.addEventListener("click", () => {
      const teleheight = clampTele(Number(btn.dataset.tele ?? "1"));
      el<HTMLInputElement>("teleport-slider").value = formatTeleheight(teleheight);
      syncTeleportDisplay(teleheight);
      persistBounceContext(readBounceContextFromDom());
      onChange();
    });
  }

  bindRigidSlider(el<HTMLInputElement>("ceiling-slider"), {
    min: CEILING_GAP_MIN,
    max: CEILING_GAP_MAX,
    step: 1,
    onInput: (gap) => {
      if (ceilingEnabled()) {
        el<HTMLOutputElement>("ceiling-display").textContent = String(gap);
      }
    },
    onSnap: (gap) => {
      if (!ceilingEnabled()) return;
      setCeilingEnabled(true, gap);
      persistBounceContext(readBounceContextFromDom());
      onChange();
    },
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-ceiling]")) {
    btn.addEventListener("click", () => {
      if (btn.dataset.ceiling === "off") {
        setCeilingEnabled(false);
        persistBounceContext(readBounceContextFromDom());
        onChange();
        return;
      }
      if (btn.disabled) return;
      const gap = clampCeiling(Number(btn.dataset.ceiling ?? "82"));
      setCeilingEnabled(true, gap);
      persistBounceContext(readBounceContextFromDom());
      onChange();
    });
  }
}
