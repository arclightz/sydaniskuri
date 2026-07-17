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
  it("creates searchable GeoJSON without personal data", () => {
    const result = transformRecords([validRecord]);

    expect(result.summary).toEqual({ processed: 1, skipped: 0 });
    expect(result.collection.features[0]).toMatchObject({
      type: "Feature",
      id: 23060,
      geometry: { type: "Point", coordinates: [23.06, 59.86] },
      properties: {
        id: 23060,
        title: "Oy Förcit Ab",
        city: "Hanko",
        searchText: "oy forcit ab hanko forcitintie 37",
      },
    });
    expect(JSON.stringify(result.collection)).not.toMatch(/private@example|Yksityinen|040 123|Ei kartalle/);
  });

  it("skips records with invalid coordinates", () => {
    const invalid = { ...validRecord, id: 2, location: { lat: 200, lng: 23 } };

    const result = transformRecords([validRecord, invalid]);

    expect(result.summary).toEqual({ processed: 1, skipped: 1 });
  });
});
