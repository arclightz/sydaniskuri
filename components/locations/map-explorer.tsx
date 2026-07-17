"use client";

import dynamic from "next/dynamic";
import { Crosshair, List } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LocationDataClient } from "@/lib/locations/location-data-client";
import { filterLocationSummaries, sortLocationSummariesByDistance } from "@/lib/locations/location-utils";
import type { LocationSummary, MapPointCollection, MapViewportBounds } from "@/lib/locations/types";
import { LocationCard, type DetailState } from "./location-card";
import { LocationDetailsModal } from "./location-details-modal";
import { MapStatus } from "./map-status";
import { SearchControls, type SearchFilterState } from "./search-controls";

const MapView = dynamic(() => import("./map-view").then((module) => module.MapView), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Karttaa ladataan…</div>,
});

const DEFAULT_CENTER: [number, number] = [24.94, 60.17];
const emptyFilters: SearchFilterState = { query: "", openNow: false, alwaysOpen: false, locationType: "" };

type LocationDataLoader = Pick<LocationDataClient, "loadPoints" | "loadIndex" | "loadDetail" | "clearDetailShard">;

export function MapExplorer({
  dataClient,
  initialPoints,
  initialSummaries,
  mapTilerKey = "",
}: {
  dataClient?: LocationDataLoader;
  initialPoints?: MapPointCollection;
  initialSummaries?: LocationSummary[];
  mapTilerKey?: string;
}) {
  const client = useMemo(() => dataClient ?? new LocationDataClient(), [dataClient]);
  const [points, setPoints] = useState<MapPointCollection | null>(initialPoints ?? null);
  const [summaries, setSummaries] = useState<LocationSummary[] | null>(initialSummaries ?? null);
  const [pointError, setPointError] = useState("");
  const [indexError, setIndexError] = useState("");
  const [mapError, setMapError] = useState(mapTilerKey ? "" : "MapTiler-avain puuttuu.");
  const [filters, setFilters] = useState(emptyFilters);
  const deferredFilters = useDeferredValue(filters);
  const [origin, setOrigin] = useState<[number, number]>(DEFAULT_CENTER);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds>({ west: -180, south: -90, east: 180, north: 90 });
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailStates, setDetailStates] = useState<Record<number, DetailState>>({});
  const detailRequestRef = useRef(0);
  const [locationMessage, setLocationMessage] = useState("");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

  const loadPoints = useCallback(async () => {
    setPointError("");
    try {
      setPoints(await client.loadPoints());
    } catch {
      setPointError("Sydäniskureita ei voitu ladata.");
    }
  }, [client]);

  const loadIndex = useCallback(async () => {
    setIndexError("");
    try {
      setSummaries(await client.loadIndex());
    } catch {
      setIndexError("Kohdetietoja ei voitu ladata.");
    }
  }, [client]);

  useEffect(() => {
    if (!initialPoints) void loadPoints();
  }, [initialPoints, loadPoints]);

  useEffect(() => {
    if (!initialSummaries) void loadIndex();
  }, [initialSummaries, loadIndex]);

  const locationTypes = useMemo(
    () => [...new Set(summaries?.map((summary) => summary.locationType).filter(Boolean) ?? [])].sort((left, right) => left.localeCompare(right, "fi")),
    [summaries],
  );
  const filteredSummaries = useMemo(
    () => filterLocationSummaries(summaries ?? [], deferredFilters),
    [deferredFilters, summaries],
  );
  const results = useMemo(
    () => sortLocationSummariesByDistance(filteredSummaries, origin),
    [filteredSummaries, origin],
  );
  const viewportResults = useMemo(() => results.filter(({ summary }) => {
    const [longitude, latitude] = summary.coordinates;
    return longitude >= viewportBounds.west && longitude <= viewportBounds.east
      && latitude >= viewportBounds.south && latitude <= viewportBounds.north;
  }), [results, viewportBounds]);
  const listedResults = viewportResults.slice(0, 5);

  const selectedResult = results.find((result) => result.summary.id === selectedId) ?? null;

  const visiblePoints = useMemo(() => {
    if (!points) return [];
    const visibleIds = new Set(filteredSummaries.map((summary) => summary.id));
    return points.features.filter((point) => visibleIds.has(point.id));
  }, [filteredSummaries, points]);

  const loadDetail = useCallback(async (id: number) => {
    const request = ++detailRequestRef.current;
    setDetailStates((states) => ({ ...states, [id]: { status: "loading" } }));
    try {
      const detail = await client.loadDetail(id);
      if (request === detailRequestRef.current) setDetailStates((states) => ({ ...states, [id]: { status: "ready", detail } }));
    } catch {
      if (request === detailRequestRef.current) setDetailStates((states) => ({ ...states, [id]: { status: "error", message: "Lisätietoja ei voitu ladata." } }));
    }
  }, [client]);

  useEffect(() => {
    if (selectedId === null || detailStates[selectedId]) return;
    void loadDetail(selectedId);
  }, [detailStates, loadDetail, selectedId]);

  const retryDetail = useCallback((id: number) => {
    client.clearDetailShard(id);
    void loadDetail(id);
  }, [client, loadDetail]);

  const selectLocation = useCallback((id: number) => {
    if (summaries?.some((summary) => summary.id === id)) {
      setSelectedId(id);
      setMobilePanelOpen(true);
    }
  }, [summaries]);

  function useOwnLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Paikannus ei ole käytettävissä. Voit hakea osoitteella tai kaupungilla.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates: [number, number] = [coords.longitude, coords.latitude];
        setUserLocation(coordinates);
        setOrigin(coordinates);
        setLocationMessage("Kartta keskitettiin sijaintiisi.");
      },
      () => setLocationMessage("Sijaintilupaa ei saatu. Voit hakea osoitteella tai kaupungilla."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <main className="explorer">
      <aside className={`explorer-panel ${mobilePanelOpen ? "explorer-panel--open" : ""}`} aria-label="Sydäniskurien hakutulokset">
        <div className="panel-handle" aria-hidden="true" />
        <div className="explorer-panel__scroll">
          <div className="panel-intro">
            <p className="eyebrow">Sydäniskurit lähelläsi</p>
            <h1>Löydä apu nopeasti</h1>
            <p>Hae yli 12 000 sydäniskurin joukosta koko Suomessa.</p>
          </div>
          <SearchControls loading={!summaries} filters={filters} locationTypes={locationTypes} onChange={setFilters} onClear={() => { setFilters(emptyFilters); setSelectedId(null); }} />
          <div className="results-heading">
            <div>
              <strong>{summaries ? `${viewportResults.length.toLocaleString("fi-FI")} ${viewportResults.length === 1 ? "kohde" : "kohdetta"} kartta-alueella` : "Kohteita ladataan…"}</strong>
              <span>etäisyyden mukaan</span>
            </div>
            <button className="button button--secondary locate-button" type="button" onClick={useOwnLocation}><Crosshair aria-hidden="true" size={18} /> Oma sijainti</button>
          </div>
          {indexError && <div className="inline-notice inline-notice--warning" role="alert"><p>{indexError}</p><button className="text-button" type="button" onClick={() => void loadIndex()}>Lataa kohdetiedot uudelleen</button></div>}
          {locationMessage && <p className="inline-notice" role="status">{locationMessage}</p>}
          <div className="location-list">
            {summaries && !indexError && (listedResults.length ? listedResults.map((result) => (
              <LocationCard key={result.summary.id} result={result} onSelect={() => selectLocation(result.summary.id)} />
            )) : (
              <div className="empty-state"><h2>Ei kohteita tältä alueelta</h2><p>Kokeile laajempaa hakua tai tyhjennä suodattimet yllä.</p></div>
            ))}
          </div>
        </div>
      </aside>
      <section className="map-area" aria-label="Sydäniskurikartta">
        <MapView features={visiblePoints} selectedId={selectedId} userLocation={userLocation} mapTilerKey={mapTilerKey} onSelect={selectLocation} onCenterChange={setOrigin} onViewportChange={setViewportBounds} onError={() => setMapError((current) => current || "Kartta ei latautunut.")} />
        <MapStatus loading={!points && !pointError} error={pointError} onRetry={() => void loadPoints()} />
        {mapError && <p className="map-status map-status--error" role="alert">{mapError}</p>}
        {selectedResult && (
          <LocationDetailsModal
            result={selectedResult}
            detailState={detailStates[selectedResult.summary.id] ?? { status: "idle" }}
            onClose={() => setSelectedId(null)}
            onRetry={() => retryDetail(selectedResult.summary.id)}
          />
        )}
        <button className="mobile-panel-toggle button button--primary" type="button" onClick={() => setMobilePanelOpen((value) => !value)}>
          <List aria-hidden="true" size={18} /> {mobilePanelOpen ? "Sulje lista" : `Näytä lista (${viewportResults.length})`}
        </button>
      </section>
    </main>
  );
}
