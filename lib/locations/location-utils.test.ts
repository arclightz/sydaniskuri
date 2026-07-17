import { describe, expect, it } from "vitest";
import {
  filterAndSortLocations,
  filterLocationSummaries,
  getAvailabilityStatus,
  getSummaryAvailabilityStatus,
  haversineDistance,
  isAlwaysOpen,
  isSummaryAlwaysOpen,
  normalizeSearchText,
  sortLocationSummariesByDistance,
} from "./location-utils";
import type { LocationFeature, LocationSummary } from "./types";
import {
  decodeAvailabilityRules,
  decodeLocationIndex,
  detailShardName,
  encodeAvailabilityRules,
  type LocationIndexDocument,
} from "./public-data";

function summary(overrides: Partial<LocationSummary> = {}, coordinates: [number, number] = [24.94, 60.17]): LocationSummary {
  return {
    id: 1,
    coordinates,
    title: "Keskustan apteekki",
    address: "Kaivokatu 1",
    postalCode: "00100",
    city: "Helsinki",
    locationType: "Apteekki",
    availabilityRules: [],
    searchText: "keskustan apteekki helsinki kaivokatu 1",
    ...overrides,
  };
}

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
  it("round-trips compact availability rules", () => {
    const rules = [
      { type: "weekday", available: true, days: ["Monday", "Friday"], from: "08:00", to: "16:30" },
      { type: "range", available: false, from: "2026-12-24 00:00:00", to: "2026-12-26 23:59:59" },
    ];

    expect(decodeAvailabilityRules(encodeAvailabilityRules(rules))).toEqual(rules);
  });

  it("decodes tuples behind a typed summary boundary", () => {
    const document: LocationIndexDocument = {
      version: 1,
      locationTypes: ["Kirjasto"],
      locations: [[1, 24.94, 60.17, "Keskustan kirjasto", "Katu 1", "00100", "Helsinki", 0, [["w", 1, 31, 480, 960]]]],
    };

    expect(decodeLocationIndex(document)[0]).toMatchObject({
      id: 1,
      coordinates: [24.94, 60.17],
      locationType: "Kirjasto",
      searchText: "keskustan kirjasto helsinki katu 1",
    });
  });

  it("assigns deterministic detail shards", () => {
    expect(detailShardName(1)).toBe("01.json");
    expect(detailShardName(33)).toBe("01.json");
    expect(detailShardName(-1)).toBe("01.json");
  });

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

  it("filters summaries independently from distance ordering", () => {
    const helsinki = summary({ id: 1, title: "Keskustan kirjasto", locationType: "Kirjasto", searchText: "keskustan kirjasto helsinki" });
    const turku = summary({ id: 2, title: "Turun kirjasto", city: "Turku", locationType: "Kirjasto", searchText: "turun kirjasto turku" }, [22.27, 60.45]);

    const filtered = filterLocationSummaries([helsinki, turku], {
      query: "kirjasto",
      openNow: false,
      alwaysOpen: false,
      locationType: "",
    });

    expect(filtered).toEqual([helsinki, turku]);
    expect(sortLocationSummariesByDistance(filtered, [24.94, 60.17])[0].summary.id).toBe(helsinki.id);
  });

  it("interprets summary availability and filters by query and type", () => {
    const office = summary({
      availabilityRules: [{ type: "weekday", available: true, days: ["Monday"], from: "08:00", to: "16:00" }],
    });
    const alwaysOpen = summary({
      id: 2,
      availabilityRules: [{ type: "weekday", available: true, days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], from: "00:00", to: "24:00" }],
    });

    expect(getSummaryAvailabilityStatus(office, new Date("2026-07-20T10:00:00+03:00"))).toBe("open");
    expect(isSummaryAlwaysOpen(alwaysOpen)).toBe(true);
    expect(filterLocationSummaries([office], { query: "apteekki", locationType: "Apteekki" })).toEqual([office]);
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
