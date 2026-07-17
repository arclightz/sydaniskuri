import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationDetailsModal } from "./location-details-modal";
import type { LocationResult } from "@/lib/locations/types";

const result: LocationResult = {
  distanceKm: 1.24,
  summary: {
    id: 1,
    coordinates: [24.94, 60.17],
    title: "Kaupungintalo",
    address: "Katu 1",
    postalCode: "00100",
    city: "Helsinki",
    locationType: "Virasto",
    availabilityRules: [],
    searchText: "kaupungintalo helsinki",
  },
};

describe("LocationDetailsModal", () => {
  it("shows selected summary data and closes with Escape", async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    render(<LocationDetailsModal result={result} detailState={{ status: "loading" }} onClose={close} onRetry={() => {}} />);

    expect(screen.getByRole("dialog", { name: "Kaupungintalo" })).toBeInTheDocument();
    expect(screen.getByText("Lisätietoja ladataan…")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps the route link and retries detail loading after an error", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<LocationDetailsModal result={result} detailState={{ status: "error", message: "Lisätietoja ei voitu ladata." }} onClose={() => {}} onRetry={retry} />);

    expect(screen.getByRole("link", { name: /näytä reitti/i })).toHaveAttribute("href", expect.stringContaining("60.17%2C24.94"));
    await user.click(screen.getByRole("button", { name: "Yritä lisätietoja uudelleen" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
