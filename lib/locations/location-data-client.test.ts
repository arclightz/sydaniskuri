import { describe, expect, it, vi } from "vitest";
import type { LocationIndexDocument } from "./public-data";
import type { MapPointCollection } from "./types";
import { LocationDataClient } from "./location-data-client";

const indexDocument: LocationIndexDocument = {
  version: 1,
  locationTypes: ["Kirjasto"],
  locations: [[1, 24.94, 60.17, "Keskustan kirjasto", "Katu 1", "00100", "Helsinki", 0, []]],
};

const pointsDocument: MapPointCollection = {
  type: "FeatureCollection",
  features: [{ type: "Feature", id: 1, properties: {}, geometry: { type: "Point", coordinates: [24.94, 60.17] } }],
};

describe("LocationDataClient", () => {
  it("loads and decodes the search index", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(indexDocument), { status: 200 }));
    const client = new LocationDataClient(fetcher);

    await expect(client.loadIndex()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    expect(fetcher).toHaveBeenCalledWith("/data/location-index.json");
  });

  it("loads coordinate-only map points", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(pointsDocument), { status: 200 }));
    const client = new LocationDataClient(fetcher);

    await expect(client.loadPoints()).resolves.toEqual(pointsDocument);
    expect(fetcher).toHaveBeenCalledWith("/data/map-points.geojson");
  });

  it("caches a detail shard across location requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: 1, details: [[1, "Aina", "Aulassa"], [33, "Arkisin", "Oven vieressä"]] }), {
        status: 200,
      }),
    );
    const client = new LocationDataClient(fetcher);

    await expect(client.loadDetail(1)).resolves.toMatchObject({ id: 1, addressDetails: "Aulassa" });
    await expect(client.loadDetail(33)).resolves.toMatchObject({ id: 33, addressDetails: "Oven vieressä" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("throws a Finnish error for missing details", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 1, details: [] }), { status: 200 }));
    const client = new LocationDataClient(fetcher);

    await expect(client.loadDetail(1)).rejects.toThrow("Kohteen lisätietoja ei löytynyt.");
  });

  it("retries a failed detail shard request", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1, details: [[1, "Aina", "Aulassa"]] }), { status: 200 }));
    const client = new LocationDataClient(fetcher);

    await expect(client.loadDetail(1)).rejects.toThrow("network");
    await expect(client.loadDetail(1)).resolves.toMatchObject({ id: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
