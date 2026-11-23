/**
 * Imprint and privacy policy. Legal texts are kept as plain data per language (not in the
 * message files) – they are long, change rarely and are reviewed as a whole. German is binding.
 *
 * Paragraphs are plain text; e-mail addresses and https:// links in them become links.
 */
import type { Locale } from './paraglide/runtime.js';

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalPage = {
	title: string;
	intro?: string;
	sections: LegalSection[];
	updated: string;
};

export const OPERATOR = {
	name: 'Marc Le Large',
	street: 'Moltkestrasse 30',
	city: '76133 Karlsruhe',
	email: 'info@toodle.lu'
};

const address = (country: string) =>
	`${OPERATOR.name}, ${OPERATOR.street}, ${OPERATOR.city}, ${country}`;

/* ------------------------------------------------------------------ imprint */

const imprint: Record<Locale, LegalPage> = {
	de: {
		title: 'Impressum',
		sections: [
			{
				heading: 'Angaben gemäß § 5 DDG',
				paragraphs: [address('Deutschland'), `E-Mail: ${OPERATOR.email}`]
			},
			{
				heading: 'Haftung für Inhalte',
				paragraphs: [
					'Veranstaltungen auf toodle werden von ihren Veranstalter:innen angelegt; für deren Inhalte (Beschreibung, Formular, Rundmails) sind sie selbst verantwortlich. Hinweise auf rechtswidrige Inhalte bitte an die oben genannte Adresse.',
					'Mitfahrten sprechen die Beteiligten direkt untereinander ab. toodle vermittelt, bucht und prüft keine Fahrten.',
					'toodle ist ein nichtkommerzielles Projekt.'
				]
			}
		],
		updated: 'Stand: 23. November 2026'
	},
	en: {
		title: 'Imprint',
		intro: 'Legal notice required by German law. The German version is binding.',
		sections: [
			{
				heading: 'Responsible (§ 5 DDG)',
				paragraphs: [address('Germany'), `Email: ${OPERATOR.email}`]
			},
			{
				heading: 'Liability for content',
				paragraphs: [
					'Events on toodle are created by their organizers, who are responsible for their content (description, form, messages). Please report unlawful content to the address above.',
					'Rides are arranged directly between the people involved. toodle does not broker, book or check any rides.',
					'toodle is a non-commercial project.'
				]
			}
		],
		updated: 'As of 23 November 2026'
	},
	fr: {
		title: 'Mentions légales',
		intro: 'Mentions exigées par le droit allemand. La version allemande fait foi.',
		sections: [
			{
				heading: 'Responsable (§ 5 DDG)',
				paragraphs: [address('Allemagne'), `E-mail : ${OPERATOR.email}`]
			},
			{
				heading: 'Responsabilité du contenu',
				paragraphs: [
					'Les événements sur toodle sont créés par leurs organisateur·ices, qui sont responsables de leur contenu (description, formulaire, messages). Merci de signaler tout contenu illicite à l’adresse ci-dessus.',
					'Les covoiturages s’organisent directement entre les personnes concernées. toodle ne réserve, n’arrange ni ne vérifie aucun trajet.',
					'toodle est un projet non commercial.'
				]
			}
		],
		updated: 'État : 23 novembre 2026'
	},
	nl: {
		title: 'Colofon',
		intro: 'Wettelijk verplichte gegevens naar Duits recht. De Duitse versie is bindend.',
		sections: [
			{
				heading: 'Verantwoordelijk (§ 5 DDG)',
				paragraphs: [address('Duitsland'), `E-mail: ${OPERATOR.email}`]
			},
			{
				heading: 'Aansprakelijkheid voor inhoud',
				paragraphs: [
					'Evenementen op toodle worden aangemaakt door hun organisatoren; zij zijn verantwoordelijk voor de inhoud (beschrijving, formulier, berichten). Meld onrechtmatige inhoud graag op het adres hierboven.',
					'Ritten worden direct tussen de betrokkenen afgesproken. toodle bemiddelt, boekt en controleert geen ritten.',
					'toodle is een niet-commercieel project.'
				]
			}
		],
		updated: 'Stand: 23 november 2026'
	}
};

/* ------------------------------------------------------------------ privacy */

const privacyDe: LegalPage = {
	title: 'Datenschutz',
	intro:
		'Kurz gesagt: toodle speichert, was für Anmeldung und Mitfahrten nötig ist, zeigt anderen nur so viel wie nötig und löscht Anmeldungen ein Jahr nach der Veranstaltung. Keine Werbung, kein Tracking, keine Analyse-Dienste.',
	sections: [
		{
			heading: 'Verantwortlich',
			paragraphs: [address('Deutschland'), `E-Mail: ${OPERATOR.email}`]
		},
		{
			heading: 'Aufruf der Seite und Server',
			paragraphs: [
				'Beim Aufruf überträgt dein Gerät technisch zwangsläufig deine IP-Adresse und die Anfrage an unseren Server. Wir speichern keine Zugriffsprotokolle mit IP-Adressen. Zum Schutz vor Missbrauch (z. B. massenhafte Anmeldungen) hält der Server IP-Adressen höchstens anderthalb Stunden im Arbeitsspeicher, um Anfragen zu zählen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren Angebot (Art. 6 Abs. 1 lit. f DSGVO).',
				'Der Server wird von der Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, in unserem Auftrag betrieben (Art. 28 DSGVO).'
			]
		},
		{
			heading: 'Konto',
			paragraphs: [
				'Für ein Konto speichern wir deine E-Mail-Adresse, deinen Namen, deine Sprache und – falls du eines setzt – ein Passwort (nur als sicherer Hash). Freiwillig kommen Kontaktwege (Telefon, Messenger …) und gespeicherte Orte hinzu. Angemeldet wirst du per Link an deine E-Mail-Adresse (gültig 15 Minuten) oder mit Passwort; die Sitzung bleibt bis zu 60 Tage bestehen.',
				'Meldest du dich ohne Konto zu einer Veranstaltung an, legen wir mit Name und E-Mail-Adresse ein Konto ohne Passwort an, damit du deine Anmeldung später ändern kannst. Solche Konten löschen wir, sobald keine Anmeldung mehr daran hängt.',
				'Rechtsgrundlage ist die Nutzung von toodle, die du mit dem Konto beginnst (Art. 6 Abs. 1 lit. b DSGVO). Du kannst dein Konto jederzeit im Profil löschen; dabei werden alle Daten gelöscht, auch Veranstaltungen, die du allein organisierst (Angemeldete erhalten dann eine Absage).'
			]
		},
		{
			heading: 'Anmeldungen und wer was sieht',
			paragraphs: [
				'Zu einer Anmeldung speichern wir deine Antworten auf das Formular der Veranstaltung, einen Kommentar und – falls die Veranstaltung danach fragt – deine Reise: wie, wann und von wo bzw. wohin du fährst, ob du Plätze frei hast, und Abholorte.',
				'Die Veranstalter:innen sehen deine Anmeldung vollständig: Name, E-Mail-Adresse, Kontaktwege, Antworten und Reise (Orte nur als Ort/Stadtteil oder Name eines Bahnhofs bzw. Treffpunkts). Sie können die Liste exportieren und sind für ihre weitere Verwendung selbst verantwortlich.',
				'Andere Teilnehmende sehen keine Teilnehmendenliste. In der Mitfahr-Ansicht sehen sie – je nach Einstellung der Veranstaltung alle, nur passende oder gar keine – Fahrten mit Name, Kontaktwegen, Ort/Stadtteil und Zeit. Deine Adresse und genaue Koordinaten sieht niemand; sie bleiben auf dem Server und dienen nur der Berechnung von Umwegen.',
				'Rechtsgrundlage ist die Anmeldung zur Veranstaltung, die du selbst vornimmst (Art. 6 Abs. 1 lit. b DSGVO).'
			]
		},
		{
			heading: 'E-Mails und Push-Nachrichten',
			paragraphs: [
				'Wir schicken dir Anmeldelinks, Anmeldebestätigungen (mit Kalendereintrag), Hinweise zu Mitfahrten, Erinnerungen, Änderungen oder Absagen einer Veranstaltung und Nachrichten der Veranstalter:innen. Hinweise und Erinnerungen kannst du im Profil oder per Link in jeder Mail abbestellen. Antworten auf diese Mails gehen an die Kontaktadresse der Veranstalter:innen.',
				'Für den Versand nutzen wir Brevo (Sendinblue SAS, 106 boulevard Haussmann, 75008 Paris, Frankreich) als Auftragsverarbeiter (Art. 28 DSGVO). Brevo erhält dafür deine E-Mail-Adresse und den Inhalt der Mail.',
				'Push-Nachrichten gibt es nur, wenn du sie auf einem Gerät einschaltest (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO). Dein Browser wählt dafür den Push-Dienst seines Herstellers (z. B. Google, Apple, Mozilla, Microsoft); der Inhalt der Nachricht ist Ende-zu-Ende verschlüsselt und für den Dienst nicht lesbar. Du kannst Push jederzeit im Profil ausschalten.'
			]
		},
		{
			heading: 'Adresssuche, Karte und Fahrzeiten',
			paragraphs: [
				'Suchst du eine Adresse oder klickst auf die Karte, geht der Suchtext bzw. die Stelle über unseren Server – ohne deine IP-Adresse – an den Suchdienst Photon der komoot GmbH (Kienberger Allee 4, 12529 Schönefeld). Kartenkacheln lädt unser Server ohne deine IP-Adresse von OpenStreetMap (OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Großbritannien) und speichert sie bis zu 7 Tage zwischen. Fahrzeiten berechnet unser Server selbst. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.'
			]
		},
		{
			heading: 'Cookies und Speicher auf deinem Gerät',
			paragraphs: [
				'toodle setzt nur Cookies, die für die Funktion nötig sind: die Sitzung (bis zu 60 Tage), deine Wahl für Sprache und Darstellung (bis zu ein Jahr) und eine kurze Anmelde-Bestätigung (1 Minute). Damit die Seiten auch offline funktionieren, speichert die App zuletzt besuchte Seiten auf deinem Gerät; beim Abmelden werden sie gelöscht. Das ist für die von dir genutzten Funktionen unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).'
			]
		},
		{
			heading: 'Speicherdauer',
			paragraphs: [
				'Anmeldungen samt Antworten, Reisedaten und Mitfahrten löschen wir ein Jahr nach Ende der Veranstaltung automatisch. Die Veranstaltung selbst bleibt für die Veranstalter:innen erhalten (ohne Anmeldungen). Konten bleiben, bis du sie löschst; Konten aus einer Anmeldung ohne Konto, deren E-Mail-Adresse nie bestätigt wurde, löschen wir automatisch, sobald keine Anmeldung mehr daran hängt. Anmeldelinks verfallen nach 15 Minuten. Sicherungskopien der Datenbank bewahren wir höchstens sechs Monate auf – was gelöscht wurde, ist spätestens dann auch aus den Sicherungen verschwunden.'
			]
		},
		{
			heading: 'Deine Rechte',
			paragraphs: [
				`Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Datenübertragbarkeit sowie auf Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 15–18, 20, 21 DSGVO). Vieles kannst du direkt im Profil erledigen; sonst schreib uns an ${OPERATOR.email}. Eine Einwilligung (Push) kannst du jederzeit widerrufen.`,
				'Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg.'
			]
		}
	],
	updated: 'Stand: 23. November 2026'
};

const privacyEn: LegalPage = {
	title: 'Privacy',
	intro:
		'In short: toodle stores what registrations and rides need, shows others only as much as necessary and deletes registrations one year after the event. No ads, no tracking, no analytics. The German version is binding.',
	sections: [
		{ heading: 'Controller', paragraphs: [address('Germany'), `Email: ${OPERATOR.email}`] },
		{
			heading: 'Visiting the site and server',
			paragraphs: [
				'When you visit toodle, your device necessarily sends your IP address and the request to our server. We keep no access logs with IP addresses. To prevent abuse (e.g. mass registrations), the server keeps IP addresses in memory for at most 90 minutes to count requests. Legal basis: our legitimate interest in a secure service (Art. 6(1)(f) GDPR).',
				'The server is operated on our behalf by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany (Art. 28 GDPR).'
			]
		},
		{
			heading: 'Account',
			paragraphs: [
				'For an account we store your email address, your name, your language and – if you set one – a password (only as a secure hash). Optionally, contact options (phone, messengers …) and saved places. You log in with a link sent to your email address (valid for 15 minutes) or with your password; a session lasts up to 60 days.',
				'If you register for an event without an account, we create an account without password from your name and email address, so you can change your registration later. Such accounts are deleted once no registration is left.',
				'Legal basis: your use of toodle (Art. 6(1)(b) GDPR). You can delete your account in your profile at any time; all data is deleted, including events you organize alone (people registered then get a cancellation).'
			]
		},
		{
			heading: 'Registrations and who sees what',
			paragraphs: [
				'With a registration we store your answers to the event’s form, a comment and – if the event asks for it – your travel: how, when and from/to where you travel, whether you have free seats, and pick-up points.',
				'The organizers see your full registration: name, email address, contact options, answers and travel (places only as town/district or the name of a station or meeting point). They can export the list and are responsible for how they use it.',
				'Other participants see no list of participants. In the rides view they see – depending on the event’s setting all, only matching or no – rides with name, contact options, town/district and time. Nobody sees your address or exact coordinates; they stay on the server and are only used to estimate detours.',
				'Legal basis: your registration for the event (Art. 6(1)(b) GDPR).'
			]
		},
		{
			heading: 'Emails and push notifications',
			paragraphs: [
				'We send you login links, confirmations (with a calendar entry), ride hints, reminders, changes or cancellations of an event and messages from the organizers. You can unsubscribe from hints and reminders in your profile or via the link in every email. Replies to these emails go to the organizers’ contact address.',
				'Emails are sent via Brevo (Sendinblue SAS, 106 boulevard Haussmann, 75008 Paris, France) as our processor (Art. 28 GDPR), which receives your email address and the content of the email.',
				'Push notifications are only sent if you switch them on for a device (consent, Art. 6(1)(a) GDPR). Your browser uses its vendor’s push service (e.g. Google, Apple, Mozilla, Microsoft); the content is end-to-end encrypted and cannot be read by that service. You can switch push off in your profile at any time.'
			]
		},
		{
			heading: 'Address search, map and travel times',
			paragraphs: [
				'When you search an address or click on the map, the search text or the spot goes through our server – without your IP address – to the Photon search service of komoot GmbH (Kienberger Allee 4, 12529 Schönefeld, Germany). Map tiles are fetched by our server without your IP address from OpenStreetMap (OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, UK) and cached for up to 7 days. Travel times are computed on our own server. Legal basis: Art. 6(1)(f) GDPR.'
			]
		},
		{
			heading: 'Cookies and storage on your device',
			paragraphs: [
				'toodle only sets cookies it needs to work: the session (up to 60 days), your choice of language and appearance (up to one year) and a short login notice (1 minute). So pages also work offline, the app keeps recently visited pages on your device; they are deleted when you log out. This is strictly necessary for the functions you use (§ 25(2) no. 2 TDDDG).'
			]
		},
		{
			heading: 'Retention',
			paragraphs: [
				'Registrations with answers, travel details and rides are deleted automatically one year after the event ended. The event itself stays with its organizers (without registrations). Accounts remain until you delete them; accounts created by registering without an account whose email address was never confirmed are deleted automatically once no registration is left. Login links expire after 15 minutes. Backups of the database are kept for at most six months – whatever was deleted is gone from the backups by then at the latest.'
			]
		},
		{
			heading: 'Your rights',
			paragraphs: [
				`You have the right of access, rectification, erasure and restriction of processing, to data portability and to object to processing based on Art. 6(1)(f) GDPR (Art. 15–18, 20, 21 GDPR). Much of this you can do in your profile; otherwise write to ${OPERATOR.email}. You can withdraw consent (push) at any time.`,
				'You may also lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), e.g. the State Commissioner for Data Protection and Freedom of Information of Baden-Württemberg.'
			]
		}
	],
	updated: 'As of 23 November 2026'
};

const privacyFr: LegalPage = {
	title: 'Protection des données',
	intro:
		'En bref : toodle enregistre ce qu’il faut pour les inscriptions et les covoiturages, ne montre aux autres que le nécessaire et supprime les inscriptions un an après l’événement. Pas de publicité, pas de pistage, pas d’outils d’analyse. La version allemande fait foi.',
	sections: [
		{ heading: 'Responsable', paragraphs: [address('Allemagne'), `E-mail : ${OPERATOR.email}`] },
		{
			heading: 'Consultation du site et serveur',
			paragraphs: [
				'Lors de la consultation, ton appareil transmet nécessairement ton adresse IP et la requête à notre serveur. Nous ne conservons pas de journaux d’accès avec adresses IP. Pour éviter les abus (p. ex. inscriptions en masse), le serveur garde les adresses IP au plus une heure et demie en mémoire pour compter les requêtes. Base légale : notre intérêt légitime à un service sûr (art. 6, par. 1, f RGPD).',
				'Le serveur est exploité pour notre compte par Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne (art. 28 RGPD).'
			]
		},
		{
			heading: 'Compte',
			paragraphs: [
				'Pour un compte, nous enregistrons ton adresse e-mail, ton nom, ta langue et – si tu en définis un – un mot de passe (uniquement sous forme de hachage sécurisé). En option : moyens de contact (téléphone, messageries …) et lieux enregistrés. Tu te connectes par un lien envoyé à ton adresse e-mail (valable 15 minutes) ou avec ton mot de passe ; une session dure jusqu’à 60 jours.',
				'Si tu t’inscris à un événement sans compte, nous créons un compte sans mot de passe avec ton nom et ton adresse e-mail, pour que tu puisses modifier ton inscription plus tard. Ces comptes sont supprimés dès qu’aucune inscription n’y est rattachée.',
				'Base légale : ton utilisation de toodle (art. 6, par. 1, b RGPD). Tu peux supprimer ton compte à tout moment dans ton profil ; toutes les données sont supprimées, y compris les événements que tu organises seul·e (les inscrit·es reçoivent alors une annulation).'
			]
		},
		{
			heading: 'Inscriptions et qui voit quoi',
			paragraphs: [
				'Avec une inscription, nous enregistrons tes réponses au formulaire de l’événement, un commentaire et – si l’événement le demande – ton trajet : comment, quand et d’où/vers où tu voyages, si tu as des places libres, et les points de prise en charge.',
				'Les organisateur·ices voient ton inscription complète : nom, adresse e-mail, moyens de contact, réponses et trajet (lieux uniquement sous forme de localité/quartier ou nom d’une gare ou d’un point de rencontre). Ils et elles peuvent exporter la liste et sont responsables de son utilisation.',
				'Les autres participant·es ne voient pas de liste des participant·es. Dans la vue covoiturage, ils voient – selon le réglage de l’événement tous, seulement ceux qui correspondent ou aucun – les trajets avec nom, moyens de contact, localité/quartier et heure. Personne ne voit ton adresse ni tes coordonnées exactes ; elles restent sur le serveur et servent uniquement à estimer les détours.',
				'Base légale : ton inscription à l’événement (art. 6, par. 1, b RGPD).'
			]
		},
		{
			heading: 'E-mails et notifications push',
			paragraphs: [
				'Nous t’envoyons des liens de connexion, des confirmations (avec entrée de calendrier), des suggestions de covoiturage, des rappels, des modifications ou annulations d’événement et des messages des organisateur·ices. Tu peux te désabonner des suggestions et rappels dans ton profil ou par le lien présent dans chaque e-mail. Les réponses à ces e-mails vont à l’adresse de contact des organisateur·ices.',
				'Les e-mails sont envoyés via Brevo (Sendinblue SAS, 106 boulevard Haussmann, 75008 Paris, France), notre sous-traitant (art. 28 RGPD), qui reçoit ton adresse e-mail et le contenu de l’e-mail.',
				'Les notifications push ne sont envoyées que si tu les actives sur un appareil (consentement, art. 6, par. 1, a RGPD). Ton navigateur utilise le service push de son éditeur (p. ex. Google, Apple, Mozilla, Microsoft) ; le contenu est chiffré de bout en bout et illisible pour ce service. Tu peux désactiver le push à tout moment dans ton profil.'
			]
		},
		{
			heading: 'Recherche d’adresse, carte et temps de trajet',
			paragraphs: [
				'Quand tu cherches une adresse ou cliques sur la carte, le texte ou l’endroit passe par notre serveur – sans ton adresse IP – vers le service de recherche Photon de komoot GmbH (Kienberger Allee 4, 12529 Schönefeld, Allemagne). Les tuiles de carte sont chargées par notre serveur sans ton adresse IP depuis OpenStreetMap (OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Royaume-Uni) et mises en cache jusqu’à 7 jours. Les temps de trajet sont calculés sur notre propre serveur. Base légale : art. 6, par. 1, f RGPD.'
			]
		},
		{
			heading: 'Cookies et stockage sur ton appareil',
			paragraphs: [
				'toodle n’utilise que les cookies nécessaires à son fonctionnement : la session (jusqu’à 60 jours), ton choix de langue et d’apparence (jusqu’à un an) et un bref avis de connexion (1 minute). Pour que les pages fonctionnent aussi hors ligne, l’application garde les pages récemment visitées sur ton appareil ; elles sont supprimées à la déconnexion. C’est strictement nécessaire pour les fonctions que tu utilises (§ 25, al. 2, n° 2 TDDDG).'
			]
		},
		{
			heading: 'Durée de conservation',
			paragraphs: [
				'Les inscriptions avec réponses, trajets et covoiturages sont supprimées automatiquement un an après la fin de l’événement. L’événement lui-même reste disponible pour ses organisateur·ices (sans inscriptions). Les comptes restent jusqu’à ce que tu les supprimes ; les comptes créés lors d’une inscription sans compte, dont l’adresse e-mail n’a jamais été confirmée, sont supprimés automatiquement dès qu’aucune inscription n’y est rattachée. Les liens de connexion expirent après 15 minutes. Les sauvegardes de la base de données sont conservées six mois au plus – ce qui a été supprimé disparaît alors aussi des sauvegardes au plus tard.'
			]
		},
		{
			heading: 'Tes droits',
			paragraphs: [
				`Tu as le droit d’accès, de rectification, d’effacement et de limitation du traitement, à la portabilité des données ainsi que le droit de t’opposer aux traitements fondés sur l’art. 6, par. 1, f RGPD (art. 15 à 18, 20, 21 RGPD). Tu peux faire beaucoup de choses directement dans ton profil ; sinon écris-nous à ${OPERATOR.email}. Tu peux retirer ton consentement (push) à tout moment.`,
				'Tu peux aussi introduire une réclamation auprès d’une autorité de contrôle (art. 77 RGPD), par exemple la CNPD au Luxembourg ou le délégué à la protection des données du Bade-Wurtemberg.'
			]
		}
	],
	updated: 'État : 23 novembre 2026'
};

const privacyNl: LegalPage = {
	title: 'Privacy',
	intro:
		'Kort gezegd: toodle bewaart wat nodig is voor aanmeldingen en ritten, laat anderen alleen het nodige zien en verwijdert aanmeldingen een jaar na het evenement. Geen reclame, geen tracking, geen analysediensten. De Duitse versie is bindend.',
	sections: [
		{
			heading: 'Verantwoordelijke',
			paragraphs: [address('Duitsland'), `E-mail: ${OPERATOR.email}`]
		},
		{
			heading: 'Bezoek van de site en server',
			paragraphs: [
				'Bij een bezoek stuurt je apparaat noodzakelijkerwijs je IP-adres en het verzoek naar onze server. We bewaren geen toegangslogs met IP-adressen. Om misbruik te voorkomen (bijv. massale aanmeldingen) houdt de server IP-adressen hooguit anderhalf uur in het geheugen om verzoeken te tellen. Rechtsgrond: ons gerechtvaardigd belang bij een veilige dienst (art. 6 lid 1 sub f AVG).',
				'De server wordt in onze opdracht beheerd door Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Duitsland (art. 28 AVG).'
			]
		},
		{
			heading: 'Account',
			paragraphs: [
				'Voor een account bewaren we je e-mailadres, je naam, je taal en – als je er een instelt – een wachtwoord (alleen als veilige hash). Optioneel: contactmogelijkheden (telefoon, messengers …) en opgeslagen plekken. Je logt in met een link naar je e-mailadres (15 minuten geldig) of met je wachtwoord; een sessie duurt tot 60 dagen.',
				'Meld je je zonder account aan voor een evenement, dan maken we met je naam en e-mailadres een account zonder wachtwoord aan, zodat je je aanmelding later kunt wijzigen. Zulke accounts verwijderen we zodra er geen aanmelding meer aan hangt.',
				'Rechtsgrond: je gebruik van toodle (art. 6 lid 1 sub b AVG). Je kunt je account altijd in je profiel verwijderen; alle gegevens worden dan verwijderd, ook evenementen die je alleen organiseert (aangemelde mensen krijgen dan een afzegging).'
			]
		},
		{
			heading: 'Aanmeldingen en wie wat ziet',
			paragraphs: [
				'Bij een aanmelding bewaren we je antwoorden op het formulier van het evenement, een opmerking en – als het evenement erom vraagt – je reis: hoe, wanneer en van/naar waar je reist, of je plaatsen vrij hebt, en ophaalplekken.',
				'De organisatoren zien je volledige aanmelding: naam, e-mailadres, contactmogelijkheden, antwoorden en reis (plekken alleen als plaats/wijk of naam van een station of ontmoetingsplek). Ze kunnen de lijst exporteren en zijn zelf verantwoordelijk voor het gebruik ervan.',
				'Andere deelnemers zien geen deelnemerslijst. In het rittenoverzicht zien ze – afhankelijk van de instelling van het evenement alle, alleen passende of geen – ritten met naam, contactmogelijkheden, plaats/wijk en tijd. Niemand ziet je adres of exacte coördinaten; die blijven op de server en dienen alleen om omwegen te schatten.',
				'Rechtsgrond: je aanmelding voor het evenement (art. 6 lid 1 sub b AVG).'
			]
		},
		{
			heading: 'E-mails en pushberichten',
			paragraphs: [
				'We sturen je inloglinks, bevestigingen (met agenda-afspraak), rittips, herinneringen, wijzigingen of afgelastingen van een evenement en berichten van de organisatoren. Tips en herinneringen kun je in je profiel of via de link in elke e-mail opzeggen. Antwoorden op deze e-mails gaan naar het contactadres van de organisatoren.',
				'E-mails worden verstuurd via Brevo (Sendinblue SAS, 106 boulevard Haussmann, 75008 Parijs, Frankrijk) als verwerker (art. 28 AVG), die daarvoor je e-mailadres en de inhoud van de e-mail ontvangt.',
				'Pushberichten krijg je alleen als je ze op een apparaat inschakelt (toestemming, art. 6 lid 1 sub a AVG). Je browser gebruikt de pushdienst van zijn maker (bijv. Google, Apple, Mozilla, Microsoft); de inhoud is end-to-end versleuteld en voor die dienst onleesbaar. Je kunt push altijd in je profiel uitzetten.'
			]
		},
		{
			heading: 'Adres zoeken, kaart en reistijden',
			paragraphs: [
				'Zoek je een adres of klik je op de kaart, dan gaat de zoektekst of de plek via onze server – zonder je IP-adres – naar de zoekdienst Photon van komoot GmbH (Kienberger Allee 4, 12529 Schönefeld, Duitsland). Kaarttegels haalt onze server zonder je IP-adres op bij OpenStreetMap (OpenStreetMap Foundation, St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, VK) en bewaart ze tot 7 dagen. Reistijden berekent onze eigen server. Rechtsgrond: art. 6 lid 1 sub f AVG.'
			]
		},
		{
			heading: 'Cookies en opslag op je apparaat',
			paragraphs: [
				'toodle gebruikt alleen cookies die nodig zijn om te werken: de sessie (tot 60 dagen), je keuze voor taal en weergave (tot een jaar) en een korte inlogmelding (1 minuut). Zodat pagina’s ook offline werken, bewaart de app onlangs bezochte pagina’s op je apparaat; bij het uitloggen worden ze verwijderd. Dit is strikt noodzakelijk voor de functies die je gebruikt (§ 25 lid 2 nr. 2 TDDDG).'
			]
		},
		{
			heading: 'Bewaartermijn',
			paragraphs: [
				'Aanmeldingen met antwoorden, reisgegevens en ritten worden een jaar na afloop van het evenement automatisch verwijderd. Het evenement zelf blijft voor de organisatoren bestaan (zonder aanmeldingen). Accounts blijven tot je ze verwijdert; accounts uit een aanmelding zonder account waarvan het e-mailadres nooit is bevestigd, worden automatisch verwijderd zodra er geen aanmelding meer aan hangt. Inloglinks verlopen na 15 minuten. Back-ups van de database bewaren we hoogstens zes maanden – wat verwijderd is, is dan uiterlijk ook uit de back-ups verdwenen.'
			]
		},
		{
			heading: 'Je rechten',
			paragraphs: [
				`Je hebt recht op inzage, rectificatie, wissing en beperking van de verwerking, op overdraagbaarheid van gegevens en op bezwaar tegen verwerkingen op grond van art. 6 lid 1 sub f AVG (art. 15–18, 20, 21 AVG). Veel kun je direct in je profiel regelen; schrijf ons anders op ${OPERATOR.email}. Je kunt je toestemming (push) altijd intrekken.`,
				'Je kunt ook een klacht indienen bij een toezichthouder (art. 77 AVG), bijvoorbeeld de Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg.'
			]
		}
	],
	updated: 'Stand: 23 november 2026'
};

const privacy: Record<Locale, LegalPage> = {
	de: privacyDe,
	en: privacyEn,
	fr: privacyFr,
	nl: privacyNl
};

export const legal = (page: 'imprint' | 'privacy', locale: Locale): LegalPage =>
	(page === 'imprint' ? imprint : privacy)[locale] ?? (page === 'imprint' ? imprint : privacy).de;

/** Splits a paragraph into text and links (e-mail addresses, https:// URLs). */
export function linkify(text: string): { text: string; href?: string }[] {
	const parts: { text: string; href?: string }[] = [];
	const re = /([\w.+-]+@[\w-]+\.[\w.]+\w|https:\/\/[^\s)]+)/g;
	let last = 0;
	for (const m of text.matchAll(re)) {
		if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
		parts.push({
			text: m[0],
			href: m[0].includes('@') && !m[0].startsWith('https') ? `mailto:${m[0]}` : m[0]
		});
		last = m.index! + m[0].length;
	}
	if (last < text.length) parts.push({ text: text.slice(last) });
	return parts;
}
