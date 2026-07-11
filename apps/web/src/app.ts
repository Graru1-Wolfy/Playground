import { bindBounceEnvControls, readBounceContextFromDom } from "./bounceEnvUi.js";
import { syncEnvCompactSummary } from "./envSummary.js";
import {
  formatDefaultSetupCard,
  type DefaultCheckRow,
  type DefaultDetailContext,
  defaultSetupId,
} from "./defaultCheck.js";
import { runDefaultChecks } from "@playground/schema";
import { formatSetupCard } from "./formatSetup.js";
import {
  renderSetupFilterGroups,
  setupMatchesActiveFilters,
} from "./setupFilters.js";
import { guardComputeInput } from "./inputGuard.js";
import { loadSetupsWithSource } from "./lookup.js";
import {
  isPreferenceEnabled,
  isSliderPreference,
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  scoreSetup,
  weightFromToggle,
  type PreferenceDefinition,
} from "./preferences.js";
import { bindSetupCards } from "./setupDetail.js";
import type { SetupLookupEntry } from "./setupDetail.js";
import { renderSurfaceDiagram } from "./surfaceDiagram.js";
import { formatSlopeWallGrid, runSlopeWallChecks } from "./slopeWallCheck.js";
import { slopeWallSummary } from "./slopeWall.js";
import { copyToClipboard, debounce, el, setLiveStatus, showElement } from "./ui.js";
import {
  TRAJECTORY_WEIGHT_MAX,
  TRAJECTORY_WEIGHT_MIN,
  TRAJECTORY_WEIGHT_STEP,
  bindRigidSlider,
} from "./sliderSnap.js";
import { bindStepper, createStepperElement } from "./stepper.js";

import type { DecodedSetup } from "@playground/schema";

let currentSetups: DecodedSetup[] = [];
let currentDefaultRows: DefaultCheckRow[] = [];
let defaultDetailContext: DefaultDetailContext = {
  rank: 0,
  height: 64,
  teleheight: 1,
  ceilingGap: null,
};
let setupDataSource: "generated" | "sample" | "none" = "none";
let maxDisplayed = 20;
let activeFilterIds = new Set<string>();
let checkGeneration = 0;
let lastComputedHeight: number | null = null;

function readRawHeight(): string {
  return el<HTMLInputElement>("height-input").value;
}

function updateComputeGuard(): void {
  const guard = guardComputeInput(readRawHeight(), readBounceContextFromDom());
  const btn = el<HTMLButtonElement>("compute-btn");
  const validation = el<HTMLParagraphElement>("height-validation");
  const inputWrap = document.querySelector<HTMLElement>(".input-wrap");

  btn.disabled = !guard.valid || btn.classList.contains("is-loading");
  validation.textContent = guard.valid ? "" : guard.message;
  inputWrap?.setAttribute("data-state", guard.valid ? "idle" : "invalid");

  if (guard.valid && guard.height !== undefined) {
    syncHeightControls(guard.height);
  }
}

function previewHeightFromControls(): void {
  const guard = guardComputeInput(readRawHeight(), readBounceContextFromDom());
  if (guard.valid && guard.height !== undefined) {
    syncHeightControls(guard.height);
    el<HTMLParagraphElement>("height-validation").textContent = "";
    document.querySelector<HTMLElement>(".input-wrap")?.setAttribute("data-state", "idle");
  }
  updateComputeGuard();
}

function syncHeightControls(height: number): void {
  const input = el<HTMLInputElement>("height-input");
  const slider = el<HTMLInputElement>("height-slider-visible");
  const display = el<HTMLSpanElement>("height-display");
  const floorDisplay = el<HTMLOutputElement>("floor-slider-display");

  input.value = String(height);
  display.textContent = String(height);
  floorDisplay.textContent = String(height);

  const sliderMax = Number(slider.max);
  slider.value = String(Math.min(height, sliderMax));

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".height-preset[data-height]")) {
    chip.classList.toggle("chip-active", Number(chip.dataset.height) === height);
  }

  syncEnvCompactSummary(height, readBounceContextFromDom());
}

function renderPreferenceControl(
  pref: PreferenceDefinition,
  weight: number,
  onChange: () => void,
): HTMLElement {
  const inputWrap = document.createElement("div");
  inputWrap.className = "pref-input-wrap";

  if (isSliderPreference(pref)) {
    const { root, input, decBtn, incBtn } = createStepperElement({
      className: "stepper-pref",
      min: TRAJECTORY_WEIGHT_MIN,
      max: TRAJECTORY_WEIGHT_MAX,
      step: TRAJECTORY_WEIGHT_STEP,
      value: Math.min(TRAJECTORY_WEIGHT_MAX, Math.max(TRAJECTORY_WEIGHT_MIN, weight)),
      inputId: `pref-${pref.id}`,
      decLabel: `Decrease ${pref.label} weight`,
      incLabel: `Increase ${pref.label} weight`,
    });

    const valueSlot = document.createElement("span");
    valueSlot.className = "stepper-body";
    const value = document.createElement("output");
    value.className = "stepper-value pref-value mono";
    value.htmlFor = input.id;
    value.textContent = input.value;
    valueSlot.append(value);
    root.insertBefore(valueSlot, incBtn);

    bindStepper({
      input,
      decBtn,
      incBtn,
      min: TRAJECTORY_WEIGHT_MIN,
      max: TRAJECTORY_WEIGHT_MAX,
      step: TRAJECTORY_WEIGHT_STEP,
      onInput: (snapped) => {
        value.textContent = String(snapped);
      },
      onChange: (snapped) => {
        value.textContent = String(snapped);
        saveWeight(pref.id, snapped);
        onChange();
      },
    });

    inputWrap.append(root);
    return inputWrap;
  }

  const toggle = document.createElement("label");
  toggle.className = "switch-toggle pref-switch";
  toggle.htmlFor = `pref-${pref.id}`;

  const input = document.createElement("input");
  input.id = `pref-${pref.id}`;
  input.type = "checkbox";
  input.role = "switch";
  input.checked = isPreferenceEnabled(pref, weight);
  input.setAttribute("aria-label", pref.label);

  const track = document.createElement("span");
  track.className = "switch-track";
  track.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "switch-thumb";
  track.append(thumb);

  toggle.append(input, track);

  input.addEventListener("change", () => {
    saveWeight(pref.id, weightFromToggle(pref, input.checked));
    onChange();
  });

  inputWrap.append(toggle);
  return inputWrap;
}

function renderPreferences(): void {
  const panel = el<HTMLDivElement>("preferences-panel");
  panel.innerHTML = "";
  const weights = loadWeights();

  for (const group of preferencesConfig.groups) {
    const section = document.createElement("section");
    section.className = "pref-group";
    const title = document.createElement("h3");
    title.textContent = group.name;
    section.appendChild(title);

    for (const pref of group.preferences) {
      const row = document.createElement("div");
      row.className = `pref-row${isSliderPreference(pref) ? "" : " pref-row-toggle"}`;

      const labelWrap = document.createElement("div");
      labelWrap.className = "pref-label";

      const name = document.createElement("span");
      name.className = "pref-name";
      name.textContent = pref.label;

      const desc = document.createElement("span");
      desc.className = "pref-desc";
      desc.textContent = pref.description;

      labelWrap.append(name, desc);

      row.append(
        labelWrap,
        renderPreferenceControl(pref, weights[pref.id] ?? pref.defaultWeight, () => {
          void rerankAndDisplay();
        }),
      );
      section.appendChild(row);
    }
    panel.appendChild(section);
  }
}

function renderSetupFilters(): void {
  const container = el<HTMLDivElement>("setup-filters");
  container.innerHTML = renderSetupFilterGroups(activeFilterIds);

  for (const chip of container.querySelectorAll<HTMLButtonElement>(".setup-filter-chip")) {
    chip.addEventListener("click", () => {
      const id = chip.dataset.filterId;
      if (!id) return;

      if (activeFilterIds.has(id)) {
        activeFilterIds.delete(id);
      } else {
        activeFilterIds.add(id);
      }

      renderSetupFilters();
      void rerankAndDisplay();
    });
  }
}

async function rerankAndDisplay(): Promise<void> {
  const weights = loadWeights();
  const scored = [...currentSetups]
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .filter(({ setup }) => setupMatchesActiveFilters(setup, activeFilterIds))
    .sort((a, b) => b.score - a.score);

  const maxScore = scored.length > 0 ? scored[0]!.score : 1;
  const list = el<HTMLOListElement>("setup-results");
  list.innerHTML = "";

  const limit = maxDisplayed;
  const slice = scored.slice(0, limit);
  const defaultCount = currentDefaultRows.length;
  const showDefaults = activeFilterIds.size === 0;

  if (showDefaults) {
    currentDefaultRows.forEach((row, index) => {
      const li = document.createElement("li");
      li.innerHTML = formatDefaultSetupCard(row, index + 1);
      list.appendChild(li);
    });
  }

  slice.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = formatSetupCard(item.setup, {
      rank: defaultCount + index + 1,
      score: item.score,
      maxScore,
    });
    list.appendChild(li);
  });

  bindCopyButtons(list);
  bindSetupCards(list, buildSetupLookup(slice, showDefaults ? currentDefaultRows : []));

  const status = el<HTMLParagraphElement>("setup-status");
  const total = currentSetups.length;
  const filtered = scored.length;
  const shownSim = Math.min(limit, filtered);
  const shownDefaults = showDefaults ? defaultCount : 0;

  if (total === 0 && shownDefaults === 0) {
    status.textContent = "No simulation data for this height";
    el<HTMLElement>("setup-summary-compact").textContent = "No setups for this height";
    showElement(el<HTMLDivElement>("setup-empty"), true);
    showElement(el<HTMLDivElement>("setup-loading"), false);
    showElement(el<HTMLDivElement>("setup-list-header"), false);
  } else {
    showElement(el<HTMLDivElement>("setup-empty"), false);
    showElement(el<HTMLDivElement>("setup-list-header"), true);
    const filterNote = activeFilterIds.size > 0 ? ` · ${filtered} match` : "";
    const sourceNote =
      setupDataSource === "sample" ? " · sample data" : setupDataSource === "generated" ? "" : "";
    const defaultNote = shownDefaults > 0 ? `${shownDefaults} DEFAULT · ` : "";
    const statusText = `${defaultNote}${shownSim}/${filtered}${filterNote} · ${total} simulation setups${sourceNote}`;
    status.textContent = statusText;
    el<HTMLElement>("setup-summary-compact").textContent = statusText;
  }
}

function buildSetupLookup(
  slice: { setup: DecodedSetup; score: number }[],
  defaultRows: DefaultCheckRow[],
): Map<string, SetupLookupEntry> {
  const maxScore = slice.length > 0 ? slice[0]!.score : 1;
  const lookup = new Map<string, SetupLookupEntry>();

  defaultRows.forEach((row, index) => {
    lookup.set(defaultSetupId(row.label), {
      kind: "default",
      row,
      context: {
        ...defaultDetailContext,
        rank: index + 1,
      },
    });
  });

  slice.forEach((item, index) => {
    lookup.set(item.setup.ID.toString(), {
      kind: "sim",
      setup: item.setup,
      context: {
        rank: defaultRows.length + index + 1,
        score: item.score,
        maxScore,
      },
    });
  });
  return lookup;
}

function bindCopyButtons(container: HTMLElement): void {
  for (const btn of container.querySelectorAll<HTMLButtonElement>(".copy-id-btn")) {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.copy ?? "";
      const ok = await copyToClipboard(id);
      const original = btn.textContent;
      btn.textContent = ok ? "Copied!" : "Failed";
      btn.classList.toggle("copy-success", ok);
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copy-success");
      }, 1500);
    });
  }
}

function renderSlopeWallChecks(height: number, ctx = readBounceContextFromDom()): void {
  const slopeDeg = Number(el<HTMLInputElement>("slope-slider").value);
  const hasWall = el<HTMLInputElement>("wall-toggle").checked;
  el<HTMLOutputElement>("slope-display").textContent = `${slopeDeg}°`;

  const note = el<HTMLParagraphElement>("slope-wall-note");
  const results = el<HTMLDivElement>("slope-wall-results");
  const diagram = el<HTMLDivElement>("surface-diagram");

  const input = {
    verticalHeight: height,
    slopeDeg,
    hasWall,
    ceilingGap: ctx.ceilingGap,
    teleheight: ctx.teleheight,
  };
  diagram.innerHTML = renderSurfaceDiagram(input);

  if (slopeDeg <= 0 && !hasWall) {
    note.textContent = "Flat ground — open DEFAULT starts in the setup list";
    results.innerHTML = `<p class="hint slope-wall-empty">Set ground slope or enable wall for angled bounce intervals.</p>`;
    return;
  }

  const { effective, rows } = runSlopeWallChecks(input, ctx.teleheight);
  note.textContent = slopeWallSummary(input, effective);
  results.innerHTML = formatSlopeWallGrid(rows, effective === null);
}

async function runCompute(): Promise<void> {
  const guard = guardComputeInput(readRawHeight(), readBounceContextFromDom());
  updateComputeGuard();
  if (!guard.valid || guard.height === undefined) {
    setLiveStatus("error");
    return;
  }

  const generation = ++checkGeneration;
  const btn = el<HTMLButtonElement>("compute-btn");
  btn.classList.add("is-loading");
  btn.disabled = true;
  setLiveStatus("loading");
  showElement(el<HTMLDivElement>("setup-loading"), true);
  showElement(el<HTMLDivElement>("setup-empty"), false);
  el<HTMLElement>("setup-summary-compact").textContent = "Loading setups…";

  const raw = guard.rawHeight ?? guard.height;
  const height = guard.height;
  lastComputedHeight = height;

  syncHeightControls(height);

  const ctx = readBounceContextFromDom();

  const note = el<HTMLParagraphElement>("height-note");
  const envParts: string[] = [];
  if (ctx.teleheight !== 1) envParts.push(`tele ${ctx.teleheight}`);
  if (ctx.ceilingGap !== null) envParts.push(`ceil ${ctx.ceilingGap}`);
  const envNote = envParts.length ? ` · ${envParts.join(" · ")}` : "";
  note.textContent =
    raw !== height
      ? `Terminal velocity remap: ${raw} → ${height}${envNote}`
      : `Lookup height: ${height} · bucket ${Math.floor(height / 100) * 100}–${Math.floor(height / 100) * 100 + 99}${envNote}`;

  currentDefaultRows = runDefaultChecks(height, {
    teleheight: ctx.teleheight,
    ceilingGap: ctx.ceilingGap,
  });
  defaultDetailContext = {
    rank: 0,
    height,
    teleheight: ctx.teleheight,
    ceilingGap: ctx.ceilingGap,
  };

  renderSlopeWallChecks(height, ctx);

  const { setups, source } = await loadSetupsWithSource(height);
  if (generation !== checkGeneration) return;

  currentSetups = setups;
  setupDataSource = source;

  btn.classList.remove("is-loading");
  showElement(el<HTMLDivElement>("setup-loading"), false);
  await rerankAndDisplay();
  setLiveStatus("ready");
  updateComputeGuard();
}

function openPrefs(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  el<HTMLButtonElement>("prefs-toggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("prefs-open");
}

function closePrefs(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  el<HTMLButtonElement>("prefs-toggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("prefs-open");
}

function slopeWallHeight(): number {
  const guard = guardComputeInput(readRawHeight(), readBounceContextFromDom());
  if (guard.valid && guard.height !== undefined) return guard.height;
  return lastComputedHeight ?? 64;
}

const debouncedPreview = debounce(() => previewHeightFromControls(), 180);

export function initApp(): void {
  renderPreferences();

  const heightInput = el<HTMLInputElement>("height-input");
  const heightSlider = el<HTMLInputElement>("height-slider-visible");

  updateComputeGuard();

  el<HTMLButtonElement>("compute-btn").addEventListener("click", (event) => {
    event.stopPropagation();
    void runCompute().then(() => {
      el<HTMLDetailsElement>("simulation-panel").open = true;
    });
  });

  heightInput.addEventListener("input", () => {
    debouncedPreview();
  });

  heightInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void runCompute();
    }
  });

  bindRigidSlider(heightSlider, {
    min: 0,
    max: 9999,
    step: 1,
    onInput: (height) => {
      heightInput.value = String(height);
      el<HTMLOutputElement>("floor-slider-display").textContent = String(height);
      el<HTMLSpanElement>("height-display").textContent = String(height);
      updateComputeGuard();
    },
    onSnap: (height) => {
      syncHeightControls(height);
      debouncedPreview();
    },
  });

  bindStepper({
    input: heightSlider,
    decBtn: el<HTMLButtonElement>("height-dec"),
    incBtn: el<HTMLButtonElement>("height-inc"),
    min: 0,
    max: 9999,
    step: 1,
    readValue: () => Number(heightInput.value) || 0,
    writeValue: (height) => {
      syncHeightControls(height);
    },
    onInput: () => {
      updateComputeGuard();
    },
    onChange: () => {
      debouncedPreview();
    },
  });

  bindStepper({
    input: el<HTMLInputElement>("slope-slider"),
    decBtn: el<HTMLButtonElement>("slope-dec"),
    incBtn: el<HTMLButtonElement>("slope-inc"),
    min: 0,
    max: 45,
    step: 1,
    format: (deg) => String(deg),
    onInput: (deg) => {
      el<HTMLOutputElement>("slope-display").textContent = `${deg}°`;
    },
    onChange: (deg) => {
      el<HTMLOutputElement>("slope-display").textContent = `${deg}°`;
      renderSlopeWallChecks(slopeWallHeight());
    },
  });

  for (const chip of document.querySelectorAll<HTMLButtonElement>(".height-preset[data-height]")) {
    chip.addEventListener("click", () => {
      heightInput.value = chip.dataset.height ?? "64";
      updateComputeGuard();
      void runCompute();
    });
  }

  el<HTMLInputElement>("wall-toggle").addEventListener("change", () => {
    renderSlopeWallChecks(slopeWallHeight());
  });

  bindBounceEnvControls(() => {
    updateComputeGuard();
    if (lastComputedHeight !== null) {
      renderSlopeWallChecks(slopeWallHeight());
    }
  });

  for (const btn of document.querySelectorAll<HTMLButtonElement>("#height-env-panel summary button")) {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  for (const ctrl of document.querySelectorAll<HTMLElement>("#simulation-panel summary select, #simulation-panel summary button")) {
    ctrl.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });

  renderSetupFilters();

  el<HTMLButtonElement>("reset-prefs").addEventListener("click", () => {
    resetWeights();
    renderPreferences();
    void rerankAndDisplay();
  });

  el<HTMLButtonElement>("prefs-toggle").addEventListener("click", openPrefs);
  el<HTMLButtonElement>("prefs-close").addEventListener("click", closePrefs);
  el<HTMLDivElement>("prefs-backdrop").addEventListener("click", closePrefs);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePrefs();
    }
  });

  void runCompute();
}
