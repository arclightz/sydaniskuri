import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Sydäniskuri – lähin apu kartalla", template: "%s | Sydäniskuri" },
  description: "Löydä lähin sydäniskuri, tarkista saatavuus ja tutustu elvytysohjeisiin.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f513d" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fi"><body className={inter.className}><a className="skip-link" href="#main-content">Siirry sisältöön</a><SiteHeader /><div id="main-content">{children}</div></body></html>;
}
