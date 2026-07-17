export const WEEKDAYS = [
  ["Monday", "Maanantai"],
  ["Tuesday", "Tiistai"],
  ["Wednesday", "Keskiviikko"],
  ["Thursday", "Torstai"],
  ["Friday", "Perjantai"],
  ["Saturday", "Lauantai"],
  ["Sunday", "Sunnuntai"],
] as const;

export type CustomAvailability = {
  type: "custom";
  days: string[];
  from: string;
  to: string;
};

export type ProposalAvailability = { type: "always" } | { type: "unknown" } | CustomAvailability;

export type ProposalInput = {
  name: string;
  locationType: string;
  model: string;
  address: string;
  postalCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  addressDetails: string;
  availability: ProposalAvailability;
};

export type Proposal = ProposalInput & {
  id: string;
  ownerId: string;
  createdAt: string;
  status: "pending";
};
