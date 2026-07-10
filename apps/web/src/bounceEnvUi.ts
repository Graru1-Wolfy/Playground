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

export function readBounceContextFromDom(): BounceContext {
  const teleheight = clampTele(Number(el<HTMLInputElement>("teleport-slider").value));
  const ceilingOn = el<HTMLInputElement>("ceiling-enabled").checked;
  const ceilingGap = ceilingOn
    ? clampCeiling(Number(el<HTMLInputElement>("ceiling-slider").value))
    : null;
  return { teleheight, ceilingGap };
}

export function syncBounceContextToDom(ctx = loadBounceContext()): void {
  const teleSlider = el<HTMLInputElement>("teleport-slider");
  teleSlider.value = formatTeleheight(ctx.teleheight);
  syncTeleportDisplay(ctx.teleheight);

  const ceilingOn = el<HTMLInputElement>("ceiling-enabled");
  const ceilingSlider = el<HTMLInputElement>("ceiling-slider");
  ceilingOn.checked = ctx.ceilingGap !== null;
  const gap = ctx.ceilingGap ?? 82;
  ceilingSlider.value = String(gap);
  ceilingSlider.disabled = ctx.ceilingGap === null;
  syncCeilingDisplay(gap, ctx.ceilingGap !== null);

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-tele]")) {
    btn.classList.toggle("chip-active", Number(btn.dataset.tele) === ctx.teleheight);
  }
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-ceiling]")) {
    btn.disabled = ctx.ceilingGap === null;
    btn.classList.toggle("chip-active", ctx.ceilingGap !== null && Number(btn.dataset.ceiling) === ctx.ceilingGap);
  }
}

export function syncTeleportDisplay(value: number): void {
  const text = formatTeleheight(value);
  el<HTMLOutputElement>("teleport-display").textContent = text;
  el<HTMLSpanElement>("tele-summary").textContent = text;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-tele]")) {
    btn.classList.toggle("chip-active", Number(btn.dataset.tele) === value);
  }
}

export function syncCeilingDisplay(value: number, enabled: boolean): void {
  el<HTMLOutputElement>("ceiling-display").textContent = String(value);
  el<HTMLSpanElement>("ceiling-summary").textContent = enabled ? String(value) : "off";
  const disabled = !enabled;
  el<HTMLInputElement>("ceiling-slider").disabled = disabled;
  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-ceiling]")) {
    btn.disabled = disabled;
    btn.classList.toggle("chip-active", !disabled && Number(btn.dataset.ceiling) === value);
  }
}

export function persistBounceContext(ctx: BounceContext): void {
  saveBounceContext(ctx);
}

export function bindBounceEnvControls(onChange: () => void): void {
  syncBounceContextToDom();

  bindRigidSlider(el<HTMLInputElement>("teleport-slider"), {
    min: TELEHEIGHT_MIN,
    max: TELEHEIGHT_MAX,
    step: TELEHEIGHT_STEP,
    onInput: (teleheight) => {
      syncTeleportDisplay(teleheight);
    },
    onSnap: (teleheight) => {
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

  el<HTMLInputElement>("ceiling-enabled").addEventListener("change", () => {
    const enabled = el<HTMLInputElement>("ceiling-enabled").checked;
    const gap = clampCeiling(Number(el<HTMLInputElement>("ceiling-slider").value));
    syncCeilingDisplay(gap, enabled);
    persistBounceContext(readBounceContextFromDom());
    onChange();
  });

  bindRigidSlider(el<HTMLInputElement>("ceiling-slider"), {
    min: CEILING_GAP_MIN,
    max: CEILING_GAP_MAX,
    step: 1,
    onInput: (gap) => {
      el<HTMLOutputElement>("ceiling-display").textContent = String(gap);
    },
    onSnap: (gap) => {
      syncCeilingDisplay(gap, true);
      el<HTMLInputElement>("ceiling-enabled").checked = true;
      persistBounceContext(readBounceContextFromDom());
      onChange();
    },
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>(".chip[data-ceiling]")) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const gap = clampCeiling(Number(btn.dataset.ceiling ?? "82"));
      el<HTMLInputElement>("ceiling-slider").value = String(gap);
      el<HTMLInputElement>("ceiling-enabled").checked = true;
      syncCeilingDisplay(gap, true);
      persistBounceContext(readBounceContextFromDom());
      onChange();
    });
  }
}
