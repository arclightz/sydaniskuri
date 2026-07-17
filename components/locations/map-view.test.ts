import { expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ default: {} }));

import { clusterTargetZoom, defibrillatorPointPaint } from "./map-view";

it("zooms clusters directly to individual marker detail", () => {
  expect(clusterTargetZoom(11)).toBe(15);
  expect(clusterTargetZoom(16)).toBe(16);
});

it("uses a visible circle marker for individual defibrillators", () => {
  expect(defibrillatorPointPaint(1)).toMatchObject({
    "circle-radius": 10,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 3,
    "circle-color": ["case", ["==", ["id"], 1], "#c62828", "#176b50"],
  });
});
