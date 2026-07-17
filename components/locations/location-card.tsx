import { ExternalLink, MapPin } from "lucide-react";
import { getSummaryAvailabilityStatus } from "@/lib/locations/location-utils";
import type { LocationResult } from "@/lib/locations/types";

const statusLabels = {
  open: "Avoinna nyt",
  closed: "Suljettu nyt",
  unknown: "Saatavuus ei tiedossa",
} as const;

export function LocationCard({
  result,
  selected = false,
  now,
  onSelect,
}: {
  result: LocationResult;
  selected?: boolean;
  now?: Date;
  onSelect: () => void;
}) {
  const { summary, distanceKm } = result;
  const status = getSummaryAvailabilityStatus(summary, now);
  const [lng, lat] = summary.coordinates;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  const address = [summary.address, summary.postalCode, summary.city].filter(Boolean).join(", ");

  return (
    <article className={`location-card ${selected ? "location-card--selected" : ""}`} aria-current={selected ? "true" : undefined}>
      <button className="location-card__main" type="button" onClick={onSelect}>
        <span className={`status-pill status-pill--${status}`}>{statusLabels[status]}</span>
        <h3>{summary.title || "Ei tiedossa"}</h3>
        <span className="location-card__distance">{distanceKm.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} km</span>
        <span className="location-card__line"><MapPin aria-hidden="true" size={17} />{address || "Ei tiedossa"}</span>
      </button>
      {selected && (
        <div className="location-card__details">
          <dl>
            <div><dt>Paikkatyyppi</dt><dd>{summary.locationType || "Ei tiedossa"}</dd></div>
            <div><dt>Saatavuus</dt><dd>Ei tiedossa</dd></div>
            <div><dt>Tarkka sijainti</dt><dd>Ei tiedossa</dd></div>
          </dl>
          <a className="button button--secondary" href={routeUrl} target="_blank" rel="noreferrer">
            Näytä reitti <ExternalLink aria-hidden="true" size={17} />
          </a>
        </div>
      )}
    </article>
  );
}
