import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Modal } from "./Modal";

afterEach(cleanup);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="modal-title">
        <h2 id="modal-title">Modal title</h2>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>
    </>
  );
}

function NestedHarness() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuterOpen(true)}>
        Open outer
      </button>
      <Modal open={outerOpen} onClose={() => setOuterOpen(false)} labelledBy="outer-title">
        <h2 id="outer-title">Outer</h2>
        <button type="button" onClick={() => setInnerOpen(true)}>
          Open inner
        </button>
      </Modal>
      <Modal open={innerOpen} onClose={() => setInnerOpen(false)} labelledBy="inner-title">
        <h2 id="inner-title">Inner</h2>
        <button type="button">Inner action</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("cycles focus within the panel and restores the opener", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);

    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });
    expect(first).toHaveFocus();
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes only the top modal on Escape", async () => {
    const user = userEvent.setup();
    render(<NestedHarness />);
    await user.click(screen.getByRole("button", { name: "Open outer" }));
    await user.click(screen.getByRole("button", { name: "Open inner" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Inner" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Outer" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Outer" })).not.toBeInTheDocument();
  });
});
