import {
  decodeDetailShard,
  decodeLocationIndex,
  detailShardName,
  type DetailShardDocument,
  type LocationIndexDocument,
} from "./public-data";
import type { LocationDetail, LocationSummary, MapPointCollection } from "./types";

export class LocationDataClient {
  private readonly shardPromises = new Map<string, Promise<Map<number, LocationDetail>>>();

  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async loadPoints(): Promise<MapPointCollection> {
    return this.loadJson<MapPointCollection>("/data/map-points.geojson");
  }

  async loadIndex(): Promise<LocationSummary[]> {
    return decodeLocationIndex(await this.loadJson<LocationIndexDocument>("/data/location-index.json"));
  }

  async loadDetail(id: number): Promise<LocationDetail> {
    const shardName = detailShardName(id);
    let shardPromise = this.shardPromises.get(shardName);
    if (!shardPromise) {
      shardPromise = this.loadJson<DetailShardDocument>(`/data/details/${shardName}`).then(decodeDetailShard);
      this.shardPromises.set(shardName, shardPromise);
    }

    let details: Map<number, LocationDetail>;
    try {
      details = await shardPromise;
    } catch (error) {
      this.shardPromises.delete(shardName);
      throw error;
    }

    const detail = details.get(id);
    if (!detail) throw new Error("Kohteen lisätietoja ei löytynyt.");
    return detail;
  }

  clearDetailShard(id: number): void {
    this.shardPromises.delete(detailShardName(id));
  }

  private async loadJson<T>(path: string): Promise<T> {
    const response = await this.fetcher(path);
    if (!response.ok) throw new Error("Sijaintiaineistoa ei voitu ladata.");
    return response.json() as Promise<T>;
  }
}
