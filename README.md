# toodle

> _Tüddelü – bis bald._ Veranstaltungsanmeldung, bei der die Mitfahrgelegenheit nebenbei sichtbar wird.

Konzept und Plan: [docs/konzept.md](docs/konzept.md)

## Entwicklung

```sh
cp .env.example .env   # SMTP_HOST leer lassen → Mails landen in der Konsole
npm install
npm run dev
```

| Befehl                            | Zweck                                                                 |
| --------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                     | Dev-Server                                                            |
| `npm run check`                   | Typecheck                                                             |
| `npm run lint` / `npm run format` | Prettier + ESLint                                                     |
| `npm test`                        | Unit-Tests (Vitest)                                                   |
| `npm run test:e2e`                | End-to-End-Tests (Playwright, Handy 360 px + Desktop, eigene Test-DB) |
| `npm run db:generate`             | Migration aus `src/lib/server/db/schema.ts` erzeugen                  |

Migrationen in `drizzle/` werden beim Serverstart automatisch angewendet.

Texte liegen in `messages/{de,en,fr,nl}.json` (`npm run i18n` erzeugt daraus `src/lib/paraglide`). Neue Sprache:
Datei anlegen, Kürzel in `project.inlang/settings.json` ergänzen, Namen in `src/lib/components/LocaleSwitch.svelte`.

Ohne `SMTP_HOST` werden Mails (z. B. Login-Links) in der Server-Konsole ausgegeben.

### Benachrichtigungen

- **Sofort:** Anmeldebestätigung (mit Kalendereintrag) und Hinweis, wenn jemand anderes eine Mitfahrt einträgt.
- **Hintergrund-Job** (alle `NOTIFY_INTERVAL` Sekunden, Standard 600, `0` = aus): Mitfahr-Hinweise an Suchende und
  Fahrende (höchstens alle 3 h pro Person und Event, nie zweimal zur selben Person) und eine einmalige Erinnerung,
  wenn die Reise 7 Tage vorher (bzw. 2 Tage vor Anmeldeschluss) noch offen ist.
- Jede Art ist im Profil oder per Link in der Mail abbestellbar. Was verschickt wurde, steht in der Tabelle
  `notification`.

## Betrieb (Docker + Caddy)

Caddy läuft auf dem Server als eigener Container (`/srv/edge`) mit `network_mode: host`. toodle veröffentlicht
seinen Port deshalb nur auf `127.0.0.1` (Standard `3100`, änderbar über `TOODLE_PORT`).

```sh
cp .env.example .env   # ORIGIN=https://toodle.lu, SMTP_* und MAIL_FROM setzen
docker compose up -d --build
```

Danach den Block aus [deploy/Caddyfile.snippet](deploy/Caddyfile.snippet) in `/srv/edge/Caddyfile` übernehmen und
Caddy neu laden (`docker compose -f /srv/edge/compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile`
bzw. passend zum Dateinamen).

Die Datenbank liegt im Volume `toodle_data` (`/data/toodle.db`). Backup: Datei kopieren
(bei laufendem Betrieb besser per `sqlite3 /data/toodle.db '.backup /data/backup.db'`).

### Push-Benachrichtigungen

Funktionieren ohne Konfiguration: Die VAPID-Schlüssel werden beim ersten Bedarf erzeugt und in der Tabelle
`app_setting` gespeichert (per `VAPID_*` überschreibbar). Wer Push auf einem Gerät einschaltet, bekommt
Mitfahr-Hinweise und Erinnerungen dorthin statt per Mail (optional zusätzlich per Mail). Anmeldebestätigungen kommen
immer per Mail. Der Server sendet nur an die Push-Dienste der gängigen Browser (Google, Mozilla, Apple, Microsoft).

### Echte Fahrzeiten (optional)

Standardmäßig schätzt toodle Umwege über die Luftlinie (× 1,3, 60 km/h). Mit `ROUTING_URL` auf einen eigenen
[OSRM](https://github.com/Project-OSRM/osrm-backend)-Server werden echte Fahrzeiten genutzt – eine Tabellen-Anfrage pro
Veranstaltung, 10 Minuten zwischengespeichert. Fällt der Server aus, rechnet toodle mit der Schätzung weiter.
Koordinaten gehen dabei an den Routing-Server – deshalb nur einen selbst betriebenen verwenden, nicht den öffentlichen
Demo-Server. Beispiel mit dem Deutschland-Auszug (braucht beim Vorbereiten einige GB RAM):

```sh
wget https://download.geofabrik.de/europe/germany-latest.osm.pbf
docker run --rm -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/germany-latest.osm.pbf
docker run --rm -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/germany-latest.osrm
docker run --rm -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/germany-latest.osrm
docker run -d -p 127.0.0.1:5000:5000 -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/germany-latest.osrm
```
