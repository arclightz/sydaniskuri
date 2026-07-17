import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocationCard } from "./location-card";
import type { LocationResult } from "@/lib/locations/types";

const result: LocationResult = {
  distanceKm: 1.24,
  feature: {
    type: "Feature",
    id: 1,
    geometry: { type: "Point", coordinates: [24.94, 60.17] },
    properties: {
      id: 1,
      title: "Kaupungintalo",
      slug: "kaupungintalo",
      address: "",
      postalCode: "",
      city: "Helsinki",
      locationType: "Virasto",
      availabilityRules: [],
      availabilityDetails: "",
      addressDetails: "",
      searchText: "kaupungintalo helsinki",
    },
  },
};

describe("LocationCard", () => {
  it("shows essential details and neutral fallbacks", () => {
    render(<LocationCard result={result} selected now={new Date("2026-07-20T10:00:00+03:00")} onSelect={() => {}} />);

    expect(screen.getByRole("heading", { name: "Kaupungintalo" })).toBeInTheDocument();
    expect(screen.getByText("1,2 km")).toBeInTheDocument();
    expect(screen.getAllByText("Ei tiedossa").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /näytä reitti/i })).toHaveAttribute("href", expect.stringContaining("60.17%2C24.94"));
  });
});
