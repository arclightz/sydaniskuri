# Sydäniskuri map performance optimization — design specification

**Date:** 2026-07-17  
**Status:** User-approved design  
**Language:** All user-visible content remains Finnish

## 1. Goal

Make the map feel immediate, remove the pixelated raster appearance, and keep search and map interaction responsive with 12,486 locations. The deployment remains static and Vercel-compatible without adding a database or server API.

## 2. Current bottlenecks

The current page waits for a 9.35 MB GeoJSON document before rendering the map. After parsing, the browser filters and sorts every location, copies complete location properties into MapLibre, and reclusters the source whenever result ordering changes. Most properties sent to the map worker are not needed for map rendering.

The basemap uses public 256-pixel OpenStreetMap raster tiles and a public demo glyph endpoint. Raster tiles appear soft on high-density displays and the public endpoints are not suitable as a polished production map service.

## 3. Basemap

Use MapTiler's vector map style through MapLibre. Configure it with `NEXT_PUBLIC_MAPTILER_KEY`.

- `.env.local` stores the local test key and remains ignored by Git.
- `.env.example` documents the required variable without containing a key.
- Vercel receives the variable through project environment settings.
- The MapTiler key should be restricted to local and deployed application domains.
- Missing or rejected configuration shows a Finnish setup error. The application does not silently fall back to the low-quality raster source.

## 4. Staged static data

The preprocessing command generates three public data layers from `defi/data/defi_locations.json`.

### 4.1 Map points

`public/data/map-points.geojson` contains only:

- location ID
- point coordinates

This file loads first and feeds MapLibre clustering. No names, addresses, availability information, contact information, or indoor details are sent to the map worker.

### 4.2 Search index

`public/data/location-index.json` uses a compact, versioned tuple schema. It contains only fields required for:

- name, city, and address search
- location-type filtering
- current and 24/7 availability filtering
- Haversine distance calculation
- textual result-list summaries

Availability rules use compact encoded values rather than repeated verbose property names. A decoder converts tuples into typed application summaries at the data boundary. The visible components do not depend directly on tuple positions.

### 4.3 Detail shards

Detailed availability text and exact indoor location instructions are split across deterministic shard files under `public/data/details/`. A selected location maps to one shard. The browser loads and caches that shard only when details are requested.

Sharding avoids thousands of individual files while preventing the entire detail corpus from loading at startup. Detail files contain no account, contact, phone, disclaimer, or other private source fields.

## 5. Client data flow

1. Render the application shell and MapTiler basemap immediately with an empty point source.
2. Fetch map points and the search index concurrently.
3. Add point data to MapLibre when ready without blocking the basemap.
4. Decode the search index once at its data boundary.
5. Filter summaries from deferred search controls.
6. Sort textual results from the current comparison origin.
7. Keep the map point source unchanged when only result distance ordering changes.
8. Rebuild the visible point collection only when an actual query or filter changes which IDs should appear.
9. Fetch and cache the relevant detail shard when the user selects a result.

Map-source state and list-order state are separate. Panning changes list distance ordering but does not serialize and recluster all map data.

## 6. Loading and failure states

- The basemap appears without waiting for location data.
- Marker loading uses a subtle map-local status indicator.
- Search controls remain visible while the index loads and announce `Kohteita ladataan…`.
- A point-data failure leaves the vector basemap and textual results available.
- An index failure shows an inline Finnish error and retry action.
- Detail loading is confined to the selected card.
- Detail failure preserves summary fields and route navigation and provides a retry action.
- MapTiler authorization or style failures show a Finnish configuration message.
- Existing geolocation denial, empty results, and textual map fallback behavior remain available.

## 7. Performance budgets

- The basemap shell does not wait for location JSON.
- `map-points.geojson` remains below 2 MB uncompressed.
- `location-index.json` remains below 5 MB uncompressed.
- No complete location-detail corpus is transferred during initial load.
- MapLibre receives no location properties beyond point ID.
- Changing only the map center does not call `setData` on the defibrillator source.
- The layout remains responsive without horizontal overflow at 375, 768, 1024, and 1440 pixels.

## 8. Privacy

The existing public-field allowlist remains authoritative. Preprocessing rejects invalid coordinates and strips `userName`, contact people, phone numbers, disclaimers, and all unrelated source fields from every generated layer.

The browser-facing MapTiler key is not treated as a server secret, but it is never committed. Domain restrictions and provider usage limits are the controls against unauthorized use.

## 9. Testing

### Unit tests

- point output includes only ID and coordinates
- compact index encode/decode round-trips searchable and availability behavior
- deterministic shard assignment and detail decoding
- private fields are absent from every generated layer
- output files remain inside their size budgets
- detail shard loader caches repeated requests
- filtering and sorting remain correct after index decoding

### Component tests

- map shell renders while the index request is unresolved
- index loading and retry states are announced
- detail loading, success, failure, and retry states remain local to the selected result
- center-only changes do not replace map point data
- missing MapTiler configuration shows a Finnish setup message

### Browser tests

- basemap container appears before delayed location responses complete
- markers, clusters, search, selection, and route links work on desktop and mobile
- failed point, index, and detail requests remain recoverable
- authentication, proposals, emergency guidance, and protected-route flows continue to pass
- no horizontal overflow at the four target widths

### Completion checks

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- generated-data privacy scan
- production browser validation against the Vercel deployment

## 10. Out of scope

- PostgreSQL or another shared database
- server-side bounding-box or search APIs
- Google Maps or Mapbox integration
- geocoding
- offline map tiles
- changing the account or proposal persistence model
