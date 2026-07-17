export type AvailabilityRule = {
  type: "weekday" | "range" | "date" | string;
  available: boolean;
  days?: string[];
  date?: string;
  from?: string;
  to?: string;
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
