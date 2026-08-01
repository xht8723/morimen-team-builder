import { expect, test, type Page } from "@playwright/test";

async function importSampleTeam(page: Page) {
  await page.getByRole("button", { name: "Import" }).click();
  await page
    .getByRole("textbox", { name: "Morimens share code" })
    .fill("@@xjwOvyVxhvRxXro6vBnw2@@");
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText("No cross-team conflicts.")).toBeVisible();
  await page.getByRole("button", { name: "Import team" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("uses the game branding and transitions between teams", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Morimen Team Builder" })).toBeVisible();
  await expect(
    page.getByText("Build faster. Keep every key piece unique. Export game-ready codes.", {
      exact: true,
    }),
  ).toHaveCount(0);
  const brandIcon = page.locator(".brand-mark");
  await expect(brandIcon).toHaveAttribute("src", "./generated-assets/icons/game_icon.jpg");
  expect(await brandIcon.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(512);
  await expect(page.locator("link[rel='icon']")).toHaveAttribute(
    "href",
    "./generated-assets/icons/game_icon.jpg",
  );
  await expect(page.locator(".app-header").getByRole("button", { name: "Import" })).toHaveCount(0);
  await expect(page.locator(".app-header").getByRole("button", { name: "Reset" })).toHaveCount(0);
  await expect(page.locator(".team-rail").getByRole("button", { name: "Reset" })).toBeVisible();
  await expect(
    page.locator(".team-board__actions").getByRole("button", { name: "Import" }),
  ).toHaveCount(1);
  const headerMetrics = await page.evaluate(() => {
    const header = document.querySelector(".app-header")!.getBoundingClientRect();
    const brand = document.querySelector(".brand-mark")!.getBoundingClientRect();
    const dataButton = document
      .querySelector(".app-header__actions .button")!
      .getBoundingClientRect();
    return {
      headerHeight: header.height,
      brandWidth: brand.width,
      brandHeight: brand.height,
      dataButtonHeight: dataButton.height,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(headerMetrics.headerHeight).toBeLessThanOrEqual(50);
  expect(headerMetrics.brandWidth).toBeLessThanOrEqual(32);
  expect(headerMetrics.brandHeight).toBe(headerMetrics.brandWidth);
  expect(headerMetrics.dataButtonHeight).toBeLessThanOrEqual(30);
  expect(headerMetrics.overflowX).toBeLessThanOrEqual(0);

  const teamCards = page.locator(".team-rail-card");
  expect(await teamCards.count()).toBe(10);
  const board = page.locator(".team-board");

  await teamCards.nth(1).click();
  await expect(page.getByRole("heading", { name: "Team 2" })).toBeVisible();
  await expect(board).not.toHaveAttribute("data-team-transition", "out");
  await teamCards.nth(2).click();
  await expect(page.getByRole("heading", { name: "Team 3" })).toBeVisible();
  await expect(board).toHaveAttribute("data-team-transition", "idle");

  await teamCards.nth(9).click();
  await expect(page.getByRole("heading", { name: "Team 10" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Team 10" })).toBeVisible();
  const railMetrics = await page.evaluate(() => {
    const list = document.querySelector(".team-rail__list")!.getBoundingClientRect();
    const activeElement = document.querySelector<HTMLElement>(
      ".team-rail-card[data-active='true']",
    )!;
    const active = activeElement.getBoundingClientRect();
    const listElement = document.querySelector(".team-rail__list")!;
    const awakeners = activeElement.querySelector(".team-rail-card__awakeners")!;
    const wheels = activeElement.querySelector(".team-rail-card__wheels")!;
    const posse = activeElement.querySelector(".team-rail-card__posse")!;
    const contentFits = [awakeners, wheels, posse].every((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left >= active.left - 1 &&
        bounds.right <= active.right + 1 &&
        bounds.top >= active.top - 1 &&
        bounds.bottom <= active.bottom + 1
      );
    });
    return {
      activeTop: active.top,
      activeRight: active.right,
      activeBottom: active.bottom,
      listTop: list.top,
      listRight: list.right,
      listBottom: list.bottom,
      scrollHeight: listElement.scrollHeight,
      clientHeight: listElement.clientHeight,
      scrollWidth: listElement.scrollWidth,
      clientWidth: listElement.clientWidth,
      activeClientHeight: activeElement.clientHeight,
      activeScrollHeight: activeElement.scrollHeight,
      awakenersDisplay: getComputedStyle(awakeners).display,
      wheelsDisplay: getComputedStyle(wheels).display,
      posseDisplay: getComputedStyle(posse).display,
      awakenerCount: activeElement.querySelectorAll(".team-rail-card__awakener").length,
      wheelCount: activeElement.querySelectorAll(".team-rail-card__wheel").length,
      contentFits,
    };
  });
  expect(railMetrics.activeTop).toBeGreaterThanOrEqual(railMetrics.listTop - 1);
  expect(railMetrics.activeRight).toBeLessThanOrEqual(railMetrics.listRight + 1);
  expect(railMetrics.activeBottom).toBeLessThanOrEqual(railMetrics.listBottom + 1);
  expect(railMetrics.activeScrollHeight).toBeLessThanOrEqual(railMetrics.activeClientHeight + 1);
  expect(railMetrics.awakenersDisplay).not.toBe("none");
  expect(railMetrics.wheelsDisplay).not.toBe("none");
  expect(railMetrics.posseDisplay).not.toBe("none");
  expect(railMetrics.awakenerCount).toBe(4);
  expect(railMetrics.wheelCount).toBe(8);
  expect(railMetrics.contentFits).toBe(true);
  if (testInfo.project.name === "desktop") {
    expect(railMetrics.scrollHeight).toBeGreaterThan(railMetrics.clientHeight);
  } else {
    expect(railMetrics.scrollWidth).toBeGreaterThan(railMetrics.clientWidth);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await teamCards.nth(0).click();
  await expect(page.getByRole("heading", { name: "Team 1" })).toBeVisible();
  await expect(board).toHaveAttribute("data-team-transition", "idle");
});

test("switches to Simplified Chinese and preserves it across reloads", async ({ page }) => {
  await page.getByRole("button", { name: "Switch to Simplified Chinese" }).click();

  await expect(page.getByRole("heading", { name: "忘却前夜队伍构筑器" })).toBeVisible();
  await expect(page.getByRole("button", { name: "切换到英文" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator(".team-rail__heading")).toContainText("十队阵容");

  await page.getByRole("button", { name: "为第 1 个位置选择唤醒体" }).click();
  const pickerMotion = await page
    .locator(".entity-picker:not(.entity-picker--empty)")
    .evaluate((element) => ({
      animationName: getComputedStyle(element).animationName,
      animationDuration: getComputedStyle(element).animationDuration,
    }));
  expect(pickerMotion.animationName).toBe("entity-picker-fade-in");
  expect(pickerMotion.animationDuration).not.toBe("0s");
  await expect(page.getByLabel("主要筛选").getByRole("button", { name: "深海" })).toBeVisible();
  await expect(page.getByLabel("主要筛选").getByRole("button", { name: "血肉" })).toBeVisible();

  const chineseLayout = await page.evaluate(() => {
    const header = document.querySelector(".app-header")!.getBoundingClientRect();
    const actions = document.querySelector(".app-header__actions")!.getBoundingClientRect();
    return {
      headerHeight: header.height,
      actionsRight: actions.right,
      headerRight: header.right,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(chineseLayout.headerHeight).toBeLessThanOrEqual(50);
  expect(chineseLayout.actionsRight).toBeLessThanOrEqual(chineseLayout.headerRight);
  expect(chineseLayout.overflowX).toBeLessThanOrEqual(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "忘却前夜队伍构筑器" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("builds a slot, auto-advances, and restores it after reload", async ({ page }) => {
  await page.locator(".awakener-slot").first().click();
  const firstRealmFilter = page.getByLabel("Primary filters").getByRole("button", { name: "All" });
  await expect(firstRealmFilter).toBeVisible();
  const filterBox = await firstRealmFilter.boundingBox();
  expect(filterBox?.height).toBeGreaterThanOrEqual(27);

  await page.getByRole("textbox", { name: "Search records" }).fill("Agrippa");
  await page.locator(".picker-card", { hasText: "Agrippa" }).click();

  await expect(page.getByRole("heading", { name: "Slot 1 · Wheel 1" })).toBeVisible();
  await expect(page.locator(".loadout-card").first()).toContainText("Agrippa");

  await page.reload();
  await expect(page.locator(".loadout-card").first()).toContainText("Agrippa");
});

test("previews and imports a documented game share code", async ({ page }) => {
  await importSampleTeam(page);

  await expect(page.getByText(/Team imported/)).toBeVisible();
  await expect(page.locator(".loadout-card").first()).not.toContainText("Choose awakener");
});

test("supports a keyboard-first mobile picker flow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only smoke flow");

  await page.locator(".awakener-slot").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Awakener 1" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search records" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Awakener 1" })).toBeHidden();
});

test("adapts the formation from four columns to a single phone column", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop project controls viewport widths");

  await page.setViewportSize({ width: 2200, height: 1100 });
  const wideCards = await page
    .locator(".formation-card")
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  expect(new Set(wideCards).size).toBe(1);
  const equipmentScale = await page.locator(".formation-card").evaluateAll((cards) => {
    const covenant = cards[0].querySelector(".formation-card__covenant")!;
    const wheel = cards[0].querySelector(".formation-card__wheel")!;
    return {
      covenant: covenant.getBoundingClientRect().width,
      wheel: wheel.getBoundingClientRect().width,
    };
  });
  expect(equipmentScale.covenant / equipmentScale.wheel).toBeGreaterThanOrEqual(0.5);
  expect(equipmentScale.covenant / equipmentScale.wheel).toBeLessThanOrEqual(0.75);

  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator(".team-rail__reset")).toBeVisible();
  const compactCards = await page
    .locator(".formation-card")
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  expect(compactCards[0]).toBe(compactCards[1]);
  expect(compactCards[2]).toBeGreaterThan(compactCards[0]);

  await page.setViewportSize({ width: 412, height: 860 });
  await expect(page.locator(".team-rail__heading")).toBeVisible();
  await expect(page.locator(".team-rail__reset")).toBeVisible();
  const phoneCards = await page
    .locator(".formation-card")
    .evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  expect(phoneCards[1]).toBeGreaterThan(phoneCards[0]);
  expect(phoneCards[2]).toBeGreaterThan(phoneCards[1]);
  expect(phoneCards[3]).toBeGreaterThan(phoneCards[2]);

  const posseDock = page.locator(".posse-dock");
  await expect(posseDock).toBeVisible();
  expect((await posseDock.boundingBox())!.y).toBeGreaterThan(
    (await page.locator(".formation-card").last().boundingBox())!.y,
  );
});

test("keeps dense picker tiles contained at every responsive breakpoint", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop project controls viewport widths");

  await importSampleTeam(page);
  const teamCards = page.locator(".team-rail-card");
  expect(await teamCards.count()).toBe(10);
  await teamCards.nth(1).click();

  const awakenerSlots = page.locator(".awakener-slot");
  expect(await awakenerSlots.count()).toBe(4);
  await awakenerSlots.first().click();
  await expect(page.getByRole("heading", { name: "Awakener 1" })).toBeVisible();
  await expect(page.getByText("Available", { exact: true })).toHaveCount(0);

  for (const viewport of [
    { width: 2200, height: 1100 },
    { width: 1366, height: 900 },
    { width: 1084, height: 920 },
    { width: 1020, height: 820 },
    { width: 700, height: 820 },
    { width: 390, height: 780 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => {
      const grid = document.querySelector(".picker-grid")!;
      const gridRect = grid.getBoundingClientRect();
      const cards = [...document.querySelectorAll(".picker-card")].slice(0, 24);
      const firstTop = cards[0]?.getBoundingClientRect().top ?? 0;
      return {
        documentOverflowX: document.documentElement.scrollWidth - window.innerWidth,
        visibleDescriptionCount: document.querySelectorAll(".picker-card__description").length,
        firstRowColumns: cards.filter(
          (card) => Math.abs(card.getBoundingClientRect().top - firstTop) <= 1,
        ).length,
        cards: cards.map((card) => {
          const cardRect = card.getBoundingClientRect();
          const footerRect = card.querySelector(".picker-card__footer")?.getBoundingClientRect();
          const name = card.querySelector(".picker-card__body > strong") as HTMLElement | null;
          const nameLineHeight = name ? Number.parseFloat(getComputedStyle(name).lineHeight) : 0;
          const artRect = card.querySelector(".entity-artwork")?.getBoundingClientRect();
          const visualRect = card.querySelector(".picker-card__visual")?.getBoundingClientRect();
          const title = card.getAttribute("title") ?? "";
          return {
            cardLeft: cardRect.left,
            cardRight: cardRect.right,
            footerBottom: footerRect?.bottom ?? cardRect.bottom,
            cardBottom: cardRect.bottom,
            nameHeight: name?.clientHeight ?? 0,
            nameTwoLines: nameLineHeight * 2,
            artWidth: artRect?.width ?? 0,
            artHeight: artRect?.height ?? 0,
            visualLeft: visualRect?.left ?? cardRect.left,
            visualRight: visualRect?.right ?? cardRect.right,
            titleLength: title.length,
          };
        }),
        gridLeft: gridRect.left,
        gridRight: gridRect.right,
      };
    });

    expect(metrics.documentOverflowX).toBeLessThanOrEqual(0);
    expect(metrics.visibleDescriptionCount).toBe(0);
    expect(metrics.firstRowColumns).toBeGreaterThanOrEqual(3);
    for (const card of metrics.cards) {
      expect(card.footerBottom).toBeLessThanOrEqual(card.cardBottom + 1);
      expect(card.cardLeft).toBeGreaterThanOrEqual(metrics.gridLeft - 1);
      expect(card.cardRight).toBeLessThanOrEqual(metrics.gridRight + 1);
      expect(card.nameHeight).toBeLessThanOrEqual(card.nameTwoLines + 1);
      expect(Math.abs(card.artWidth - card.artHeight)).toBeLessThanOrEqual(1);
      expect(card.visualLeft).toBeGreaterThanOrEqual(card.cardLeft);
      expect(card.visualRight).toBeLessThanOrEqual(card.cardRight);
      expect(card.titleLength).toBeGreaterThan(0);
    }
  }

  const usedCard = page.locator(".picker-card--used").first();
  await expect(usedCard).toBeVisible();
  await expect(page.getByText("Move from", { exact: false })).toHaveCount(0);
  const replaceOverlay = usedCard.locator(".picker-card__used-overlay");
  expect(await replaceOverlay.evaluate((element) => getComputedStyle(element).opacity)).toBe("0");
  await usedCard.hover();
  await expect
    .poll(() => replaceOverlay.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
  await usedCard.focus();
  await expect
    .poll(() => replaceOverlay.evaluate((element) => getComputedStyle(element).opacity))
    .toBe("1");
});

test("uses icon-only picker realms and centers iconless posse badges", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop project controls visual geometry");

  await page.getByRole("button", { name: "Team posse: Empty" }).click();

  const iconOnlyBadge = page.locator(".picker-card .realm-badge--icon-only").first();
  await expect(iconOnlyBadge).toBeVisible();
  await expect(iconOnlyBadge).toHaveAttribute("aria-label", /Aequor|Caro|Chaos|Ultra/);
  await expect(iconOnlyBadge.locator("span")).toHaveCount(0);
  const iconGeometry = await iconOnlyBadge.evaluate((element) => {
    const badge = element.getBoundingClientRect();
    const icon = element.querySelector("img")!.getBoundingClientRect();
    return {
      badgeWidth: badge.width,
      iconWidth: icon.width,
      iconHeight: icon.height,
      background: getComputedStyle(element).backgroundColor,
      borderWidth: getComputedStyle(element).borderTopWidth,
      boxShadow: getComputedStyle(element).boxShadow,
      horizontalCenterOffset: Math.abs(icon.x + icon.width / 2 - (badge.x + badge.width / 2)),
      verticalCenterOffset: Math.abs(icon.y + icon.height / 2 - (badge.y + badge.height / 2)),
    };
  });
  expect(iconGeometry.badgeWidth).toBe(24);
  expect(iconGeometry.iconWidth).toBe(24);
  expect(iconGeometry.iconHeight).toBe(iconGeometry.iconWidth);
  expect(iconGeometry.horizontalCenterOffset).toBeLessThanOrEqual(1);
  expect(iconGeometry.verticalCenterOffset).toBeLessThanOrEqual(1);
  expect(iconGeometry.background).toBe("rgba(0, 0, 0, 0)");
  expect(iconGeometry.borderWidth).toBe("0px");
  expect(iconGeometry.boxShadow).toBe("none");

  for (const label of ["Other", "FL"]) {
    const badge = page.locator(".picker-card .realm-badge--text-only", { hasText: label }).first();
    await expect(badge).toBeVisible();
    if (label === "FL") await expect(badge).toHaveAttribute("aria-label", "Faded Legacy");

    const insets = await badge.evaluate((element) => {
      const badgeRect = element.getBoundingClientRect();
      const textRect = element.querySelector("span")!.getBoundingClientRect();
      return {
        left: textRect.left - badgeRect.left,
        right: badgeRect.right - textRect.right,
      };
    });

    expect(Math.abs(insets.left - insets.right)).toBeLessThanOrEqual(1);
  }

  await expect(page.locator(".picker-card", { hasText: "Primordial Memory" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search records" }).fill("Primordial Memory");
  await expect(page.locator(".picker-card")).toHaveCount(0);
  await expect(page.getByText("No matching records.")).toBeVisible();
});

test("animates empty and filled selection slots and respects reduced motion", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop project controls hover behavior");

  const emptySlots = [
    page.locator(".awakener-slot[data-empty='true']").first(),
    page.locator(".formation-card__wheel[data-empty='true']").first(),
    page.locator(".formation-card__covenant[data-empty='true']").first(),
    page.locator(".posse-slot[data-empty='true']"),
  ];

  for (const slot of emptySlots) {
    await slot.hover();
    await expect
      .poll(() => slot.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe("none");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBe(0);
  }

  await emptySlots[1].focus();
  await expect
    .poll(() => emptySlots[1].evaluate((element) => getComputedStyle(element).transform))
    .not.toBe("none");

  await importSampleTeam(page);
  const filledSlots = [
    page.locator(".awakener-slot[data-empty='false']").first(),
    page.locator(".formation-card__wheel[data-empty='false']").first(),
    page.locator(".formation-card__covenant[data-empty='false']").first(),
    page.locator(".posse-slot[data-empty='false']"),
  ];

  for (const slot of filledSlots) {
    await slot.hover();
    await expect
      .poll(() => slot.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe("none");
  }

  await page.evaluate(() => window.localStorage.clear());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();

  const reducedMotionSlot = page.locator(".awakener-slot[data-empty='true']").first();
  await reducedMotionSlot.hover();
  expect(await reducedMotionSlot.evaluate((element) => getComputedStyle(element).transform)).toBe(
    "none",
  );
  expect(
    await reducedMotionSlot.evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe("none");
});
