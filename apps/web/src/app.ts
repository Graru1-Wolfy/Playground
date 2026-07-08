import { formatDefaultTable, runDefaultChecks } from "./defaultCheck.js";
import { formatSetupCard } from "./formatSetup.js";
import { normalizeHeight } from "./height.js";
import { loadSetupsForHeight } from "./lookup.js";
import {
  loadWeights,
  preferencesConfig,
  resetWeights,
  saveWeight,
  scoreSetup,
} from "./preferences.js";

import type { DecodedSetup } from "@playground/schema";

let currentSetups: DecodedSetup[] = [];
let maxDisplayed = 20;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function setLoading(loading: boolean): void {
  el<HTMLDivElement>("app").classList.toggle("loading", loading);
}

function updateStats(height: number, setupCount: number, topScore: number | null): void {
  const bucket = Math.floor(height / 100);
  el<HTMLSpanElement>("stat-height-value").textContent = String(height);
  el<HTMLSpanElement>("stat-setups-value").textContent = String(setupCount);
  el<HTMLSpanElement>("stat-best-value").textContent =
    topScore !== null ? String(Math.round(topScore)) : "—";
  el<HTMLSpanElement>("stat-bucket-value").textContent =
    bucket <= 0 ? `000–099` : `${String(bucket * 100).padStart(3, "0")}+`;
}

function openDrawer(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  const backdrop = el<HTMLElement>("drawer-backdrop");
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add("visible"));
}

function closeDrawer(): void {
  const drawer = el<HTMLElement>("prefs-drawer");
  const backdrop = el<HTMLElement>("drawer-backdrop");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("visible");
  setTimeout(() => {
    backdrop.hidden = true;
  }, 220);
}

function toggleSidebar(): void {
  el<HTMLElement>("app").querySelector(".sidebar")?.classList.toggle("open");
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
      const row = document.createElement("label");
      row.className = "pref-row";
      const name = document.createElement("span");
      name.textContent = pref.label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "-1000";
      input.max = "255";
      input.step = "1";
      input.value = String(weights[pref.id] ?? pref.defaultWeight);
      input.addEventListener("change", () => {
        saveWeight(pref.id, Number(input.value));
        void rerankAndDisplay();
      });
      row.append(name, input);
      section.appendChild(row);
    }
    panel.appendChild(section);
  }
}

async function rerankAndDisplay(): Promise<void> {
  const weights = loadWeights();
  const scored = [...currentSetups]
    .map((setup) => ({ setup, score: scoreSetup(setup, weights) }))
    .sort((a, b) => b.score - a.score);

  const list = el<HTMLDivElement>("setup-results");
  list.innerHTML = "";
  const limit = maxDisplayed;
  scored.slice(0, limit).forEach((item, index) => {
    list.insertAdjacentHTML("beforeend", formatSetupCard(item.setup, item.score, index + 1));
  });

  const status = el<HTMLParagraphElement>("setup-status");
  status.textContent =
    currentSetups.length === 0
      ? "No precomputed file for this height (bucket 0–99 only in MVP)."
      : `Showing ${Math.min(limit, scored.length)} of ${scored.length} setups`;

  updateStats(
    Number(el<HTMLInputElement>("height-input").value),
    currentSetups.length,
    scored.length > 0 ? scored[0].score : null,
  );
}

async function runCheck(): Promise<void> {
  setLoading(true);
  try {
    const raw = Number(el<HTMLInputElement>("height-input").value);
    const height = normalizeHeight(raw);
    const note = el<HTMLParagraphElement>("height-note");
    note.textContent =
      raw !== height ? `Terminal velocity remap: ${raw} → ${height}` : `Lookup height: ${height}`;

    const defaultRows = runDefaultChecks(height);
    el<HTMLDivElement>("default-results").innerHTML = formatDefaultTable(defaultRows);

    currentSetups = await loadSetupsForHeight(height);
    await rerankAndDisplay();
  } finally {
    setLoading(false);
  }
}

function bindDrawerControls(): void {
  for (const id of ["prefs-toggle", "prefs-nav"]) {
    el<HTMLButtonElement>(id).addEventListener("click", openDrawer);
  }
  el<HTMLButtonElement>("drawer-close").addEventListener("click", closeDrawer);
  el<HTMLElement>("drawer-backdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

function bindNavigation(): void {
  el<HTMLButtonElement>("menu-toggle").addEventListener("click", toggleSidebar);

  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav-item[data-section]")) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section) {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
        for (const item of document.querySelectorAll(".nav-item")) {
          item.classList.toggle("active", item === link);
        }
      }
      el<HTMLElement>("app").querySelector(".sidebar")?.classList.remove("open");
    });
  }
}

export function initApp(): void {
  renderPreferences();
  bindDrawerControls();
  bindNavigation();

  el<HTMLButtonElement>("check-btn").addEventListener("click", () => void runCheck());
  el<HTMLInputElement>("height-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") void runCheck();
  });
  el<HTMLSelectElement>("page-size").addEventListener("change", (e) => {
    maxDisplayed = Number((e.target as HTMLSelectElement).value);
    void rerankAndDisplay();
  });
  el<HTMLButtonElement>("reset-prefs").addEventListener("click", () => {
    resetWeights();
    renderPreferences();
    void rerankAndDisplay();
  });
  void runCheck();
}
