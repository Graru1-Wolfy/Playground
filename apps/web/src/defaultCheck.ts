import {
  checkBounce,
  getBounceAngles,
  LandType,
  type BounceInput,
  type WeaponName,
} from "@playground/engine-fast";

const STANDARD_STARTS: { label: string; bounce: BounceInput }[] = [
  { label: "Walk", bounce: { vel: -6, text: "Walk" } },
  { label: "Crouch Walk", bounce: { vel: -6, crouched: true, text: "Crouch Walk" } },
  { label: "Jump", bounce: { vel: 283, text: "Jump" } },
  { label: "Crouch Jump", bounce: { vel: 289, text: "Crouch Jump" } },
];

const SPECIAL_STARTS: { label: string; bounce: BounceInput }[] = [
  { label: "Ctap", bounce: { vel: 289, crouched: true, text: "Ctap" } },
  { label: "Ceilingsmash", bounce: { vel: -6, ceiling: true, text: "Ceilingsmash" } },
];

const ANGLE_LAUNCHERS: WeaponName[] = ["Stock", "Original", "Mangler", "Mangler Charged"];

export interface DefaultCheckRow {
  label: string;
  uncrouched: number;
  crouched: number;
  jumpbug: number;
}

export interface DefaultAngleRow {
  launcher: WeaponName;
  walkUnc: string;
  walkCro: string;
  walkJb: string;
  crouchUnc: string;
  crouchCro: string;
  crouchJb: string;
}

export interface DefaultCheckResult {
  standard: DefaultCheckRow[];
  special: DefaultCheckRow[];
  angles: DefaultAngleRow[];
}

export interface BounceCheckOptions {
  teleheight?: number;
  ceilingGap?: number | null;
}

function runRows(
  starts: { label: string; bounce: BounceInput }[],
  height: number,
  teleheight: number,
  ceilingGap: number | null,
): DefaultCheckRow[] {
  return starts.map(({ label, bounce }) => {
    const checkHeight =
      bounce.ceiling && ceilingGap !== null ? ceilingGap : height;
    return {
      label,
      uncrouched: checkBounce(checkHeight, bounce, LandType.UNCROUCHED, teleheight),
      crouched: checkBounce(checkHeight, bounce, LandType.CROUCHED, teleheight),
      jumpbug: checkBounce(checkHeight, bounce, LandType.JUMPBUG, teleheight),
    };
  });
}

function formatAngles(angles: [number, number][] | [number, number]): string {
  if (!angles || (Array.isArray(angles[0]) && (angles as [number, number][]).length === 0)) {
    return "—";
  }
  if (typeof angles[0] === "number") {
    const [a, b] = angles as [number, number];
    return `${a.toFixed(1)}–${b.toFixed(1)}°`;
  }
  return (angles as [number, number][])
    .map(([a, b]) => `${a.toFixed(1)}–${b.toFixed(1)}°`)
    .join(", ");
}

function angleBadge(
  height: number,
  weapon: WeaponName,
  crouched: boolean,
  land: LandType,
  teleheight: number,
): string {
  const angles = getBounceAngles(height, { ang: true, crouched, weapon }, land, teleheight);
  if (!angles || (Array.isArray(angles[0]) && angles.length === 0)) return "—";
  return `<span class="angle-badge">${formatAngles(angles)}</span>`;
}

function runAngleRows(height: number, teleheight: number): DefaultAngleRow[] {
  return ANGLE_LAUNCHERS.map((launcher) => ({
    launcher,
    walkUnc: angleBadge(height, launcher, false, LandType.UNCROUCHED, teleheight),
    walkCro: angleBadge(height, launcher, false, LandType.CROUCHED, teleheight),
    walkJb: angleBadge(height, launcher, false, LandType.JUMPBUG, teleheight),
    crouchUnc: angleBadge(height, launcher, true, LandType.UNCROUCHED, teleheight),
    crouchCro: angleBadge(height, launcher, true, LandType.CROUCHED, teleheight),
    crouchJb: angleBadge(height, launcher, true, LandType.JUMPBUG, teleheight),
  }));
}

export function runDefaultChecks(height: number, options: BounceCheckOptions = {}): DefaultCheckResult {
  const teleheight = options.teleheight ?? 1;
  const ceilingGap = options.ceilingGap ?? null;

  return {
    standard: runRows(STANDARD_STARTS, height, teleheight, ceilingGap),
    special: runRows(SPECIAL_STARTS, height, teleheight, ceilingGap),
    angles: runAngleRows(height, teleheight),
  };
}

const START_GRAPHICS: Record<string, string> = {
  Walk: `<svg class="start-graphic start-graphic-walk" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-rocket" d="M6 17l10-10 5 5-10 10-6 1 1-6z" />
    <path class="start-rocket-line" d="M15 8l5 5M5 23l5-5" />
    <path class="start-flame" d="M4 20c-1 1-2 2-2 4 2 0 4-1 5-2" />
  </svg>`,
  "Crouch Walk": `<svg class="start-graphic start-graphic-crouch" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-rocket" d="M7 18l9-9 5 5-9 9-6 1 1-6z" />
    <path class="start-rocket-line" d="M15 10l5 5M5 24h9" />
    <path class="start-flame" d="M4 21c-1 1-2 2-2 4 2 0 4-1 5-2" />
  </svg>`,
  Jump: `<svg class="start-graphic start-graphic-jump" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-arc" d="M5 21C8 11 14 6 23 5" />
    <path class="start-rocket" d="M12 16l8-10 5 4-9 10-5 1 1-5z" />
    <path class="start-flame" d="M9 19c-2 1-3 2-4 5 3 0 5-1 7-3" />
  </svg>`,
  "Crouch Jump": `<svg class="start-graphic start-graphic-crouch-jump" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-arc" d="M4 22c3-8 8-13 16-16" />
    <path class="start-rocket" d="M11 17l8-9 5 4-9 10-5 1 1-6z" />
    <path class="start-rocket-line" d="M4 24h8" />
    <path class="start-flame" d="M8 20c-2 1-3 2-4 4 3 0 5-1 7-3" />
  </svg>`,
  Ctap: `<svg class="start-graphic start-graphic-ctap" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-arc" d="M5 22c3-9 8-14 17-17" />
    <path class="start-rocket" d="M11 17l8-9 5 4-9 10-5 1 1-6z" />
    <path class="start-flame" d="M8 20c-2 1-4 2-5 5 3 0 6-1 8-3" />
    <path class="start-spark" d="M6 6l2 3 3-2-2 4 3 2-4 1-1 4-2-4-4-1 3-2-1-4z" />
  </svg>`,
  Ceilingsmash: `<svg class="start-graphic start-graphic-ceiling" viewBox="0 0 28 28" aria-hidden="true">
    <path class="start-ceiling" d="M4 5h20" />
    <path class="start-rocket" d="M18 7l-8 9-5-4 9-10 5-1-1 6z" />
    <path class="start-flame" d="M20 4c2-1 4-1 6-1-1 2-3 4-5 5" />
    <path class="start-impact" d="M8 18l-2 3M12 18l1 4M16 17l3 3" />
  </svg>`,
};

function bounceBadgeCompact(code: number): string {
  if (code === 0) return `<span class="bounce-badge bounce-none">—</span>`;
  if (code === 1) return `<span class="bounce-badge bounce-yes">B</span>`;
  if (code === 2) return `<span class="bounce-badge bounce-double">2×</span>`;
  return `<span class="bounce-badge bounce-other">${code}</span>`;
}

function formatBounceTable(rows: DefaultCheckRow[], caption: string): string {
  const head = `<thead><tr><th>Start</th><th>Unc</th><th>Cro</th><th>JB</th></tr></thead>`;
  const body = rows
    .map((row) => {
      const hasBounce =
        row.uncrouched > 0 || row.crouched > 0 || row.jumpbug > 0;
      const graphic = START_GRAPHICS[row.label] ?? "";
      return `<tr class="${hasBounce ? "default-row-active" : ""}">
        <th scope="row"><span class="default-label">${graphic}<span>${row.label}</span></span></th>
        <td>${bounceBadgeCompact(row.uncrouched)}</td>
        <td>${bounceBadgeCompact(row.crouched)}</td>
        <td>${bounceBadgeCompact(row.jumpbug)}</td>
      </tr>`;
    })
    .join("");

  return `<table class="default-table"><caption class="sr-only">${caption}</caption>${head}<tbody>${body}</tbody></table>`;
}

function formatAngleTable(rows: DefaultAngleRow[]): string {
  const head = `<thead><tr>
    <th>Launcher</th>
    <th colspan="3">Walk angle starts</th>
    <th colspan="3">Crouch angle starts</th>
  </tr><tr>
    <th></th><th>Unc</th><th>Cro</th><th>JB</th><th>Unc</th><th>Cro</th><th>JB</th>
  </tr></thead>`;

  const launcherClass: Record<string, string> = {
    Stock: "launcher-stock",
    Original: "launcher-orig",
    Mangler: "launcher-mang",
    "Mangler Charged": "launcher-mang",
  };

  const body = rows
    .map((row) => {
      const cls = launcherClass[row.launcher] ?? "launcher-any";
      const hasAngle = [row.walkUnc, row.walkCro, row.walkJb, row.crouchUnc, row.crouchCro, row.crouchJb].some(
        (cell) => !cell.includes("—"),
      );
      return `<tr class="${hasAngle ? "default-row-active" : ""}">
        <th scope="row"><span class="launcher-pill ${cls}">${row.launcher}</span></th>
        <td>${row.walkUnc}</td><td>${row.walkCro}</td><td>${row.walkJb}</td>
        <td>${row.crouchUnc}</td><td>${row.crouchCro}</td><td>${row.crouchJb}</td>
      </tr>`;
    })
    .join("");

  return `<table class="default-table default-angle-table"><caption class="sr-only">DEFAULT angle start intervals by launcher and landing</caption>${head}<tbody>${body}</tbody></table>`;
}

function defaultSection(title: string, body: string): string {
  return `<section class="default-section">
    <h3 class="default-section-title">${title}</h3>
    ${body}
  </section>`;
}

export function formatDefaultGrid(result: DefaultCheckResult): string {
  return `<div class="default-sections">
    ${defaultSection("Fixed starts", formatBounceTable(result.standard, "DEFAULT fixed starts by landing"))}
    ${defaultSection("Angle starts", formatAngleTable(result.angles))}
    ${defaultSection("Special starts", formatBounceTable(result.special, "DEFAULT special starts by landing"))}
  </div>`;
}

/** @deprecated Use formatDefaultGrid */
export function formatDefaultTable(result: DefaultCheckResult): string {
  return formatDefaultGrid(result);
}
