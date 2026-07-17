"use client";

import Link from "next/link";
import { HeartPulse, LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LocalAuthRepository, type PublicUser } from "@/lib/auth/local-auth";
import { EmergencyGuide } from "./emergency-guide";

export const AUTH_EVENT = "sydaniskuri:auth";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const repository = useMemo(() => typeof window === "undefined" ? null : new LocalAuthRepository(window.localStorage), []);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refresh = () => { void repository?.getSessionUser().then(setUser).catch(() => setUser(null)); };
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(AUTH_EVENT, refresh); window.removeEventListener("storage", refresh); };
  }, [repository]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function logout() {
    await repository?.logout();
    setUser(null);
    window.dispatchEvent(new Event(AUTH_EVENT));
    router.push("/");
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark"><HeartPulse aria-hidden="true" /></span><span>Sydäniskuri<small>Lähin apu kartalla</small></span></Link>
      <nav className={`main-nav ${menuOpen ? "main-nav--open" : ""}`} aria-label="Päänavigaatio">
        <Link className={pathname === "/" ? "active" : ""} href="/">Kartta</Link>
        <Link className={pathname === "/ohjeet" ? "active" : ""} href="/ohjeet">Elvytysohjeet</Link>
        {user && <><Link className={pathname === "/lisaa" ? "active" : ""} href="/lisaa"><Plus aria-hidden="true" size={17} /> Lisää kohde</Link><Link className={pathname === "/omat-ehdotukset" ? "active" : ""} href="/omat-ehdotukset">Omat ehdotukset</Link><button className="main-nav-logout" type="button" aria-label="Kirjaudu ulos" onClick={() => void logout()}><LogOut aria-hidden="true" /> Kirjaudu ulos</button></>}
      </nav>
      <div className="header-actions">
        <EmergencyGuide />
        {user ? <div className="user-actions"><span><UserRound aria-hidden="true" size={17} />{user.name}</span><button className="icon-button" type="button" aria-label="Kirjaudu ulos" onClick={() => void logout()}><LogOut aria-hidden="true" /></button></div> : <Link className="button button--secondary login-link" href="/kirjaudu">Kirjaudu</Link>}
        <button className="icon-button menu-button" type="button" aria-label={menuOpen ? "Sulje valikko" : "Avaa valikko"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      </div>
    </header>
  );
}
