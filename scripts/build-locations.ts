import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type AvailabilityRule = {
  type: "weekday" | "range" | "date" | string;
  available: boolean;
  days?: string[];
  date?: string;
  from?: string;
  to?: string;
};

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

export type LocationProperties = {
  id: number;
  title: string;
  slug: string;
  address: string;
  postalCode: string;
  city: string;
  locationType: string;
  availabilityRules: AvailabilityRule[];
  availabilityDetails: string;
  addressDetails: string;
  searchText: string;
};

export type LocationFeature = {
  type: "Feature";
  id: number;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: LocationProperties;
};

export type LocationCollection = {
  type: "FeatureCollection";
  features: LocationFeature[];
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fi")
    .replace(/[^a-z0-9åäö]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function transformRecords(records: SourceRecord[]): {
  collection: LocationCollection;
  summary: { processed: number; skipped: number };
} {
  const features: LocationFeature[] = [];
  let skipped = 0;

  for (const record of records) {
    const lat = Number(record.location?.lat);
    const lng = Number(record.location?.lng);
    if (
      !Number.isInteger(record.id) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      skipped += 1;
      continue;
    }

    const title = String(record.title ?? "Ei tiedossa");
    const city = String(record.city ?? "");
    const address = String(record.address ?? "");
    const properties: LocationProperties = {
      id: record.id as number,
      title,
      slug: String(record.slug ?? record.id),
      address,
      postalCode: String(record.postalCode ?? ""),
      city,
      locationType: String(record.location_type ?? "Ei tiedossa"),
      availabilityRules: Array.isArray(record.availabilityRules) ? record.availabilityRules : [],
      availabilityDetails: String(record.availabilityDetails ?? ""),
      addressDetails: String(record.addressDetails ?? ""),
      searchText: normalizeSearchText(`${title} ${city} ${address}`),
    };

    features.push({
      type: "Feature",
      id: properties.id,
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties,
    });
  }

  return {
    collection: { type: "FeatureCollection", features },
    summary: { processed: features.length, skipped },
  };
}

async function main() {
  const inputPath = resolve("defi/data/defi_locations.json");
  const outputPath = resolve("public/data/defibrillators.geojson");
  const records = JSON.parse(await readFile(inputPath, "utf8")) as SourceRecord[];
  const result = transformRecords(records);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result.collection), "utf8");
  console.log(`Käsitelty: ${result.summary.processed}, ohitettu: ${result.summary.skipped}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error("GeoJSON-muunnos epäonnistui:", error);
    process.exitCode = 1;
  });
}
