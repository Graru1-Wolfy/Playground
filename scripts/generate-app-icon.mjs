#!/usr/bin/env node
/** Render apps/web/public/icon-512.svg to PNG sizes for Android / store assets. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const svgPath = path.join(repoRoot, "apps/web/public/icon-512.svg");
const outDir = path.join(repoRoot, "apps/web/resources");
const svg = fs.readFileSync(svgPath, "utf8");

const sizes = [
  { name: "icon.png", size: 1024 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-192.png", size: 192 },
];

async function renderPng(size) {
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#0c0f14;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace("<svg", `<svg width="${size}" height="${size}"`)}</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const { name, size } of sizes) {
    const file = path.join(outDir, name);
    fs.writeFileSync(file, await renderPng(size));
    console.log("wrote", file);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
