import { Suspense } from "react";
import { LoginPageClient } from "./page-client";

export const metadata = { title: "Kirjaudu" };

export default function LoginPage() {
  return <main className="content-page auth-page"><Suspense fallback={<p role="status">Kirjautumista ladataan…</p>}><LoginPageClient /></Suspense></main>;
}
