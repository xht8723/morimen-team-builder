import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { recommendedTeams } from "@/data-access/recommended-teams";
import { createDefaultTeams } from "@/domain/team-rules";
import { useBuilderStore } from "@/features/builder/builder-store";
import i18n from "@/i18n";

import { RecommendedTeamsView } from "./RecommendedTeamsView";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
  window.localStorage.clear();
  const teams = createDefaultTeams();
  teams[0].name = "Kept formation";
  useBuilderStore.setState({
    teams,
    activeTeamId: "team-1",
    pickerTarget: null,
    undoSnapshot: null,
    toast: null,
    importPreview: null,
    importError: null,
  });
});

describe("recommended teams", () => {
  it("switches tabs, copies the stored code, and preserves builder state", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<App />);
    const builderTab = screen.getByRole("tab", { name: "Team Builder" });
    const recommendedTab = screen.getByRole("tab", { name: "Recommended Teams" });
    expect(builderTab).toHaveAttribute("aria-selected", "true");
    expect(recommendedTab).toHaveAttribute("aria-selected", "false");

    useBuilderStore.setState({
      pickerTarget: { kind: "awakener", teamId: "team-1", slotIndex: 0 },
    });
    await user.click(recommendedTab);

    expect(recommendedTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("Test catalog")).not.toBeInTheDocument();
    expect(screen.queryByText(/sample formation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sample teams/i)).not.toBeInTheDocument();
    expect(useBuilderStore.getState().pickerTarget).toBeNull();
    const firstCard = screen.getByRole("article", { name: "1T GLotan" });
    await user.click(within(firstCard).getByRole("button", { name: "Copy code" }));

    expect(clipboardWrite).toHaveBeenCalledWith("@@xtW4mzeXxJy7yi7aabkka7@@");
    expect(recommendedTeams).toHaveLength(6);
    expect(within(firstCard).getByRole("button", { name: "Copied" })).toBeVisible();
    expect(useBuilderStore.getState().teams[0].name).toBe("Kept formation");

    await user.click(builderTab);
    expect(screen.getByRole("heading", { name: "Kept formation" })).toBeVisible();
    expect(useBuilderStore.getState().teams[0].name).toBe("Kept formation");
  });

  it("supports keyboard navigation between the top-level tabs", async () => {
    const user = userEvent.setup();
    render(<App />);
    const builderTab = screen.getByRole("tab", { name: "Team Builder" });
    builderTab.focus();

    await user.keyboard("{ArrowRight}");
    const recommendedTab = screen.getByRole("tab", { name: "Recommended Teams" });
    expect(recommendedTab).toHaveFocus();
    expect(recommendedTab).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(builderTab).toHaveFocus();
    expect(builderTab).toHaveAttribute("aria-selected", "true");
  });

  it("localizes recommendation metadata and reports clipboard failures", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("denied"));
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Switch to Simplified Chinese" }));
    await user.click(screen.getByRole("tab", { name: "推荐队伍" }));
    const firstCard = screen.getByRole("article", { name: "1T神鲸" });
    expect(firstCard).toHaveTextContent("配合阿拉克涅提供的超额指令卡增伤");
    expect(within(firstCard).getByRole("heading", { name: "核心思路", level: 4 })).toBeVisible();
    expect(within(firstCard).getByText("伤害极高，1T2T轻松删除道中").closest("li")).not.toBeNull();
    expect(screen.queryByText("示例编队")).not.toBeInTheDocument();
    await user.click(within(firstCard).getByRole("button", { name: "复制代码" }));
    expect(within(firstCard).getByRole("status")).toHaveTextContent("无法访问剪贴板。");
  });

  it("renders an actionable empty state", () => {
    render(<RecommendedTeamsView teams={[]} />);
    expect(screen.getByRole("heading", { name: "No recommended teams yet" })).toBeVisible();
    expect(screen.getByText(/data\/recommended-teams\.json/)).toBeVisible();
  });
});
