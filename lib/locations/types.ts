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

export type LocationResult = {
  feature: LocationFeature;
  distanceKm: number;
};
