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

export function runDefaultChecks(height: number): DefaultCheckRow[] {
  return DEFAULT_TYPES.map(({ label, bounce }) => ({
    label,
    uncrouched: checkBounce(height, bounce, LandType.UNCROUCHED),
    crouched: checkBounce(height, bounce, LandType.CROUCHED),
    jumpbug: checkBounce(height, bounce, LandType.JUMPBUG),
  }));
}

function bounceBadge(code: number): string {
  if (code === 0) {
    return `<span class="bounce-badge bounce-none" title="No bounce">—</span>`;
  }
  if (code === 1) {
    return `<span class="bounce-badge bounce-yes" title="Bounce">Bounce</span>`;
  }
  if (code === 2) {
    return `<span class="bounce-badge bounce-double" title="Double bounce">Double</span>`;
  }
  return `<span class="bounce-badge bounce-other">${code}</span>`;
}

const START_ICONS: Record<string, string> = {
  Walk: "🚶",
  "Crouch Walk": "🦆",
  Jump: "⬆",
  "Crouch Jump": "⬆",
  Ctap: "⚡",
  Ceilingsmash: "⬇",
};

export function formatDefaultGrid(rows: DefaultCheckRow[]): string {
  const cards = rows
    .map((row) => {
      const icon = START_ICONS[row.label] ?? "•";
      const hasBounce =
        row.uncrouched === 1 ||
        row.uncrouched === 2 ||
        row.crouched === 1 ||
        row.crouched === 2 ||
        row.jumpbug === 1 ||
        row.jumpbug === 2;
      return `
        <article class="default-card${hasBounce ? " default-card-active" : ""}">
          <header class="default-card-head">
            <span class="default-icon" aria-hidden="true">${icon}</span>
            <h3>${row.label}</h3>
          </header>
          <div class="default-lands">
            <div class="default-land">
              <span class="default-land-label">Uncrouched</span>
              ${bounceBadge(row.uncrouched)}
            </div>
            <div class="default-land">
              <span class="default-land-label">Crouched</span>
              ${bounceBadge(row.crouched)}
            </div>
            <div class="default-land">
              <span class="default-land-label">Jumpbug</span>
              ${bounceBadge(row.jumpbug)}
            </div>
          </div>
        </article>`;
    })
    .join("");

  return `<div class="default-grid-inner">${cards}</div>`;
}

/** @deprecated Use formatDefaultGrid */
export function formatDefaultTable(rows: DefaultCheckRow[]): string {
  return formatDefaultGrid(rows);
}
