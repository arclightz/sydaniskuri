# Map Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a crisp MapTiler vector basemap immediately and load 12,486 defibrillators through lightweight staged static payloads without blocking interaction.

**Architecture:** The preprocessing pipeline emits coordinate-only GeoJSON, a compact search index, and 32 deterministic detail shards. The client loads map points and search summaries concurrently, keeps map-source state separate from distance ordering, and fetches cached detail shards only for selected locations.

**Tech Stack:** Next.js App Router, React 19, TypeScript, MapLibre GL JS, MapTiler vector styles, Vitest, Testing Library, Playwright, pnpm

---

## File structure

**Create:**

- `lib/locations/public-data.ts` — compact tuple schemas, availability codecs, detail-shard assignment, and index decoding
- `lib/locations/location-data-client.ts` — fetch functions and cached detail repository
- `lib/locations/location-data-client.test.ts` — loader, cache, and error tests
- `lib/maps/maptiler.ts` — validated MapTiler vector-style URL construction
- `lib/maps/maptiler.test.ts` — MapTiler configuration tests
- `components/locations/map-status.tsx` — map-local loading/error/retry overlay
- `components/locations/map-status.test.tsx` — status accessibility and retry tests
- `.env.example` — documents the browser-facing MapTiler variable without a key
- `public/data/map-points.geojson` — generated coordinate-only map source
- `public/data/location-index.json` — generated compact search index
- `public/data/details/00.json` through `public/data/details/31.json` — generated detail shards

**Modify:**

- `scripts/build-locations.ts` — generate staged output instead of one full GeoJSON file
- `scripts/build-locations.test.ts` — verify schemas, privacy, shards, and size budgets
- `lib/locations/types.ts` — separate summary, map-point, and detail types
- `lib/locations/location-utils.ts` — operate on decoded summaries
- `lib/locations/location-utils.test.ts` — preserve search, distance, and availability behavior
- `app/page.tsx` — pass the public MapTiler key into the explorer
- `components/locations/map-view.tsx` — use MapTiler style and minimal point data
- `components/proposals/coordinate-picker.tsx` — use the same crisp vector style
- `components/locations/map-explorer.tsx` — render immediately and coordinate staged loading
- `components/locations/map-explorer.test.tsx` — loading order, retries, and source-stability tests
- `components/locations/location-card.tsx` — selected-detail loading and retry state
- `components/locations/location-card.test.tsx` — summary/detail behavior
- `components/locations/search-controls.tsx` — disable unavailable filters while index loads
- `components/locations/search-controls.test.tsx` — loading-disabled behavior
- `e2e/core-flows.spec.ts` — delayed data, vector style, search, and failure paths
- `README.md` — MapTiler and generated-data setup
- `package.json` — keep the existing commands; no new runtime dependencies are required

**Delete:**

- `public/data/defibrillators.geojson` — replaced by staged public files

---

### Task 1: Define compact public-data schemas and codecs

**Files:**
- Create: `lib/locations/public-data.ts`
- Modify: `lib/locations/types.ts`
- Test: `lib/locations/location-utils.test.ts`
- Test: `scripts/build-locations.test.ts`

- [ ] **Step 1: Write failing codec and shard tests**

Add tests that define the public boundary:

```ts
import {
  decodeAvailabilityRules,
  decodeLocationIndex,
  detailShardName,
  encodeAvailabilityRules,
  type LocationIndexDocument,
} from "@/lib/locations/public-data";

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
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
pnpm test scripts/build-locations.test.ts lib/locations/location-utils.test.ts
```

Expected: FAIL because `lib/locations/public-data.ts` and its exports do not exist.

- [ ] **Step 3: Add separated runtime types**

Update `lib/locations/types.ts` with these public UI types while retaining `AvailabilityRule`, `LocationFeature`, and `LocationCollection` until the component migration in Task 6:

```ts
export type LocationSummary = {
  id: number;
  coordinates: [number, number];
  title: string;
  address: string;
  postalCode: string;
  city: string;
  locationType: string;
  availabilityRules: AvailabilityRule[];
  searchText: string;
};

export type LocationDetail = {
  id: number;
  availabilityDetails: string;
  addressDetails: string;
};

export type MapPointFeature = {
  type: "Feature";
  id: number;
  properties: Record<string, never>;
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type MapPointCollection = {
  type: "FeatureCollection";
  features: MapPointFeature[];
};

export type LocationResult = {
  summary: LocationSummary;
  distanceKm: number;
};
```

- [ ] **Step 4: Implement compact schemas and codecs**

Create `lib/locations/public-data.ts` with:

```ts
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
    if (rule.type === "date") return [["d", available, rule.date ?? "", timeToMinutes(rule.from), timeToMinutes(rule.to ?? "24:00")]];
    return [];
  });
}

export function decodeAvailabilityRules(rules: CompactAvailabilityRule[]): AvailabilityRule[] {
  return rules.map((rule) => {
    if (rule[0] === "w") {
      return {
        type: "weekday",
        available: rule[1] === 1,
        days: Object.entries(DAY_BITS).filter(([, bit]) => (rule[2] & bit) !== 0).map(([day]) => day),
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
```

- [ ] **Step 5: Run tests and verify GREEN**

Run:

```bash
pnpm test scripts/build-locations.test.ts lib/locations/location-utils.test.ts
```

Expected: PASS for the new codec and shard tests; existing location tests may still require API updates completed in Task 3.

- [ ] **Step 6: Commit the schema boundary**

```bash
git add lib/locations/public-data.ts lib/locations/types.ts scripts/build-locations.test.ts lib/locations/location-utils.test.ts
git commit -m "feat: define compact location data schema"
```

---

### Task 2: Generate staged sanitized public files

**Files:**
- Modify: `scripts/build-locations.ts`
- Modify: `scripts/build-locations.test.ts`
- Delete: `public/data/defibrillators.geojson`
- Create: `public/data/map-points.geojson`
- Create: `public/data/location-index.json`
- Create: `public/data/details/00.json` through `public/data/details/31.json`

- [ ] **Step 1: Write failing transformation tests**

Replace the old single-collection expectations with:

```ts
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
  23060, 23.06, 59.86, "Oy Förcit Ab", "Forcitintie 37", "10900", "Hanko", 0,
]);
expect(result.detailShards.get("20.json")?.details).toEqual([
  [23060, "Arkisin", "Alakerran aulassa"],
]);

const serialized = [
  JSON.stringify(result.points),
  JSON.stringify(result.index),
  ...[...result.detailShards.values()].map((shard) => JSON.stringify(shard)),
].join("\n");
expect(serialized).not.toMatch(/private@example|Yksityinen|040 123|Ei kartalle/);
```

Add committed-output budget tests:

```ts
it("keeps generated startup payloads inside budgets", async () => {
  const points = await readFile("public/data/map-points.geojson");
  const index = await readFile("public/data/location-index.json");
  expect(points.byteLength).toBeLessThan(2_000_000);
  expect(index.byteLength).toBeLessThan(5_000_000);
});
```

- [ ] **Step 2: Run the transformation tests and verify RED**

```bash
pnpm test scripts/build-locations.test.ts
```

Expected: FAIL because `transformRecords` still returns `collection` and no staged documents.

- [ ] **Step 3: Refactor `transformRecords` to emit staged documents**

Use an allowlist when constructing each output. Build a sorted unique `locationTypes` table, encode type references by index, call `encodeAvailabilityRules`, and create a `Map<string, DetailShardDocument>` initialized with all 32 shard names. Return:

```ts
{
  points: MapPointCollection;
  index: LocationIndexDocument;
  detailShards: Map<string, DetailShardDocument>;
  summary: { processed: number; skipped: number };
}
```

Do not copy source records or use object spread when constructing public fields.

- [ ] **Step 4: Update the script writer**

Write compact JSON to:

```ts
await writeFile("public/data/map-points.geojson", JSON.stringify(result.points));
await writeFile("public/data/location-index.json", JSON.stringify(result.index));
for (const [fileName, shard] of result.detailShards) {
  await writeFile(resolve("public/data/details", fileName), JSON.stringify(shard));
}
```

Create directories with `mkdir(..., { recursive: true })`. Remove stale detail JSON files before writing by enumerating `public/data/details`; never remove files outside that generated directory.

- [ ] **Step 5: Run tests and regenerate data**

```bash
pnpm test scripts/build-locations.test.ts
pnpm data:build
wc -c public/data/map-points.geojson public/data/location-index.json
```

Expected:

- tests PASS
- 12,486 processed and 0 skipped for the current source
- points below 2,000,000 bytes
- index below 5,000,000 bytes

- [ ] **Step 6: Run the privacy scan**

```bash
if rg -n 'userName|contactPerson|phoneNumber|disclaimers|@' public/data; then
  echo "Generated-data privacy scan failed" >&2
  exit 1
fi
```

Expected: no matches and exit 0.

- [ ] **Step 7: Replace the old generated artifact and commit**

```bash
git rm public/data/defibrillators.geojson
git add scripts/build-locations.ts scripts/build-locations.test.ts public/data/map-points.geojson public/data/location-index.json public/data/details
git commit -m "perf: split location data into staged payloads"
```

---

### Task 3: Adapt filtering and availability to summaries

**Files:**
- Modify: `lib/locations/location-utils.ts`
- Modify: `lib/locations/location-utils.test.ts`

- [ ] **Step 1: Rewrite the existing location utility fixtures to use `LocationSummary`**

Define fixtures with `coordinates` and direct summary fields instead of GeoJSON `geometry` and `properties`. Preserve assertions for Finnish normalization, Haversine distance, weekday availability, 24/7 detection, query/type filtering, and nearest-first order.

Add a separation test:

```ts
it("keeps filtering independent from distance ordering", () => {
  const filtered = filterLocationSummaries([helsinki, turku], { query: "kirjasto", openNow: false, alwaysOpen: false, locationType: "" });
  expect(filtered).toEqual([helsinki, turku]);
  expect(sortLocationSummariesByDistance(filtered, [24.94, 60.17])[0].summary.id).toBe(helsinki.id);
});
```

- [ ] **Step 2: Run the utility tests and verify RED**

```bash
pnpm test lib/locations/location-utils.test.ts
```

Expected: FAIL because the current functions require `LocationFeature` and combine filtering with sorting.

- [ ] **Step 3: Split filtering from sorting**

Expose:

```ts
export function getSummaryAvailabilityStatus(summary: LocationSummary, date = new Date()): "open" | "closed" | "unknown";
export function isSummaryAlwaysOpen(summary: LocationSummary): boolean;
export function filterLocationSummaries(summaries: LocationSummary[], filters: Omit<LocationFilters, "origin" | "now">, now?: Date): LocationSummary[];
export function sortLocationSummariesByDistance(summaries: LocationSummary[], origin: [number, number]): LocationResult[];
```

`sortLocationSummariesByDistance` maps `summary.coordinates` through `haversineDistance` and returns `{ summary, distanceKm }`. Do not include query/filter values in this function. Retain the existing feature-based exports temporarily so the application continues to compile before Task 6 migrates all consumers.

- [ ] **Step 4: Run affected tests and verify GREEN**

```bash
pnpm test lib/locations/location-utils.test.ts
```

Expected: old feature-based tests and new summary-based tests PASS.

- [ ] **Step 5: Commit the domain refactor**

```bash
git add lib/locations/location-utils.ts lib/locations/location-utils.test.ts
git commit -m "refactor: separate location filtering from ordering"
```

---

### Task 4: Add staged browser loaders and detail caching

**Files:**
- Create: `lib/locations/location-data-client.ts`
- Create: `lib/locations/location-data-client.test.ts`

- [ ] **Step 1: Write failing fetch and cache tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { LocationDataClient } from "./location-data-client";

it("loads and decodes the search index", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(indexDocument), { status: 200 }));
  const client = new LocationDataClient(fetcher);
  await expect(client.loadIndex()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
  expect(fetcher).toHaveBeenCalledWith("/data/location-index.json");
});

it("caches a detail shard across location requests", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 1, details: [[1, "Aina", "Aulassa"], [33, "Arkisin", "Oven vieressä"]] }), { status: 200 }));
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
```

- [ ] **Step 2: Run tests and verify RED**

```bash
pnpm test lib/locations/location-data-client.test.ts
```

Expected: FAIL because `LocationDataClient` does not exist.

- [ ] **Step 3: Implement the data client**

Create a class that accepts `typeof fetch`, validates `response.ok`, and exposes:

```ts
class LocationDataClient {
  private readonly shardPromises = new Map<string, Promise<Map<number, LocationDetail>>>();

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async loadPoints(): Promise<MapPointCollection>;
  async loadIndex(): Promise<LocationSummary[]>;
  async loadDetail(id: number): Promise<LocationDetail>;
  clearDetailShard(id: number): void;
}
```

`loadDetail` stores the fetch-and-decode promise before awaiting it so simultaneous requests share one request. If a shard fetch fails, remove that promise from the cache so retry can succeed. `clearDetailShard` supports explicit retry after an error.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
pnpm test lib/locations/location-data-client.test.ts
```

Expected: all loader and cache tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/locations/location-data-client.ts lib/locations/location-data-client.test.ts
git commit -m "feat: add cached staged location loader"
```

---

### Task 5: Switch MapLibre to MapTiler and minimal point features

**Files:**
- Create: `components/locations/map-status.tsx`
- Create: `components/locations/map-status.test.tsx`
- Create: `lib/maps/maptiler.ts`
- Create: `lib/maps/maptiler.test.ts`
- Modify: `app/page.tsx`
- Modify: `components/locations/map-view.tsx`
- Modify: `components/proposals/coordinate-picker.tsx`
- Modify: `components/locations/map-explorer.test.tsx`
- Create: `.env.example`

- [ ] **Step 1: Add failing MapTiler configuration tests**

Create `lib/maps/maptiler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapTilerStyleUrl } from "./maptiler";

describe("mapTilerStyleUrl", () => {
  it("builds the MapTiler vector style URL", () => {
    expect(mapTilerStyleUrl("test key")).toBe("https://api.maptiler.com/maps/streets-v2/style.json?key=test%20key");
  });

  it("rejects missing MapTiler configuration", () => {
    expect(() => mapTilerStyleUrl("")).toThrow("MapTiler-avain puuttuu.");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
pnpm test lib/maps/maptiler.test.ts
```

Expected: FAIL because `lib/maps/maptiler.ts` does not exist.

- [ ] **Step 3: Add the MapTiler style helper**

Create `lib/maps/maptiler.ts`:

```ts
export function mapTilerStyleUrl(key: string) {
  if (!key.trim()) throw new Error("MapTiler-avain puuttuu.");
  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key.trim())}`;
}
```

Pass the key from the server page boundary:

```tsx
export default function HomePage() {
  return <MapExplorer mapTilerKey={process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""} />;
}
```

Use `mapTilerStyleUrl(mapTilerKey)` as the MapLibre `style` value in the main map. Use `mapTilerStyleUrl(process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "")` in the coordinate picker. Remove both OSM raster sources, raster layers, and the MapLibre demo glyph URL. Keep OpenStreetMap attribution supplied by the MapTiler style.

Update main-map point handling:

- accept `MapPointFeature[]`
- read selected IDs through feature IDs instead of properties
- use `["id"]` in paint expressions
- send the point collection directly without copying location properties

- [ ] **Step 4: Write the failing map-status test**

Create `components/locations/map-status.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MapStatus } from "./map-status";

it("announces loading", () => {
  render(<MapStatus loading error="" onRetry={() => {}} />);
  expect(screen.getByRole("status")).toHaveTextContent("Sydäniskureita ladataan…");
});

it("announces an error and retries", async () => {
  const retry = vi.fn();
  render(<MapStatus loading={false} error="Sydäniskureita ei voitu ladata." onRetry={retry} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Sydäniskureita ei voitu ladata.");
  await userEvent.click(screen.getByRole("button", { name: "Yritä uudelleen" }));
  expect(retry).toHaveBeenCalledOnce();
});
```

Run:

```bash
pnpm test components/locations/map-status.test.tsx
```

Expected: FAIL because `MapStatus` does not exist.

- [ ] **Step 5: Add map-local status UI**

Create `MapStatus` with `loading`, `error`, and `onRetry` props. Loading uses `role="status"`; errors use `role="alert"` and a `Yritä uudelleen` button. Place it over the map without replacing the basemap.

- [ ] **Step 6: Document environment configuration**

Create `.env.example`:

```dotenv
NEXT_PUBLIC_MAPTILER_KEY=
```

For local validation, set the approved browser key without committing it:

```bash
printf 'NEXT_PUBLIC_MAPTILER_KEY=%s\n' "$MAPTILER_TEST_KEY" > .env.local
```

The executor obtains `MAPTILER_TEST_KEY` from the approved secure session context. Never print or stage `.env.local`.

- [ ] **Step 7: Run tests and verify GREEN**

```bash
pnpm test lib/maps/maptiler.test.ts components/locations/map-status.test.tsx components/locations/map-explorer.test.tsx
```

Expected: MapTiler helper, map-status, and existing explorer tests PASS.

- [ ] **Step 8: Commit**

```bash
git add .env.example app/page.tsx lib/maps/maptiler.ts lib/maps/maptiler.test.ts components/locations/map-view.tsx components/proposals/coordinate-picker.tsx components/locations/map-status.tsx components/locations/map-status.test.tsx components/locations/map-explorer.test.tsx
git commit -m "feat: use MapTiler vector basemap"
```

---

### Task 6: Render the map immediately and keep source updates stable

**Files:**
- Modify: `components/locations/map-explorer.tsx`
- Modify: `components/locations/map-explorer.test.tsx`
- Modify: `components/locations/location-card.tsx`
- Modify: `components/locations/location-card.test.tsx`
- Modify: `components/locations/search-controls.tsx`
- Modify: `components/locations/search-controls.test.tsx`
- Modify: `lib/locations/types.ts`
- Modify: `lib/locations/location-utils.ts`

- [ ] **Step 1: Write failing staged-loading tests**

Mock `LocationDataClient` and `MapView`. Add tests proving:

```ts
it("renders the map before points and index resolve", () => {
  render(<MapExplorer dataClient={pendingClient} mapTilerKey="key" />);
  expect(screen.getByLabelText("Testikartta")).toBeInTheDocument();
  expect(screen.getByText("Kohteita ladataan…")).toBeInTheDocument();
});

it("does not replace point features for a center-only change", async () => {
  render(<MapExplorer initialPoints={points} initialSummaries={summaries} mapTilerKey="key" />);
  const initialMarkerVersion = screen.getByTestId("point-source-version").textContent;
  await user.click(screen.getByRole("button", { name: "Siirrä testikartan keskustaa" }));
  expect(screen.getByTestId("point-source-version")).toHaveTextContent(initialMarkerVersion ?? "");
});

it("retries a failed search-index request", async () => {
  render(<MapExplorer dataClient={failThenSucceedClient} mapTilerKey="key" />);
  expect(await screen.findByText("Kohdetietoja ei voitu ladata.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Lataa kohdetiedot uudelleen" }));
  expect(await screen.findByText("2 kohdetta")).toBeInTheDocument();
});

it("keeps the basemap visible when point loading fails", async () => {
  render(<MapExplorer dataClient={pointFailureClient} mapTilerKey="key" />);
  expect(screen.getByLabelText("Testikartta")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Sydäniskureita ei voitu ladata.");
  expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeInTheDocument();
});

it("shows MapTiler setup guidance when the key is missing", () => {
  render(<MapExplorer initialPoints={points} initialSummaries={summaries} mapTilerKey="" />);
  expect(screen.getByRole("alert")).toHaveTextContent("MapTiler-avain puuttuu.");
});
```

The MapView mock should expose a deterministic render count or feature-array identity token; do not inspect MapLibre internals.

Update the LocationCard fixture from `{ feature, distanceKm }` to `{ summary, distanceKm }` while retaining its existing assertions for title, address, distance, neutral fallbacks, and route coordinates. This fixture change must fail against the old component API.

- [ ] **Step 2: Run tests and verify RED**

```bash
pnpm test components/locations/map-explorer.test.tsx components/locations/location-card.test.tsx components/locations/search-controls.test.tsx
```

Expected: FAIL because the explorer still blocks on one collection and has no staged loading API.

- [ ] **Step 3: Refactor explorer state**

Use separate state for:

```ts
points: MapPointCollection | null;
summaries: LocationSummary[] | null;
pointError: string;
indexError: string;
```

Start `loadPoints()` and `loadIndex()` independently in the mount effect. Always render the `MapView`, passing an empty point list until points arrive.

Use `useDeferredValue(filters)` for filtering. Compute:

1. `filteredSummaries` from deferred filters, independent of origin
2. `results` from `sortLocationSummariesByDistance(filteredSummaries, origin)`
3. `visiblePointIds` from `filteredSummaries`
4. `visiblePoints` from the point document and ID set

Ensure `visiblePoints` has no `origin` dependency. Center changes may update `results` but must retain the same `visiblePoints` reference.

Migrate `LocationCard` to read base fields and route coordinates from `result.summary`. Use `getSummaryAvailabilityStatus` for the status pill. Until Task 7 adds asynchronous details, selected availability-description and indoor-location rows display the existing neutral `Ei tiedossa` fallback.

After all component consumers use summaries and map points, remove the legacy `LocationFeature`, `LocationCollection`, `filterAndSortLocations`, `getAvailabilityStatus`, and `isAlwaysOpen` exports. Confirm with:

```bash
rg -n 'LocationFeature|LocationCollection|filterAndSortLocations|getAvailabilityStatus|isAlwaysOpen' app components lib scripts --glob '!*.test.*'
```

Expected: no legacy runtime references.

- [ ] **Step 4: Add loading-disabled search behavior**

Add `loading?: boolean` to `SearchControls`. Disable search, checkboxes, and type selection while summaries are absent; keep clear controls disabled as well. Add `aria-busy` to the section and display `Kohteita ladataan…` in the explorer result area.

- [ ] **Step 5: Run tests and verify GREEN**

```bash
pnpm test components/locations/map-explorer.test.tsx components/locations/location-card.test.tsx components/locations/search-controls.test.tsx lib/locations/location-utils.test.ts
```

Expected: staged loading, summary-card, retry, source-stability, and utility tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/locations/map-explorer.tsx components/locations/map-explorer.test.tsx components/locations/location-card.tsx components/locations/location-card.test.tsx components/locations/search-controls.tsx components/locations/search-controls.test.tsx lib/locations/types.ts lib/locations/location-utils.ts
git commit -m "perf: render map before location index"
```

---

### Task 7: Load selected location details on demand

**Files:**
- Modify: `components/locations/location-card.tsx`
- Modify: `components/locations/location-card.test.tsx`
- Modify: `components/locations/map-explorer.tsx`
- Modify: `components/locations/map-explorer.test.tsx`

- [ ] **Step 1: Write failing card detail-state tests**

```ts
it("shows summary fields while selected details load", () => {
  render(<LocationCard result={result} selected detailState={{ status: "loading" }} onSelect={() => {}} />);
  expect(screen.getByText("Lisätietoja ladataan…")).toBeInTheDocument();
  expect(screen.getByText("Katu 1, 00100, Helsinki")).toBeInTheDocument();
});

it("shows loaded details", () => {
  render(<LocationCard result={result} selected detailState={{ status: "ready", detail }} onSelect={() => {}} />);
  expect(screen.getByText("Infopisteen vieressä")).toBeInTheDocument();
});

it("keeps route action and offers detail retry after failure", async () => {
  const retry = vi.fn();
  render(<LocationCard result={result} selected detailState={{ status: "error", message: "Lisätietoja ei voitu ladata." }} onRetryDetail={retry} onSelect={() => {}} />);
  expect(screen.getByRole("link", { name: /näytä reitti/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Yritä lisätietoja uudelleen" }));
  expect(retry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run card tests and verify RED**

```bash
pnpm test components/locations/location-card.test.tsx
```

Expected: FAIL because `detailState` and detail retry do not exist.

- [ ] **Step 3: Implement card detail states**

Define:

```ts
export type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; detail: LocationDetail }
  | { status: "error"; message: string };
```

Summary fields always render. Selected-only availability description and indoor location render from `detailState`. The route action remains available in all selected states.

- [ ] **Step 4: Load details from the explorer**

When `selectedId` changes:

- set loading state for that ID
- call `dataClient.loadDetail(selectedId)`
- ignore stale resolution after another selection or unmount
- store ready/error state by location ID
- on retry call `dataClient.clearDetailShard(id)` and load again

Do not fetch details for the automatically highlighted nearest marker until the user explicitly selects it.

- [ ] **Step 5: Run card and explorer tests and verify GREEN**

```bash
pnpm test components/locations/location-card.test.tsx components/locations/map-explorer.test.tsx lib/locations/location-data-client.test.ts
```

Expected: all detail loading and cache tests PASS.

- [ ] **Step 6: Commit**

```bash
git add components/locations/location-card.tsx components/locations/location-card.test.tsx components/locations/map-explorer.tsx components/locations/map-explorer.test.tsx
git commit -m "perf: load location details on demand"
```

---

### Task 8: Update browser flows, documentation, and performance assertions

**Files:**
- Modify: `e2e/core-flows.spec.ts`
- Modify: `README.md`
- Modify: `package.json` only if the generated-data command description changes

- [ ] **Step 1: Add failing browser loading-order coverage**

Add a Playwright test that delays staged data:

```ts
test("vector basemap renders before location data", async ({ page }) => {
  await page.route("**/data/map-points.geojson", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.route("**/data/location-index.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByLabel("Interaktiivinen sydäniskurikartta")).toBeVisible();
  await expect(page.getByText("Kohteita ladataan…")).toBeVisible();
  await expect(page.getByText(/12[\s\u00a0]486 kohdetta/)).toBeVisible({ timeout: 10_000 });
});
```

Add request assertions that initial navigation requests points and index but no `/data/details/*.json`; selecting a location should request exactly one detail shard.

- [ ] **Step 2: Run the browser test and verify RED**

```bash
pnpm test:e2e --project=chromium --grep "vector basemap"
```

Expected: FAIL before the staged explorer and generated files are fully wired.

- [ ] **Step 3: Update existing browser selectors and failure routes**

Keep the original search, selected detail, emergency guide, auth, proposal, logout, and overflow flows. The overflow flow must continue to iterate through `[375, 768, 1024, 1440]`. Add route-abort cases for points, index, and detail shards and assert each Finnish retry state.

- [ ] **Step 4: Update README setup**

Document:

```md
cp .env.example .env.local
# Set NEXT_PUBLIC_MAPTILER_KEY in .env.local and Vercel.
pnpm data:build
pnpm dev
```

Explain that `.env.local` is ignored, the browser key should use domain restrictions, and production deploys use the committed staged files.

- [ ] **Step 5: Run browser tests and verify GREEN**

```bash
pnpm test:e2e
```

Expected: all Chromium desktop and mobile projects PASS.

- [ ] **Step 6: Commit**

```bash
git add e2e/core-flows.spec.ts README.md package.json
git commit -m "test: verify staged map loading performance"
```

---

### Task 9: Full verification and deployment validation

**Files:**
- Modify only files required by failures reproduced during this task

- [ ] **Step 1: Regenerate and check deterministic output**

```bash
pnpm data:build
git diff --exit-code public/data
```

Expected: generation succeeds and the committed output is unchanged.

- [ ] **Step 2: Verify privacy and budgets**

```bash
if rg -n 'userName|contactPerson|phoneNumber|disclaimers|@' public/data; then exit 1; fi
test "$(wc -c < public/data/map-points.geojson)" -lt 2000000
test "$(wc -c < public/data/location-index.json)" -lt 5000000
```

Expected: all commands exit 0.

- [ ] **Step 3: Run the complete local verification suite**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

Expected:

- all Vitest files PASS
- ESLint exits 0 without warnings
- TypeScript exits 0
- Next.js production build succeeds
- all Playwright desktop/mobile flows PASS

- [ ] **Step 4: Inspect production bundle and staged payloads**

```bash
du -h public/data/map-points.geojson public/data/location-index.json
gzip -c -9 public/data/map-points.geojson | wc -c
gzip -c -9 public/data/location-index.json | wc -c
```

Record the raw and compressed sizes in the commit message or completion report. Do not introduce a new report file.

- [ ] **Step 5: Push and validate Vercel**

After explicit user approval to push:

```bash
git push origin master
```

In Vercel, set `NEXT_PUBLIC_MAPTILER_KEY` for Production and Preview, redeploy, then verify in browser DevTools:

- MapTiler style and vector-tile requests return 200
- basemap is visible before staged location requests finish
- no initial detail-shard request occurs
- selecting a location loads one detail shard
- no raster requests to `tile.openstreetmap.org` occur

- [ ] **Step 6: Update the project wiki**

Use the `wiki-update` skill to record the staged static data architecture, MapTiler decision, measured payload sizes, and deployment configuration. Run `cross-linker` if the update creates a new page.

