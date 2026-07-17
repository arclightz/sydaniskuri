# Sydäniskuri-demo — suunnittelumäärittely

**Päiväys:** 17.7.2026  
**Tila:** Käyttäjän hyväksymä suunnitteluratkaisu  
**Kieli:** Kaikki käyttäjälle näkyvä sisältö on suomeksi

## 1. Tavoite

Rakennetaan moderni ja responsiivinen verkkosovellus, jolla käyttäjä voi:

- löytää lähimmän sydäniskurin kartalta
- hakea kohteita osoitteen, kaupungin tai nimen perusteella
- tarkastella kohteen saatavuutta ja tarkkoja sijaintitietoja
- avata nopeasti elvytys- ja sydäniskuriohjeet
- rekisteröityä tai kirjautua paikalliseen demokäyttäjätiliin
- ehdottaa uutta sydäniskuria tarkistettavaksi
- nähdä omat tarkistusta odottavat ehdotuksensa

Demo toimii paikallisesti komennolla `pnpm dev`, voidaan rakentaa tuotantotilaan ja on julkaistavissa Vercelissä. Tuotantotason käyttäjähallinta, tietokanta ja ylläpitäjän tarkistusprosessi eivät kuulu demoon.

## 2. Lähtöaineisto ja tietosuoja

Lähtöaineisto on `defi/data/defi_locations.json`, joka sisältää 12 486 sydäniskurin sijaintia. Raakatiedostoa ei toimiteta sellaisenaan selaimeen. Esikäsittelyskripti muodostaa kompaktin julkisen GeoJSON-tiedoston.

Julkiseen aineistoon sisällytetään vain:

- tunniste ja nimi
- koordinaatit
- katuosoite, postinumero ja kaupunki
- paikkatyyppi
- saatavuussäännöt ja saatavuuden tekstikuvaus
- laitteen tarkka sijaintiohje rakennuksessa
- URL-tunniste

`userName`, yhteyshenkilöt, puhelinnumerot, vastuuvapausmerkinnät sekä muut karttakäytölle tarpeettomat tiedot poistetaan julkisesta aineistosta. Esikäsittely validoi koordinaatit, ohittaa virheelliset tietueet ja tulostaa yhteenvedon käsitellyistä ja ohitetuista kohteista.

Hakua varten aineistoon muodostetaan normalisoitu hakuteksti nimestä, kaupungista ja osoitteesta. Normalisointi ei muuta käyttäjälle näytettäviä alkuperäisiä arvoja.

## 3. Tekninen arkkitehtuuri

### 3.1 Teknologiat

- Next.js App Router
- React ja TypeScript
- Tailwind CSS 4
- MapLibre GL JS
- OpenStreetMap-pohjainen kartta asianmukaisella lähdemerkinnällä
- selainkohtainen `localStorage` mock-käyttäjille, istunnolle ja ehdotuksille
- Web Crypto API paikallisten salasanojen PBKDF2-tiivistämiseen satunnaisella suolalla
- Vitest ja Testing Library yksikkö- ja komponenttitesteihin
- Playwright keskeisten käyttäjäpolkujen testaukseen

### 3.2 Sovelluksen rajat

Sovellus jaetaan vastuultaan selkeisiin kokonaisuuksiin:

- **kartta:** MapLibre-instanssi, GeoJSON-lähde, klusterit, valinta ja kartan ohjaimet
- **kohteet:** aineiston lataus, haku, suodatus, etäisyys ja saatavuuden tulkinta
- **käyttäjätili:** paikallinen rekisteröityminen, kirjautuminen, demokäyttäjä ja istunto
- **ehdotukset:** lomake, validointi, paikallinen tallennus ja omien ehdotusten lista
- **ohjeet:** nopea hätäohje sekä laajempi elvytysohjesivu

Käyttäjätili- ja ehdotustallennus toteutetaan rajattujen repository-rajapintojen takana. Myöhempi palvelin-API voidaan korvata niiden alle ilman kartan tai lomakkeiden julkisten rajapintojen muuttamista.

### 3.3 Reitit

- `/` — kartta, haku, suodattimet, kohdelista ja kohteen tiedot
- `/ohjeet` — laajemmat elvytys- ja sydäniskuriohjeet
- `/kirjaudu` — kirjautuminen, rekisteröinti ja demokäyttäjä
- `/lisaa` — kirjautuneen käyttäjän uuden kohteen lomake
- `/omat-ehdotukset` — käyttäjän omat tarkistusta odottavat ehdotukset

Kirjautumista vaativat sivut tekevät selaimessa istuntotarkistuksen ja ohjaavat kirjautumissivulle, jos istuntoa ei ole.

## 4. Kartta ja kohteiden löytäminen

### 4.1 Työpöytänäkymä

Etusivu on karttapainotteinen. Noin 380 pikselin levyinen sivupaneeli sisältää:

1. osoite-, kaupunki- ja nimihakukentän
2. suodattimet “Avoinna nyt”, “Avoinna 24/7” ja paikkatyyppi
3. etäisyyden mukaan järjestetyn kohdelistan
4. valitun kohteen tiedot

Kartta täyttää muun näkymän.

### 4.2 Mobiilinäkymä

Kartta täyttää näytön. Haku sijaitsee kartan päällä yläreunassa. Hakutulokset ja kohteen tiedot avautuvat alapaneelissa, jonka voi avata ja sulkea ilman, että kartan tila katoaa.

### 4.3 Kartan toiminta

- Kohteet näytetään vihreinä sydäniskurimerkkeinä.
- Lähekkäiset kohteet yhdistetään numeroiduiksi klustereiksi.
- Klusterin valinta lähentää karttaa sen kohteisiin.
- Valittu tai lähimmäksi tunnistettu kohde korostetaan punaisella.
- “Oma sijainti” pyytää selaimen paikannusluvan ja keskittää kartan.
- Paikannusluvan puuttuessa käyttäjä voi jatkaa osoite- ja paikkakuntahaulla.
- Etäisyydet lasketaan käyttäjän sijainnista; ilman sitä kartan keskipisteestä.
- Kohdekortin “Näytä reitti” avaa koordinaatit ulkoisessa karttapalvelussa.

### 4.4 Kohteen tiedot

Kohteen tiedoissa näytetään:

- nimi
- osoite
- etäisyys, kun vertailusijainti on käytettävissä
- tämänhetkinen saatavuustila ja saatavuuden kuvaus
- paikkatyyppi
- tarkka sijaintiohje rakennuksessa
- reittitoiminto

Puuttuvasta tiedosta näytetään neutraali “Ei tiedossa” eikä tyhjää tai teknistä arvoa.

## 5. Käyttäjätilit

Kirjautumissivulla käyttäjä voi:

- kirjautua aiemmin luomaansa paikalliseen tiliin
- rekisteröidä paikallisen tilin nimellä, sähköpostilla ja salasanalla
- aloittaa heti valmiina demokäyttäjänä

Sivu kertoo näkyvästi, että:

- käyttäjätili on vain toiminnallinen selainkohtainen demo
- tiedot eivät siirry selainten tai laitteiden välillä
- käyttäjän ei pidä käyttää oikeaa salasanaansa
- paikallisen selaindatan tyhjentäminen poistaa tilin ja ehdotukset

Sähköposti normalisoidaan ennen vertailua. Salasana käsitellään Web Crypto APIlla, eikä sitä tallenneta selväkielisenä. Istunto tallennetaan erillään käyttäjätiedoista. Uloskirjautuminen poistaa istunnon, mutta ei paikallista käyttäjätiliä tai ehdotuksia.

## 6. Uuden sydäniskurin ehdottaminen

Kirjautunut käyttäjä täyttää yhdellä sivulla osioihin jaetun lomakkeen.

### 6.1 Kentät

**Perustiedot**

- kohteen nimi, pakollinen
- paikkatyyppi, pakollinen
- laitteen malli, valinnainen

**Osoite ja sijainti**

- katuosoite, pakollinen
- postinumero, pakollinen ja viisinumeroinen
- kaupunki, pakollinen
- leveys- ja pituusaste karttavalitsimesta, pakolliset

**Löydettävyys**

- tarkka sijaintiohje rakennuksessa, pakollinen

**Saatavuus**

- aina avoinna
- mukautetut viikonpäivät ja kellonajat
- ei tiedossa

Karttavalitsimessa käyttäjä voi siirtää merkkiä tai käyttää omaa sijaintiaan. Demo ei käytä ulkoista geokoodauspalvelua.

### 6.2 Tallennus ja tila

Lähetys validoidaan selaimessa. Onnistunut ehdotus saa yksilöllisen paikallisen tunnisteen, aikaleiman, käyttäjätunnisteen ja tilan `pending`. Käyttöliittymä näyttää tilan suomeksi muodossa “Odottaa tarkistusta”.

Ehdotusta ei lisätä julkiseen kartta-aineistoon. Käyttäjä näkee omat ehdotuksensa `/omat-ehdotukset`-sivulla ja voi poistaa niitä vahvistuksen jälkeen. Muokkaus, hyväksyntä ja hylkäys eivät kuulu demoon.

## 7. Elvytys- ja sydäniskuriohjeet

Punainen “Hätäohje” on aina nopeasti saavutettavissa ylätunnisteesta. Mobiilissa toiminto pysyy näkyvänä ilman valikon avaamista.

Nopea ohje esittää seuraavan toimintajärjestyksen:

1. varmista turvallisuus ja tarkista reagointi
2. jos henkilö ei hengitä normaalisti, soita 112 ja käytä kaiutinta
3. aloita paineluelvytys: 30 painallusta rytmillä 100–120 kertaa minuutissa
4. anna kaksi puhallusta, jos osaat; muussa tapauksessa jatka painelua
5. käynnistä sydäniskuri ja noudata laitteen puheohjeita

Laajempi `/ohjeet`-sivu käsittelee:

- tilanteen tunnistamisen ja hätäpuhelun
- aikuisen painelupuhalluselvytyksen
- sydäniskurin turvallisen käytön vaiheittain
- tavallisimmat kysymykset

Ohjesivulla näkyvät lähdelinkit ja sisällön tarkistuspäivä. Ensisijaiset lähteet ovat Suomen Punaisen Ristin elvytysohje ja Hätäkeskuslaitoksen 112-ohje. Käyttöliittymässä todetaan näkyvästi, että hätäkeskuksen ohjeita on aina noudatettava ja verkkosivu ei korvaa ensiapukoulutusta.

## 8. Visuaalinen järjestelmä

Tyylisuunta on “rauhallinen turvallisuus”:

- syvä vihreä päävärinä
- lämmin luonnonvalkoinen tausta
- hätäpunainen vain 112-toimintoihin ja kriittiseen korostukseen
- selkeä sans-serif-typografia
- 8–12 pikselin kulmanpyöristykset
- hienovaraiset reunat ja maltilliset varjot
- yhtenäinen viivakuvakkeiden kirjasto; emojeita ei käytetä käyttöliittymäkuvakkeina

Sivusto välttää koristeellisia lasiefektejä, voimakkaita liukuvärejä ja tarpeetonta animaatiota. Informaatiohierarkia, luettavuus ja kiireellisen toiminnon löydettävyys ovat visuaalisen näyttävyyden edellä.

## 9. Saavutettavuus ja responsiivisuus

- Interaktiiviset kohteet ovat vähintään 44 × 44 pikseliä.
- Kaikilla kontrolleilla on näkyvä hover-, aktiivinen ja fokus-tila.
- Sovellus toimii näppäimistöllä ja kontrollit on nimetty ruudunlukijoille.
- Lomakevirheet yhdistetään kenttiin ohjelmallisesti ja ilmoitetaan tarvittaessa live-alueella.
- Värit täyttävät WCAG AA -kontrastivaatimukset.
- Kartalle on tarjolla tekstimuotoinen kohdelista.
- Liike vähennetään `prefers-reduced-motion`-asetuksen mukaisesti.
- Käyttöliittymä tarkistetaan 375, 768, 1024 ja 1440 pikselin leveyksillä.

## 10. Virhe- ja tyhjätilat

- Paikannusluvan epääminen ohjaa käyttäjän manuaaliseen hakuun.
- Kartan latausvirhe näyttää haettavan kohdelistan ja uudelleenyrityspainikkeen.
- Aineiston latausvirhe näyttää suomenkielisen virheilmoituksen.
- Tulokseton haku näyttää “Ei kohteita tältä alueelta” ja suodattimien tyhjennyksen.
- Vioittunut paikallistallennus ei kaada sovellusta; käyttäjälle tarjotaan demotietojen nollausta.
- Täyttämättömät tai virheelliset lomakekentät näytetään kentän vieressä.
- Tallennustilan ollessa estetty käyttäjälle kerrotaan, ettei ehdotusta voitu säilyttää.

## 11. Testaus

### 11.1 Yksikkötestit

Vitestillä testataan:

- GeoJSON-muunnos ja henkilötietojen poistaminen
- hakutekstin normalisointi
- Haversine-etäisyyslaskenta
- saatavuussääntöjen tulkinta
- kohteiden haku, suodatus ja järjestys
- paikallinen rekisteröinti, kirjautuminen ja uloskirjautuminen
- ehdotusten omistajuus ja tallennus
- lisäyslomakkeen validointi

### 11.2 Komponenttitestit

Testing Libraryllä testataan:

- haku- ja suodatinkontrollit
- kohdekortti ja puuttuvien tietojen esitys
- kirjautumis- ja rekisteröintilomakkeiden virheet
- uuden ehdotuksen lomakkeen osiot ja virheiden kohdistus
- nopean hätäohjeen avaaminen ja sulkeminen

### 11.3 Selainpolut

Playwrightillä testataan vähintään:

1. etusivun avaus, haku ja kohteen valinta
2. elvytysohjeen avaaminen
3. demokäyttäjän kirjautuminen
4. uuden kohteen validointivirheet
5. kelvollisen ehdotuksen tallentaminen
6. ehdotuksen näkyminen omissa ehdotuksissa tilassa “Odottaa tarkistusta”
7. uloskirjautuminen ja suojatun sivun uudelleenohjaus

### 11.4 Valmistumisen tarkistus

- linttaus ja tyyppitarkistus onnistuvat
- kaikki testit läpäisevät
- `pnpm build` onnistuu
- sivusto toimii ilman vaakasuuntaista vieritystä määritellyillä näyttöleveyksillä
- kartan perustoiminnot ja tekstimuotoinen varavaihtoehto toimivat
- Vercel-yhteensopivuus ei vaadi kirjoitettavaa palvelimen tiedostojärjestelmää

## 12. Demon hyväksymiskriteerit

Demo on valmis, kun käyttäjä voi:

1. avata kartan ja nähdä klusteroidut sydäniskurit
2. hakea ja suodattaa kohteita
3. käyttää omaa sijaintiaan tai jatkaa ilman paikannuslupaa
4. nähdä valitun kohteen keskeiset tiedot ja avata reitin
5. avata nopean ja laajan elvytysohjeen
6. rekisteröidä paikallisen käyttäjän tai käyttää demokäyttäjää
7. tallentaa uuden sydäniskuriehdotuksen
8. nähdä oman ehdotuksensa tarkistusta odottavana
9. käyttää keskeisiä toimintoja mobiilissa ja näppäimistöllä

## 13. Demon ulkopuolelle rajatut asiat

- oikea sähköpostivahvistus ja salasanojen palautus
- palvelinpuolen käyttäjähallinta
- PostgreSQL tai muu jaettu tietokanta
- ylläpitäjän hyväksyntä- ja hylkäysnäkymä
- käyttäjän ehdotuksen julkaiseminen julkiselle kartalle
- osoitteiden automaattinen geokoodaus
- ehdotusten muokkaaminen
- ilmoitukset sähköpostilla tai push-viesteillä
- offline-kartat ja asennettava PWA
