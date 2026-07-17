export type AvailabilityRule = {
  type: "weekday" | "range" | "date" | string;
  available: boolean;
  days?: string[];
  date?: string;
  from?: string;
  to?: string;
};

export type LocationSummary = {
  id: number;
  coordinates: [number, number];
  title: string;
  address: string;
  postalCode: string;
  city: string;
  locationType: string;
  availabilityRules: AvailabilityRule[];
  searchText: string;
};

export type LocationDetail = {
  id: number;
  availabilityDetails: string;
  addressDetails: string;
};

export type MapPointFeature = {
  type: "Feature";
  id: number;
  properties: Record<string, never>;
  geometry: { type: "Point"; coordinates: [number, number] };
};

export type MapPointCollection = {
  type: "FeatureCollection";
  features: MapPointFeature[];
};

export type LocationResult = {
  summary: LocationSummary;
  distanceKm: number;
};
