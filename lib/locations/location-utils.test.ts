import { describe, expect, it } from "vitest";
import {
  filterAndSortLocations,
  getAvailabilityStatus,
  haversineDistance,
  isAlwaysOpen,
  normalizeSearchText,
} from "./location-utils";
import type { LocationFeature } from "./types";

function feature(overrides: Partial<LocationFeature["properties"]> = {}, coordinates: [number, number] = [24.94, 60.17]): LocationFeature {
  return {
    type: "Feature",
    id: overrides.id ?? 1,
    geometry: { type: "Point", coordinates },
    properties: {
      id: 1,
      title: "Keskustan apteekki",
      slug: "keskustan-apteekki",
      address: "Kaivokatu 1",
      postalCode: "00100",
      city: "Helsinki",
      locationType: "Apteekki",
      availabilityRules: [],
      availabilityDetails: "",
      addressDetails: "Sisäänkäynnin vieressä",
      searchText: "keskustan apteekki helsinki kaivokatu 1",
      ...overrides,
    },
  };
}

describe("location utilities", () => {
  it("normalizes Finnish search text", () => {
    expect(normalizeSearchText("  Töölön Sydäniskuri!  ")).toBe("toolon sydaniskuri");
  });

  it("calculates Haversine distance in kilometres", () => {
    const helsinkiToEspoo = haversineDistance([24.94, 60.17], [24.66, 60.21]);
    expect(helsinkiToEspoo).toBeGreaterThan(15);
    expect(helsinkiToEspoo).toBeLessThan(17);
  });

  it("interprets weekday availability and 24/7 rules", () => {
    const office = feature({
      availabilityRules: [{ type: "weekday", available: true, days: ["Monday"], from: "08:00", to: "16:00" }],
    });
    const alwaysOpen = feature({
      availabilityRules: [{ type: "weekday", available: true, days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], from: "00:00", to: "24:00" }],
    });

    expect(getAvailabilityStatus(office, new Date("2026-07-20T10:00:00+03:00"))).toBe("open");
    expect(getAvailabilityStatus(office, new Date("2026-07-20T18:00:00+03:00"))).toBe("closed");
    expect(isAlwaysOpen(alwaysOpen)).toBe(true);
  });

  it("filters by query and type and sorts nearest first", () => {
    const near = feature({ id: 1 });
    const far = feature({ id: 2, title: "Turun uimahalli", city: "Turku", locationType: "Liikuntapaikka", searchText: "turun uimahalli turku" }, [22.27, 60.45]);
    const second = feature({ id: 3, title: "Espoon uimahalli", city: "Espoo", locationType: "Liikuntapaikka", searchText: "espoon uimahalli espoo" }, [24.66, 60.21]);

    const result = filterAndSortLocations([far, near, second], {
      query: "uimahalli",
      locationType: "Liikuntapaikka",
      origin: [24.94, 60.17],
      now: new Date("2026-07-20T10:00:00+03:00"),
    });

    expect(result.map((item) => item.feature.properties.id)).toEqual([3, 2]);
    expect(result[0].distanceKm).toBeLessThan(result[1].distanceKm);
  });
});
