"use client";

import Link from "next/link";
import { HeartPulse, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  "Varmista turvallisuus ja tarkista, reagoiko henkilö.",
  "Jos henkilö ei hengitä normaalisti, soita 112 ja laita puhelu kaiuttimelle.",
  "Aloita paineluelvytys: 30 painallusta rytmillä 100–120 kertaa minuutissa.",
  "Anna kaksi puhallusta, jos osaat. Muussa tapauksessa jatka painelua.",
  "Käynnistä sydäniskuri ja noudata laitteen puheohjeita.",
];

export function EmergencyGuide() {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);

  return (
    <>
      <button className="emergency-button" type="button" onClick={() => setOpen(true)}>
        <Phone aria-hidden="true" size={18} /> Hätäohje
      </button>
      {open && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="emergency-dialog" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
            <button ref={closeButton} className="icon-button dialog-close" type="button" aria-label="Sulje hätäohje" onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </button>
            <div className="emergency-dialog__icon"><HeartPulse aria-hidden="true" /></div>
            <p className="eyebrow eyebrow--red">Hätätilanne</p>
            <h2 id="emergency-title">Toimi näin hätätilanteessa</h2>
            <ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
            <p className="emergency-note">Noudata aina hätäkeskuksen ohjeita. Tämä sivu ei korvaa ensiapukoulutusta.</p>
            <Link className="button button--primary" href="/ohjeet" onClick={() => setOpen(false)}>Avaa laajemmat ohjeet</Link>
          </section>
        </div>
      )}
    </>
  );
}
