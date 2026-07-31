import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@/i18n";

import { gameCatalog } from "@/data-access/catalog";
import type { LoadoutSlot, PickerTarget } from "@/domain/types";

import { GameLoadoutCard } from "./GameLoadoutCard";

afterEach(cleanup);

function createSlot(): LoadoutSlot {
  return {
    awakenerId: null,
    wheelIds: [null, null],
    covenantId: null,
  };
}

describe("game-style loadout card", () => {
  it("uses full artwork for the awakener and both wheels without rendering stat metadata", () => {
    const awakener = gameCatalog.entities.awakeners[0];
    const wheels = gameCatalog.entities.wheels.slice(0, 2);
    const covenant = gameCatalog.entities.covenants[0];
    const slot: LoadoutSlot = {
      awakenerId: awakener.id,
      wheelIds: [wheels[0].id, wheels[1].id],
      covenantId: covenant.id,
    };

    const { container } = render(
      <GameLoadoutCard teamId="team-1" slot={slot} slotIndex={0} onOpenPicker={vi.fn()} />,
    );

    expect(
      screen
        .getByRole("button", { name: `Awakener slot 1: ${awakener.name}` })
        .querySelector("img"),
    ).toHaveAttribute("src", awakener.assets.full);

    for (const [wheelIndex, wheel] of wheels.entries()) {
      expect(
        screen
          .getByRole("button", {
            name: `Slot 1, wheel ${String(wheelIndex + 1)}: ${wheel.name}`,
          })
          .querySelector("img"),
      ).toHaveAttribute("src", wheel.assets.full);
    }

    expect(container).not.toHaveTextContent(awakener.rarity);
    expect(container).not.toHaveTextContent(awakener.type);
    expect(container).not.toHaveTextContent(wheels[0].mainstatKey);
  });

  it("keeps all four empty controls keyboard accessible and opens their existing targets", async () => {
    const user = userEvent.setup();
    const onOpenPicker = vi.fn<(target: PickerTarget) => void>();

    render(
      <GameLoadoutCard
        teamId="team-3"
        slot={createSlot()}
        slotIndex={2}
        onOpenPicker={onOpenPicker}
      />,
    );

    const controls = [
      screen.getByRole("button", { name: "Choose awakener for slot 3" }),
      screen.getByRole("button", { name: "Choose wheel 1 for slot 3" }),
      screen.getByRole("button", { name: "Choose wheel 2 for slot 3" }),
      screen.getByRole("button", { name: "Choose covenant for slot 3" }),
    ];

    for (const control of controls) {
      control.focus();
      await user.keyboard("{Enter}");
    }

    expect(onOpenPicker.mock.calls.map(([target]) => target)).toEqual([
      { kind: "awakener", teamId: "team-3", slotIndex: 2 },
      { kind: "wheel", teamId: "team-3", slotIndex: 2, wheelIndex: 0 },
      { kind: "wheel", teamId: "team-3", slotIndex: 2, wheelIndex: 1 },
      { kind: "covenant", teamId: "team-3", slotIndex: 2 },
    ]);
  });
});
