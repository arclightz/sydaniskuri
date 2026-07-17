# Viewport Results and Location Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the MapLibre canvas at viewport size, show at most five filtered locations within the current map bounds, and open selected-location details in a modal.

**Architecture:** `MapView` publishes its bounds on load and on completed map moves. `MapExplorer` intersects those bounds with the existing filtered and distance-sorted summaries, renders the first five as compact cards, and owns selected-detail state. A dedicated modal renders selected summary/detail content above the map and handles focus, escape, backdrop click, and retry.

**Tech Stack:** Next.js App Router, React 19, TypeScript, MapLibre GL JS, Vitest, Testing Library, Playwright

---

## File structure

**Create:**
- `components/locations/location-details-modal.tsx` — accessible selected-location dialog with detail loading states
- `components/locations/location-details-modal.test.tsx` — dialog, close, route, and retry behavior

**Modify:**
- `lib/locations/types.ts` — map viewport bounds type
- `components/locations/map-view.tsx` — emit viewport bounds from MapLibre
- `components/locations/map-explorer.tsx` — viewport filtering, five-card cap, modal selection
- `components/locations/map-explorer.test.tsx` — bounds filtering, cap, modal selection
- `components/locations/location-card.tsx` — compact trigger-only card
- `components/locations/location-card.test.tsx` — compact card behavior
- `app/globals.css` — constrain desktop grid items and style location modal
- `e2e/core-flows.spec.ts` — canvas-size and modal browser checks

---

### Task 1: Publish map viewport bounds

**Files:**
- Modify: `lib/locations/types.ts`
- Modify: `components/locations/map-view.tsx`
- Modify: `components/locations/map-explorer.test.tsx`

- [ ] **Step 1: Add a failing explorer test for map-bounds filtering**

Extend the `MapView` mock to accept `onViewportChange` and add a control that emits a Helsinki-only viewport. Add six summary fixtures, where only IDs `1` through `5` are inside the emitted bounds and ID `6` is outside.

```tsx
<button type="button" onClick={() => onViewportChange({ west: 24.8, south: 60.1, east: 25.1, north: 60.3 })}>
  Rajaa testikartta Helsinkiin
</button>

it("shows at most five filtered locations inside the map viewport", async () => {
  const user = userEvent.setup();
  render(<MapExplorer initialPoints={points} initialSummaries={sixSummaries} mapTilerKey="key" />);
  await user.click(await screen.findByRole("button", { name: "Rajaa testikartta Helsinkiin" }));

  expect(screen.getAllByRole("article")).toHaveLength(5);
  expect(screen.queryByRole("heading", { name: "Turun kirjasto" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm test components/locations/map-explorer.test.tsx
```

Expected: FAIL because `MapView` has no `onViewportChange` API and the explorer does not filter against bounds.

- [ ] **Step 3: Add the shared viewport-boundary type**

Add to `lib/locations/types.ts`:

```ts
export type MapViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
```

- [ ] **Step 4: Emit bounds from MapLibre**

Add `onViewportChange` to `MapView` props and its callback ref. Emit normalized `getBounds()` values after map setup and from the `moveend` listener:

```ts
function emitViewport(map: MapLibreMap) {
  const bounds = map.getBounds();
  callbacksRef.current.onViewportChange({
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  });
}

map.on("moveend", () => {
  const center = map.getCenter();
  callbacksRef.current.onCenterChange([center.lng, center.lat]);
  emitViewport(map);
});
emitViewport(map);
```

- [ ] **Step 5: Run the targeted test and verify GREEN**

Run:

```bash
pnpm test components/locations/map-explorer.test.tsx
```

Expected: the new test still fails until Task 2 wires the explorer state; existing tests remain green.

- [ ] **Step 6: Commit the map callback boundary**

```bash
git add lib/locations/types.ts components/locations/map-view.tsx components/locations/map-explorer.test.tsx
git commit -m "feat: publish map viewport bounds"
```

### Task 2: Restrict the left pane to five in-viewport results

**Files:**
- Modify: `components/locations/map-explorer.tsx`
- Modify: `components/locations/map-explorer.test.tsx`
- Modify: `components/locations/location-card.tsx`
- Modify: `components/locations/location-card.test.tsx`

- [ ] **Step 1: Add a failing compact-card test**

Replace selected-detail expectations with a test showing a card is a selection trigger only:

```tsx
it("opens a selected location without rendering inline details", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(<LocationCard result={result} onSelect={select} />);

  await user.click(screen.getByRole("button", { name: /kaupungintalo/i }));
  expect(select).toHaveBeenCalledOnce();
  expect(screen.queryByText("Tarkka sijainti")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the card test and verify RED**

Run:

```bash
pnpm test components/locations/location-card.test.tsx
```

Expected: FAIL because selected cards currently render inline details.

- [ ] **Step 3: Add viewport state and derive the capped list**

In `MapExplorer`, store `MapViewportBounds | null` and derive `viewportResults` from already filtered and distance-sorted results:

```ts
const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);

const viewportResults = useMemo(() => results.filter(({ summary }) => {
  if (!viewportBounds) return false;
  const [longitude, latitude] = summary.coordinates;
  return longitude >= viewportBounds.west && longitude <= viewportBounds.east
    && latitude >= viewportBounds.south && latitude <= viewportBounds.north;
}), [results, viewportBounds]);

const listedResults = viewportResults.slice(0, 5);
```

Pass `setViewportBounds` as `onViewportChange`, render `listedResults`, and render the count as `"${viewportResults.length} kohdetta kartta-alueella"`. Keep `visiblePoints` based on query/filter summaries rather than viewport results, so markers remain available to pan toward.

- [ ] **Step 4: Make `LocationCard` compact**

Remove `selected`, `detailState`, `onRetryDetail`, the details `<div>`, and route link from `LocationCard`. Keep summary title, distance, address, availability pill, and `onSelect` button.

- [ ] **Step 5: Run component tests and verify GREEN**

Run:

```bash
pnpm test components/locations/map-explorer.test.tsx components/locations/location-card.test.tsx
```

Expected: five-card cap, viewport exclusion, and compact-card tests PASS.

- [ ] **Step 6: Commit viewport results**

```bash
git add components/locations/map-explorer.tsx components/locations/map-explorer.test.tsx components/locations/location-card.tsx components/locations/location-card.test.tsx
git commit -m "feat: show nearby viewport results"
```

### Task 3: Present selected details in an accessible modal

**Files:**
- Create: `components/locations/location-details-modal.tsx`
- Create: `components/locations/location-details-modal.test.tsx`
- Modify: `components/locations/map-explorer.tsx`
- Modify: `components/locations/map-explorer.test.tsx`

- [ ] **Step 1: Write failing modal tests**

```tsx
it("shows selected summary data and closes with Escape", async () => {
  const close = vi.fn();
  const user = userEvent.setup();
  render(<LocationDetailsModal result={result} detailState={{ status: "loading" }} onClose={close} onRetry={() => {}} />);

  expect(screen.getByRole("dialog", { name: "Kaupungintalo" })).toBeInTheDocument();
  expect(screen.getByText("Lisätietoja ladataan…")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(close).toHaveBeenCalledOnce();
});

it("keeps the route link and retries detail loading after an error", async () => {
  const retry = vi.fn();
  render(<LocationDetailsModal result={result} detailState={{ status: "error", message: "Lisätietoja ei voitu ladata." }} onClose={() => {}} onRetry={retry} />);

  expect(screen.getByRole("link", { name: /näytä reitti/i })).toHaveAttribute("href", expect.stringContaining("60.17%2C24.94"));
  await userEvent.click(screen.getByRole("button", { name: "Yritä lisätietoja uudelleen" }));
  expect(retry).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the modal tests and verify RED**

Run:

```bash
pnpm test components/locations/location-details-modal.test.tsx
```

Expected: FAIL because the modal does not exist.

- [ ] **Step 3: Implement the modal**

Build `LocationDetailsModal` using the existing `dialog-backdrop` and `emergency-dialog` interaction model. The component receives `result`, `detailState`, `onClose`, and `onRetry`; focuses its close button on mount; restores the previously focused element on cleanup; closes on backdrop click and Escape. Render summary fields immediately, detail loading/error/ready states, and the Google Maps route link.

```tsx
type Props = {
  result: LocationResult;
  detailState: DetailState;
  onClose: () => void;
  onRetry: () => void;
};

export function LocationDetailsModal({ result, detailState, onClose, onRetry }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const { summary } = result;
  const detail = detailState.status === "ready" ? detailState.detail : null;
  const [longitude, latitude] = summary.coordinates;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="emergency-dialog location-details-modal" role="dialog" aria-modal="true" aria-labelledby="location-details-title">
        <button ref={closeButton} className="icon-button dialog-close" type="button" aria-label="Sulje kohdetiedot" onClick={onClose}><X aria-hidden="true" /></button>
        <p className="eyebrow">Sydäniskuri</p>
        <h2 id="location-details-title">{summary.title}</h2>
        <p>{[summary.address, summary.postalCode, summary.city].filter(Boolean).join(", ") || "Ei tiedossa"}</p>
        <dl>
          <div><dt>Paikkatyyppi</dt><dd>{summary.locationType || "Ei tiedossa"}</dd></div>
          <div><dt>Saatavuus</dt><dd>{detail?.availabilityDetails || "Ei tiedossa"}</dd></div>
          <div><dt>Tarkka sijainti</dt><dd>{detail?.addressDetails || "Ei tiedossa"}</dd></div>
        </dl>
        {detailState.status === "loading" && <p role="status">Lisätietoja ladataan…</p>}
        {detailState.status === "error" && <div role="alert"><p>{detailState.message}</p><button className="text-button" type="button" onClick={onRetry}>Yritä lisätietoja uudelleen</button></div>}
        <a className="button button--secondary" href={routeUrl} target="_blank" rel="noreferrer">Näytä reitti <ExternalLink aria-hidden="true" size={17} /></a>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Wire selection into the explorer**

Keep `selectedId` as modal state. Render the modal only when `selectedResult` is found:

```tsx
const selectedResult = results.find((result) => result.summary.id === selectedId) ?? null;

{selectedResult && (
  <LocationDetailsModal
    result={selectedResult}
    detailState={detailStates[selectedResult.summary.id] ?? { status: "idle" }}
    onClose={() => setSelectedId(null)}
    onRetry={() => retryDetail(selectedResult.summary.id)}
  />
)}
```

Selection from a marker or compact card continues to call `selectLocation`, which starts the existing detail request. Extend explorer coverage to select a marker, assert the dialog contains loaded detail text, and close it.

- [ ] **Step 5: Run modal and explorer tests and verify GREEN**

Run:

```bash
pnpm test components/locations/location-details-modal.test.tsx components/locations/map-explorer.test.tsx
```

Expected: modal keyboard close, retry, route, on-demand load, and selection tests PASS.

- [ ] **Step 6: Commit the details modal**

```bash
git add components/locations/location-details-modal.tsx components/locations/location-details-modal.test.tsx components/locations/map-explorer.tsx components/locations/map-explorer.test.tsx
git commit -m "feat: show location details in modal"
```

### Task 4: Prevent canvas stretching and prove browser behavior

**Files:**
- Modify: `app/globals.css`
- Modify: `e2e/core-flows.spec.ts`

- [ ] **Step 1: Add failing browser assertions**

Add an E2E test that waits for the canvas and verifies it is not stretched beyond the browser canvas limit. Select a visible location and verify its dialog opens.

```ts
test("map canvas stays viewport-sized and opens selected details in a modal", async ({ page }) => {
  await page.goto("/");
  const map = page.locator(".map");
  await expect(map).toBeVisible();
  await expect(page.getByText(/kohdetta kartta-alueella/)).toBeVisible();

  const dimensions = await page.locator(".map canvas").evaluate((canvas) => ({
    cssWidth: canvas.clientWidth,
    cssHeight: canvas.clientHeight,
    bufferWidth: canvas.width,
    bufferHeight: canvas.height,
    dpr: window.devicePixelRatio,
  }));
  expect(dimensions.bufferWidth).toBe(dimensions.cssWidth * dimensions.dpr);
  expect(dimensions.bufferHeight).toBe(dimensions.cssHeight * dimensions.dpr);

  await page.locator(".location-card").first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

- [ ] **Step 2: Run the browser test and verify RED**

Run:

```bash
pnpm test:e2e --project=chromium --grep "canvas stays viewport"
```

Expected: FAIL because the desktop grid items expand to the result list and stretch the map canvas.

- [ ] **Step 3: Constrain the grid and map area**

Add the following desktop rules near the existing explorer styles; retain the mobile override unchanged:

```css
.explorer { grid-template-rows: minmax(0, 1fr); }
.explorer-panel, .map-area { min-height: 0; }
.map-area { overflow: hidden; }
```

Add focused modal styles by extending the existing dialog selectors:

```css
.location-details-modal { width: min(560px, 100%); }
.location-details-modal dl { margin-block: 20px; }
```

- [ ] **Step 4: Run all affected verification and verify GREEN**

Run:

```bash
pnpm test components/locations/location-details-modal.test.tsx components/locations/map-explorer.test.tsx components/locations/location-card.test.tsx
pnpm test:e2e --project=chromium --grep "canvas stays viewport"
pnpm lint
pnpm typecheck
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the layout fix and browser regression coverage**

```bash
git add app/globals.css e2e/core-flows.spec.ts
git commit -m "fix: constrain map canvas to viewport"
```

### Task 5: Expand clusters to individual defibrillator markers

**Files:**
- Create: `components/locations/map-view.test.ts`
- Modify: `components/locations/map-view.tsx`

- [ ] **Step 1: Write a failing target-zoom test**

```ts
import { expect, it } from "vitest";
import { clusterTargetZoom } from "./map-view";

it("zooms clusters directly to individual marker detail", () => {
  expect(clusterTargetZoom(11)).toBe(15);
  expect(clusterTargetZoom(16)).toBe(16);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm test components/locations/map-view.test.ts
```

Expected: FAIL because `clusterTargetZoom` does not exist.

- [ ] **Step 3: Implement direct expansion**

Export this helper from `map-view.tsx` and use it in the cluster click handler:

```ts
export function clusterTargetZoom(expansionZoom: number) {
  return Math.max(expansionZoom, 15);
}

const expansionZoom = await source.getClusterExpansionZoom(clusterId);
map.easeTo({ center: coordinates, zoom: clusterTargetZoom(expansionZoom) });
```

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
pnpm test components/locations/map-view.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit direct cluster expansion**

```bash
git add components/locations/map-view.tsx components/locations/map-view.test.ts docs/superpowers/specs/2026-07-17-viewport-results-modal-design.md docs/superpowers/plans/2026-07-17-viewport-results-modal.md
git commit -m "fix: expand clusters to individual markers"
```
