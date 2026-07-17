# Sydäniskuri-demo

Responsiivinen Next.js-demo lähimpien sydäniskurien löytämiseen, elvytysohjeisiin ja uusien kohteiden ehdottamiseen.

## Käynnistys

```bash
pnpm install
cp .env.example .env.local
# Set NEXT_PUBLIC_MAPTILER_KEY in .env.local and Vercel.
pnpm data:build
pnpm dev
```

Avaa <http://localhost:3000>.

## Komennot

```bash
pnpm data:build   # muodostaa julkiset karttapisteet, hakuindeksin ja lisätietoshardit
pnpm test         # Vitest-yksikkö- ja komponenttitestit
pnpm test:e2e     # Playwright-selainpolut (työpöytä + mobiili)
pnpm lint
pnpm typecheck
pnpm build
```

Playwrightin Chromium asennetaan tarvittaessa komennolla:

```bash
pnpm exec playwright install chromium
```

## Aineisto ja yksityisyys

Yksityinen lähdeaineisto sijaitsee tiedostossa `defi/data/defi_locations.json`, eikä sitä toimiteta selaimeen. `scripts/build-locations.ts` validoi koordinaatit ja muodostaa versionoidut karttapisteet (`public/data/map-points.geojson`), hakuindeksin (`public/data/location-index.json`) sekä 32 valittavan kohteen lisätietoshardia (`public/data/details/`).

Kartta käyttää MapTilerin vektorikarttatyyliä. `.env.local` on git-ignorattu: aseta siihen ja Verceliin `NEXT_PUBLIC_MAPTILER_KEY`, jonka käyttö on rajattu sovelluksen domaineihin. Tuotantorakennus käyttää commitattuja vaiheistettuja tiedostoja, joten se toimii Vercelissä ilman yksityistä lähdeaineistoa tai kirjoitettavaa palvelimen tiedostojärjestelmää.

## Demotallennus

Käyttäjätilit, istunto ja ehdotukset tallennetaan vain selaimen `localStorage`-tilaan. Älä käytä oikeaa salasanaa. Selaindatan tyhjentäminen poistaa demotilin ja ehdotukset.
