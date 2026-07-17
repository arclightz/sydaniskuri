import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocationCard } from "./location-card";
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

describe("LocationCard", () => {
  it("opens a selected location without rendering inline details", async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(<LocationCard result={result} onSelect={select} />);

    await user.click(screen.getByRole("button", { name: /kaupungintalo/i }));
    expect(select).toHaveBeenCalledOnce();
    expect(screen.queryByText("Tarkka sijainti")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /näytä reitti/i })).not.toBeInTheDocument();
  });
});
