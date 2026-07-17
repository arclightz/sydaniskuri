import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapExplorer } from "./map-explorer";
import type { LocationCollection, LocationFeature } from "@/lib/locations/types";

vi.mock("./map-view", () => ({
  MapView: ({ onSelect, selectedFeature }: { onSelect: (id: number) => void; selectedFeature: LocationFeature | null }) => (
    <><button type="button" onClick={() => onSelect(2)}>Testikartta</button><span>Korostettu: {selectedFeature?.properties.title ?? "ei mikään"}</span></>
  ),
}));

function location(id: number, title: string, city: string): LocationFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: id === 1 ? [24.94, 60.17] : [22.27, 60.45] },
    properties: {
      id,
      title,
      slug: `kohde-${id}`,
      address: "Katu 1",
      postalCode: "00100",
      city,
      locationType: "Kirjasto",
      availabilityRules: [],
      availabilityDetails: "",
      addressDetails: "Aulassa",
      searchText: `${title} ${city}`.toLocaleLowerCase("fi"),
    },
  };
}

const collection: LocationCollection = {
  type: "FeatureCollection",
  features: [location(1, "Helsingin kirjasto", "Helsinki"), location(2, "Turun kirjasto", "Turku")],
};

describe("MapExplorer", () => {
  it("searches the text alternative and selects a result", async () => {
    const user = userEvent.setup();
    render(<MapExplorer initialCollection={collection} />);

    expect(screen.getByText("2 kohdetta")).toBeInTheDocument();
    expect(await screen.findByText("Korostettu: Helsingin kirjasto")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "Turku");
    expect(screen.queryByRole("heading", { name: "Helsingin kirjasto" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("heading", { name: "Turun kirjasto" }));
    expect(screen.getByText("Tarkka sijainti")).toBeInTheDocument();
  });

  it("shows a recoverable empty state", async () => {
    const user = userEvent.setup();
    render(<MapExplorer initialCollection={collection} />);
    await user.type(screen.getByRole("searchbox"), "Rovaniemi");

    expect(screen.getByText("Ei kohteita tältä alueelta")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tyhjennä suodattimet" }));
    expect(screen.getByText("2 kohdetta")).toBeInTheDocument();
  });
});
