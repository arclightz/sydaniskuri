import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  detailShardName,
  encodeAvailabilityRules,
  type DetailShardDocument,
  type LocationIndexDocument,
} from "../lib/locations/public-data";
import type { AvailabilityRule, MapPointCollection } from "../lib/locations/types";

type SourceRecord = {
  id?: number;
  title?: string;
  slug?: string;
  location?: { lat?: number; lng?: number };
  address?: string;
  postalCode?: string;
  city?: string;
  location_type?: string;
  availabilityRules?: AvailabilityRule[];
  availabilityDetails?: string;
  addressDetails?: string;
  [key: string]: unknown;
};

type ValidRecord = {
  id: number;
  longitude: number;
  latitude: number;
  title: string;
  address: string;
  postalCode: string;
  city: string;
  locationType: string;
  availabilityRules: AvailabilityRule[];
  availabilityDetails: string;
  addressDetails: string;
};

export function transformRecords(records: SourceRecord[]): {
  points: MapPointCollection;
  index: LocationIndexDocument;
  detailShards: Map<string, DetailShardDocument>;
  summary: { processed: number; skipped: number };
} {
  const validRecords: ValidRecord[] = [];
  let skipped = 0;

  for (const record of records) {
    const latitude = Number(record.location?.lat);
    const longitude = Number(record.location?.lng);
    if (
      !Number.isInteger(record.id) ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      skipped += 1;
      continue;
    }

    validRecords.push({
      id: record.id,
      longitude,
      latitude,
      title: String(record.title ?? "Ei tiedossa"),
      address: String(record.address ?? ""),
      postalCode: String(record.postalCode ?? ""),
      city: String(record.city ?? ""),
      locationType: String(record.location_type ?? "Ei tiedossa"),
      availabilityRules: Array.isArray(record.availabilityRules) ? record.availabilityRules : [],
      availabilityDetails: String(record.availabilityDetails ?? ""),
      addressDetails: String(record.addressDetails ?? ""),
    });
  }

  const locationTypes = [...new Set(validRecords.map((record) => record.locationType))].sort((left, right) =>
    left.localeCompare(right, "fi"),
  );
  const locationTypeIndexes = new Map(locationTypes.map((locationType, index) => [locationType, index]));
  const detailShards = new Map<string, DetailShardDocument>(
    Array.from({ length: 32 }, (_, index) => [
      `${index}`.padStart(2, "0") + ".json",
      { version: 1, details: [] },
    ]),
  );

  const points: MapPointCollection = {
    type: "FeatureCollection",
    features: validRecords.map((record) => ({
      type: "Feature",
      id: record.id,
      properties: {},
      geometry: { type: "Point", coordinates: [record.longitude, record.latitude] },
    })),
  };
  const index: LocationIndexDocument = {
    version: 1,
    locationTypes,
    locations: validRecords.map((record) => [
      record.id,
      record.longitude,
      record.latitude,
      record.title,
      record.address,
      record.postalCode,
      record.city,
      locationTypeIndexes.get(record.locationType) ?? 0,
      encodeAvailabilityRules(record.availabilityRules),
    ]),
  };

  for (const record of validRecords) {
    detailShards.get(detailShardName(record.id))?.details.push([
      record.id,
      record.availabilityDetails,
      record.addressDetails,
    ]);
  }

  return {
    points,
    index,
    detailShards,
    summary: { processed: validRecords.length, skipped },
  };
}

async function main() {
  const inputPath = resolve("defi/data/defi_locations.json");
  const publicDataPath = resolve("public/data");
  const detailsPath = resolve(publicDataPath, "details");
  const records = JSON.parse(await readFile(inputPath, "utf8")) as SourceRecord[];
  const result = transformRecords(records);

  await mkdir(detailsPath, { recursive: true });
  await Promise.all(
    (await readdir(detailsPath, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => rm(resolve(detailsPath, entry.name))),
  );
  await writeFile(resolve(publicDataPath, "map-points.geojson"), JSON.stringify(result.points));
  await writeFile(resolve(publicDataPath, "location-index.json"), JSON.stringify(result.index));
  await Promise.all(
    [...result.detailShards].map(([fileName, shard]) =>
      writeFile(resolve(detailsPath, fileName), JSON.stringify(shard)),
    ),
  );
  console.log(`Käsitelty: ${result.summary.processed}, ohitettu: ${result.summary.skipped}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error("GeoJSON-muunnos epäonnistui:", error);
    process.exitCode = 1;
  });
}
