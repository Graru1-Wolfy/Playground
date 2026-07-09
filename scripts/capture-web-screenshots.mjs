#!/usr/bin/env node
/**
 * Capture TF2 bounce checker screenshots (desktop + mobile, key UI states).
 *
 * Usage:
 *   npm run preview:web   # in another terminal
 *   node scripts/capture-web-screenshots.mjs
 *
 * Env:
 *   SCREENSHOT_URL  — default http://127.0.0.1:4173/Playground/
 *   SCREENSHOT_DIR  — default /opt/cursor/artifacts/screenshots
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const url = process.env.SCREENSHOT_URL ?? "http://127.0.0.1:4173/Playground/";
const outDir = process.env.SCREENSHOT_DIR ?? "/opt/cursor/artifacts/screenshots";

async function waitForApp(page) {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector("#default-results .default-table tbody tr", { timeout: 15_000 });
  await page.waitForSelector("#setup-results .setup-card", { timeout: 15_000 });
  await page.waitForFunction(
    () => document.querySelector("#setup-loading")?.classList.contains("hidden") === true,
    { timeout: 15_000 },
  );
  await new Promise((r) => setTimeout(r, 500));
}

async function shot(page, name, opts = {}) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, type: "png", ...opts });
  console.log("wrote", file);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
  });

  try {
    // Desktop — full page
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
      await waitForApp(page);
      await shot(page, "desktop-full.png", { fullPage: true });
      await shot(page, "desktop-viewport.png", { fullPage: false });
      await page.close();
    }

    // Mobile — full page
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
      await waitForApp(page);
      await shot(page, "mobile-full.png", { fullPage: true });
      await shot(page, "mobile-viewport.png", { fullPage: false });
      await page.close();
    }

    // Desktop — preferences drawer open
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
      await waitForApp(page);
      await page.click("#prefs-toggle");
      await page.waitForSelector("#prefs-drawer.open", { timeout: 5000 });
      await new Promise((r) => setTimeout(r, 300));
      await shot(page, "desktop-prefs-open.png", { fullPage: false });
      await page.close();
    }

    // Desktop — env dropdowns expanded
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
      await waitForApp(page);
      await page.evaluate(() => {
        document.querySelector("#tele-dropdown")?.setAttribute("open", "");
        document.querySelector("#ceiling-dropdown")?.setAttribute("open", "");
      });
      await new Promise((r) => setTimeout(r, 200));
      await shot(page, "desktop-env-dropdowns.png", { fullPage: false });
      await page.close();
    }

    // Desktop — slopes scrolled into view
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
      await waitForApp(page);
      await page.evaluate(() => {
        document.querySelector(".panel-slope-wall")?.scrollIntoView({ block: "start" });
      });
      await new Promise((r) => setTimeout(r, 200));
      await shot(page, "desktop-slopes-walls.png", { fullPage: false });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
