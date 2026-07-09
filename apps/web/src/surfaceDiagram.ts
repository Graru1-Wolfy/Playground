import {
  DIST_EPSILON,
  effectiveBounceHeight,
  getWallZ,
  HULL_WIDTH,
  isSlopeStandable,
  slopeNormalZ,
  type SlopeWallInput,
} from "./slopeWall.js";

export interface SurfaceDiagramModel {
  slopeDeg: number;
  verticalHeight: number;
  hasWall: boolean;
  standable: boolean;
  effective: number | null;
  /** World Z of horizontal floor plane (bounce start). */
  floorZ: number;
  /** World Z where landing/bounce occurs on ground profile. */
  bounceZ: number;
}

export function buildSurfaceDiagramModel(input: SlopeWallInput): SurfaceDiagramModel {
  const standable = isSlopeStandable(input.slopeDeg);
  const floorZ = input.verticalHeight + DIST_EPSILON;
  const nz = slopeNormalZ(input.slopeDeg);
  let bounceZ = 0;

  if (input.slopeDeg > 0.5 && standable) {
    if (input.hasWall) {
      bounceZ = getWallZ(floorZ, nz, -HULL_WIDTH / 2);
      if (!Number.isFinite(bounceZ)) bounceZ = 0;
    }
  }

  return {
    slopeDeg: input.slopeDeg,
    verticalHeight: input.verticalHeight,
    hasWall: input.hasWall,
    standable,
    effective: effectiveBounceHeight(input),
    floorZ,
    bounceZ,
  };
}

/** Side-view XZ diagram (X right, Z up). Returns SVG markup. */
export function renderSurfaceDiagramSvg(model: SurfaceDiagramModel): string {
  const W = 300;
  const H = 148;
  const padL = 36;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const ox = padL;
  const oy = H - padB;

  const maxH = Math.max(model.verticalHeight, model.floorZ, 24) * 1.15;
  const spanX = 200;
  const sx = (spanX - padL - padR) / Math.max(maxH * 0.6, 40);
  const sy = (oy - padT) / maxH;

  const toSvg = (x: number, z: number): [number, number] => [ox + x * sx, oy - z * sy];

  const slopeRad = (model.slopeDeg * Math.PI) / 180;
  const run = maxH * 1.1;
  const g0 = toSvg(0, 0);
  const g1 = toSvg(Math.cos(slopeRad) * run, Math.sin(slopeRad) * run);

  const floorZ = model.floorZ;
  const f0 = toSvg(-8, floorZ);
  const f1 = toSvg(run * 0.85, floorZ);

  const bounceZ = model.bounceZ;
  const bounceX = model.slopeDeg > 0.5 ? bounceZ / Math.tan(slopeRad || 1e-6) : 0;
  const bp = toSvg(Math.max(0, bounceX), bounceZ);

  const wallTop = toSvg(0, floorZ);
  const wallBot = toSvg(0, -2);

  const heightTop = toSvg(-14, floorZ);
  const heightBot = toSvg(-14, bounceZ);

  const surfaces: string[] = [];

  // Ground (always marked)
  surfaces.push(`
    <g class="surface-group surface-ground" data-surface="ground">
      <line class="surface-outline" x1="${g0[0]}" y1="${g0[1]}" x2="${g1[0]}" y2="${g1[1]}" />
      <circle class="surface-marker" cx="${g0[0]}" cy="${g0[1]}" r="3.5" />
      ${label(g0[0] + 6, g0[1] + 14, `Ground ${Math.round(model.slopeDeg)}°`, "surface-label-ground")}
    </g>`);

  // Floor plane (marked when using slope/wall mode)
  if (model.slopeDeg > 0.5 || model.hasWall) {
    surfaces.push(`
      <g class="surface-group surface-floor" data-surface="floor">
        <line class="surface-outline surface-outline-dashed" x1="${f0[0]}" y1="${f0[1]}" x2="${f1[0]}" y2="${f1[1]}" />
        ${label(f1[0] - 42, f1[1] - 6, "Floor", "surface-label-floor")}
      </g>`);
  }

  // Wall (marked when enabled)
  if (model.hasWall) {
    surfaces.push(`
      <g class="surface-group surface-wall" data-surface="wall">
        <line class="surface-outline" x1="${wallBot[0]}" y1="${wallBot[1]}" x2="${wallTop[0]}" y2="${wallTop[1]}" />
        ${label(wallBot[0] - 4, wallBot[1] + 12, "Wall", "surface-label-wall")}
      </g>`);
  }

  // Bounce point on ground profile
  if ((model.slopeDeg > 0.5 || model.hasWall) && model.standable) {
    surfaces.push(`
      <g class="surface-group surface-bounce" data-surface="bounce">
        <circle class="surface-marker surface-marker-bounce" cx="${bp[0]}" cy="${bp[1]}" r="4" />
        ${label(bp[0] + 8, bp[1] + 4, "Bounce", "surface-label-bounce")}
      </g>`);
  }

  // Height dimension
  if (model.slopeDeg > 0.5 || model.hasWall) {
    surfaces.push(`
      <g class="surface-dim" aria-hidden="true">
        <line class="surface-dim-line" x1="${heightBot[0]}" y1="${heightBot[1]}" x2="${heightTop[0]}" y2="${heightTop[1]}" />
        <text class="surface-dim-text" x="${heightTop[0] - 10}" y="${(heightTop[1] + heightBot[1]) / 2 + 3}">${model.verticalHeight} ft</text>
      </g>`);
  }

  const warning =
    !model.standable
      ? `<text class="surface-warn" x="${W / 2}" y="${padT}">Too steep to stand</text>`
      : model.effective === null && (model.slopeDeg > 0.5 || model.hasWall)
        ? `<text class="surface-warn" x="${W / 2}" y="${padT}">No valid bounce</text>`
        : "";

  const legend = buildLegend(model);

  return `<svg class="surface-diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Side view of marked ground, floor, and wall surfaces">
    <title>Marked surfaces: ground${model.hasWall ? ", wall" : ""}${model.slopeDeg > 0.5 || model.hasWall ? ", floor" : ""}</title>
    ${warning}
    <g class="surface-axis" aria-hidden="true">
      <line x1="${ox}" y1="${oy}" x2="${ox + 12}" y2="${oy}" class="surface-axis-line" />
      <text x="${ox + 14}" y="${oy + 4}" class="surface-axis-text">X</text>
      <line x1="${ox}" y1="${oy}" x2="${ox}" y2="${oy - 12}" class="surface-axis-line" />
      <text x="${ox - 10}" y="${oy - 14}" class="surface-axis-text">Z</text>
    </g>
    ${surfaces.join("\n")}
    ${legend}
  </svg>`;
}

function label(x: number, y: number, text: string, className: string): string {
  return `<text class="surface-label ${className}" x="${x}" y="${y}">${text}</text>`;
}

function buildLegend(model: SurfaceDiagramModel): string {
  const items: { key: string; text: string; cls: string }[] = [
    { key: "ground", text: "Ground", cls: "legend-ground" },
  ];
  if (model.slopeDeg > 0.5 || model.hasWall) {
    items.push({ key: "floor", text: "Floor", cls: "legend-floor" });
  }
  if (model.hasWall) {
    items.push({ key: "wall", text: "Wall", cls: "legend-wall" });
  }
  if ((model.slopeDeg > 0.5 || model.hasWall) && model.standable) {
    items.push({ key: "bounce", text: "Bounce pt", cls: "legend-bounce" });
  }

  const swatch = (cls: string, dashed = false) =>
    `<line class="legend-swatch ${cls}${dashed ? " legend-swatch-dashed" : ""}" x1="0" y1="0" x2="14" y2="0" />`;

  const rows = items
    .map((item, i) => {
      const y = 12 + i * 13;
      return `<g class="legend-item" transform="translate(8, ${y})">
        ${swatch(`legend-swatch-${item.key}`, item.key === "floor")}
        <text class="legend-text" x="18" y="4">${item.text}</text>
      </g>`;
    })
    .join("");

  return `<g class="surface-legend" transform="translate(${300 - 88}, ${148 - 8 - items.length * 13})">${rows}</g>`;
}

export function renderSurfaceDiagram(input: SlopeWallInput): string {
  return renderSurfaceDiagramSvg(buildSurfaceDiagramModel(input));
}
