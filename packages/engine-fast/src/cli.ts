#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LandType,
  checkBounce,
  formatBounceJSON,
  getBounces,
  type BounceInput,
} from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function formatSetup(setup: string[]): string {
  const parts = setup.map((x) => {
    if (["JDS", "JS", "SHOOT"].includes(x)) return x;
    if (x === "SIDE") return "Left/Right";
    return x[0].toUpperCase() + x.slice(1).toLowerCase();
  });
  let str = "";
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "SHOOT") continue;
    if (i !== 0) str += i === 2 && parts.length > 3 ? "+" : " ";
    str += parts[i];
  }
  return str;
}

function formatText(bounce: {
  weapon?: string;
  text?: string;
  setup?: string[];
  speedo?: string;
  double?: boolean;
  ang?: [number, number] | [number, number][];
}): string {
  const ang = bounce.ang;
  const angStr =
    Array.isArray(ang) && ang.length === 2 && typeof ang[0] === "number"
      ? ` <${ang[0]} - ${ang[1]}>`
      : "";
  return (
    (bounce.weapon ? `(${bounce.weapon}) ` : "") +
    (bounce.text || (bounce.setup ? formatSetup(bounce.setup) : "")) +
    (bounce.speedo ? ` <${bounce.speedo} u/s>` : "") +
    angStr +
    (bounce.double ? " [double]" : "")
  );
}

function formatBounces(
  height: number,
  bounces: BounceInput[],
  land: LandType,
): string {
  return getBounces(height, bounces, land)
    .map((b) => formatText(b))
    .join("\n");
}

function loadBounceData(path?: string): ReturnType<typeof formatBounceJSON> {
  const dataPath =
    path ??
    process.env.BCHECK_DATA ??
    resolve(__dirname, "../data/bounces.sample.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8")) as Record<string, BounceInput[]>;
  return formatBounceJSON(raw);
}

function check(
  height: number,
  types: string[] = ["default"],
  weapons: string[] = [],
  dataPath?: string,
): void {
  const { bounces, list } = loadBounceData(dataPath);
  const normalizedTypes = types.map((x) => x.toLowerCase());
  const normalizedWeapons = weapons.map((x) => x.toLowerCase());
  const includes = (arr: string[], value: string) =>
    !value || (!arr.length || arr.includes(value.toLowerCase()));
  const m = "-".repeat(5);
  const set = Object.entries(bounces)
    .filter(([type]) => includes(normalizedTypes, type))
    .flatMap(([, arr]) => arr.filter((x) => includes(normalizedWeapons, x.weapon ?? "")));

  console.log(
    [
      `BCHECK: ${height}\n`,
      `${m} UNCROUCHED ${m}`,
      formatBounces(height, set, LandType.UNCROUCHED) + "\n",
      `${m} CROUCHED ${m}`,
      formatBounces(height, set, LandType.CROUCHED) + "\n",
      `${m} JUMPBUG ${m}`,
      formatBounces(height, set, LandType.JUMPBUG) + "\n",
    ].join("\n"),
  );
  void list;
}

function quickCheck(height: number, vel: number, land: string): void {
  const landType =
    land === "crouched"
      ? LandType.CROUCHED
      : land === "jumpbug"
        ? LandType.JUMPBUG
        : LandType.UNCROUCHED;
  const result = checkBounce(height, { vel, crouched: false }, landType);
  const labels = ["no bounce", "bounce", "double bounce"];
  console.log(`height=${height} vel=${vel} land=${land} => ${labels[result] ?? result}`);
}

function printUsage(): void {
  console.log(`Usage:
  bcheck <height> [type] [weapon]     Lookup setups from bounce data JSON
  bcheck quick <height> <vel> [land]  Analytical vel check (no data file)
  bcheck types | weapons              List categories (requires data file)

  Set BCHECK_DATA to override bounce JSON path.
  Default sample data: packages/engine-fast/data/bounces.sample.json`);
}

const args = process.argv.slice(2);
const invokedAs = process.argv[1]?.includes("bfind") ? "bfind" : "bcheck";

if (!args.length || args[0] === "--help" || args[0] === "-h") {
  printUsage();
  process.exit(0);
}

if (invokedAs === "bfind") {
  console.log("bfind: full setup search requires bounce data — use bcheck with height for now.");
  process.exit(0);
}

if (args[0] === "quick") {
  quickCheck(Number(args[1]), Number(args[2]), args[3] ?? "uncrouched");
} else if (args[0] === "types") {
  console.log("Types:", loadBounceData().list.types.join(", "));
} else if (args[0] === "weapons") {
  console.log("Weapons:", loadBounceData().list.weapons.join(", "));
} else {
  const height = Number(args[0]);
  const types = args[1]?.split(",");
  const weapons = args[2]?.split(",");
  check(height, types, weapons);
}
