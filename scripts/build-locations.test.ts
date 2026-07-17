import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { transformRecords } from "./build-locations";

const validRecord = {
  id: 23060,
  title: "Oy Förcit Ab",
  slug: "oy-forcit-ab",
  location: { lat: 59.86, lng: 23.06 },
  address: "Forcitintie 37",
  postalCode: "10900",
  city: "Hanko",
  location_type: "Toimisto",
  availabilityRules: [{ type: "weekday", available: true, days: ["Monday"], from: "08:00", to: "16:00" }],
  availabilityDetails: "Arkisin",
  addressDetails: "Alakerran aulassa",
  userName: "private@example.com",
  contactPerson: "Yksityinen Henkilö",
  phoneNumber: "040 123 4567",
  disclaimers: "Ei kartalle",
};

describe("transformRecords", () => {
  it("creates staged public documents without personal data", () => {
    const invalidRecord = { ...validRecord, id: 2, location: { lat: 200, lng: 23 } };
    const result = transformRecords([validRecord, invalidRecord]);

    expect(result.summary).toEqual({ processed: 1, skipped: 1 });
    expect(result.points.features[0]).toEqual({
      type: "Feature",
      id: 23060,
      properties: {},
      geometry: { type: "Point", coordinates: [23.06, 59.86] },
    });
    expect(result.index.locationTypes).toEqual(["Toimisto"]);
    expect(result.index.locations[0].slice(0, 8)).toEqual([
      23060,
      23.06,
      59.86,
      "Oy Förcit Ab",
      "Forcitintie 37",
      "10900",
      "Hanko",
      0,
    ]);
    expect(result.detailShards.get("20.json")?.details).toEqual([[23060, "Arkisin", "Alakerran aulassa"]]);

    const serialized = [
      JSON.stringify(result.points),
      JSON.stringify(result.index),
      ...[...result.detailShards.values()].map((shard) => JSON.stringify(shard)),
    ].join("\n");
    expect(serialized).not.toMatch(/private@example|Yksityinen|040 123|Ei kartalle/);
  });

  it("keeps generated startup payloads inside budgets", async () => {
    const points = await readFile("public/data/map-points.geojson");
    const index = await readFile("public/data/location-index.json");
    expect(points.byteLength).toBeLessThan(2_000_000);
    expect(index.byteLength).toBeLessThan(5_000_000);
  });
});
