# toodle.lu – Konzept & Plan

> _Tüddelü – bis bald._ Veranstaltungsanmeldung, bei der die Mitfahrgelegenheit nebenbei sichtbar wird.

## 1. Leitidee

Mitfahrgelegenheiten scheitern selten am Willen, sondern am Aufwand. Autofahrende nehmen gerne Leute aus ihrer
Peergroup mit, wollen dafür aber nichts extra eintragen, buchen oder verwalten. toodle koppelt deshalb die ohnehin
nötige Anmeldung zu einer Veranstaltung mit der Frage „Wie kommst du hin?“ – und macht sichtbar, wer von wo fährt.

**Prinzipien**

1. **Sichtbarkeit statt Vermittlung.** toodle zeigt, wer wann von wo fährt oder sucht. Absprachen passieren dort, wo
   sie sowieso passieren (Telefon, Messenger). Keine Buchungen, keine Platzverwaltung, kein In-App-Chat.
2. **Null Mehraufwand für Fahrende.** Fahren = ein Klick bei der Anmeldung. Alles weitere ist optional.
3. **Formular zuerst.** Die Anmeldung ist ein normales Formular (à la Nextcloud Forms). Die Reise-/Mitfahrangabe ist
   ein spezieller, optionaler Feldtyp darin.
4. **Wiederverwenden statt neu eingeben.** Orte (Zuhause, Arbeit, Bahnhof …) werden einmal im Profil gespeichert;
   Events lassen sich duplizieren.
5. **Neutral & selbst hostbar.** Kein Marketing, kein Corporate-Look, keine Tracker. Ein Container, eine Datenbankdatei.

## 2. Lehren aus Version 1

| Version 1                                             | Erfahrung                             | Version 2                                         |
| ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| Automatisches Matching und Zuordnung in Autos (Motis) | Leute stimmen sich trotzdem extern ab | Sortierte Liste „Wer passt zu dir“ + Kontaktlinks |
| Fahrten buchen, Plätze/Gepäck verwalten               | Wurde nie gepflegt                    | Fällt weg; nur ein Status pro Fahrt               |
| Anonym, ohne E-Mail                                   | Kein Vertrauen, keine Kontinuität     | E-Mail-Pflicht, Login per Magic Link              |
| Events löschen sich selbst                            | Keine Wiederverwendung                | Dashboard, Archiv, Duplizieren                    |
| Pro Event alles neu eingeben                          | Hoher Aufwand                         | Gespeicherte Orte im Profil                       |

## 3. Rollen

Es gibt keine getrennten Nutzertypen. Jede Person kann Events anlegen (→ Veranstalter:in dieses Events) und sich
für Events anmelden. Fahrende sind Teilnehmende, die bei einer Fahrt „Auto“ gewählt haben.

Ein Event kann mehrere Veranstalter:innen haben (Co-Orga per Einladung).

## 4. Funktionen

### 4.1 Account & Profil

- E-Mail ist Pflicht. Login wahlweise per **Passwort** (optional im Profil setzbar – angenehm für Menschen mit
  Passwortmanager) oder per **Magic Link** (immer verfügbar, Fallback und „Passwort vergessen“ zugleich).
- Profil: Anzeigename, bevorzugte Kontaktwege (Telefon, Signal, WhatsApp, Telegram, E-Mail – jeweils optional,
  Sichtbarkeit nur für Mitteilnehmende eines Events), Sprache, Theme.
- **Gespeicherte Orte**: Name („Zuhause“, „Arbeit“, „Bhf. Musterstadt“) + Koordinate über Adresssuche/Karte.
  Angezeigt wird anderen nur ein grober Ortsname (Ort/Stadtteil), nie die Adresse.
- Kurzes Onboarding beim ersten Login: Name, ein Kontaktweg, ein bis zwei Orte – alles überspringbar.

### 4.2 Veranstalter-Dashboard

- Liste eigener Events: Entwurf · offen · Anmeldung geschlossen · vergangen · archiviert.
- Event anlegen: Titel, Beschreibung, Ort (Karte), Zeitraum (Start/Ende, mehrtägig), Anmeldefrist, optional
  Kapazität.
- **Duplizieren** (inkl. Formular, ohne Anmeldungen) – z. B. „Sommerfreizeit 2027“ aus 2026.
- Öffentlicher Link (unratbarer Slug) + QR-Code zum Teilen.
- Co-Orga einladen.
- Events löschen sich nie automatisch; Archivieren ist manuell.

### 4.3 Formular-Builder

Normales Formular mit Feldtypen:

- Kurztext, Langtext, Zahl, Datum/Uhrzeit
- Einfachauswahl, Mehrfachauswahl, Checkbox (z. B. „vegetarisch“)
- **Reise** (Spezialfeld, optional, max. einmal pro Formular) → siehe 4.4

Felder können Pflicht oder optional sein, haben eine Reihenfolge und einen Hilfetext. Das Formular ist bewusst
schlicht – keine Bedingungslogik im MVP.

Der Name und die E-Mail kommen immer aus dem Account und sind keine Formularfelder.

### 4.4 Feldtyp „Reise“

Erfasst Hin- und Rückfahrt getrennt. Pro Richtung:

| Angabe        | Beispiel                                            |
| ------------- | --------------------------------------------------- |
| Wann          | Fr ca. 12:00 / „nach Ende“                          |
| Von bzw. nach | gespeicherter Ort _Arbeit_ oder neuer Ort           |
| Wie           | 🚗 Auto · 🚆 ÖV · 🙋 suche Mitfahrt · 🤷 noch offen |

Zusätzlich je nach Modus:

- **🚗 Auto → Status** (jederzeit änderbar, ein Tap):
  - _nehme gerne Leute mit_ (Standard)
  - _Auto ist voll_
  - _nehme niemanden mit_ (z. B. weil Einkauf/Umweg geplant) – optional mit kurzem Grund
    Fahrende ohne Mitnahme bleiben trotzdem sichtbar (ausgegraut): Information für die Orga und für Absprachen
    („fährst du doch direkt?“).
- **🚆 ÖV → „letzte Meile“** (optional): _„Ich komme bis Bhf. X um ca. 16:40 und würde mich über eine Abholung
  freuen.“_ Der Abholpunkt wird damit zum Suchpunkt für Fahrende, deren Strecke dort vorbeiführt.
- **🙋 suche Mitfahrt**: Suchpunkt ist der Start- bzw. Zielort.

Die Zeitangabe für das Event als Ganzes (wann bin ich vor Ort) ergibt sich aus Hin-/Rückfahrt und speist die
Belegungsübersicht der Orga.

### 4.5 Mitfahr-Ansicht

Für angemeldete Teilnehmende, getrennt nach Hin- und Rückfahrt. Zeigt die jeweils passenden Personen:

- Wer sucht (inkl. letzte Meile) → sieht Fahrende, sortiert nach geschätztem Umweg und Zeitnähe.
- Wer fährt → sieht Suchende, deren Suchpunkt auf der eigenen Strecke liegt.

```
Hinfahrt Fr · Du: ÖV bis Bhf. Waldheim ~16:40, suchst Abholung

🚗 Anna M.    Köln-Lindenthal   Fr ~15:00   +3 min    nimmt mit        [Signal] [Tel]
🚗 Jonas K.   Bonn              Fr ~16:00   +6 min    Auto voll
🚗 Mia R.     Siegen            Fr ~14:00   +2 min    nimmt niemanden mit
🙋 Lea S.     Bhf. Waldheim     Fr ~16:40   sucht auch                 [WhatsApp]
```

**Umwegschätzung** (bewusst simpel, einheitlich für ganze Strecke und letzte Meile):
`Umweg ≈ (d(Start, Suchpunkt) + d(Suchpunkt, Ziel) − d(Start, Ziel)) × Faktor`, d = Luftlinie, Faktor ~1,3,
umgerechnet in Minuten. Rückfahrt spiegelbildlich. Echtes Routing ist eine spätere Option, nicht MVP.

**Mitfahr-Zuordnung (weiches Signal)**: „Ich fahre bei Anna mit“ / „Ich nehme Lea mit“. Unverbindlich, ohne
Bestätigungsschritt; dient dem Überblick („Lea ist versorgt“). Setzen können es:

- die beiden beteiligten Personen,
- **die Veranstaltungsleitung manuell** (z. B. wenn sie mitbekommen hat, wer bei wem mitfährt).

Wer zugeordnet ist, verschwindet in den Listen anderer nach unten bzw. wird als „versorgt“ markiert.

### 4.6 Orga-Übersicht

- Teilnehmendenliste mit allen Formularantworten, filter-/sortierbar, **CSV-Export**.
- **Belegung pro Tag** (wer ist wann da) – Grundlage für Essens- und Raumplanung; Zusammenfassung von
  Auswahlfeldern („12 × vegetarisch“).
- **Mobilitätsübersicht**: wie viele Auto/ÖV/suchend/offen; wer hat noch keine Lösung; alle Zuordnungen.
  Hier kann die Orga Zuordnungen manuell setzen/lösen.
- Teilnehmende manuell hinzufügen/entfernen.

### 4.7 Benachrichtigungen (nach MVP)

Per E-Mail, später Web-Push (PWA):

- an Suchende: „Neu: Anna fährt Freitag aus Köln, ca. 3 min Umweg.“
- an Fahrende: „2 Leute auf deiner Strecke suchen noch eine Mitfahrt.“ – der eigentliche soziale Hebel.
- Erinnerungen: Anmeldefrist naht; Reise noch „offen“.
- Jede Benachrichtigungsart abbestellbar.

## 5. Anmelde-Ablauf

1. Person öffnet den öffentlichen Link → sieht Event-Infos.
2. Nicht eingeloggt: Login vor dem Formular – E-Mail + Passwort oder E-Mail → Magic Link → zurück zum Formular
   (Account wird beim ersten Magic Link angelegt).
3. Formular ausfüllen; im Reise-Feld werden gespeicherte Orte angeboten, neue Orte können direkt im Profil
   gespeichert werden.
4. Nach dem Absenden: direkt die Mitfahr-Ansicht.
5. Anmeldung ist bis zur Frist änderbar/zurückziehbar; Reise-Angaben und Fahrstatus auch danach.

## 6. Nicht-funktionale Anforderungen

- **PWA**: installierbar, responsive (mobile first), Offline-Ansicht der eigenen Anmeldungen.
- **Theme**: hell/dunkel, folgt dem System, manuell umschaltbar.
- **Sprachen**: Deutsch und Englisch; alle Texte über i18n, sodass weitere EU-Sprachen nur Übersetzungsdateien sind.
  Datums-/Zeitformate nach Locale; Zeitzone pro Event.
- **Design**: neutral, ruhig, zugänglich (Kontrast, Tastaturbedienung). Keine Landingpage mit Marketing.
- **Datenschutz**: Datensparsam; grobe Ortsangaben nach außen; Kontaktdaten nur für Mitteilnehmende desselben
  Events; Teilnehmende sehen keine vollständige Teilnehmendenliste, nur die Mitfahr-Ansicht; Account samt Daten
  selbst löschbar; keine externen Tracker.
- **Self-Hosting**: ein Docker-Image, SQLite-Datei auf einem Volume, Konfiguration über Umgebungsvariablen (Base-URL,
  SMTP). Einfaches Backup = Datei kopieren.

## 7. Technik (Vorschlag)

| Bereich    | Wahl                                                                                                                        | Begründung                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework  | SvelteKit (Svelte 5, TypeScript), Node-Adapter                                                                              | Server + UI in einem, wenig Ballast, gute PWA-Unterstützung |
| Datenbank  | SQLite + Drizzle ORM                                                                                                        | Kein separater DB-Container, triviales Backup               |
| Auth       | Eigene Implementierung: optionales Passwort (scrypt aus `node:crypto`) + Magic Link (Token-Hash in DB), Session-Cookie      | Klein, keine Abhängigkeit                                   |
| Mail       | SMTP via Nodemailer; Betrieb über Brevo (smtp-relay.brevo.com)                                                              | Anbieter bleibt austauschbar                                |
| i18n       | Paraglide JS                                                                                                                | Typsicher, gut mit SvelteKit                                |
| Styling    | Eigenes CSS mit Custom Properties (Light/Dark-Tokens)                                                                       | Neutral, keine Framework-Optik                              |
| Karten     | Leaflet + OSM-Tiles; Adresssuche über Photon/Nominatim (Endpoint konfigurierbar)                                            | Offen, selbst hostbar                                       |
| PWA        | @vite-pwa/sveltekit                                                                                                         | Manifest + Service Worker                                   |
| Deployment | Docker Compose, hinter vorhandenem Caddy-Container (`/srv/edge`, `network_mode: host`); toodle lauscht auf `127.0.0.1:3100` | Koexistenz mit OpenDogMap                                   |

## 8. Datenmodell (Entwurf)

```
user            id, email, name, password_hash (nullable), locale, theme, created_at
contact         id, user_id, kind (phone|signal|whatsapp|telegram|email), value
place           id, user_id, label, lat, lon, display_name
login_token     id, email, token_hash, expires_at, used_at
session         id, user_id, expires_at

event           id, slug, title, description, location_label, lat, lon,
                starts_at, ends_at, timezone, registration_deadline, capacity,
                status (draft|open|closed|archived), created_by, created_at
event_organizer event_id, user_id
form_field      id, event_id, position, type, label, help, required, options(json)

registration    id, event_id, user_id, status (active|withdrawn), comment, created_at, updated_at
answer          registration_id, field_id, value(json)
travel_leg      id, registration_id, direction (to|from),
                time, time_flexible ("nach Ende"), place_lat, place_lon, place_label,
                mode (car|transit|seeking|undecided),
                car_status (offering|full|not_offering), car_note,
                pickup_lat, pickup_lon, pickup_label, pickup_time   -- letzte Meile
ride_link       id, event_id, direction, driver_leg_id, passenger_leg_id, set_by_user_id, created_at
```

Ortsangaben werden in `travel_leg` kopiert (Snapshot), damit spätere Profiländerungen alte Anmeldungen nicht
verändern.

## 9. Meilensteine

| #   | Inhalt                                                                                                                     | Ergebnis                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| M0  | Projektgerüst: SvelteKit, Drizzle/SQLite, i18n DE/EN, Theme-Tokens hell/dunkel, Docker, Caddy-Snippet                      | Leere App läuft auf dem Server              |
| M1  | Login (Passwort + Magic Link), Profil, Kontaktwege, gespeicherte Orte (mit Adresssuche), Onboarding                        | Man kann sich anmelden und Orte pflegen     |
| M2  | Events anlegen/bearbeiten, Formular-Builder (inkl. Reise-Feld), Dashboard, Duplizieren, Archiv, Co-Orga, öffentlicher Link | Orga kann ein Event vollständig vorbereiten |
| M3  | Anmeldung ausfüllen/ändern/zurückziehen, Reise-Feld mit Fahrstatus und letzter Meile                                       | Teilnehmende können sich anmelden           |
| M4  | Mitfahr-Ansicht mit Umwegschätzung, Kontaktlinks, Zuordnung (selbst + Orga)                                                | **Kernnutzen erreicht**                     |
| M5  | Orga-Übersicht: Tabelle, CSV-Export, Belegung pro Tag, Mobilitätsübersicht                                                 | Event ist planbar                           |
| M6  | E-Mail-Benachrichtigungen, PWA-Feinschliff (Offline, Installierbarkeit)                                                    | Spontane Fahrende werden aktiviert          |
| M7  | Web-Push, weitere Sprachen, optional echtes Routing                                                                        | Ausbau                                      |

## 10. Bewusst nicht

Platz- und Gepäckverwaltung · verbindliche Buchungen · automatische Zuordnung in Autos · In-App-Chat · Bezahlung ·
Bewertungen/Profile mit Reputation · Marketing-Seiten.

## 11. Entscheidungen

- Login vor dem Formular, per Passwort oder Magic Link.
- Teilnehmende sehen nur die Mitfahr-Ansicht, keine vollständige Namensliste.
- Mails über Brevo (SMTP-Relay).
- Caddy läuft als Container unter `/srv/edge` mit `network_mode: host`; Domain `toodle.lu`.
