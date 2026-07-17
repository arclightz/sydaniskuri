import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationCard } from "./location-card";
import type { LocationDetail, LocationResult } from "@/lib/locations/types";

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
const detail: LocationDetail = { id: 1, availabilityDetails: "Arkisin", addressDetails: "Infopisteen vieressä" };

describe("LocationCard", () => {
  it("shows summary fields while selected details load", () => {
    render(<LocationCard result={result} selected detailState={{ status: "loading" }} onSelect={() => {}} />);
    expect(screen.getByText("Lisätietoja ladataan…")).toBeInTheDocument();
    expect(screen.getByText("Katu 1, 00100, Helsinki")).toBeInTheDocument();
  });

  it("shows loaded details", () => {
    render(<LocationCard result={result} selected detailState={{ status: "ready", detail }} onSelect={() => {}} />);
    expect(screen.getByText("Infopisteen vieressä")).toBeInTheDocument();
  });

  it("keeps route action and offers detail retry after failure", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<LocationCard result={result} selected detailState={{ status: "error", message: "Lisätietoja ei voitu ladata." }} onRetryDetail={retry} onSelect={() => {}} />);
    expect(screen.getByRole("link", { name: /näytä reitti/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yritä lisätietoja uudelleen" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
