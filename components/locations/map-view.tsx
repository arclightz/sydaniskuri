"use client";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { mapTilerStyleUrl } from "@/lib/maps/maptiler";
import type { MapPointFeature, MapViewportBounds } from "@/lib/locations/types";

const SOURCE_ID = "defibrillators";
const USER_SOURCE_ID = "user-location";

export function clusterTargetZoom(expansionZoom: number) {
  return Math.max(expansionZoom, 15);
}

type DefibrillatorPointPaint = {
  "circle-color": ["case", ["==", ["id"], number], string, string];
  "circle-radius": number;
  "circle-stroke-color": string;
  "circle-stroke-width": number;
};

export function defibrillatorPointPaint(selectedId: number | null): DefibrillatorPointPaint {
  return {
    "circle-color": ["case", ["==", ["id"], selectedId ?? -1], "#c62828", "#176b50"],
    "circle-radius": 10,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 3,
  };
}

export function MapView({
  features,
  selectedId,
  userLocation,
  mapTilerKey,
  onSelect,
  onCenterChange,
  onViewportChange,
  onError,
}: {
  features: MapPointFeature[];
  selectedId: number | null;
  userLocation: [number, number] | null;
  mapTilerKey: string;
  onSelect: (id: number) => void;
  onCenterChange: (center: [number, number]) => void;
  onViewportChange: (bounds: MapViewportBounds) => void;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedIdRef = useRef(selectedId);
  const callbacksRef = useRef({ onSelect, onCenterChange, onViewportChange, onError });
  selectedIdRef.current = selectedId;
  callbacksRef.current = { onSelect, onCenterChange, onViewportChange, onError };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    try {
      const map = new maplibregl.Map({
        container: containerRef.current,
        center: [24.94, 60.17],
        zoom: 10,
        minZoom: 4,
        maxZoom: 18,
        style: mapTilerStyleUrl(mapTilerKey),
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        map.addSource(SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterMaxZoom: 14, clusterRadius: 48 });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: { "circle-color": "#176b50", "circle-radius": ["step", ["get", "point_count"], 19, 50, 24, 250, 29], "circle-stroke-color": "#fff", "circle-stroke-width": 3 },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["Open Sans Regular"] },
          paint: { "text-color": "#ffffff" },
        });
        map.addLayer({
          id: "defibrillator-points",
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: defibrillatorPointPaint(selectedIdRef.current),
        });
        map.addSource(USER_SOURCE_ID, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "user-position", type: "circle", source: USER_SOURCE_ID, paint: { "circle-radius": 8, "circle-color": "#2563eb", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });

        map.on("click", "clusters", async (event) => {
          const feature = map.queryRenderedFeatures(event.point, { layers: ["clusters"] })[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          const source = map.getSource(SOURCE_ID) as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coordinates = (feature.geometry as { type: "Point"; coordinates: [number, number] }).coordinates;
          map.easeTo({ center: coordinates, zoom: clusterTargetZoom(zoom) });
        });
        map.on("click", "defibrillator-points", (event) => {
          const id = Number(event.features?.[0]?.id);
          if (Number.isFinite(id)) callbacksRef.current.onSelect(id);
        });
        ["clusters", "defibrillator-points"].forEach((layer) => {
          map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
          map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
        });
        const emitViewport = () => {
          const bounds = map.getBounds();
          callbacksRef.current.onViewportChange({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
        };
        map.on("moveend", () => {
          const center = map.getCenter();
          callbacksRef.current.onCenterChange([center.lng, center.lat]);
          emitViewport();
        });
        emitViewport();
      });
    } catch {
      callbacksRef.current.onError();
    }
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, [mapTilerKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [features]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId === null) return;
    const feature = features.find((candidate) => candidate.id === selectedId);
    if (feature) map.easeTo({ center: feature.geometry.coordinates, zoom: Math.max(map.getZoom(), 15), duration: 500 });
    if (map.getLayer("defibrillator-points")) {
      map.setPaintProperty("defibrillator-points", "circle-color", defibrillatorPointPaint(selectedId)["circle-color"]);
    }
  }, [features, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => (map.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: userLocation ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: userLocation } }] : [],
    });
    if (map.isStyleLoaded()) update(); else map.once("load", update);
    if (userLocation) map.easeTo({ center: userLocation, zoom: 14 });
  }, [userLocation]);

  return <div ref={containerRef} className="map" aria-label="Interaktiivinen sydäniskurikartta" />;
}
