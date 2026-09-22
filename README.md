# Ferrobygget – nettside med administrasjon

Landingsside for Ferrobygget (Ulefoss) med eget administrasjonspanel. Én administrator logger inn med passord og kan endre tekster, bilder, bakgrunnsbilde, seksjoner, kontaktinfo og e-postvarsling – uten å røre koden.

## Kom i gang

```bash
npm install
npm start          # eller: npm run dev (starter på nytt ved kodeendringer)
```

- Nettside: http://localhost:3000
- Administrasjon: http://localhost:3000/admin

Første gang serveren starter, opprettes et tilfeldig admin-passord. Det skrives i terminalen og lagres i `data/INITIAL_ADMIN_PASSWORD.txt`. Bytt det under **Passord** i admin, og slett deretter filen.

Vil du bestemme passordet selv ved første oppstart: `ADMIN_PASSWORD=ditt-passord npm start`.

## Hva kan endres i admin

| Fane | Innhold |
|---|---|
| Forside | Bakgrunnsbilde, overskrift, undertekst, knapp, nøkkelinfo-stripen |
| Seksjoner | Legg til, rediger, flytt, dupliser, skjul og slett seksjoner. Fire typer: *Tekst + bilde + punkter*, *Ikon-rutenett*, *Tekst + bilde + kort*, *Kun tekst* |
| Kontaktskjema | Tekster, knapp, takkemelding, valg for antall ansatte |
| Generelt | Logo, menyknapp, luft rundt seksjonene (kompakt/normal/luftig), adresse, e-post, telefon, sosiale medier, tittel og beskrivelse for Google |
| Henvendelser | Alle innsendte skjema, sletting og eksport til CSV (Excel) |
| E-postvarsling | Mottakere og SMTP-oppsett, med testknapp. Av som standard – henvendelser lagres uansett |
| Passord | Bytt admin-passord (logger ut andre enheter) |

Endringer publiseres når du trykker **Lagre og publiser** (eller Cmd/Ctrl + S). Forhåndsvisningen oppdateres mens du skriver (før du lagrer), og kan byttes mellom **Desktop**, **iPad** og **Mobil** for å se hvordan siden ser ut på hver skjerm.

Administrasjonspanelet fungerer også på iPad og mobil: der åpnes forhåndsvisningen i fullskjerm via øye-knappen øverst.

## GitHub Pages (midlertidig)

- Nettside: **https://ferro-ui.github.io/ferrobygget-nettside/**
- Admin: **https://ferro-ui.github.io/ferrobygget-nettside/admin/**

Admin på GitHub Pages lagrer endringene direkte i repoet (`content/`). GitHub Actions bygger nettsiden på nytt automatisk, og etter ca. ett minutt er endringene ute. Status («Publiserer …» / «Publisert ✓») vises øverst i admin.

**Innlogging:** i stedet for passord brukes en personlig GitHub-tilgangsnøkkel. Den lagres kun i nettleseren du logger inn fra. Slik lager du den:

1. Gå til https://github.com/settings/personal-access-tokens/new
2. Navn: «Ferrobygget admin», velg utløpsdato.
3. Repository access → **Only select repositories** → `ferrobygget-nettside`.
4. Permissions → Repository → **Contents: Read and write** og **Actions: Read-only**.
5. «Generate token», kopier og lim inn på innloggingssiden.

**Begrensninger på GitHub Pages** (ingen server):

- Henvendelser, e-postvarsling og passord finnes ikke. Skjemaet «Meld interesse» åpner i stedet en ferdig utfylt e-post til adressen under **Generelt → E-post**.
- Forhåndsvisningen i admin oppdateres mens du skriver – også før du lagrer.

**Lokalt og på GitHub samtidig:** innholdet ligger i `content/content.json` og `content/uploads/`. Har du endret noe på GitHub Pages, kjør `git pull` før du jobber lokalt. Endringer gjort lokalt publiseres med `git add -A && git commit -m "…" && git push`.

`npm run export` bygger den samme statiske siden i `_site/` hvis du vil sjekke den lokalt.

## Data og sikkerhetskopi

- `content/` (i Git): `content.json` med alt innholdet på nettsiden, og `uploads/` med opplastede bilder. Historikken i Git fungerer som sikkerhetskopi.
- `data/` (ikke i Git – inneholder hemmeligheter):
  - `leads.json` – henvendelser fra skjemaet
  - `private.json` – passord (kryptert), e-postoppsett og nøkkel for innlogging
  - `backups/` – de 30 siste versjonene av `content.json` ved lagring via lokal admin

Plasseringen kan endres med `CONTENT_DIR=…` og `DATA_DIR=…`.

## Drift

- Krever Node.js 20 eller nyere.
- Miljøvariabler: `PORT` (standard 3000), `DATA_DIR`, `ADMIN_PASSWORD` (kun første oppstart), `NODE_ENV=production` (sikre cookies – krever HTTPS).
- Kjør bak HTTPS (f.eks. Caddy/Nginx, eller en plattform som Railway/Render/Fly med vedvarende disk for `data/`).

## Kjent før lansering

- Tailwind lastes fra CDN (`cdn.tailwindcss.com`), som ikke anbefales i produksjon. Bør byttes til en ferdigbygd CSS-fil før lansering.
- Bildene er foreløpig stockfoto fra Unsplash og skal erstattes med egne bilder via admin.
- Adresse og telefonnummer i bunnen er plassholdere.

## Struktur

```
server.js                 Express-server og API
lib/render.js             Bygger nettsiden fra content.json
lib/schema.js             Validerer og renser innhold fra admin
lib/store.js              Lagring i content/ og data/
lib/auth.js               Innlogging (signert cookie) og rate limiting
lib/mail.js               E-postvarsling (nodemailer)
lib/default-content.js    Startinnhold
public/assets/            CSS/JS for nettsiden
public/admin/             Administrasjonspanelet (server- og GitHub-modus)
scripts/export.js         Bygger statisk side + admin til _site/
.github/workflows/        Publiserer til GitHub Pages ved hver endring
content/                  Innhold og bilder
```
