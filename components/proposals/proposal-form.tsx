"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCircle2, MapPinned, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ProposalRepository, ProposalErrors } from "@/lib/proposals/proposals";
import { validateProposal } from "@/lib/proposals/proposals";
import { WEEKDAYS, type ProposalInput } from "@/lib/proposals/types";

const CoordinatePicker = dynamic(() => import("./coordinate-picker").then((module) => module.CoordinatePicker), {
  ssr: false,
  loading: () => <div className="coordinate-map map-loading" role="status">Karttavalitsinta ladataan…</div>,
});

const locationTypes = ["Koulu tai oppilaitos", "Kirjasto", "Liikunta- tai hyvinvointipaikka", "Kauppa tai liiketila", "Toimisto tai virasto", "Teollisuus- tai tuotantokiinteistö", "Terveyden- tai sosiaalihuollon toimipiste", "Muu"];

const initialInput: ProposalInput = {
  name: "", locationType: "", model: "", address: "", postalCode: "", city: "",
  latitude: null, longitude: null, addressDetails: "", availability: { type: "unknown" },
};

function ErrorMessage({ id, children }: { id: string; children?: string }) {
  return children ? <p id={id} className="field-error">{children}</p> : null;
}

export function ProposalForm({ ownerId, repository }: { ownerId: string; repository: ProposalRepository }) {
  const [input, setInput] = useState<ProposalInput>(initialInput);
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ProposalInput>(key: K, value: ProposalInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateProposal(input);
    if (Object.keys(validation).length) {
      setErrors(validation);
      setFormMessage("Tarkista merkityt kentät ja yritä uudelleen.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    try {
      repository.create(ownerId, input);
      setSaved(true);
      setFormMessage("");
    } catch (caught) {
      setFormMessage(caught instanceof Error ? `Ehdotusta ei voitu säilyttää: ${caught.message}` : "Ehdotusta ei voitu säilyttää.");
    }
  }

  if (saved) return (
    <section className="success-state">
      <CheckCircle2 aria-hidden="true" /><p className="eyebrow">Ehdotus tallennettu</p><h1>Kiitos ehdotuksestasi</h1>
      <p>Kohde odottaa tarkistusta eikä näy vielä julkisella kartalla.</p>
      <div className="button-row"><Link className="button button--primary" href="/omat-ehdotukset">Näytä omat ehdotukset</Link><button className="button button--secondary" type="button" onClick={() => { setInput(initialInput); setSaved(false); }}>Lisää toinen</button></div>
    </section>
  );

  return (
    <form className="proposal-form" onSubmit={submit} noValidate>
      <header className="form-page-heading"><p className="eyebrow">Uusi ehdotus</p><h1>Lisää sydäniskuri</h1><p>Ilmoita puuttuva kohde tarkistettavaksi. Tähdellä merkityt kentät ovat pakollisia.</p></header>
      <section className="form-section"><div className="section-number">1</div><div className="form-section__content"><h2>Perustiedot</h2><div className="form-stack">
        <label><span>Kohteen nimi <b aria-hidden="true">*</b></span><input id="name" value={input.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} onChange={(event) => update("name", event.target.value)} /><ErrorMessage id="name-error">{errors.name}</ErrorMessage></label>
        <label><span>Paikkatyyppi <b aria-hidden="true">*</b></span><select value={input.locationType} aria-invalid={Boolean(errors.locationType)} aria-describedby={errors.locationType ? "type-error" : undefined} onChange={(event) => update("locationType", event.target.value)}><option value="">Valitse paikkatyyppi</option>{locationTypes.map((type) => <option key={type}>{type}</option>)}</select><ErrorMessage id="type-error">{errors.locationType}</ErrorMessage></label>
        <label><span>Laitteen malli <small>(valinnainen)</small></span><input value={input.model} onChange={(event) => update("model", event.target.value)} /></label>
      </div></div></section>

      <section className="form-section"><div className="section-number">2</div><div className="form-section__content"><h2>Osoite ja sijainti</h2><div className="form-stack">
        <label><span>Katuosoite <b aria-hidden="true">*</b></span><input value={input.address} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "address-error" : undefined} onChange={(event) => update("address", event.target.value)} /><ErrorMessage id="address-error">{errors.address}</ErrorMessage></label>
        <div className="form-grid form-grid--two"><label><span>Postinumero <b aria-hidden="true">*</b></span><input value={input.postalCode} inputMode="numeric" maxLength={5} aria-invalid={Boolean(errors.postalCode)} aria-describedby={errors.postalCode ? "postal-error" : undefined} onChange={(event) => update("postalCode", event.target.value)} /><ErrorMessage id="postal-error">{errors.postalCode}</ErrorMessage></label><label><span>Kaupunki <b aria-hidden="true">*</b></span><input value={input.city} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "city-error" : undefined} onChange={(event) => update("city", event.target.value)} /><ErrorMessage id="city-error">{errors.city}</ErrorMessage></label></div>
        <div className="field-label"><MapPinned aria-hidden="true" /><div><strong>Valitse sijainti kartalta <b aria-hidden="true">*</b></strong><span>Napsauta karttaa, siirrä merkkiä tai syötä koordinaatit.</span></div></div>
        <CoordinatePicker latitude={input.latitude} longitude={input.longitude} onChange={(latitude, longitude) => setInput((current) => ({ ...current, latitude, longitude }))} />
        {(errors.latitude || errors.longitude) && <p className="field-error">{errors.latitude || errors.longitude}</p>}
      </div></div></section>

      <section className="form-section"><div className="section-number">3</div><div className="form-section__content"><h2>Löydettävyys</h2><label className="form-stack"><span>Tarkka sijaintiohje rakennuksessa <b aria-hidden="true">*</b></span><textarea rows={4} value={input.addressDetails} aria-invalid={Boolean(errors.addressDetails)} aria-describedby={errors.addressDetails ? "details-error" : undefined} placeholder="Esim. pääsisäänkäynnistä oikealla, infopisteen vieressä" onChange={(event) => update("addressDetails", event.target.value)} /><ErrorMessage id="details-error">{errors.addressDetails}</ErrorMessage></label></div></section>

      <section className="form-section"><div className="section-number">4</div><div className="form-section__content"><h2>Saatavuus</h2><fieldset className="availability-options"><legend>Milloin sydäniskuri on saatavilla?</legend>
        <label><input type="radio" name="availability" checked={input.availability.type === "always"} onChange={() => update("availability", { type: "always" })} /><span><strong>Aina avoinna</strong><small>Saatavilla ympäri vuorokauden vuoden jokaisena päivänä.</small></span></label>
        <label><input type="radio" name="availability" checked={input.availability.type === "custom"} onChange={() => update("availability", { type: "custom", days: [], from: "08:00", to: "16:00" })} /><span><strong>Mukautetut ajat</strong><small>Valitse viikonpäivät ja kellonajat.</small></span></label>
        <label><input type="radio" name="availability" checked={input.availability.type === "unknown"} onChange={() => update("availability", { type: "unknown" })} /><span><strong>Ei tiedossa</strong><small>Saatavuus tarkistetaan myöhemmin.</small></span></label>
      </fieldset>
      {input.availability.type === "custom" && <div className="custom-availability"><div className="weekday-grid">{WEEKDAYS.map(([value, label]) => <label key={value}><input type="checkbox" checked={input.availability.type === "custom" && input.availability.days.includes(value)} onChange={(event) => { if (input.availability.type !== "custom") return; update("availability", { ...input.availability, days: event.target.checked ? [...input.availability.days, value] : input.availability.days.filter((day) => day !== value) }); }} />{label}</label>)}</div><ErrorMessage id="days-error">{errors.availabilityDays}</ErrorMessage><div className="form-grid form-grid--two"><label><span>Alkaa</span><input type="time" value={input.availability.from} onChange={(event) => { if (input.availability.type === "custom") update("availability", { ...input.availability, from: event.target.value }); }} /></label><label><span>Päättyy</span><input type="time" value={input.availability.to} onChange={(event) => { if (input.availability.type === "custom") update("availability", { ...input.availability, to: event.target.value }); }} /></label></div><ErrorMessage id="time-error">{errors.availabilityTime}</ErrorMessage></div>}
      </div></section>
      {formMessage && <div className="form-error form-error--summary" role="alert">{formMessage}</div>}
      <button className="button button--primary submit-button" type="submit"><Send aria-hidden="true" /> Lähetä ehdotus</button>
    </form>
  );
}
