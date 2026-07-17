# Sydäniskuri-demo

Responsiivinen Next.js-demo lähimpien sydäniskurien löytämiseen, elvytysohjeisiin ja uusien kohteiden ehdottamiseen.

## Käynnistys

```bash
pnpm install
pnpm dev
```

Avaa <http://localhost:3000>.

## Komennot

```bash
pnpm data:build   # muodostaa julkisen GeoJSONin lähdeaineistosta
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

Yksityinen lähdeaineisto sijaitsee tiedostossa `defi/data/defi_locations.json`, eikä sitä toimiteta selaimeen. `scripts/build-locations.ts` validoi koordinaatit ja muodostaa tiedoston `public/data/defibrillators.geojson`. Julkisesta tiedostosta poistetaan käyttäjänimi, yhteyshenkilöt, puhelinnumerot, vastuuvapausmerkinnät ja muu kartalle tarpeeton tieto.

Kun lähdeaineisto muuttuu, aja `pnpm data:build` ja tallenna uusi julkinen GeoJSON. Tuotantorakennus käyttää valmiiksi esikäsiteltyä tiedostoa, joten se toimii Vercelissä ilman yksityistä lähdeaineistoa tai kirjoitettavaa palvelimen tiedostojärjestelmää.

## Demotallennus

Käyttäjätilit, istunto ja ehdotukset tallennetaan vain selaimen `localStorage`-tilaan. Älä käytä oikeaa salasanaa. Selaindatan tyhjentäminen poistaa demotilin ja ehdotukset.
