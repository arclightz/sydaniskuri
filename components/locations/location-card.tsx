import { ExternalLink, MapPin } from "lucide-react";
import { getSummaryAvailabilityStatus } from "@/lib/locations/location-utils";
import type { LocationDetail, LocationResult } from "@/lib/locations/types";

const statusLabels = { open: "Avoinna nyt", closed: "Suljettu nyt", unknown: "Saatavuus ei tiedossa" } as const;

export type DetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; detail: LocationDetail }
  | { status: "error"; message: string };

export function LocationCard({ result, selected = false, now, detailState = { status: "idle" }, onRetryDetail, onSelect }: {
  result: LocationResult;
  selected?: boolean;
  now?: Date;
  detailState?: DetailState;
  onRetryDetail?: () => void;
  onSelect: () => void;
}) {
  const { summary, distanceKm } = result;
  const status = getSummaryAvailabilityStatus(summary, now);
  const [lng, lat] = summary.coordinates;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  const address = [summary.address, summary.postalCode, summary.city].filter(Boolean).join(", ");
  const detail = detailState.status === "ready" ? detailState.detail : null;

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
            <div><dt>Saatavuus</dt><dd>{detail?.availabilityDetails || "Ei tiedossa"}</dd></div>
            <div><dt>Tarkka sijainti</dt><dd>{detail?.addressDetails || "Ei tiedossa"}</dd></div>
          </dl>
          {detailState.status === "loading" && <p className="inline-notice" role="status">Lisätietoja ladataan…</p>}
          {detailState.status === "error" && <div className="inline-notice inline-notice--warning" role="alert"><p>{detailState.message}</p><button className="text-button" type="button" onClick={onRetryDetail}>Yritä lisätietoja uudelleen</button></div>}
          <a className="button button--secondary" href={routeUrl} target="_blank" rel="noreferrer">Näytä reitti <ExternalLink aria-hidden="true" size={17} /></a>
        </div>
      )}
    </article>
  );
}
