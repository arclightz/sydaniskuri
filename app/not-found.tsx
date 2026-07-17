import Link from "next/link";

export default function NotFound() {
  return <main className="centered-state"><h1>Sivua ei löytynyt</h1><p>Tarkista osoite tai palaa kartalle.</p><Link className="button button--primary" href="/">Avaa kartta</Link></main>;
}
