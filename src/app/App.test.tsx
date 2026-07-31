import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatEnumLabel, gameCatalog } from "@/data-access/catalog";
import { createDefaultTeams } from "@/domain/team-rules";
import { useBuilderStore } from "@/features/builder/builder-store";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";

import { App } from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
  window.localStorage.clear();
  useBuilderStore.setState({
    teams: createDefaultTeams(),
    activeTeamId: "team-1",
    pickerTarget: null,
    undoSnapshot: null,
    toast: null,
    importPreview: null,
    importError: null,
    aboutOpen: false,
  });
});

function pickerCardNames() {
  return [...document.querySelectorAll<HTMLElement>(".picker-card strong")].map(
    (element) => element.textContent ?? "",
  );
}

function namesByCategory<T extends { name: string }>(
  entities: T[],
  getCategory: (entity: T) => string,
  categoryOrder: string[],
) {
  return categoryOrder.flatMap((category) =>
    entities
      .filter((entity) => getCategory(entity) === category)
      .map((entity) => entity.name)
      .sort((left, right) => left.localeCompare(right)),
  );
}

function pickerVisiblePosses() {
  return gameCatalog.entities.posses.filter(
    (posse) => !/^primordial memory(?:·|\b)/i.test(posse.name),
  );
}

describe("builder interface", () => {
  it("keeps the idle picker minimal and removes default-success copy", () => {
    const { container } = render(<App />);
    const emptyPicker = container.querySelector(".entity-picker--empty");
    const brandIcon = container.querySelector(".brand-mark");

    expect(screen.getByRole("heading", { name: "Morimen Team Builder" })).toBeInTheDocument();
    expect(brandIcon).toHaveAttribute("src", "./generated-assets/icons/game_icon.jpg");
    expect(brandIcon).toHaveAttribute("width", "32");
    expect(brandIcon).toHaveAttribute("height", "32");
    expect(
      screen.queryByText("Build faster. Keep every key piece unique. Export game-ready codes."),
    ).not.toBeInTheDocument();
    expect(emptyPicker).toBeInTheDocument();
    expect(within(emptyPicker as HTMLElement).getByRole("heading")).toHaveTextContent(
      "Select a slot to begin.",
    );
    expect(emptyPicker).not.toHaveTextContent("Contextual loadout library");
    expect(emptyPicker).not.toHaveTextContent("Filter & choose");
    expect(screen.queryByText("Code ready")).not.toBeInTheDocument();
    expect(
      within(container.querySelector(".app-header") as HTMLElement).queryByRole("button", {
        name: "Import",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(container.querySelector(".app-header") as HTMLElement).queryByRole("button", {
        name: "Reset",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(container.querySelector(".team-rail") as HTMLElement).getByRole("button", {
        name: "Reset",
      }),
    ).toBeVisible();
    expect(within(screen.getByRole("main")).getByRole("button", { name: "Import" })).toBeVisible();
  });

  it("switches to Simplified Chinese, localizes enum labels, and persists the preference", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", {
        name: "Switch to Simplified Chinese",
      }),
    );

    expect(await screen.findByRole("heading", { name: "忘却前夜队伍构筑器" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "队伍 1" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "zh-CN");
    expect(document.title).toBe("忘却前夜队伍构筑器");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      "快速、非官方的忘却前夜五队构筑工具。",
    );
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh-CN");
    expect(screen.getByRole("button", { name: "切换到英文" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "为第 1 个位置选择唤醒体" }));
    const filters = screen.getByLabelText("主要筛选");
    expect(within(filters).getByRole("button", { name: "深海" })).toBeVisible();
    expect(within(filters).getByRole("button", { name: "血肉" })).toBeVisible();
    expect(screen.getByLabelText("唤醒体 1选择器")).toBeInTheDocument();
    expect(screen.getByText("阿格里帕", { selector: ".picker-card strong" })).toBeVisible();

    const search = screen.getByRole("textbox", { name: "搜索记录" });
    await user.clear(search);
    await user.type(search, "Agrippa");
    expect(screen.getByText("阿格里帕", { selector: ".picker-card strong" })).toBeVisible();
  });

  it("confirms a rail reset and keeps the existing one-level Undo behavior", async () => {
    const user = userEvent.setup();
    const assignedTeams = createDefaultTeams();
    assignedTeams[0].slots[0].awakenerId = gameCatalog.entities.awakeners[0].id;
    useBuilderStore.setState({ teams: assignedTeams });
    const confirm = vi.spyOn(window, "confirm");
    render(<App />);

    confirm.mockReturnValueOnce(false);
    await user.click(
      within(screen.getByLabelText("Five teams")).getByRole("button", { name: "Reset" }),
    );
    expect(useBuilderStore.getState().teams[0].slots[0].awakenerId).toBe(
      gameCatalog.entities.awakeners[0].id,
    );

    confirm.mockReturnValueOnce(true);
    await user.click(
      within(screen.getByLabelText("Five teams")).getByRole("button", { name: "Reset" }),
    );
    expect(useBuilderStore.getState().teams[0].slots[0].awakenerId).toBeNull();
    expect(useBuilderStore.getState().undoSnapshot).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(useBuilderStore.getState().teams[0].slots[0].awakenerId).toBe(
      gameCatalog.entities.awakeners[0].id,
    );
  });

  it("fades the previous team out before fading the selected team in", async () => {
    const user = userEvent.setup();
    render(<App />);

    const board = screen.getByRole("main");
    await user.click(
      screen.getByText("Team 2", { selector: ".team-rail-card strong" }).closest("button")!,
    );

    expect(board).toHaveAttribute("data-team-transition", "out");
    expect(screen.getByRole("heading", { name: "Team 1" })).toBeInTheDocument();

    fireEvent.transitionEnd(board, { propertyName: "opacity" });
    expect(screen.getByRole("heading", { name: "Team 2" })).toBeInTheDocument();
    expect(board).toHaveAttribute("data-team-transition", "in");

    fireEvent.transitionEnd(board, { propertyName: "opacity" });
    expect(board).toHaveAttribute("data-team-transition", "idle");
  });

  it("renders the empty posse dock without a decorative shield", () => {
    render(<App />);

    const posseDock = screen.getByRole("button", { name: "Team posse: Empty" });
    expect(posseDock).toHaveAttribute("data-empty", "true");
    expect(posseDock.querySelector("svg")).not.toBeInTheDocument();
  });

  it("opens contextual realm filters and auto-advances from an awakener to wheel one", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /choose awakener/i })[0]);
    expect(screen.getByRole("heading", { name: "Awakener 1" })).toBeInTheDocument();
    const realmFilters = within(screen.getByLabelText("Primary filters"));
    for (const realm of gameCatalog.filters.realms) {
      expect(
        realmFilters.getByRole("button", { name: new RegExp(realm, "i") }),
      ).toBeInTheDocument();
    }

    const awakener = gameCatalog.entities.awakeners.find((entity) => entity.name === "Agrippa");
    expect(awakener).toBeDefined();
    const awakenerName = screen.getByText(awakener!.name, { selector: ".picker-card strong" });
    const awakenerCard = awakenerName.closest("button");
    expect(awakenerCard).not.toHaveTextContent(
      `${awakener!.rarity} · ${formatEnumLabel(awakener!.type)}`,
    );
    expect(awakenerCard).not.toHaveTextContent("Available");
    await user.click(awakenerName.closest("button")!);

    expect(screen.getByRole("heading", { name: "Slot 1 · Wheel 1" })).toBeInTheDocument();
    const mainstatFilters = within(screen.getByLabelText("Primary filters"));
    for (const mainstat of gameCatalog.filters.wheelMainstats) {
      expect(
        mainstatFilters.getByRole("button", {
          name: new RegExp(mainstat.replaceAll("_", " "), "i"),
        }),
      ).toBeInTheDocument();
    }
  });

  it("renders a description-free icon grid while retaining hover tooltips", async () => {
    const user = userEvent.setup();
    const awakener = gameCatalog.entities.awakeners.find((entity) => entity.name === "Agrippa")!;
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /choose awakener/i })[0]);

    const card = screen
      .getByText(awakener.name, { selector: ".picker-card strong" })
      .closest("button")!;
    expect(card).toHaveAttribute("title", awakener.description);
    expect(card.querySelector(".picker-card__description")).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(awakener.description);
    expect(card.querySelector(".picker-card__visual .entity-artwork--thumb")).toBeInTheDocument();
    const realmBadge = card.querySelector(".realm-badge--icon-only");
    expect(realmBadge).toHaveAttribute("aria-label", i18n.t(`enums.${awakener.realm}`));
    expect(realmBadge?.querySelector("span")).not.toBeInTheDocument();
  });

  it("sorts picker grids by realm, rarity, and posse category", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /choose awakener/i })[0]);
    expect(pickerCardNames()).toEqual(
      namesByCategory(
        gameCatalog.entities.awakeners,
        (entity) => entity.realm,
        gameCatalog.filters.realms,
      ),
    );

    const realmFilters = within(screen.getByLabelText("Primary filters"));
    await user.click(realmFilters.getByRole("button", { name: "Caro" }));
    expect(pickerCardNames()).toEqual(
      gameCatalog.entities.awakeners
        .filter((entity) => entity.realm === "CARO")
        .map((entity) => entity.name)
        .sort((left, right) => left.localeCompare(right)),
    );

    await user.click(realmFilters.getByRole("button", { name: "All" }));
    await user.type(screen.getByRole("textbox", { name: "Search records" }), "a");
    const searchedNames = pickerCardNames();
    const realmRank = new Map(gameCatalog.filters.realms.map((realm, index) => [realm, index]));
    const awakenersByName = new Map(
      gameCatalog.entities.awakeners.map((entity) => [entity.name, entity]),
    );
    expect(searchedNames).toEqual(
      [...searchedNames].sort((left, right) => {
        const leftEntity = awakenersByName.get(left)!;
        const rightEntity = awakenersByName.get(right)!;
        return (
          realmRank.get(leftEntity.realm)! - realmRank.get(rightEntity.realm)! ||
          left.localeCompare(right)
        );
      }),
    );

    await user.click(screen.getByRole("button", { name: "Close picker" }));
    await user.click(screen.getByRole("button", { name: "Choose wheel 1 for slot 1" }));
    expect(pickerCardNames()).toEqual(
      namesByCategory(gameCatalog.entities.wheels, (entity) => entity.rarity, [
        "SSR",
        "SR",
        "R",
        "N",
      ]),
    );

    await user.click(screen.getByRole("button", { name: "Close picker" }));
    await user.click(screen.getByRole("button", { name: "Team posse: Empty" }));
    const visiblePosses = pickerVisiblePosses();
    expect(pickerCardNames()).toEqual(
      namesByCategory(visiblePosses, (entity) => entity.realm, gameCatalog.filters.posseRealms),
    );
    expect(screen.getByText(`${String(visiblePosses.length)} records`)).toBeInTheDocument();
    for (const posse of gameCatalog.entities.posses.filter((entity) =>
      /^primordial memory(?:·|\b)/i.test(entity.name),
    )) {
      expect(screen.queryByText(posse.name)).not.toBeInTheDocument();
    }
  });

  it("marks a used awakener for replacement while preserving move behavior", async () => {
    const user = userEvent.setup();
    const awakener = gameCatalog.entities.awakeners.find((entity) => entity.name === "Agrippa")!;
    const teams = createDefaultTeams();
    teams[1].slots[0].awakenerId = awakener.id;
    useBuilderStore.setState({ teams });
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /choose awakener/i })[0]);
    await user.type(screen.getByRole("textbox", { name: "Search records" }), awakener.name);

    const resultName = screen.getByText(awakener.name, { selector: ".picker-card strong" });
    const usedCard = resultName.closest("button")!;
    expect(usedCard).toHaveClass("picker-card--used");
    expect(within(usedCard).getByText("Replace")).toBeInTheDocument();
    expect(usedCard).not.toHaveTextContent("Move from");
    await user.click(usedCard);

    expect(useBuilderStore.getState().teams[0].slots[0].awakenerId).toBe(awakener.id);
    expect(useBuilderStore.getState().teams[1].slots[0].awakenerId).toBeNull();
    expect(screen.getByText(/Moved from its previous team/)).toBeInTheDocument();
  });

  it("removes covenant readiness copy and hides Primordial Memory posses", async () => {
    const user = userEvent.setup();
    const tokenlessPosse = gameCatalog.entities.posses.find((entity) => !entity.lineupToken);
    expect(tokenlessPosse).toBeDefined();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Choose covenant for slot 1" }));
    expect(screen.queryByText("Share-code ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Available")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close picker" }));
    await user.click(screen.getByRole("button", { name: "Team posse: Empty" }));
    await user.type(screen.getByRole("textbox", { name: "Search records" }), tokenlessPosse!.name);

    expect(
      screen.queryByText(tokenlessPosse!.name, { selector: ".picker-card strong" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No matching records.")).toBeInTheDocument();
  });

  it("marks used wheels for replacement without changing wheel metadata", async () => {
    const user = userEvent.setup();
    const wheel = gameCatalog.entities.wheels[0];
    const teams = createDefaultTeams();
    teams[1].slots[0].wheelIds[0] = wheel.id;
    useBuilderStore.setState({ teams });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Choose wheel 1 for slot 1" }));
    await user.type(screen.getByRole("textbox", { name: "Search records" }), wheel.name);

    const usedCard = screen
      .getByText(wheel.name, { selector: ".picker-card strong" })
      .closest("button")!;
    expect(usedCard).toHaveClass("picker-card--used");
    expect(usedCard).toHaveTextContent("Replace");
    expect(usedCard).toHaveTextContent(wheel.rarity);
    expect(usedCard).toHaveTextContent(formatEnumLabel(wheel.mainstatKey));
    expect(usedCard).not.toHaveTextContent("Move from");
  });

  it("shows only an actionable token warning in the team rail", () => {
    const tokenlessPosse = gameCatalog.entities.posses.find((entity) => !entity.lineupToken);
    expect(tokenlessPosse).toBeDefined();
    const teams = createDefaultTeams();
    teams[0].posseId = tokenlessPosse!.id;
    useBuilderStore.setState({ teams });

    render(<App />);

    expect(screen.getByText("Token missing")).toBeInTheDocument();
    expect(screen.queryByText("Code ready")).not.toBeInTheDocument();
  });

  it("previews the documented import sample without changing teams", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("main")).getByRole("button", { name: "Import" }));
    await user.type(
      screen.getByRole("textbox", { name: "Morimens share code" }),
      "@@xjwOvyVxhvRxXro6vBnw2@@",
    );
    await user.click(screen.getByRole("button", { name: "Preview import" }));

    expect(screen.getByText("Conflicts to clear")).toBeInTheDocument();
    expect(screen.getByText("No cross-team conflicts.")).toBeInTheDocument();
    expect(useBuilderStore.getState().teams[0].slots.every((slot) => !slot.awakenerId)).toBe(true);
  });
});
