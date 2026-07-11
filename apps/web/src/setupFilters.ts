import type { DecodedSetup } from "@playground/schema";

export interface SetupFilterOption {
  id: string;
  label: string;
  match: (setup: DecodedSetup) => boolean;
}

export interface SetupFilterGroup {
  name: string;
  filters: SetupFilterOption[];
}

function flag(setup: DecodedSetup, id: keyof DecodedSetup): boolean {
  const value = setup[id];
  return typeof value === "number" && value > 0;
}

export const SETUP_FILTER_GROUPS: SetupFilterGroup[] = [
  {
    name: "Launcher",
    filters: [
      { id: "stock", label: "Stock", match: (s) => s.num_rockets > 0 && s.launcher === 0 },
      { id: "original", label: "Original", match: (s) => s.num_rockets > 0 && s.launcher === 1 },
      { id: "mangler", label: "Mangler", match: (s) => s.num_rockets > 0 && s.launcher === 2 },
      { id: "drop-only", label: "Drop only", match: (s) => s.num_rockets === 0 },
    ],
  },
  {
    name: "Type",
    filters: [
      { id: "bounce", label: "Bounce", match: (s) => flag(s, "BOUNCE") },
      { id: "bhop", label: "Bhop", match: (s) => flag(s, "BHOP") },
      { id: "jumpbug", label: "Jumpbug", match: (s) => flag(s, "JB") },
    ],
  },
  {
    name: "Style",
    filters: [
      { id: "simple", label: "Simple", match: (s) => flag(s, "SIMPLE") },
      { id: "auto", label: "Auto", match: (s) => flag(s, "ABOUNCE") || flag(s, "ASBOUNCE") || flag(s, "ASTANDBOUNCE") || flag(s, "ASSTANDBOUNCE") },
      {
        id: "full-auto",
        label: "Full auto",
        match: (s) =>
          flag(s, "FABOUNCE") ||
          flag(s, "FASBOUNCE") ||
          flag(s, "FASTANDBOUNCE") ||
          flag(s, "FASSTANDBOUNCE"),
      },
      { id: "standing", label: "Standing", match: (s) => flag(s, "STANDBOUNCE") || flag(s, "SSTANDBOUNCE") },
      { id: "synced", label: "Synced", match: (s) => flag(s, "SBOUNCE") || flag(s, "SPB") || flag(s, "SJBPB") },
    ],
  },
  {
    name: "Rockets",
    filters: [
      { id: "one-rocket", label: "1 rocket", match: (s) => s.num_rockets === 1 },
      { id: "multi-rocket", label: "2–3 rockets", match: (s) => s.num_rockets >= 2 },
    ],
  },
];

const FILTER_BY_ID = new Map(
  SETUP_FILTER_GROUPS.flatMap((group) => group.filters.map((filter) => [filter.id, filter] as const)),
);

export function setupMatchesActiveFilters(setup: DecodedSetup, activeFilterIds: ReadonlySet<string>): boolean {
  if (activeFilterIds.size === 0) return true;

  for (const id of activeFilterIds) {
    const filter = FILTER_BY_ID.get(id);
    if (!filter?.match(setup)) return false;
  }

  return true;
}

export function renderSetupFilterGroups(activeFilterIds: ReadonlySet<string>): string {
  return SETUP_FILTER_GROUPS.map((group) => {
    const chips = group.filters
      .map((filter) => {
        const active = activeFilterIds.has(filter.id);
        return `<button type="button" class="chip chip-sm setup-filter-chip${active ? " chip-active" : ""}" data-filter-id="${filter.id}" aria-pressed="${active}">${filter.label}</button>`;
      })
      .join("");

    return `
      <div class="setup-filter-group">
        <span class="setup-filter-group-label">${group.name}</span>
        <div class="setup-filter-options" role="group" aria-label="${group.name} filters">${chips}</div>
      </div>`;
  }).join("");
}
