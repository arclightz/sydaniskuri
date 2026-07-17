"use client";

import Link from "next/link";
import { Clock3, MapPin, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ProtectedContent } from "@/components/auth/protected-content";
import { LocalAuthRepository } from "@/lib/auth/local-auth";
import { LocalProposalRepository } from "@/lib/proposals/proposals";
import type { Proposal } from "@/lib/proposals/types";
import { getLocalStorage } from "@/lib/storage";

function ProposalList({ ownerId, repository }: { ownerId: string; repository: LocalProposalRepository }) {
  const [version, setVersion] = useState(0);
  let proposals: Proposal[] = [];
  let error = "";
  try { proposals = repository.listByOwner(ownerId); } catch (caught) { error = caught instanceof Error ? caught.message : "Ehdotuksia ei voitu lukea."; }
  void version;

  if (error) return <div className="centered-state"><h1>Ehdotustiedot ovat vioittuneet</h1><p>{error}</p><button className="button button--primary" type="button" onClick={() => { repository.reset(); setVersion((value) => value + 1); }}>Nollaa ehdotukset</button></div>;
  return (
    <>
      <header className="page-heading page-heading--actions"><div><p className="eyebrow">Paikallinen demo</p><h1>Omat ehdotukset</h1><p>Täällä näkyvät selaimella tallentamasi, tarkistusta odottavat kohteet.</p></div><Link className="button button--primary" href="/lisaa"><Plus aria-hidden="true" /> Lisää uusi</Link></header>
      {proposals.length ? <div className="proposal-list">{proposals.map((proposal) => <article className="proposal-card" key={proposal.id}><div className="proposal-card__header"><div><span className="status-pill status-pill--pending"><Clock3 aria-hidden="true" /> Odottaa tarkistusta</span><h2>{proposal.name}</h2></div><button className="icon-button icon-button--danger" type="button" aria-label={`Poista ehdotus ${proposal.name}`} onClick={() => { if (window.confirm("Poistetaanko ehdotus pysyvästi tästä selaimesta?")) { repository.remove(ownerId, proposal.id); setVersion((value) => value + 1); } }}><Trash2 aria-hidden="true" /></button></div><p className="location-card__line"><MapPin aria-hidden="true" />{proposal.address}, {proposal.postalCode} {proposal.city}</p><dl><div><dt>Paikkatyyppi</dt><dd>{proposal.locationType}</dd></div><div><dt>Tarkka sijainti</dt><dd>{proposal.addressDetails}</dd></div><div><dt>Lähetetty</dt><dd>{new Date(proposal.createdAt).toLocaleString("fi-FI")}</dd></div></dl></article>)}</div> : <section className="empty-state empty-state--large"><MapPin aria-hidden="true" /><h2>Ei vielä ehdotuksia</h2><p>Kun ehdotat uutta sydäniskuria, se näkyy täällä tarkistusta odottavana.</p><Link className="button button--primary" href="/lisaa">Lisää ensimmäinen kohde</Link></section>}
    </>
  );
}

export function OwnProposalsClient() {
  const storage = getLocalStorage();
  const auth = useMemo(() => new LocalAuthRepository(storage), [storage]);
  const repository = useMemo(() => new LocalProposalRepository(storage), [storage]);
  return <ProtectedContent repository={auth}>{(user) => <ProposalList ownerId={user.id} repository={repository} />}</ProtectedContent>;
}
