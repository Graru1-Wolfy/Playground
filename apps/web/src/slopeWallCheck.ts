import { getBounceAngles, LandType, type WeaponName } from "@playground/engine-fast";
import { effectiveBounceHeight, type SlopeWallInput } from "./slopeWall.js";

const LAUNCHERS: WeaponName[] = ["Stock", "Original", "Mangler"];

export interface SlopeWallRow {
  launcher: string;
  walkUnc: string;
  walkCro: string;
  walkJb: string;
  crouchUnc: string;
  crouchCro: string;
  crouchJb: string;
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

function angleBounce(
  height: number,
  weapon: WeaponName,
  crouched: boolean,
  land: LandType,
): string {
  const angles = getBounceAngles(height, { ang: true, crouched, weapon }, land);
  if (!angles || (Array.isArray(angles[0]) && angles.length === 0)) return "—";
  return `<span class="angle-badge">${formatAngles(angles)}</span>`;
}

export function runSlopeWallChecks(input: SlopeWallInput): {
  effective: number | null;
  rows: SlopeWallRow[];
} {
  const effective = effectiveBounceHeight(input);
  if (effective === null || effective <= 0) {
    return { effective, rows: [] };
  }

  const rows = LAUNCHERS.map((launcher) => ({
    launcher,
    walkUnc: angleBounce(effective, launcher, false, LandType.UNCROUCHED),
    walkCro: angleBounce(effective, launcher, false, LandType.CROUCHED),
    walkJb: angleBounce(effective, launcher, false, LandType.JUMPBUG),
    crouchUnc: angleBounce(effective, launcher, true, LandType.UNCROUCHED),
    crouchCro: angleBounce(effective, launcher, true, LandType.CROUCHED),
    crouchJb: angleBounce(effective, launcher, true, LandType.JUMPBUG),
  }));

  return { effective, rows };
}

export function formatSlopeWallGrid(rows: SlopeWallRow[], invalid = false): string {
  if (!rows.length) {
    return invalid
      ? `<p class="hint slope-wall-empty">No angle intervals for this slope/wall geometry.</p>`
      : `<p class="hint slope-wall-empty">Set ground slope or enable wall for angled bounce intervals.</p>`;
  }

  const head = `<thead><tr>
    <th>Launcher</th>
    <th colspan="3">Walk angles</th>
    <th colspan="3">Crouch angles</th>
  </tr><tr>
    <th></th><th>Unc</th><th>Cro</th><th>JB</th><th>Unc</th><th>Cro</th><th>JB</th>
  </tr></thead>`;

  const launcherClass: Record<string, string> = {
    Stock: "launcher-stock",
    Original: "launcher-orig",
    Mangler: "launcher-mang",
  };

  const body = rows
    .map((row) => {
      const cls = launcherClass[row.launcher] ?? "launcher-any";
      const hasAngle = [row.walkUnc, row.walkCro, row.walkJb, row.crouchUnc, row.crouchCro, row.crouchJb].some(
        (c) => !c.includes("—"),
      );
      return `<tr class="${hasAngle ? "default-row-active" : ""}">
        <th scope="row"><span class="launcher-pill ${cls}">${row.launcher}</span></th>
        <td>${row.walkUnc}</td><td>${row.walkCro}</td><td>${row.walkJb}</td>
        <td>${row.crouchUnc}</td><td>${row.crouchCro}</td><td>${row.crouchJb}</td>
      </tr>`;
    })
    .join("");

  return `<table class="default-table slope-wall-table"><caption class="sr-only">Slope and wall angle bounce intervals</caption>${head}<tbody>${body}</tbody></table>`;
}
