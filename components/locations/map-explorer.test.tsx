import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapExplorer } from "./map-explorer";
import type { LocationSummary, MapPointCollection } from "@/lib/locations/types";

const featureVersions = new WeakMap<object, number>();
let nextFeatureVersion = 1;
function featureVersion(features: object) {
  let version = featureVersions.get(features);
  if (!version) {
    version = nextFeatureVersion++;
    featureVersions.set(features, version);
  }
  return version;
}

vi.mock("./map-view", () => ({
  MapView: ({ features, onCenterChange, onSelect }: { features: MapPointCollection["features"]; onCenterChange: (center: [number, number]) => void; onSelect: (id: number) => void }) => (
    <div aria-label="Testikartta">
      <span data-testid="point-source-version">{featureVersion(features)}</span>
      <button type="button" onClick={() => onCenterChange([22.27, 60.45])}>Siirrä testikartan keskustaa</button>
      <button type="button" onClick={() => onSelect(2)}>Valitse Turku</button>
    </div>
  ),
}));

const points: MapPointCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", id: 1, properties: {}, geometry: { type: "Point", coordinates: [24.94, 60.17] } },
    { type: "Feature", id: 2, properties: {}, geometry: { type: "Point", coordinates: [22.27, 60.45] } },
  ],
};

const summaries: LocationSummary[] = [
  { id: 1, coordinates: [24.94, 60.17], title: "Helsingin kirjasto", address: "Katu 1", postalCode: "00100", city: "Helsinki", locationType: "Kirjasto", availabilityRules: [], searchText: "helsingin kirjasto helsinki" },
  { id: 2, coordinates: [22.27, 60.45], title: "Turun kirjasto", address: "Katu 1", postalCode: "20100", city: "Turku", locationType: "Kirjasto", availabilityRules: [], searchText: "turun kirjasto turku" },
];

const pendingClient = {
  loadPoints: () => new Promise<MapPointCollection>(() => {}),
  loadIndex: () => new Promise<LocationSummary[]>(() => {}),
  loadDetail: vi.fn(),
  clearDetailShard: vi.fn(),
};

describe("MapExplorer", () => {
  it("renders the map before points and index resolve", async () => {
    render(<MapExplorer dataClient={pendingClient} mapTilerKey="key" />);
    expect(await screen.findByLabelText("Testikartta")).toBeInTheDocument();
    expect(screen.getByText("Kohteita ladataan…")).toBeInTheDocument();
  });

  it("does not replace point features for a center-only change", async () => {
    const user = userEvent.setup();
    render(<MapExplorer initialPoints={points} initialSummaries={summaries} mapTilerKey="key" />);
    const initialMarkerVersion = screen.getByTestId("point-source-version").textContent;
    await user.click(screen.getByRole("button", { name: "Siirrä testikartan keskustaa" }));
    expect(screen.getByTestId("point-source-version")).toHaveTextContent(initialMarkerVersion ?? "");
  });

  it("retries a failed search-index request", async () => {
    const loadIndex = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(summaries);
    const client = { loadPoints: vi.fn().mockResolvedValue(points), loadIndex, loadDetail: vi.fn(), clearDetailShard: vi.fn() };
    const user = userEvent.setup();
    render(<MapExplorer dataClient={client} mapTilerKey="key" />);

    expect(await screen.findByText("Kohdetietoja ei voitu ladata.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lataa kohdetiedot uudelleen" }));
    expect(await screen.findByText("2 kohdetta")).toBeInTheDocument();
  });

  it("keeps the basemap visible when point loading fails", async () => {
    const client = { loadPoints: vi.fn().mockRejectedValue(new Error("network")), loadIndex: vi.fn().mockResolvedValue(summaries), loadDetail: vi.fn(), clearDetailShard: vi.fn() };
    render(<MapExplorer dataClient={client} mapTilerKey="key" />);
    expect(screen.getByLabelText("Testikartta")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sydäniskureita ei voitu ladata.");
    expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeInTheDocument();
  });

  it("loads details only after an explicit map selection", async () => {
    const user = userEvent.setup();
    const loadDetail = vi.fn().mockResolvedValue({ id: 2, availabilityDetails: "Arkisin", addressDetails: "Oven vieressä" });
    const client = { loadPoints: vi.fn(), loadIndex: vi.fn(), loadDetail, clearDetailShard: vi.fn() };
    render(<MapExplorer dataClient={client} initialPoints={points} initialSummaries={summaries} mapTilerKey="key" />);

    expect(loadDetail).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Valitse Turku" }));
    expect(await screen.findByText("Oven vieressä")).toBeInTheDocument();
    expect(loadDetail).toHaveBeenCalledWith(2);
  });

  it("shows MapTiler setup guidance when the key is missing", () => {
    render(<MapExplorer initialPoints={points} initialSummaries={summaries} mapTilerKey="" />);
    expect(screen.getByRole("alert")).toHaveTextContent("MapTiler-avain puuttuu.");
  });
});
