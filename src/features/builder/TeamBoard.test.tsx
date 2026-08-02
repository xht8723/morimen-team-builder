import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultTeams } from "@/domain/team-rules";

import { TeamBoard } from "./TeamBoard";

afterEach(cleanup);

function renderBoard(overrides: Partial<Parameters<typeof TeamBoard>[0]> = {}) {
  const props: Parameters<typeof TeamBoard>[0] = {
    team: createDefaultTeams()[0],
    teamNumber: 1,
    onOpenPicker: vi.fn(),
    onRename: vi.fn(),
    onClearTeam: vi.fn(),
    onImport: vi.fn(),
    onNotify: vi.fn(),
    ...overrides,
  };
  render(<TeamBoard {...props} />);
  return props;
}

describe("TeamBoard", () => {
  it("cancels a rename on Escape without committing the draft", async () => {
    const user = userEvent.setup();
    const props = renderBoard();
    await user.click(screen.getByRole("button", { name: "Rename team" }));
    const input = screen.getByRole("textbox", { name: "Team name" });
    await user.clear(input);
    await user.type(input, "Discard me");
    await user.keyboard("{Escape}");

    expect(props.onRename).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Team 1" })).toBeInTheDocument();
  });

  it("reports clipboard rejection without leaving copied state behind", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const props = renderBoard();
    await user.click(screen.getByRole("button", { name: "Copy code" }));

    expect(writeText).toHaveBeenCalledOnce();
    expect(props.onNotify).toHaveBeenCalledWith("Clipboard access failed. Copy the code manually.");
    expect(screen.getByRole("button", { name: "Copy code" })).toHaveTextContent("Copy code");
  });
});
