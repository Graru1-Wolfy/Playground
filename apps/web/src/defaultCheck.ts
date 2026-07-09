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

const START_ICONS: Record<string, string> = {
  Walk: "🚶",
  "Crouch Walk": "🦆",
  Jump: "⬆",
  "Crouch Jump": "⬆",
  Ctap: "⚡",
  Ceilingsmash: "⬇",
};

function bounceBadgeCompact(code: number): string {
  if (code === 0) return `<span class="bounce-badge bounce-none">—</span>`;
  if (code === 1) return `<span class="bounce-badge bounce-yes">B</span>`;
  if (code === 2) return `<span class="bounce-badge bounce-double">2×</span>`;
  return `<span class="bounce-badge bounce-other">${code}</span>`;
}

export function formatDefaultGrid(rows: DefaultCheckRow[]): string {
  const head = `<thead><tr><th>Start</th><th>Unc</th><th>Cro</th><th>JB</th></tr></thead>`;
  const body = rows
    .map((row) => {
      const hasBounce =
        row.uncrouched > 0 || row.crouched > 0 || row.jumpbug > 0;
      const icon = START_ICONS[row.label] ?? "";
      return `<tr class="${hasBounce ? "default-row-active" : ""}">
        <th scope="row"><span class="default-label">${icon} ${row.label}</span></th>
        <td>${bounceBadgeCompact(row.uncrouched)}</td>
        <td>${bounceBadgeCompact(row.crouched)}</td>
        <td>${bounceBadgeCompact(row.jumpbug)}</td>
      </tr>`;
    })
    .join("");

  return `<table class="default-table"><caption class="sr-only">DEFAULT bounce results by start type and landing</caption>${head}<tbody>${body}</tbody></table>`;
}

/** @deprecated Use formatDefaultGrid */
export function formatDefaultTable(rows: DefaultCheckRow[]): string {
  return formatDefaultGrid(rows);
}
