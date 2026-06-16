import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
const outputDir = process.env.E2E_OUTPUT_DIR || "/private/tmp/foxfam-e2e";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const messages = [];
    await page.addInitScript(() => {
      window.sessionStorage.setItem("splash_seen", "true");
      window.localStorage.setItem("commhub_guest_onboarding_seen", "true");
      window.localStorage.setItem("commhub_guest_profile", JSON.stringify({ name: "E2E Guest", discordId: "" }));
    });

    page.on("pageerror", (error) => {
      messages.push(`pageerror: ${error.message}`);
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        messages.push(`console: ${message.text()}`);
      }
    });

    await page.goto(`${baseUrl}/ops`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const text = await page.locator("body").innerText();
    const hasExpectedGate = text.includes("Staff Ops") || text.includes("Access Denied");
    if (!hasExpectedGate) {
      failures.push(`${viewport.name}: /ops did not render staff page or access gate`);
    }

    if (text.includes("CLICK TO ENTER") || text.includes("Welcome to the Forsaken Faith")) {
      failures.push(`${viewport.name}: route check was blocked by splash or onboarding overlay`);
    }

    const seriousMessages = messages.filter((message) => !message.includes("Failed to load resource"));
    if (seriousMessages.length > 0) {
      failures.push(`${viewport.name}: ${seriousMessages.join(" | ")}`);
    }

    await page.screenshot({
      path: `${outputDir}/staff-ops-${viewport.name}.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}

console.log(`Staff Ops browser smoke passed. Screenshots: ${outputDir}`);
