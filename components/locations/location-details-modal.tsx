import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { LocationResult } from "@/lib/locations/types";
import type { DetailState } from "./location-card";

type Props = {
  result: LocationResult;
  detailState: DetailState;
  onClose: () => void;
  onRetry: () => void;
};

export function LocationDetailsModal({ result, detailState, onClose, onRetry }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const { summary } = result;
  const detail = detailState.status === "ready" ? detailState.detail : null;
  const [longitude, latitude] = summary.coordinates;
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="emergency-dialog location-details-modal" role="dialog" aria-modal="true" aria-labelledby="location-details-title">
        <button ref={closeButton} className="icon-button dialog-close" type="button" aria-label="Sulje kohdetiedot" onClick={onClose}><X aria-hidden="true" /></button>
        <p className="eyebrow">Sydäniskuri</p>
        <h2 id="location-details-title">{summary.title}</h2>
        <p>{[summary.address, summary.postalCode, summary.city].filter(Boolean).join(", ") || "Ei tiedossa"}</p>
        <dl>
          <div><dt>Paikkatyyppi</dt><dd>{summary.locationType || "Ei tiedossa"}</dd></div>
          <div><dt>Saatavuus</dt><dd>{detail?.availabilityDetails || "Ei tiedossa"}</dd></div>
          <div><dt>Tarkka sijainti</dt><dd>{detail?.addressDetails || "Ei tiedossa"}</dd></div>
        </dl>
        {detailState.status === "loading" && <p className="inline-notice" role="status">Lisätietoja ladataan…</p>}
        {detailState.status === "error" && <div className="inline-notice inline-notice--warning" role="alert"><p>{detailState.message}</p><button className="text-button" type="button" onClick={onRetry}>Yritä lisätietoja uudelleen</button></div>}
        <a className="button button--secondary" href={routeUrl} target="_blank" rel="noreferrer">Näytä reitti <ExternalLink aria-hidden="true" size={17} /></a>
      </section>
    </div>
  );
}
