import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { BOBA_ORDER_LIMIT } from "../src/games/bobaCafe/simulation/bobaCafeRules.js";
import { FIND_VEZMIR_OBJECTS } from "../src/games/findVezmir/content/hiddenObjects.js";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5190";
const outputDir = process.env.E2E_OUTPUT_DIR || "/private/tmp/foxfam-game-hub-playtest";

const routes = [
  { slug: "quarters", path: "/quarters", heading: /Quarters/i },
  {
    slug: "visitor-quarters",
    path: "/quarters/00000000-0000-4000-8000-000000000001",
    heading: /Visiting Quarters/i,
  },
  { slug: "forge", path: "/relic-forge", heading: /Relic Forge/i },
  { slug: "starfishing", path: "/starfishing", heading: /Starfishing/i, canvas: true },
  { slug: "match-merge", path: "/match-merge", heading: /Match & Merge/i },
  { slug: "boba-cafe", path: "/boba-cafe", heading: /Boba Shrine Cafe/i },
  { slug: "find-vezmir", path: "/find-vezmir", heading: /Find Vezmir/i },
  { slug: "time-runner", path: "/time-runner", heading: /Time Runner/i, canvas: true },
  { slug: "word-garden", path: "/word-garden", heading: /Blooming Ink/i },
  { slug: "collections", path: "/collections", heading: /Collections/i },
  { slug: "profile", path: "/profile", heading: /Profile/i },
  { slug: "familiar-wardrobe", path: "/profile/familiar", heading: /Familiar Wardrobe/i },
];

const viewports = [
  { key: "desktop", width: 1280, height: 900, isMobile: false },
  { key: "mobile", width: 390, height: 844, isMobile: true },
];

function formatFailure(viewport, route, message) {
  return `[${viewport.key}] ${route.path}: ${message}`;
}

async function seedGuestPreview(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("splash_seen", "1");
    localStorage.setItem("commhub_guest_onboarding_seen", "1");
  });
}

async function sampleCanvas(page, canvas) {
  const screenshot = await canvas.screenshot({ type: "png" });
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;
  return page.evaluate(async (snapshotUrl) => {
    const image = new Image();
    image.src = snapshotUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Could not decode the canvas snapshot"));
    });

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (width < 32 || height < 32) return { width, height, colors: 0, readable: false };

    const scratch = document.createElement("canvas");
    scratch.width = width;
    scratch.height = height;
    const context = scratch.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);

    const points = [];
    for (let y = 1; y <= 7; y += 1) {
      for (let x = 1; x <= 7; x += 1) {
        points.push([
          Math.floor((width * x) / 8),
          Math.floor((height * y) / 8),
        ]);
      }
    }

    const colors = new Set();
    for (const [x, y] of points) {
      const pixel = context.getImageData(x, y, 1, 1).data;
      colors.add(Array.from(pixel).join(","));
    }
    return { width, height, colors: colors.size, readable: colors.size >= 3 };
  }, dataUrl);
}

async function activateControl(page, locator, viewport) {
  if (viewport.isMobile) {
    await locator.click();
    return;
  }
  await locator.focus();
  await page.keyboard.press("Enter");
}

async function exerciseRoute(page, route, viewport) {
  if (route.slug === "starfishing") {
    const castButton = page.getByRole("button", { name: /Cast line/i });
    if (viewport.isMobile) await castButton.click();
    else {
      await page.locator(".starfishing-world").click({ position: { x: 12, y: 12 } });
      await page.keyboard.press("Space");
    }
    for (let step = 0; step < 16; step += 1) {
      const outcomeHandle = await page.waitForFunction(() => {
        if (document.querySelector('.reel-qte button[data-active="true"]')) return "active";
        if (document.querySelector(".game-result-sheet")) return "caught";
        if (/A soft escape/i.test(document.body.innerText)) return "escaped";
        return null;
      });
      const outcome = await outcomeHandle.jsonValue();
      if (outcome === "caught") break;
      if (outcome === "escaped") throw new Error("The QTE escaped before the automated input could advance.");
      const activePull = page.locator('.reel-qte button[data-active="true"]');
      if (!(await activePull.count())) break;
      if (viewport.isMobile) await activePull.click();
      else {
        const direction = (await activePull.getAttribute("aria-label"))?.replace("Reel ", "");
        const key = { Left: "ArrowLeft", Up: "ArrowUp", Right: "ArrowRight", Down: "ArrowDown" }[direction];
        if (!key) throw new Error(`Unknown keyboard QTE direction: ${direction || "missing"}`);
        await page.keyboard.press(key);
      }
    }
    await page.locator(".game-result-sheet").waitFor({ state: "visible" });
    return `complete one cast and directional QTE by ${viewport.isMobile ? "touch" : "keyboard"}`;
  }

  if (route.slug === "match-merge") {
    const cells = page.locator(".reliquary-board > button");
    await activateControl(page, cells.nth(0), viewport);
    await activateControl(page, cells.nth(1), viewport);
    await page.waitForFunction(() => document.body.innerText.includes("Refined into"));
    return `merge matching offerings by ${viewport.isMobile ? "touch" : "keyboard"}`;
  }

  if (route.slug === "boba-cafe") {
    const stationRows = [
      ["tea", "Tea"],
      ["milk", "Milk"],
      ["topping", "Pearls"],
      ["charm", "Charm"],
      ["sweetness", "Sweet"],
    ];
    for (let ticket = 0; ticket < BOBA_ORDER_LIMIT; ticket += 1) {
      const recipe = await page.locator(".game-shell__sidebar .boba-ticket__recipe > div").evaluateAll((rows) => Object.fromEntries(rows.map((row) => [
        row.querySelector("dt")?.textContent?.trim(),
        row.querySelector("dd")?.textContent?.trim(),
      ])));
      for (const [station, label] of stationRows) {
        await page.locator(`#boba-tab-${station}`).click();
        const option = page.getByRole("button", { name: new RegExp(`^${escapeRegExp(recipe[label])}(?:,|$)`, "i") }).last();
        if (viewport.isMobile) await option.click();
        else {
          const options = page.locator(".boba-stations__options > button");
          const optionCount = await options.count();
          let ordinal = 0;
          for (let index = 0; index < optionCount; index += 1) {
            if (await options.nth(index).evaluate((node, expected) => node.getAttribute("aria-label")?.startsWith(expected), recipe[label])) {
              ordinal = index + 1;
              break;
            }
          }
          if (!ordinal) throw new Error(`Could not resolve keyboard shortcut for ${recipe[label]}`);
          await page.evaluate(() => document.activeElement?.blur());
          await page.keyboard.press(String(ordinal));
        }
      }
      if (viewport.isMobile) {
        await page.getByRole("button", { name: /^Serve\b/i }).click();
        await page.getByRole("button", { name: /Next ticket/i }).first().click();
      } else {
        await activateControl(page, page.getByRole("button", { name: /^Serve\b/i }), viewport);
        await activateControl(page, page.getByRole("button", { name: /Next ticket/i }).first(), viewport);
      }
    }
    await page.getByText("Moonbrew shift complete", { exact: true }).waitFor();
    return `fulfill all three cafe tickets by ${viewport.isMobile ? "touch" : "keyboard shortcuts"}`;
  }

  if (route.slug === "find-vezmir") {
    const layerOrder = ["room", "background", "foreground", "room", "background"];
    const labelsByLayer = {
      room: ["Ribbon Bell", "Seed Pouch"],
      background: ["Star Note"],
      foreground: ["Moon Mug", "Fox Pin"],
    };
    let activeLayer = "room";
    const searchedLayers = new Set();
    for (const nextLayer of layerOrder) {
      while (activeLayer !== nextLayer) {
        await page.getByRole("button", { name: "Show farther depth layer" }).click();
        const currentIndex = ["foreground", "room", "background"].indexOf(activeLayer);
        activeLayer = ["foreground", "room", "background"][(currentIndex + 1) % 3];
      }
      if (searchedLayers.has(nextLayer)) continue;
      searchedLayers.add(nextLayer);
      for (const label of labelsByLayer[nextLayer] || []) {
        const object = FIND_VEZMIR_OBJECTS.find((candidate) => candidate.label === label);
        await activateControl(
          page,
          page.getByRole("button", { name: `Search ${object.region} for ${object.label}` }),
          viewport,
        );
      }
    }
    const vezmir = FIND_VEZMIR_OBJECTS.find((object) => object.label === "Vezmir");
    await activateControl(
      page,
      page.getByRole("button", { name: `Search ${vezmir.region} for ${vezmir.label}` }),
      viewport,
    );
    await page.getByText("Vezmir found", { exact: true }).first().waitFor();
    return `find all five clues and Vezmir by ${viewport.isMobile ? "touch" : "keyboard activation"}`;
  }

  if (route.slug === "time-runner") {
    await activateControl(page, page.getByRole("button", { name: /^Start (the )?traverse$/i }).first(), viewport);
    await page.waitForFunction(() => Boolean(document.querySelector('[aria-label="Pause Time Runner"]')));
    const leap = page.getByRole("button", { name: /^Leap/i }).last();
    if (viewport.isMobile) await leap.click();
    else {
      await page.locator(".time-runner-stage").click({ position: { x: 12, y: 12 } });
      await page.keyboard.press("ArrowUp");
    }
    await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Leap/i.test(button.textContent)));
    return `start and leap in the clocktower by ${viewport.isMobile ? "touch" : "keyboard"}`;
  }

  if (route.slug === "word-garden") {
    const center = await page.locator(".word-flower__center span").innerText();
    const petals = (await page.locator(".word-flower__petal span").allInnerTexts()).join("");
    const letterSet = new Set(`${center}${petals}`.toUpperCase());
    const word = ["P", "A", "L", "E"].every((letter) => letterSet.has(letter))
      ? "PALE"
      : ["L", "O", "V", "E"].every((letter) => letterSet.has(letter))
        ? "LOVE"
        : "ACHE";
    if (viewport.isMobile) {
      for (const letter of word) {
        const petal = page.getByRole("button", { name: new RegExp(`^Add (?:required center letter )?${letter}$`) });
        await petal.click();
      }
      await page.getByRole("button", { name: "Bloom word" }).click();
    } else {
      await page.locator(".word-garden-scene").click({ position: { x: 12, y: 12 } });
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.type(word);
      await page.keyboard.press("Enter");
    }
    await page.locator(".word-garden-hud__found li", { hasText: word }).waitFor();
    await page.getByRole("button", { name: /Rest the garden/i }).click();
    await page.getByText("Garden resting", { exact: true }).waitFor();
    return `bloom a valid word by ${viewport.isMobile ? "touch" : "keyboard"} and complete the garden`;
  }

  return null;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function inspectRoute(page, viewport, route, failures, results) {
  const pageErrors = [];
  const badAssets = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onResponse = (response) => {
    const url = new URL(response.url());
    if (url.origin === new URL(baseUrl).origin && response.status() >= 400) {
      badAssets.push(`${response.status()} ${url.pathname}`);
    }
  };
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(route.canvas ? 1300 : 700);

    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const accessibility = {
      passes: axeResults.passes.length,
      violations: axeResults.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(" ")),
      })),
    };
    for (const violation of accessibility.violations.filter(({ impact }) => (
      impact === "critical" || impact === "serious"
    ))) {
      failures.push(formatFailure(
        viewport,
        route,
        `Axe ${violation.impact} ${violation.id}: ${violation.help} (${violation.targets.length} target(s))`,
      ));
    }

    const metrics = await page.evaluate(() => ({
      bodyText: document.body.innerText.trim(),
      bodyTextLength: document.body.innerText.trim().length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      focusableCount: document.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])").length,
      headerOverflow: Array.from(document.querySelectorAll(".game-shell__header"))
        .some((element) => element.scrollWidth > element.clientWidth + 1),
      mainCount: document.querySelectorAll("main").length,
      headingCount: document.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
      unnamedButtonCount: Array.from(document.querySelectorAll("button")).filter((element) => {
        const name = element.getAttribute("aria-label")
          || element.getAttribute("title")
          || element.textContent
          || element.querySelector("img")?.getAttribute("alt")
          || "";
        return !name.trim();
      }).length,
      imageWithoutAltCount: document.querySelectorAll("img:not([alt])").length,
      positiveTabIndexCount: Array.from(document.querySelectorAll("[tabindex]"))
        .filter((element) => Number(element.getAttribute("tabindex")) > 0).length,
      duplicateIdCount: (() => {
        const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
        return ids.length - new Set(ids).size;
      })(),
    }));

    if (!route.heading.test(metrics.bodyText)) failures.push(formatFailure(viewport, route, "expected page title is missing"));
    if (metrics.bodyTextLength < 60) failures.push(formatFailure(viewport, route, "page content is effectively blank"));
    if (metrics.documentWidth > metrics.viewportWidth + 2) {
      failures.push(formatFailure(viewport, route, `horizontal overflow ${metrics.documentWidth}px > ${metrics.viewportWidth}px`));
    }
    if (metrics.focusableCount < 1) failures.push(formatFailure(viewport, route, "no keyboard-focusable action is available"));
    if (metrics.headerOverflow) failures.push(formatFailure(viewport, route, "game header content overflows its container"));
    if (metrics.mainCount !== 1) failures.push(formatFailure(viewport, route, `expected one main landmark, found ${metrics.mainCount}`));
    if (metrics.headingCount < 1) failures.push(formatFailure(viewport, route, "no semantic heading is available"));
    if (metrics.unnamedButtonCount) failures.push(formatFailure(viewport, route, `${metrics.unnamedButtonCount} button(s) have no accessible name`));
    if (metrics.imageWithoutAltCount) failures.push(formatFailure(viewport, route, `${metrics.imageWithoutAltCount} image(s) are missing alt text`));
    if (metrics.positiveTabIndexCount) failures.push(formatFailure(viewport, route, `${metrics.positiveTabIndexCount} control(s) use a positive tabindex`));
    if (metrics.duplicateIdCount) failures.push(formatFailure(viewport, route, `${metrics.duplicateIdCount} duplicate DOM id(s) found`));

    await page.keyboard.press("Tab");
    const focusState = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return { tag: "", visible: false };
      const style = getComputedStyle(element);
      const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
      const visible = (style.outlineStyle !== "none" && outlineWidth > 0)
        || style.boxShadow !== "none"
        || style.borderColor !== "rgba(0, 0, 0, 0)";
      return { tag: element.tagName, visible };
    });
    if (!["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(focusState.tag)) {
      failures.push(formatFailure(viewport, route, `Tab did not reach an interactive control (${focusState.tag || "none"})`));
    } else if (!focusState.visible) {
      failures.push(formatFailure(viewport, route, "the first keyboard control has no visible focus treatment"));
    }

    let canvasState = null;
    if (route.canvas) {
      const canvas = page.locator("canvas").first();
      if (await canvas.count()) {
        canvasState = await sampleCanvas(page, canvas);
        if (!canvasState.readable) {
          failures.push(formatFailure(viewport, route, `canvas appears blank or uniform (${canvasState.colors} sampled colors)`));
        }
      } else {
        failures.push(formatFailure(viewport, route, "expected game canvas is missing"));
      }
    }

    if (pageErrors.length) failures.push(formatFailure(viewport, route, `page errors: ${pageErrors.join(" | ")}`));
    if (badAssets.length) failures.push(formatFailure(viewport, route, `same-origin failures: ${badAssets.join(" | ")}`));

    const screenshotPath = path.join(outputDir, `${viewport.key}-${route.slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    let interaction = null;
    try {
      interaction = await exerciseRoute(page, route, viewport);
    } catch (error) {
      failures.push(formatFailure(viewport, route, `primary interaction failed: ${error.message}`));
    }
    const { bodyText: _bodyText, ...reportMetrics } = metrics;
    results.push({
      viewport: viewport.key,
      route: route.path,
      metrics: reportMetrics,
      accessibility,
      canvasState,
      interaction,
      screenshotPath,
    });
  } finally {
    page.off("pageerror", onPageError);
    page.off("response", onResponse);
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await seedGuestPreview(page);

      for (const route of routes) {
        await inspectRoute(page, viewport, route, failures, results);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = { baseUrl, generatedAt: new Date().toISOString(), failures, results };
  await writeFile(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  assert.deepEqual(failures, [], `Game-hub playtest failed:\n${failures.join("\n")}`);
  console.log(`Game-hub playtest passed: ${results.length} route/viewport checks.`);
  console.log(`Screenshots and report: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
