"use client";

import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER: [number, number] = [24.94, 60.17];

export function CoordinatePicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number | null, longitude: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        center: longitude !== null && latitude !== null ? [longitude, latitude] : DEFAULT_CENTER,
        zoom: 13,
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMapin tekijät" } },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      const setMarker = (lng: number, lat: number) => {
        markerRef.current?.remove();
        const marker = new maplibregl.Marker({ color: "#176b50", draggable: true }).setLngLat([lng, lat]).addTo(map);
        marker.on("dragend", () => { const point = marker.getLngLat(); onChange(point.lat, point.lng); });
        markerRef.current = marker;
        onChange(lat, lng);
      };
      map.on("click", ({ lngLat }) => setMarker(lngLat.lng, lngLat.lat));
      if (longitude !== null && latitude !== null) setMarker(longitude, latitude);
    } catch {
      setMessage("Karttavalitsin ei latautunut. Voit syöttää koordinaatit käsin.");
    }
    return () => { markerRef.current?.remove(); mapRef.current?.remove(); mapRef.current = null; };
  // Initial map setup only. Updates happen through the marker and coordinate fields.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useCenter() {
    const center = mapRef.current?.getCenter();
    if (center) onChange(center.lat, center.lng);
    else onChange(DEFAULT_CENTER[1], DEFAULT_CENTER[0]);
  }

  function useOwnLocation() {
    if (!navigator.geolocation) { setMessage("Paikannus ei ole käytettävissä."); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange(coords.latitude, coords.longitude);
        mapRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 15 });
        setMessage("Sijainti asetettu.");
      },
      () => setMessage("Sijaintilupaa ei saatu. Valitse paikka kartalta tai syötä koordinaatit."),
    );
  }

  return (
    <div className="coordinate-picker">
      <div ref={containerRef} className="coordinate-map" aria-label="Valitse sydäniskurin sijainti kartalta" />
      <div className="coordinate-actions">
        <button className="button button--secondary" type="button" onClick={useCenter}><MapPin aria-hidden="true" /> Aseta kartan keskelle</button>
        <button className="button button--secondary" type="button" onClick={useOwnLocation}><Crosshair aria-hidden="true" /> Käytä omaa sijaintia</button>
      </div>
      {message && <p className="inline-notice" role="status">{message}</p>}
      <div className="form-grid form-grid--two">
        <label><span>Leveysaste <b aria-hidden="true">*</b></span><input aria-label="Leveysaste" type="number" step="any" inputMode="decimal" value={latitude ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null, longitude)} /></label>
        <label><span>Pituusaste <b aria-hidden="true">*</b></span><input aria-label="Pituusaste" type="number" step="any" inputMode="decimal" value={longitude ?? ""} onChange={(event) => onChange(latitude, event.target.value ? Number(event.target.value) : null)} /></label>
      </div>
    </div>
  );
}
