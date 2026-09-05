import { test, expect, type Page } from "@playwright/test";

async function settings(page: Page, rarity: string, connection = "normal") {
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByLabel("Preview rarity").selectOption(rarity);
  await page.getByLabel("Preview connection").selectOption(connection);
  await page.getByRole("button", { name: "Close dialog" }).click();
}

test("desktop imagery, lever click, skip and recent moments", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Borrow a little tomorrow." }),
  ).toBeVisible();
  const action = (await page
    .getByRole("button", { name: "Pull the lever", exact: true })
    .boundingBox())!;
  expect(action.y + action.height).toBeLessThan(1000);
  await page.screenshot({ path: "artifacts/desktop-idle.png", fullPage: true });
  await page.getByRole("button", { name: "Pull the Aether lever" }).click();
  await expect(page.getByRole("button", { name: "Reveal now" })).toBeVisible();
  await page.waitForTimeout(4500);
  await page.screenshot({
    path: "artifacts/five-star-seal.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reveal now" }).click();
  await expect(
    page.getByRole("heading", { name: "Veri's Last Word" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/desktop-reveal.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Recent moments" }).click();
  await expect(
    page.getByRole("dialog").getByText("Veri's Last Word"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("short drag cancels; full drag commits exactly once", async ({ page }) => {
  await page.goto("/");
  const lever = page.getByRole("button", { name: "Pull the Aether lever" });
  const box = (await lever.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 15, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("heading", { name: "Borrow a little tomorrow." }),
  ).toBeVisible();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 110, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Reveal now" })).toBeVisible();
  await page.getByRole("button", { name: "Reveal now" }).click();
  await expect(
    page.getByRole("button", { name: "Recent moments" }),
  ).toContainText("1");
});

test("all rarity timelines finish naturally and preserve the selected reward", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  for (const [rarity, name] of [
    ["rare", "Borrowed Starlight"],
    ["epic", "Tenko Echo"],
    ["mythic", "Veri's Last Word"],
  ]) {
    await settings(page, rarity);
    await page.getByRole("button", { name: "Pull the Aether lever" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Keep this moment" }),
    ).toBeVisible({ timeout: 14000 });
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await page.getByRole("button", { name: "Keep this moment" }).click();
  }
});

test("slow request stays pending, error retry uses same reward tier", async ({
  page,
}) => {
  await page.goto("/");
  await settings(page, "epic", "slow");
  await page
    .getByRole("button", { name: "Pull the lever", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Listening to the Aether" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Reveal now" })).toBeVisible({
    timeout: 9000,
  });
  await page.getByRole("button", { name: "Reveal now" }).click();
  await page.getByRole("button", { name: "Keep this moment" }).click();
  await settings(page, "mythic", "error");
  await page
    .getByRole("button", { name: "Pull the lever", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry this pull" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("Preview rarity")).toBeDisabled();
  await page.getByLabel("Preview connection").selectOption("normal");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Retry this pull" }).click();
  await page.getByRole("button", { name: "Reveal now" }).click();
  await expect(
    page.getByRole("heading", { name: "Veri's Last Word" }),
  ).toBeVisible();
});

test("mobile fit, reduced motion, focus trap, preferences survive refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.screenshot({ path: "artifacts/mobile-idle.png", fullPage: true });
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("checkbox", { name: /Quiet motion/ }),
  ).toBeChecked();
  await page.getByLabel("Preview rarity").selectOption("epic");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Pull the lever", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Keep this moment" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/mobile-reveal.png",
    fullPage: true,
  });
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(horizontalOverflow).toBe(false);
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("checkbox", { name: /Sound/ }).check();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mute sound" })).toBeVisible();
});
