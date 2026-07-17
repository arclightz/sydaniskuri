import { normalizeSearchText } from "./location-utils";
import type { AvailabilityRule, LocationDetail, LocationSummary } from "./types";

const DAY_BITS: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 4,
  Thursday: 8,
  Friday: 16,
  Saturday: 32,
  Sunday: 64,
};
const SHARD_COUNT = 32;

export type CompactAvailabilityRule =
  | ["w", 0 | 1, number, number, number]
  | ["r", 0 | 1, string, string]
  | ["d", 0 | 1, string, number, number];

export type LocationIndexTuple = [
  id: number,
  longitude: number,
  latitude: number,
  title: string,
  address: string,
  postalCode: string,
  city: string,
  locationTypeIndex: number,
  availabilityRules: CompactAvailabilityRule[],
];

export type LocationIndexDocument = {
  version: 1;
  locationTypes: string[];
  locations: LocationIndexTuple[];
};

export type DetailTuple = [id: number, availabilityDetails: string, addressDetails: string];
export type DetailShardDocument = { version: 1; details: DetailTuple[] };

function timeToMinutes(value = "00:00") {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function encodeAvailabilityRules(rules: AvailabilityRule[]): CompactAvailabilityRule[] {
  return rules.flatMap((rule) => {
    const available = rule.available ? 1 : 0;
    if (rule.type === "weekday") {
      const mask = (rule.days ?? []).reduce((sum, day) => sum | (DAY_BITS[day] ?? 0), 0);
      return [["w", available, mask, timeToMinutes(rule.from), timeToMinutes(rule.to ?? "24:00")]];
    }
    if (rule.type === "range") return [["r", available, rule.from ?? "", rule.to ?? ""]];
    if (rule.type === "date") {
      return [["d", available, rule.date ?? "", timeToMinutes(rule.from), timeToMinutes(rule.to ?? "24:00")]];
    }
    return [];
  });
}

export function decodeAvailabilityRules(rules: CompactAvailabilityRule[]): AvailabilityRule[] {
  return rules.map((rule) => {
    if (rule[0] === "w") {
      return {
        type: "weekday",
        available: rule[1] === 1,
        days: Object.entries(DAY_BITS)
          .filter(([, bit]) => (rule[2] & bit) !== 0)
          .map(([day]) => day),
        from: minutesToTime(rule[3]),
        to: minutesToTime(rule[4]),
      };
    }
    if (rule[0] === "r") return { type: "range", available: rule[1] === 1, from: rule[2], to: rule[3] };
    return { type: "date", available: rule[1] === 1, date: rule[2], from: minutesToTime(rule[3]), to: minutesToTime(rule[4]) };
  });
}

export function decodeLocationIndex(document: LocationIndexDocument): LocationSummary[] {
  if (document.version !== 1) throw new Error("Tuntematon sijaintiaineiston versio.");
  return document.locations.map(([id, longitude, latitude, title, address, postalCode, city, typeIndex, rules]) => ({
    id,
    coordinates: [longitude, latitude],
    title,
    address,
    postalCode,
    city,
    locationType: document.locationTypes[typeIndex] ?? "Ei tiedossa",
    availabilityRules: decodeAvailabilityRules(rules),
    searchText: normalizeSearchText(`${title} ${city} ${address}`),
  }));
}

export function decodeDetailShard(document: DetailShardDocument): Map<number, LocationDetail> {
  if (document.version !== 1) throw new Error("Tuntematon lisätietoaineiston versio.");
  return new Map(document.details.map(([id, availabilityDetails, addressDetails]) => [id, { id, availabilityDetails, addressDetails }]));
}

export function detailShardName(id: number) {
  return `${Math.abs(id) % SHARD_COUNT}`.padStart(2, "0") + ".json";
}
