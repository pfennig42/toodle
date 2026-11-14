# toodle

> _Tüddelü – bis bald._ Veranstaltungsanmeldung, bei der die Mitfahrgelegenheit nebenbei sichtbar wird.

Konzept und Plan: [docs/konzept.md](docs/konzept.md)

## Entwicklung

```sh
cp .env.example .env   # SMTP_HOST leer lassen → Mails landen in der Konsole
npm install
npm run dev
```

| Befehl                            | Zweck                                                |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Dev-Server                                           |
| `npm run check`                   | Typecheck                                            |
| `npm run lint` / `npm run format` | Prettier + ESLint                                    |
| `npm test`                        | Unit-Tests (Vitest)                                  |
| `npm run db:generate`             | Migration aus `src/lib/server/db/schema.ts` erzeugen |

Migrationen in `drizzle/` werden beim Serverstart automatisch angewendet.

Texte liegen in `messages/de.json` und `messages/en.json`.

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
