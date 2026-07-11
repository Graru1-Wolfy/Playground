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

function formatBounceTable(rows: DefaultCheckRow[], caption: string): string {
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
