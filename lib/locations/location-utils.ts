import type { AvailabilityRule, LocationResult, LocationSummary } from "./types";

const EARTH_RADIUS_KM = 6371;
const FINNISH_TIME_ZONE = "Europe/Helsinki";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fi")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function haversineDistance(from: [number, number], to: [number, number]): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const latDelta = radians(toLat - fromLat);
  const lngDelta = radians(toLng - fromLng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function finnishDateParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: FINNISH_TIME_ZONE, weekday: "long", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return { weekday: parts.weekday, date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, dateTime: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:00` };
}

function timeMatches(time: string, from = "00:00", to = "24:00") {
  if (from <= to) return time >= from && time < to;
  return time >= from || time < to;
}

function ruleMatches(rule: AvailabilityRule, now: ReturnType<typeof finnishDateParts>): boolean {
  if (rule.type === "weekday") return Boolean(rule.days?.includes(now.weekday) && timeMatches(now.time, rule.from, rule.to));
  if (rule.type === "range") return Boolean(rule.from && rule.to && now.dateTime >= rule.from && now.dateTime <= rule.to);
  if (rule.type === "date") return Boolean(rule.date && now.date === rule.date.slice(0, 10) && timeMatches(now.time, rule.from, rule.to));
  return false;
}

export function getSummaryAvailabilityStatus(summary: LocationSummary, date = new Date()): "open" | "closed" | "unknown" {
  const rules = summary.availabilityRules;
  if (!rules.length) return "unknown";
  const matching = rules.filter((rule) => ruleMatches(rule, finnishDateParts(date)));
  if (matching.some((rule) => !rule.available)) return "closed";
  if (matching.some((rule) => rule.available)) return "open";
  return rules.some((rule) => rule.type === "weekday") ? "closed" : "unknown";
}

export function isSummaryAlwaysOpen(summary: LocationSummary): boolean {
  const allDays = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
  return summary.availabilityRules.some((rule) => rule.type === "weekday" && rule.available && rule.from === "00:00" && rule.to === "24:00" && rule.days?.length === allDays.size && rule.days.every((day) => allDays.has(day)));
}

export type LocationFilters = { query?: string; openNow?: boolean; alwaysOpen?: boolean; locationType?: string; origin: [number, number]; now?: Date };

export function filterLocationSummaries(summaries: LocationSummary[], filters: Omit<LocationFilters, "origin" | "now">, now = new Date()): LocationSummary[] {
  const terms = normalizeSearchText(filters.query ?? "").split(" ").filter(Boolean);
  return summaries
    .filter((summary) => terms.every((term) => summary.searchText.includes(term)))
    .filter((summary) => !filters.locationType || summary.locationType === filters.locationType)
    .filter((summary) => !filters.openNow || getSummaryAvailabilityStatus(summary, now) === "open")
    .filter((summary) => !filters.alwaysOpen || isSummaryAlwaysOpen(summary));
}

export function sortLocationSummariesByDistance(summaries: LocationSummary[], origin: [number, number]): LocationResult[] {
  return summaries.map((summary) => ({ summary, distanceKm: haversineDistance(origin, summary.coordinates) })).sort((left, right) => left.distanceKm - right.distanceKm);
}
