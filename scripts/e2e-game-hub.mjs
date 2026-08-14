import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { BOBA_ORDER_LIMIT } from "../src/games/bobaCafe/simulation/bobaCafeRules.js";
import { FIND_VEZMIR_OBJECTS } from "../src/games/findVezmir/content/hiddenObjects.js";
import {
  getDailyWordGardenPuzzle,
  getLocalDateKey,
} from "../src/games/wordGarden/content/wordGardenCatalog.js";

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
  {
    slug: "starfishing",
    path: "/starfishing",
    heading: /Starfishing/i,
    canvas: true,
    desktopTaskControls: [".starfishing-world", ".starfishing-control-deck"],
  },
  {
    slug: "match-merge",
    path: "/match-merge",
    heading: /Match & Merge/i,
    desktopTaskControls: [".reliquary-board"],
  },
  {
    slug: "boba-cafe",
    path: "/boba-cafe",
    heading: /Boba Shrine Cafe/i,
    visualBounds: {
      container: ".boba-counter",
      subjects: [".boba-counter__customer", ".boba-counter__familiar"],
    },
    desktopTaskControls: [".boba-cafe__stage-row", ".boba-stations__actions"],
  },
  {
    slug: "find-vezmir",
    path: "/find-vezmir",
    heading: /Find Vezmir/i,
    desktopTaskControls: [".vezmir-diorama__viewport", ".vezmir-diorama__control-rail"],
  },
  {
    slug: "time-runner",
    path: "/time-runner",
    heading: /Time Runner/i,
    canvas: true,
    desktopTaskControls: [".time-runner-stage__canvas-wrap", ".time-runner-stage__controls"],
  },
  {
    slug: "word-garden",
    path: "/word-garden",
    heading: /Blooming Ink/i,
    desktopTaskControls: [".word-flower__bed", ".word-flower__tools"],
  },
  { slug: "collections", path: "/collections", heading: /Collections/i },
  { slug: "profile", path: "/profile", heading: /Profile/i },
  { slug: "familiar-wardrobe", path: "/profile/familiar", heading: /Familiar Wardrobe/i },
];

const SANCTUARY_ROUTE_PATHS = new Set(
  routes.filter(({ slug }) => slug !== "profile").map(({ path: routePath }) => routePath),
);

const viewports = [
  { key: "desktop-keyboard", width: 1280, height: 900, isMobile: false, inputMode: "keyboard" },
  { key: "compact-desktop", width: 1200, height: 817, isMobile: false, inputMode: "keyboard" },
  { key: "short-desktop", width: 1280, height: 720, isMobile: false, inputMode: "keyboard" },
  { key: "desktop-pointer", width: 1280, height: 900, isMobile: false, inputMode: "pointer" },
  { key: "mobile", width: 390, height: 844, isMobile: true, inputMode: "touch" },
];

const COURTYARD_JOURNEY = Object.freeze([
  ["Starfishing", "/starfishing"],
  ["Match & Merge", "/match-merge"],
  ["Boba Shop Cafe", "/boba-cafe"],
  ["Find Vezmir", "/find-vezmir"],
  ["Clocktower Side-Scroller", "/time-runner"],
  ["Word Garden", "/word-garden"],
]);

function formatFailure(viewport, route, message) {
  return `[${viewport.key}] ${route.path}: ${message}`;
}

async function seedGuestPreview(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("splash_seen", "1");
    localStorage.setItem("commhub_guest_onboarding_seen", "1");
    localStorage.setItem("foxfam_sanctuary_nav_mode", "expanded");
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

async function sampleSvgAtSizes(page, selector) {
  return page.locator(selector).first().evaluate(async (svg) => {
    const source = new XMLSerializer().serializeToString(svg);
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    const declaredFills = new Set(
      Array.from(svg.querySelectorAll("[fill]"), (node) => node.getAttribute("fill")?.toLowerCase())
        .filter((fill) => fill && fill !== "none" && fill !== "transparent"),
    ).size;
    const sizes = [48, 64, 128];
    const results = [];

    for (const size of sizes) {
      const image = new Image();
      image.src = encoded;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error(`Could not rasterize ${selector} at ${size}px`));
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      let opaquePixels = 0;
      let minX = size;
      let minY = size;
      let maxX = -1;
      let maxY = -1;
      const colorBins = new Set();
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 32) continue;
        opaquePixels += 1;
        const pixelIndex = index / 4;
        const x = pixelIndex % size;
        const y = Math.floor(pixelIndex / size);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        colorBins.add(`${pixels[index] >> 5},${pixels[index + 1] >> 5},${pixels[index + 2] >> 5}`);
      }
      results.push({
        size,
        opaqueRatio: opaquePixels / (size * size),
        widthCoverage: maxX >= minX ? (maxX - minX + 1) / size : 0,
        heightCoverage: maxY >= minY ? (maxY - minY + 1) / size : 0,
        colorBins: colorBins.size,
        declaredFills,
      });
    }
    return results;
  });
}

function assertCollectibleReadability(samples, label) {
  for (const sample of samples) {
    if (sample.opaqueRatio < 0.14 || sample.widthCoverage < 0.55 || sample.heightCoverage < 0.55) {
      throw new Error(`${label} is too sparse at ${sample.size}px`);
    }
    if (sample.colorBins < 3) {
      throw new Error(`${label} is visually uniform at ${sample.size}px`);
    }
    if (sample.declaredFills > 16) {
      throw new Error(`${label} declares ${sample.declaredFills} flat fills; expected a limited collectible palette`);
    }
  }
}

async function activateControl(page, locator, viewport) {
  if (viewport.inputMode === "touch") {
    await locator.scrollIntoViewIfNeeded();
    const bounds = await locator.boundingBox();
    if (!bounds) throw new Error("Touch target is not visible.");
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    return;
  }
  if (viewport.inputMode === "pointer") {
    await locator.click();
    return;
  }
  await locator.focus();
  await page.keyboard.press("Enter");
}

async function exerciseRoute(page, route, viewport) {
  if (route.slug === "quarters") {
    for (const [label, pathName] of COURTYARD_JOURNEY) {
      const courtyard = page.getByRole("button", { name: "Priory Courtyard" }).first();
      await activateControl(page, courtyard, viewport);
      await page.locator(".courtyard-scene").waitFor({ state: "visible" });
      await activateControl(page, page.getByRole("button", { name: new RegExp(`^Enter ${escapeRegExp(label)}\\.`) }), viewport);
      await page.waitForFunction((expectedPath) => window.location.pathname === expectedPath, pathName);
      await activateControl(page, page.getByRole("link", { name: "Return to Quarters" }), viewport);
      await page.waitForFunction(() => window.location.pathname === "/quarters");
      await page.locator(".quarters-scene").waitFor({ state: "visible" });
    }
    return `visit all six Courtyard worlds and return by ${viewport.inputMode}`;
  }

  if (route.slug === "forge") {
    const themeStep = page.getByRole("button", { name: "Theme", exact: true });
    await activateControl(page, themeStep, viewport);
    const themeOptions = page.locator('button[aria-pressed="false"]').filter({ has: page.locator("span.font-medium") });
    const option = themeOptions.first();
    if (!(await option.count())) throw new Error("No alternate relic theme is available in the guest Forge preview.");
    const themeLabel = await option.locator("span.font-medium").innerText();
    await activateControl(page, option, viewport);
    await page.waitForFunction((label) => Array.from(document.querySelectorAll('button[aria-pressed="true"]'))
      .some((button) => button.textContent?.trim().startsWith(label)), themeLabel);
    const relicSamples = await sampleSvgAtSizes(page, ".relic-art__artifact");
    const charmSamples = await sampleSvgAtSizes(page, ".relic-art__socket [data-charm-art]");
    assertCollectibleReadability(relicSamples, "Relic collectible");
    assertCollectibleReadability(charmSamples, "Charm collectible");
    return `change a guest relic theme by ${viewport.inputMode} and verify collectible readability at 48, 64, and 128 pixels`;
  }

  if (route.slug === "starfishing") {
    const castButton = page.getByRole("button", { name: /Cast line/i });
    if (viewport.inputMode !== "keyboard") await activateControl(page, castButton, viewport);
    else {
      await castButton.focus();
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
      if (viewport.inputMode !== "keyboard") await activateControl(page, activePull, viewport);
      else {
        const direction = (await activePull.getAttribute("aria-label"))?.replace("Reel ", "");
        const key = { Left: "ArrowLeft", Up: "ArrowUp", Right: "ArrowRight", Down: "ArrowDown" }[direction];
        if (!key) throw new Error(`Unknown keyboard QTE direction: ${direction || "missing"}`);
        await page.keyboard.press(key);
      }
    }
    await page.locator(".game-result-sheet").waitFor({ state: "visible" });
    return `complete one cast and directional QTE by ${viewport.inputMode}`;
  }

  if (route.slug === "match-merge") {
    const cells = page.locator(".reliquary-board > button");
    await activateControl(page, cells.nth(0), viewport);
    await activateControl(page, cells.nth(1), viewport);
    await page.waitForFunction(() => document.body.innerText.includes("Refined into"));
    return `merge matching offerings by ${viewport.inputMode}`;
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
      const recipe = await page.locator(".boba-cafe__live-ticket .boba-ticket__recipe > div").evaluateAll((rows) => Object.fromEntries(rows.map((row) => [
        row.querySelector("dt")?.textContent?.trim(),
        row.querySelector("dd")?.textContent?.trim(),
      ])));
      for (const [station, label] of stationRows) {
        await activateControl(page, page.locator(`#boba-tab-${station}`), viewport);
        const option = page.getByRole("button", { name: new RegExp(`^${escapeRegExp(recipe[label])}(?:,|$)`, "i") }).last();
        if (viewport.inputMode !== "keyboard") await activateControl(page, option, viewport);
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
      if (viewport.inputMode !== "keyboard") {
        await activateControl(page, page.getByRole("button", { name: /^Serve\b/i }), viewport);
        await activateControl(page, page.getByRole("button", { name: /Next ticket/i }).first(), viewport);
      } else {
        await activateControl(page, page.getByRole("button", { name: /^Serve\b/i }), viewport);
        await activateControl(page, page.getByRole("button", { name: /Next ticket/i }).first(), viewport);
      }
    }
    await page.getByText("Moonbrew shift complete", { exact: true }).waitFor();
    return `fulfill all ${BOBA_ORDER_LIMIT} cafe tickets by ${viewport.inputMode}`;
  }

  if (route.slug === "find-vezmir") {
    const layerOrder = ["room", "background", "foreground", "room", "background"];
    const depthLabels = {
      foreground: "Near",
      room: "Cloister",
      background: "Far",
    };
    const labelsByLayer = {
      room: ["Ribbon Bell", "Seed Pouch"],
      background: ["Star Note"],
      foreground: ["Moon Mug", "Fox Pin"],
    };
    const searchedLayers = new Set();
    for (const nextLayer of layerOrder) {
      if (searchedLayers.has(nextLayer)) continue;
      searchedLayers.add(nextLayer);
      await activateControl(
        page,
        page.getByRole("button", { name: depthLabels[nextLayer], exact: true }),
        viewport,
      );
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
      page.getByRole("button", { name: depthLabels[vezmir.layer], exact: true }),
      viewport,
    );
    await activateControl(
      page,
      page.getByRole("button", { name: `Search ${vezmir.region} for ${vezmir.label}` }),
      viewport,
    );
    await page.getByText("Vezmir found", { exact: true }).first().waitFor();
    return `find all five clues and Vezmir by ${viewport.inputMode}`;
  }

  if (route.slug === "time-runner") {
    await activateControl(page, page.getByRole("button", { name: /^Start (the )?traverse$/i }).first(), viewport);
    await page.waitForFunction(() => Boolean(document.querySelector('[aria-label="Pause Time Runner"]')));
    const leap = page.getByRole("button", { name: /^Leap/i }).last();
    const duck = page.getByRole("button", { name: /^Duck/i }).last();
    if (viewport.inputMode !== "keyboard") {
      await activateControl(page, leap, viewport);
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Leap/i.test(button.textContent)));
      await activateControl(page, duck, viewport);
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Duck/i.test(button.textContent)));
    } else {
      await page.locator(".time-runner-stage").focus();
      await page.keyboard.press("ArrowUp");
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Leap/i.test(button.textContent)));
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Duck/i.test(button.textContent)));
      await page.keyboard.press("Digit2");
      await page.waitForFunction(() => Array.from(document.querySelectorAll("button.is-active")).some((button) => /Leap/i.test(button.textContent)));
    }
    return viewport.inputMode !== "keyboard"
      ? `start, leap, and duck in the clocktower by ${viewport.inputMode}`
      : "start, leap, duck, and choose the alternate clock landing by keyboard only";
  }

  if (route.slug === "word-garden") {
    const word = getDailyWordGardenPuzzle(getLocalDateKey()).featuredWords[0];
    if (viewport.inputMode !== "keyboard") {
      for (const letter of word) {
        const petal = page.getByRole("button", { name: new RegExp(`^Add (?:required center letter )?${letter}$`) });
        await activateControl(page, petal, viewport);
      }
      await activateControl(page, page.getByRole("button", { name: "Bloom word" }), viewport);
    } else {
      await page.locator(".word-garden-scene").focus();
      await page.keyboard.type(word);
      await page.keyboard.press("Enter");
    }
    await page.getByRole("listitem", { name: `${word}, found`, exact: true }).waitFor();
    await activateControl(page, page.getByRole("button", { name: /Rest the garden/i }), viewport);
    await page.getByText("Garden resting", { exact: true }).waitFor();
    return `bloom a valid word by ${viewport.inputMode} and complete the garden`;
  }

  if (route.slug === "familiar-wardrobe") {
    const speciesChoices = page.getByRole("group", { name: "Species choices" }).getByRole("button");
    const choiceCount = await speciesChoices.count();
    let alternate = null;
    for (let index = 0; index < choiceCount; index += 1) {
      const choice = speciesChoices.nth(index);
      if ((await choice.getAttribute("aria-pressed")) === "false") {
        alternate = choice;
        break;
      }
    }
    if (!alternate) throw new Error("No alternate familiar species is available.");
    await activateControl(page, alternate, viewport);
    await activateControl(page, page.getByRole("button", { name: "Save", exact: true }), viewport);
    await page.getByText("Guest preview saved on this device.", { exact: true }).waitFor();
    return `customize and save a guest familiar by ${viewport.inputMode}`;
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
      sanctuaryRail: (() => {
        const element = document.querySelector(".sanctuary-rail-slot");
        const bounds = element?.getBoundingClientRect();
        return {
          found: Boolean(element),
          visible: Boolean(bounds && bounds.width > 0 && bounds.height > 0),
          width: bounds?.width ?? 0,
        };
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

    const expectsSanctuaryRail = SANCTUARY_ROUTE_PATHS.has(route.path) && !viewport.isMobile;
    if (expectsSanctuaryRail && !metrics.sanctuaryRail.visible) {
      failures.push(formatFailure(viewport, route, "compact Sanctuary navigation rail is not visible"));
    }
    if (expectsSanctuaryRail && metrics.sanctuaryRail.width > 73) {
      failures.push(formatFailure(viewport, route, `Sanctuary navigation reserves ${metrics.sanctuaryRail.width}px instead of the compact rail`));
    }
    if (!expectsSanctuaryRail && metrics.sanctuaryRail.visible) {
      failures.push(formatFailure(viewport, route, "Sanctuary navigation rail is visible outside its desktop route boundary"));
    }

    let taskFit = null;
    if (!viewport.isMobile && route.desktopTaskControls) {
      taskFit = await page.evaluate((selectors) => ({
        viewportHeight: window.innerHeight,
        controls: selectors.map((selector) => {
          const element = document.querySelector(selector);
          const rect = element?.getBoundingClientRect();
          return {
            selector,
            found: Boolean(rect),
            top: rect?.top ?? null,
            bottom: rect?.bottom ?? null,
            visibleWithoutScroll: Boolean(rect && rect.top >= -1 && rect.bottom <= window.innerHeight + 1),
          };
        }),
      }), route.desktopTaskControls);
      const hiddenControls = taskFit.controls.filter((control) => !control.visibleWithoutScroll);
      if (hiddenControls.length) {
        failures.push(formatFailure(viewport, route, `task controls require page scrolling: ${hiddenControls.map(({ selector }) => selector).join(", ")}`));
      }
    }

    let visualBounds = null;
    if (route.visualBounds) {
      visualBounds = await page.evaluate(({ container, subjects }) => {
        const frame = document.querySelector(container)?.getBoundingClientRect();
        if (!frame) return { frameFound: false, clippedSubjects: subjects };

        const clippedSubjects = subjects.filter((selector) => {
          const subject = document.querySelector(selector)?.getBoundingClientRect();
          if (!subject || subject.width < 1 || subject.height < 1) return true;
          return subject.left < frame.left - 1
            || subject.top < frame.top - 1
            || subject.right > frame.right + 1
            || subject.bottom > frame.bottom + 1;
        });
        return { frameFound: true, clippedSubjects };
      }, route.visualBounds);
      if (!visualBounds.frameFound) {
        failures.push(formatFailure(viewport, route, `visual-bounds container ${route.visualBounds.container} is missing`));
      } else if (visualBounds.clippedSubjects.length) {
        failures.push(formatFailure(viewport, route, `visual subjects clipped by playfield: ${visualBounds.clippedSubjects.join(", ")}`));
      }
    }

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

    let portalNavigationOverlay = null;
    if (route.slug === "match-merge" && viewport.key === "compact-desktop") {
      const shell = page.locator(".clockyboii-shell");
      const before = await shell.boundingBox();
      const openPortalNavigation = page.getByRole("button", { name: "Open full portal navigation" });
      await openPortalNavigation.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog", { name: "Portal navigation" }).waitFor({ state: "visible" });
      const during = await shell.boundingBox();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "Portal navigation" }).waitFor({ state: "hidden" });
      const after = await shell.boundingBox();
      portalNavigationOverlay = {
        shellLeftBefore: before?.x ?? null,
        shellLeftDuring: during?.x ?? null,
        shellLeftAfter: after?.x ?? null,
      };
      if (!before || !during || !after || Math.abs(before.x - during.x) > 1 || Math.abs(before.x - after.x) > 1) {
        failures.push(formatFailure(viewport, route, "opening the full portal menu resized or shifted the game canvas"));
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
      portalNavigationOverlay,
      visualBounds,
      taskFit,
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
