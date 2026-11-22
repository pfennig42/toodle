/**
 * Texts of the start page (/ when logged out) and of /about. Longer prose than the rest of the
 * app, so it lives here per language instead of in single message keys.
 * The start page only says what toodle does; the motivation lives in the blog article,
 * the personal part on /about.
 * Style: short sentences, concrete, no dashes, no sales pitch.
 */
import type { Locale } from './paraglide/runtime.js';

/** A sentence with one link in it. */
export type Linked = { before: string; link: string; after: string };

export type Home = {
	intro: { title: string; text: string; cta: string; note: string };
	steps: { title: string; items: { lead: string; text: string }[] };
	features: { title: string; groups: { title: string; items: string[] }[] };
	fit: { title: string; text: string; items: string[]; after: string };
	privacy: { title: string; items: string[] };
	article: Linked;
};

export type About = {
	title: string;
	intro: string;
	article: Linked;
	feedback: string;
	costs: { title: string; before: string; after: string; coffee: string };
	faq: { title: string; items: { q: string; a: string }[] };
};

export type Landing = { home: Home; about: About };

const de: Landing = {
	home: {
		intro: {
			title: 'Anmeldung und Anreise an einem Ort.',
			text: 'toodle ist ein Anmeldetool für Veranstaltungen. Neben den üblichen Angaben fragt es, wann und von wo jemand anreist und ob ein Auto dabei ist. Daraus entsteht eine Übersicht, wer mit wem fahren könnte. Die Absprache selbst bleibt bei euch.',
			cta: 'Veranstaltung anlegen',
			note: 'Kostenlos, ohne Werbung und ohne Tracking.'
		},
		steps: {
			title: 'So läuft es ab',
			items: [
				{
					lead: 'Veranstaltung anlegen.',
					text: 'Titel, Ort, Zeitraum und Anmeldeschluss. Eigene Fragen wie Essenswünsche oder Übernachtung kannst du ergänzen.'
				},
				{
					lead: 'Link verschicken.',
					text: 'Per Mail, Messenger oder QR-Code. Zum Anmelden braucht niemand ein Konto, Name und E-Mail reichen.'
				},
				{
					lead: 'Anmeldungen sammeln.',
					text: 'Für Hin- und Rückfahrt gibt jede Person an, ob sie mit dem Auto fährt, eine Mitfahrt sucht oder flexibel ist. Dazu Ort und ungefähre Uhrzeit.'
				},
				{
					lead: 'Mitfahrten finden.',
					text: 'Die Mitfahr-Übersicht zeigt passende Personen mit Kontaktweg, sortiert nach Umweg und Uhrzeit. Ihr sprecht euch direkt ab und tragt ein, wer bei wem mitfährt.'
				}
			]
		},
		features: {
			title: 'Funktionen',
			groups: [
				{
					title: 'Bei der Anmeldung',
					items: [
						'Hin- und Rückfahrt getrennt. Die Rückfahrt übernimmt die Hinfahrt, bis du sie änderst.',
						'Mehrere Abholorte, zum Beispiel zu Hause oder am Bahnhof im Nachbarort.',
						'Gespeicherte Orte aus dem Profil. Bei der nächsten Anmeldung ist das ein Klick.',
						'Änderbar bis zum Anmeldeschluss, die Reiseangaben auch danach.'
					]
				},
				{
					title: 'Beim Mitfahren',
					items: [
						'Passende Fahrten, sortiert nach geschätztem Umweg.',
						'Kontakt über den Weg, den die Person angegeben hat: Telefon, Signal, WhatsApp, Telegram oder E-Mail.',
						'Eintragen, wer bei wem mitfährt. Unverbindlich, aber alle sehen den Stand.',
						'Hinweis per Mail, wenn jemand Passendes dazukommt. Abbestellbar.'
					]
				},
				{
					title: 'Für die Orga',
					items: [
						'Teilnehmendenliste mit allen Antworten, als CSV exportierbar.',
						'Übersicht pro Tag, wer da ist. Zum Planen von Essen und Betten.',
						'Übersicht, wer noch keine Mitfahrt hat. Zuordnungen kann die Orga selbst eintragen.',
						'Einstellbar, wie viel die Teilnehmenden voneinander sehen.',
						'Mehrere Personen in der Orga. Veranstaltungen vom Vorjahr kopieren.'
					]
				}
			]
		},
		fit: {
			title: 'Wann es sich lohnt',
			text: 'toodle hilft vor allem, wenn drei Dinge zusammenkommen:',
			items: [
				'Der Ort ist mit Bus und Bahn schlecht erreichbar.',
				'Die Veranstaltung hat einen festen Beginn und ein festes Ende.',
				'Die Teilnehmenden kommen grob aus ähnlichen Richtungen.'
			],
			after:
				'Also das Sommerfest, die Freizeit oder die Hochzeit auf dem Land. Mitten in der Stadt oder bei offenen Zeiten bringt die Mitfahr-Übersicht wenig.'
		},
		privacy: {
			title: 'Daten',
			items: [
				'Andere Teilnehmende sehen nur Ort oder Stadtteil, nie deine Adresse.',
				'Kontaktwege sehen nur Teilnehmende derselben Veranstaltung.',
				'Login per Link in der Mail. Ein Passwort ist freiwillig.',
				'Dein Konto samt Anmeldungen kannst du jederzeit selbst löschen.'
			]
		},
		article: {
			before: 'Warum es toodle gibt, steht im Blog: ',
			link: 'Tüdelü, riech dich später!',
			after: ''
		}
	},
	about: {
		title: 'Über toodle',
		intro:
			'toodle probiert eine Idee aus: Mitfahrgelegenheiten entstehen bei der Anmeldung zur Veranstaltung, nicht in einer eigenen App. Wer sich sowieso anmeldet, sagt dabei auch, von wo die Anreise losgeht.',
		article: {
			before: 'Wie es dazu kam, steht ausführlich im Blog: ',
			link: 'Tüdelü, riech dich später!',
			after: ''
		},
		feedback:
			'Ob die Idee aufgeht, zeigt sich erst im Einsatz. Wenn du toodle für eine Veranstaltung nutzt, freue ich mich über Rückmeldung, was funktioniert hat und was nicht.',
		costs: {
			title: 'Kosten',
			before:
				'toodle ist kostenlos und bleibt es. Es gibt keine Werbung, kein Tracking und keinen Bezahl-Tarif. Die Seite läuft auf einem eigenen Server und wird von ',
			after: ' in der Freizeit gebaut.',
			coffee: 'Wenn du mich und das Projekt unterstützen willst, lad mich auf einen Kaffee ein:'
		},
		faq: {
			title: 'Kurze Fragen',
			items: [
				{
					q: 'Brauchen meine Gäste ein Konto?',
					a: 'Nein. Zum Anmelden reichen Name und E-Mail. Wer später wieder rein will, bekommt einen Link per Mail. Ein Passwort ist freiwillig.'
				},
				{
					q: 'Wer sieht, von wo ich komme?',
					a: 'Die Orga und, je nach Einstellung der Veranstaltung, die anderen Teilnehmenden. Angezeigt wird nur der Ort oder Stadtteil, nie deine Adresse. Im Anmeldeformular steht, wer deine Fahrt sieht.'
				},
				{
					q: 'Bucht toodle Plätze oder teilt mich einem Auto zu?',
					a: 'Nein. toodle sortiert nur, wer passen könnte. Absprechen tut ihr euch selbst, per Nachricht, Anruf oder in der Gruppe.'
				},
				{
					q: 'Was passiert nach der Veranstaltung mit den Daten?',
					a: 'Erst mal nichts. Die Veranstaltung bleibt, damit man sie nächstes Jahr wiederverwenden kann. Die Orga kann sie archivieren oder löschen. Dein Konto samt Anmeldungen kannst du jederzeit selbst löschen.'
				}
			]
		}
	}
};

// TODO en/fr/nl: translate once the German text is settled; until then German is shown.
const texts: Partial<Record<Locale, Landing>> = { de };

export const landing = (locale: Locale): Landing => texts[locale] ?? de;
