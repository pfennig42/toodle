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

- **Sofort:** Anmeldebestätigung (mit Kalendereintrag) bzw. Wartelisten-Bestätigung, Hinweis, wenn jemand anderes eine
  Mitfahrt einträgt, Mail an von der Orga hinzugefügte Personen, „Du bist nachgerückt“ (Warteliste), Änderung von
  Termin/Ort (abwählbar) und Absage, wenn eine Veranstaltung gelöscht wird, sowie Rundmails der Orga (höchstens 5 pro
  Tag und Veranstaltung).
- **Hintergrund-Job** (alle `NOTIFY_INTERVAL` Sekunden, Standard 600, `0` = aus): Mitfahr-Hinweise an Suchende und
  Fahrende (höchstens alle 3 h pro Person und Event, nie zweimal zur selben Person), eine einmalige Erinnerung, wenn
  die Reise 7 Tage vorher (bzw. 2 Tage vor Anmeldeschluss) noch offen ist, und „Bald geht's los“ 2 Tage vor Beginn
  (mit der eigenen Mitfahrt).
- Hinweise und Erinnerungen sind im Profil oder per Link in der Mail abbestellbar; was die Veranstaltung selbst betrifft
  (Änderung, Absage, Nachrücken, Rundmail), kommt immer. Was der Job verschickt hat, steht in der Tabelle
  `notification`.

### Datenhaltung

Täglich (und beim Start) löscht toodle die Anmeldungen samt Antworten, Reisedaten und Mitfahrten von Veranstaltungen,
die seit mehr als einem Jahr vorbei sind. Die Veranstaltung selbst bleibt zum Duplizieren erhalten; die Orga sieht in
der Übersicht, wann gelöscht wird. Außerdem gehen Gastkonten ohne Anmeldung (älter als 30 Tage), abgelaufene Sitzungen
und Links. Impressum und Datenschutzerklärung stehen in [src/lib/legal.ts](src/lib/legal.ts).

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

Die Datenbank liegt im Volume `toodle_data` (`/data/toodle.db`).

### Backups

Mit `BACKUP_DIR` (in `docker-compose.yml`: `./backups` neben der Compose-Datei, also `/srv/toodle/backups`) sichert
toodle die Datenbank selbst – beim Start (vor den Migrationen) und dann stündlich, aber nur wenn sich etwas geändert
hat. Jede Sicherung ist eine geprüfte (`integrity_check`), gzip-komprimierte Kopie
(`toodle-JJJJMMTT-HHMMSSZ-<hash>.db.gz`); sie wird unter einem `.tmp-…`-Namen geschrieben und erst fertig umbenannt.
Beim Abholen per rsync also `--exclude '.tmp-*'` setzen.

Aufbewahrt wird gestaffelt: alles der letzten 24 Stunden, dann die neueste pro Tag (14 Tage), pro Woche (8 Wochen)
und pro Monat (6 Monate) – höchstens gut 50 Dateien. Älteres wird gelöscht, damit gelöschte Daten nicht in alten
Sicherungen weiterleben (Datenschutzerklärung: höchstens sechs Monate). Die neueste Sicherung bleibt immer.

Das Verzeichnis muss für den Container-Nutzer (uid 1000) beschreibbar sein:
`mkdir -p /srv/toodle/backups && sudo chown 1000:1000 /srv/toodle/backups`.

Wiederherstellen:

```sh
cd /srv/toodle
docker compose stop toodle
docker run --rm -v toodle_data:/data -v "$PWD/backups:/backups:ro" alpine sh -c \
  'rm -f /data/toodle.db-wal /data/toodle.db-shm &&
   gunzip -c /backups/toodle-….db.gz > /data/toodle.db && chown 1000:1000 /data/toodle.db'
docker compose start toodle
```

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
