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

Endringer publiseres når du trykker **Lagre og publiser** (eller Cmd/Ctrl + S). Forhåndsvisningen viser den lagrede versjonen, og kan byttes mellom **Desktop**, **iPad** og **Mobil** for å se hvordan siden ser ut på hver skjerm.

Administrasjonspanelet fungerer også på iPad og mobil: der åpnes forhåndsvisningen i fullskjerm via øye-knappen øverst.

## Data og sikkerhetskopi

Alt innhold ligger i mappen `data/` (ikke i Git):

- `content.json` – alt innholdet på nettsiden
- `leads.json` – henvendelser fra skjemaet
- `private.json` – passord (kryptert), e-postoppsett og nøkkel for innlogging
- `uploads/` – opplastede bilder
- `backups/` – de 30 siste versjonene av `content.json`, lages automatisk ved hver lagring

Ta sikkerhetskopi av hele `data/`-mappen. Plasseringen kan endres med `DATA_DIR=/sti/til/data`.

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
lib/store.js              Lagring i data/
lib/auth.js               Innlogging (signert cookie) og rate limiting
lib/mail.js               E-postvarsling (nodemailer)
lib/default-content.js    Startinnhold
public/assets/            CSS/JS for nettsiden
public/admin/             Administrasjonspanelet
```
