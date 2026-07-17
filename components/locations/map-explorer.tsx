"use client";

import dynamic from "next/dynamic";
import { Crosshair, List, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { filterAndSortLocations } from "@/lib/locations/location-utils";
import type { LocationCollection, LocationFeature } from "@/lib/locations/types";
import { LocationCard } from "./location-card";
import { SearchControls, type SearchFilterState } from "./search-controls";

const MapView = dynamic(() => import("./map-view").then((module) => module.MapView), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Karttaa ladataan…</div>,
});

const DEFAULT_CENTER: [number, number] = [24.94, 60.17];
const emptyFilters: SearchFilterState = { query: "", openNow: false, alwaysOpen: false, locationType: "" };

export function MapExplorer({ initialCollection }: { initialCollection?: LocationCollection }) {
  const [collection, setCollection] = useState<LocationCollection | null>(initialCollection ?? null);
  const [loadError, setLoadError] = useState("");
  const [mapError, setMapError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [origin, setOrigin] = useState<[number, number]>(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(true);

  const loadLocations = useCallback(async () => {
    if (initialCollection) return;
    setLoadError("");
    try {
      const response = await fetch("/data/defibrillators.geojson");
      if (!response.ok) throw new Error();
      setCollection(await response.json() as LocationCollection);
    } catch {
      setLoadError("Sydäniskuritietoja ei voitu ladata.");
    }
  }, [initialCollection]);

  useEffect(() => { void loadLocations(); }, [loadLocations]);

  const locationTypes = useMemo(
    () => [...new Set(collection?.features.map((feature) => feature.properties.locationType).filter(Boolean) ?? [])].sort((a, b) => a.localeCompare(b, "fi")),
    [collection],
  );

  const results = useMemo(
    () => filterAndSortLocations(collection?.features ?? [], { ...filters, origin }),
    [collection, filters, origin],
  );

  const visibleFeatures = useMemo<LocationFeature[]>(() => results.map((result) => result.feature), [results]);
  const selectedResult = results.find((result) => result.feature.properties.id === selectedId);
  const highlightedFeature = selectedResult?.feature ?? results[0]?.feature ?? null;

  const selectLocation = useCallback((id: number) => {
    const feature = collection?.features.find((candidate) => candidate.properties.id === id);
    if (feature) {
      setSelectedId(id);
      setMobilePanelOpen(true);
    }
  }, [collection]);

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

  if (loadError) {
    return (
      <main className="centered-state">
        <h1>Tietojen lataus epäonnistui</h1><p>{loadError}</p>
        <button className="button button--primary" type="button" onClick={() => void loadLocations()}><RotateCcw aria-hidden="true" /> Yritä uudelleen</button>
      </main>
    );
  }

  if (!collection) return <main className="centered-state" role="status"><div className="spinner" /><p>Sydäniskureita ladataan…</p></main>;

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
          <SearchControls filters={filters} locationTypes={locationTypes} onChange={setFilters} onClear={() => { setFilters(emptyFilters); setSelectedId(null); }} />
          <div className="results-heading">
            <div><strong>{results.length.toLocaleString("fi-FI")} {results.length === 1 ? "kohde" : "kohdetta"}</strong><span>etäisyyden mukaan</span></div>
            <button className="button button--secondary locate-button" type="button" onClick={useOwnLocation}><Crosshair aria-hidden="true" size={18} /> Oma sijainti</button>
          </div>
          {locationMessage && <p className="inline-notice" role="status">{locationMessage}</p>}
          {mapError && <p className="inline-notice inline-notice--warning" role="status">Kartta ei latautunut. Voit käyttää alla olevaa kohdelistaa.</p>}
          <div className="location-list">
            {results.length ? results.slice(0, 60).map((result) => (
              <LocationCard key={result.feature.properties.id} result={result} selected={selectedId === result.feature.properties.id} onSelect={() => selectLocation(result.feature.properties.id)} />
            )) : (
              <div className="empty-state"><h2>Ei kohteita tältä alueelta</h2><p>Kokeile laajempaa hakua tai tyhjennä suodattimet yllä.</p></div>
            )}
          </div>
        </div>
      </aside>
      <section className="map-area" aria-label="Sydäniskurikartta">
        {!mapError && <MapView features={visibleFeatures} selectedFeature={highlightedFeature} userLocation={userLocation} onSelect={selectLocation} onCenterChange={setOrigin} onError={() => setMapError("Kartta ei latautunut.")} />}
        <button className="mobile-panel-toggle button button--primary" type="button" onClick={() => setMobilePanelOpen((value) => !value)}>
          <List aria-hidden="true" size={18} /> {mobilePanelOpen ? "Sulje lista" : `Näytä lista (${results.length})`}
        </button>
      </section>
    </main>
  );
}
