import { MapPin } from "lucide-react";
import { getSummaryAvailabilityStatus } from "@/lib/locations/location-utils";
import type { LocationDetail, LocationResult } from "@/lib/locations/types";

const statusLabels = { open: "Avoinna nyt", closed: "Suljettu nyt", unknown: "Saatavuus ei tiedossa" } as const;

export type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; detail: LocationDetail }
  | { status: "error"; message: string };

export function LocationCard({ result, now, onSelect }: { result: LocationResult; now?: Date; onSelect: () => void }) {
  const { summary, distanceKm } = result;
  const status = getSummaryAvailabilityStatus(summary, now);
  const address = [summary.address, summary.postalCode, summary.city].filter(Boolean).join(", ");

  return (
    <article className="location-card">
      <button className="location-card__main" type="button" onClick={onSelect}>
        <span className={`status-pill status-pill--${status}`}>{statusLabels[status]}</span>
        <h3>{summary.title || "Ei tiedossa"}</h3>
        <span className="location-card__distance">{distanceKm.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} km</span>
        <span className="location-card__line"><MapPin aria-hidden="true" size={17} />{address || "Ei tiedossa"}</span>
      </button>
    </article>
  );
}
