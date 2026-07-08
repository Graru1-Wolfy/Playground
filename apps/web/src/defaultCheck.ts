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

function badgeFor(code: number): string {
  if (code === 0) {
    return '<span class="result-badge result-badge--none">—</span>';
  }
  if (code === 1) {
    return '<span class="result-badge result-badge--bounce">bounce</span>';
  }
  if (code === 2) {
    return '<span class="result-badge result-badge--double">double</span>';
  }
  return `<span class="result-badge result-badge--other">${code}</span>`;
}

export function runDefaultChecks(height: number): DefaultCheckRow[] {
  return DEFAULT_TYPES.map(({ label, bounce }) => ({
    label,
    uncrouched: checkBounce(height, bounce, LandType.UNCROUCHED),
    crouched: checkBounce(height, bounce, LandType.CROUCHED),
    jumpbug: checkBounce(height, bounce, LandType.JUMPBUG),
  }));
}

export function formatDefaultTable(rows: DefaultCheckRow[]): string {
  const lines = [
    '<table class="default-table"><thead><tr>',
    "<th>Start</th><th>Uncrouched</th><th>Crouched</th><th>Jumpbug</th>",
    "</tr></thead><tbody>",
  ];
  for (const row of rows) {
    lines.push(
      `<tr><td>${row.label}</td>`,
      `<td>${badgeFor(row.uncrouched)}</td>`,
      `<td>${badgeFor(row.crouched)}</td>`,
      `<td>${badgeFor(row.jumpbug)}</td></tr>`,
    );
  }
  lines.push("</tbody></table>");
  return lines.join("");
}

export function countBounceResults(rows: DefaultCheckRow[]): number {
  let count = 0;
  for (const row of rows) {
    for (const code of [row.uncrouched, row.crouched, row.jumpbug]) {
      if (code === 1 || code === 2) count++;
    }
  }
  return count;
}
