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
