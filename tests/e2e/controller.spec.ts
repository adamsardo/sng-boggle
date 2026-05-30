import { expect, test, type Page } from "@playwright/test";

const controllerUrl = "/controller/local?duration=30";

test.describe("local controller prototype", () => {
  test("tap word accepts a valid word", async ({ page }) => {
    await openController(page);
    await tapWord(page, [
      [0, 0],
      [0, 1],
      [0, 2],
    ]);

    await expect(page.getByTestId("feedback")).toContainText("Added CAR.");
    await expect(page.getByTestId("found-count")).toHaveText("1");
  });

  test("swipe word accepts a valid word", async ({ page }) => {
    await openController(page);
    await swipeWord(page, [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ]);

    await expect(page.getByTestId("feedback")).toContainText("Added SEND.");
    await expect(page.getByTestId("found-count")).toHaveText("1");
  });

  test("swipe over the current tile does not show a reused-tile error", async ({ page }) => {
    await openController(page);

    const first = await centerOfTile(page, 0, 0);
    const second = await centerOfTile(page, 0, 1);

    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    await page.mouse.move(first.x + 24, first.y, { steps: 4 });
    await page.mouse.move(second.x, second.y, { steps: 4 });

    await expect(page.getByTestId("current-word")).toContainText("CA");
    await expect(page.getByTestId("feedback")).not.toContainText("A tile can only be used once.");

    await page.mouse.up();
  });

  test("fixed-board dictionary accepts MAT", async ({ page }) => {
    await openController(page);
    await tapWord(page, [
      [3, 0],
      [3, 1],
      [3, 2],
    ]);

    await expect(page.getByTestId("feedback")).toContainText("Added MAT.");
    await expect(page.getByTestId("found-count")).toHaveText("1");
  });

  test("invalid non-adjacent path is rejected", async ({ page }) => {
    await openController(page);
    await tile(page, 0, 0).click();
    await tile(page, 0, 3).click();

    await expect(page.getByTestId("feedback")).toContainText("Tiles must be adjacent.");
    await expect(page.getByTestId("current-word")).toContainText("C");
  });

  test("duplicate submission is rejected", async ({ page }) => {
    await openController(page);
    await tapWord(page, [
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
    await tapWord(page, [
      [0, 0],
      [0, 1],
      [0, 2],
    ]);

    await expect(page.getByTestId("feedback")).toContainText("Already found.");
    await expect(page.getByTestId("found-count")).toHaveText("1");
  });

  test("hint request reveals a sequential hint path", async ({ page }) => {
    await openController(page);
    await page.getByTestId("hint-button").click();

    await expect(page.getByTestId("hint-status")).toContainText("Hint: 4 letters");
    await expect(page.getByTestId("hint-status")).toHaveAttribute("data-hint-mode", "sequence");
    await expect(tile(page, 0, 0)).toHaveAttribute("data-hinted", "true");
  });

  test("keyboard path can submit a word", async ({ page }) => {
    await openController(page);
    await page.keyboard.press("c");
    await page.keyboard.press("a");
    await page.keyboard.press("r");
    await expect(page.getByTestId("current-word")).toContainText("CAR");
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("feedback")).toContainText("Added CAR.");
  });

  test("complete local round reaches results", async ({ page }) => {
    await openController(page);
    await tapWord(page, [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    await page.getByRole("button", { name: "End round" }).click();

    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(page.getByTestId("result-word-count")).toHaveText("1");
  });

  test("captures core controller screenshots", async ({ page }, testInfo) => {
    await openController(page);
    await attachScreenshot(page, testInfo, "controller-initial");

    await tapWord(page, [
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
    await attachScreenshot(page, testInfo, "controller-accepted");

    await page.getByTestId("hint-button").click();
    await attachScreenshot(page, testInfo, "controller-hint");

    await page.getByRole("button", { name: "End round" }).click();
    await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
    await attachScreenshot(page, testInfo, "controller-results");
  });
});

test.describe("reduced motion", () => {
  test("hint request reveals the full path without sequential animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openController(page);
    await page.getByTestId("hint-button").click();

    await expect(page.getByTestId("hint-status")).toHaveAttribute("data-hint-mode", "static");
    await expect(tile(page, 0, 0)).toHaveAttribute("data-hinted", "true");
    await expect(tile(page, 0, 1)).toHaveAttribute("data-hinted", "true");
    await expect(tile(page, 0, 2)).toHaveAttribute("data-hinted", "true");
    await expect(tile(page, 0, 3)).toHaveAttribute("data-hinted", "true");
  });
});

test("stage route renders the fixed board", async ({ page }) => {
  await page.goto("/stage/local");

  await expect(page.getByTestId("stage-board")).toBeVisible();
  await expect(page.getByTestId("stage-board").locator("span")).toHaveCount(16);
});

async function openController(page: Page) {
  await page.goto(controllerUrl);
  await expect(page.getByTestId("controller-board")).toBeVisible();
}

async function tapWord(page: Page, coords: [number, number][]) {
  for (const [row, col] of coords) {
    await tile(page, row, col).click();
  }
  await page.getByRole("button", { name: "Submit" }).click();
}

async function swipeWord(page: Page, coords: [number, number][]) {
  const boxes = await Promise.all(coords.map(([row, col]) => centerOfTile(page, row, col)));

  await page.mouse.move(boxes[0]!.x, boxes[0]!.y);
  await page.mouse.down();
  for (const box of boxes.slice(1)) {
    await page.mouse.move(box.x, box.y, { steps: 8 });
  }
  await page.mouse.up();
}

function tile(page: Page, row: number, col: number) {
  return page.getByTestId(`tile-${row}-${col}`);
}

async function centerOfTile(page: Page, row: number, col: number) {
  const box = await tile(page, row, col).boundingBox();
  if (!box) throw new Error(`Missing tile box ${row},${col}`);
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

async function attachScreenshot(
  page: Page,
  testInfo: { attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void> },
  name: string,
) {
  await testInfo.attach(name, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
}
