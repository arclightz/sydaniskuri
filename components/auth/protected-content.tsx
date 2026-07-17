"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { AuthRepository, PublicUser } from "@/lib/auth/local-auth";

export function ProtectedContent({ repository, children }: { repository: AuthRepository; children: (user: PublicUser) => ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    repository.getSessionUser().then((sessionUser) => {
      if (!active) return;
      if (!sessionUser) router.replace(`/kirjaudu?next=${encodeURIComponent(pathname)}`);
      else setUser(sessionUser);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Istuntoa ei voitu lukea.");
    });
    return () => { active = false; };
  }, [pathname, repository, router]);

  if (error) return (
    <div className="centered-state"><h1>Demotiedot ovat vioittuneet</h1><p>{error}</p><button className="button button--primary" type="button" onClick={() => { repository.reset(); router.replace("/kirjaudu"); }}>Nollaa demotiedot</button></div>
  );
  if (!user) return <div className="centered-state" role="status"><div className="spinner" /><p>Istuntoa tarkistetaan…</p></div>;
  return children(user);
}
