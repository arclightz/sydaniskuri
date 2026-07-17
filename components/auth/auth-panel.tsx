"use client";

import { Info, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { AuthRepository, PublicUser } from "@/lib/auth/local-auth";

export function AuthPanel({ repository, onAuthenticated }: { repository: AuthRepository; onAuthenticated?: (user: PublicUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      const user = mode === "login"
        ? await repository.login(String(values.get("email") ?? ""), String(values.get("password") ?? ""))
        : await repository.register({
            name: String(values.get("name") ?? ""),
            email: String(values.get("email") ?? ""),
            password: String(values.get("password") ?? ""),
          });
      onAuthenticated?.(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Kirjautuminen epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  async function startDemo() {
    setError("");
    setBusy(true);
    try {
      onAuthenticated?.(await repository.loginAsDemo());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Demokirjautuminen epäonnistui.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-grid">
      <section className="auth-card">
        <p className="eyebrow">Paikallinen demo</p>
        <h1>Tervetuloa Sydäniskuriin</h1>
        <p>Kirjaudu nähdäksesi ehdotuksesi tai lisätäksesi uuden sydäniskurin.</p>
        <div className="tabs" role="group" aria-label="Valitse kirjautumistapa">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Kirjaudu</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Rekisteröidy</button>
        </div>
        <form className="form-stack" onSubmit={submit} noValidate>
          {mode === "register" && <label><span>Nimi <b aria-hidden="true">*</b></span><input name="name" autoComplete="name" /></label>}
          <label><span>Sähköposti <b aria-hidden="true">*</b></span><input name="email" type="email" autoComplete="email" /></label>
          <label><span>Salasana <b aria-hidden="true">*</b></span><input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          {mode === "register" && <p className="field-hint">Vähintään 8 merkkiä. Älä käytä oikeaa salasanaasi.</p>}
          {error && <div className="form-error" role="alert">{error}</div>}
          {error.toLocaleLowerCase("fi").includes("vioittu") && <button className="button button--secondary button--wide" type="button" onClick={() => { repository.reset(); setError(""); }}>Nollaa demotiedot</button>}
          <button className="button button--primary button--wide" type="submit" disabled={busy}>
            {mode === "login" ? <><LogIn aria-hidden="true" /> Kirjaudu</> : <><UserPlus aria-hidden="true" /> Luo paikallinen tili</>}
          </button>
        </form>
        <div className="divider"><span>tai</span></div>
        <button className="button button--secondary button--wide" type="button" disabled={busy} onClick={() => void startDemo()}>
          <ShieldCheck aria-hidden="true" /> Jatka demokäyttäjänä
        </button>
      </section>
      <aside className="demo-notice">
        <Info aria-hidden="true" />
        <div><h2>Tämä on selainkohtainen demo</h2><ul><li>Tiedot eivät siirry toiselle selaimelle tai laitteelle.</li><li>Älä käytä oikeaa salasanaasi.</li><li>Selaindatan tyhjentäminen poistaa tilin ja ehdotukset.</li><li>Salasana tiivistetään selaimessa eikä sitä tallenneta selväkielisenä.</li></ul></div>
      </aside>
    </div>
  );
}
