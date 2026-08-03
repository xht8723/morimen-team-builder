import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecommendedSummary } from "./RecommendedSummary";

afterEach(cleanup);

describe("RecommendedSummary", () => {
  it("renders safe GitHub Flavored Markdown with accessible heading levels", () => {
    render(
      <RecommendedSummary
        markdown={[
          "### Strategy",
          "",
          "Use **bold**, *italic*, and ~~discarded~~ text with `inline code`.",
          "",
          "- First item",
          "- [x] Completed item",
          "",
          "> Keep a fallback.",
          "",
          "| Turn | Action |",
          "| --- | --- |",
          "| 1 | Awaken |",
          "",
          "```text",
          "a-very-long-code-line",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Strategy", level: 4 })).toBeVisible();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("discarded").tagName).toBe("DEL");
    expect(screen.getByText("First item").closest("li")).not.toBeNull();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("checkbox").closest("li")).toHaveTextContent("Completed item");
    expect(screen.getByRole("blockquote")).toHaveTextContent("Keep a fallback.");
    expect(screen.getByRole("table")).toHaveTextContent("Awaken");
    expect(screen.getByText("a-very-long-code-line").closest("pre")).not.toBeNull();
  });

  it("opens safe links separately and suppresses raw HTML, images, and unsafe URLs", () => {
    render(
      <RecommendedSummary
        markdown={[
          "[Guide](https://example.com/guide)",
          "",
          "[Unsafe](javascript:alert(1))",
          "",
          "![Tracking pixel](https://example.com/pixel.png)",
          "",
          "<span>raw html</span>",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute(
      "href",
      "https://example.com/guide",
    );
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Guide" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByText("Unsafe").tagName).toBe("SPAN");
    expect(screen.getByText("Unsafe").closest("a")).toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("raw html").closest("span")).toBeNull();
  });

  it("keeps plain string summaries as ordinary paragraphs", () => {
    render(<RecommendedSummary markdown="Plain recommendation summary." />);

    expect(screen.getByText("Plain recommendation summary.").tagName).toBe("P");
  });
});
