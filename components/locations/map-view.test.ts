import { expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => ({ default: {} }));

import { clusterTargetZoom } from "./map-view";

it("zooms clusters directly to individual marker detail", () => {
  expect(clusterTargetZoom(11)).toBe(15);
  expect(clusterTargetZoom(16)).toBe(16);
});
