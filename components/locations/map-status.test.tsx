import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MapStatus } from "./map-status";

it("announces loading", () => {
  render(<MapStatus loading error="" onRetry={() => {}} />);
  expect(screen.getByRole("status")).toHaveTextContent("Sydäniskureita ladataan…");
});

it("announces an error and retries", async () => {
  const retry = vi.fn();
  render(<MapStatus loading={false} error="Sydäniskureita ei voitu ladata." onRetry={retry} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Sydäniskureita ei voitu ladata.");
  await userEvent.click(screen.getByRole("button", { name: "Yritä uudelleen" }));
  expect(retry).toHaveBeenCalledOnce();
});
