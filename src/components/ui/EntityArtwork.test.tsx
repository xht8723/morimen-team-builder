import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import i18n from "@/i18n";
import { RealmBadge } from "./EntityArtwork";

afterEach(cleanup);
beforeEach(async () => {
  await i18n.changeLanguage("en");
});

describe("realm badge", () => {
  it("marks iconless posse realms as centered text-only badges", () => {
    const { container } = render(
      <>
        <RealmBadge realm="OTHER" iconOnly />
        <RealmBadge realm="FADED_LEGACY" iconOnly />
        <RealmBadge realm="CHAOS" iconOnly />
        <RealmBadge realm="FADED_LEGACY" />
        <RealmBadge realm="CHAOS" />
      </>,
    );

    const otherBadge = screen.getByText("Other").parentElement;
    expect(otherBadge).toHaveClass("realm-badge--text-only");
    expect(otherBadge?.querySelector("img")).not.toBeInTheDocument();

    const compactFadedLegacy = screen.getByText("FL").parentElement;
    expect(compactFadedLegacy).toHaveClass("realm-badge--text-only");
    expect(compactFadedLegacy).toHaveAttribute("aria-label", "Faded Legacy");
    expect(compactFadedLegacy?.querySelector("img")).not.toBeInTheDocument();

    const fullFadedLegacy = screen.getByText("Faded Legacy").parentElement;
    expect(fullFadedLegacy).not.toHaveAttribute("aria-label");

    const iconOnlyChaos = container.querySelector(".realm-badge--icon-only");
    expect(iconOnlyChaos).toHaveAttribute("aria-label", "Chaos");
    expect(iconOnlyChaos?.querySelector("img")).toBeInTheDocument();
    expect(iconOnlyChaos?.querySelector("img")).toHaveAttribute(
      "src",
      "./generated-assets/ui/realm-icon-chaos.png",
    );
    expect(iconOnlyChaos?.querySelector("span")).not.toBeInTheDocument();

    const labeledChaos = screen.getByText("Chaos").parentElement;
    expect(labeledChaos).not.toHaveClass("realm-badge--icon-only");
    expect(labeledChaos?.querySelector("img")).toBeInTheDocument();
  });

  it("localizes visible and accessible realm labels in Chinese", async () => {
    await i18n.changeLanguage("zh-CN");
    render(
      <>
        <RealmBadge realm="OTHER" iconOnly />
        <RealmBadge realm="FADED_LEGACY" iconOnly />
        <RealmBadge realm="FADED_LEGACY" />
        <RealmBadge realm="CHAOS" iconOnly />
        <RealmBadge realm="CHAOS" />
      </>,
    );

    expect(screen.getByText("其他")).toBeInTheDocument();
    expect(screen.getByText("FL").parentElement).toHaveAttribute("aria-label", "忘却篇");
    expect(screen.getByText("忘却篇")).toBeInTheDocument();
    expect(document.querySelector(".realm-badge--icon-only")).toHaveAttribute("aria-label", "混沌");
    expect(screen.getByText("混沌")).toBeInTheDocument();
  });
});
