/**
 * Texts of the landing page (/ when logged out, /about). Longer prose than the rest of the
 * app, so it lives here per language instead of in single message keys.
 * Style: short sentences, concrete, no dashes.
 */
import type { Locale } from './paraglide/runtime.js';

export type Landing = {
	hero: { title: string; text: string; cta: string; note: string };
	why: { title: string; paragraphs: string[] };
	steps: { title: string; items: { lead: string; text: string }[] };
	not: { title: string; items: string[]; after: string };
	orga: { title: string; items: string[] };
	costs: { title: string; before: string; after: string; coffee: string };
	faq: { title: string; items: { q: string; a: string }[] };
};

const de: Landing = {
	hero: {
		title: 'Anmelden und sehen, wer mitfährt.',
		text: 'Mit toodle meldest du dich zu einer Veranstaltung an und sagst dabei, wann und von wo du anreist. So sieht jeder, wer aus seiner Gegend kommt. Wer mit wem fährt, macht ihr unter euch aus.',
		cta: 'Veranstaltung anlegen',
		note: 'Kostenlos. Ohne Werbung, ohne Tracking.'
	},
	why: {
		title: 'Warum es das gibt',
		paragraphs: [
			'Mitfahrbörsen funktionieren selten. Wer mit dem Auto fährt, nimmt ungern Fremde mit, und für ein paar Euro Spritgeld lohnt sich der Aufwand nicht.',
			'Bei Leuten, die man kennt, ist das anders. Für die fährt man auch mal einen Umweg. Man muss nur wissen, dass sie aus der gleichen Ecke kommen.',
			'Bei Freizeiten und Wochenenden irgendwo auf dem Land fragt die Anmeldung sowieso, wann du kommst und wann du fährst. toodle fragt dazu nur noch, von wo. Das ist alles.'
		]
	},
	steps: {
		title: 'So läuft es ab',
		items: [
			{
				lead: 'Du legst die Veranstaltung an.',
				text: 'Name, Ort, Zeitraum, Anmeldeschluss. Fragen wie Essenswünsche oder T-Shirt-Größe kannst du ergänzen.'
			},
			{
				lead: 'Du schickst den Link herum.',
				text: 'Wer sich anmeldet, gibt an, wann er anreist und abreist und ob er mit dem Auto kommt oder eine Mitfahrt sucht.'
			},
			{
				lead: 'Alle sehen, wer von wo kommt.',
				text: 'Absprechen könnt ihr euch dann so, wie ihr es sowieso tut: per Nachricht, Anruf oder in der Gruppe.'
			}
		]
	},
	not: {
		title: 'Was toodle absichtlich nicht macht',
		items: [
			'Keine Plätze buchen, keine Sitzplätze zählen',
			'Kein Algorithmus, der dich in ein Auto steckt',
			'Keine Bezahlung, keine Bewertungen'
		],
		after:
			'Das haben wir ausprobiert. Die Leute haben sich trotzdem lieber direkt abgesprochen. Also lassen wir das.'
	},
	orga: {
		title: 'Für Veranstalter',
		items: [
			'Alle Veranstaltungen auf einer Übersicht',
			'Eine Veranstaltung vom letzten Jahr kopieren und anpassen',
			'Anmeldeliste mit An- und Abreisezeiten, zum Planen von Essen und Betten',
			'Teilnehmende speichern ihre üblichen Orte einmal, zum Beispiel Zuhause und Arbeit. Bei der nächsten Anmeldung ist das ein Klick.'
		]
	},
	costs: {
		title: 'Kosten und Daten',
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
				a: 'Ja, aber dafür reicht eine E-Mail-Adresse. Man bekommt einen Link per Mail und ist drin. Ein Passwort ist freiwillig.'
			},
			{
				q: 'Wer sieht, von wo ich komme?',
				a: 'Nur die Orga und die anderen Teilnehmenden dieser Veranstaltung. In der Mitfahr-Ansicht steht nur der Ort oder Stadtteil, nie deine Adresse.'
			},
			{
				q: 'Was passiert nach der Veranstaltung mit den Daten?',
				a: 'Erst mal nichts. Die Veranstaltung bleibt, damit man sie nächstes Jahr wiederverwenden kann. Die Orga kann sie archivieren oder löschen. Dein Konto samt Anmeldungen kannst du jederzeit selbst löschen.'
			}
		]
	}
};

const en: Landing = {
	hero: {
		title: 'Sign up and see who’s driving.',
		text: 'With toodle you sign up for an event and say when and where you’re coming from. That way everyone sees who lives nearby. Who rides with whom, you sort out among yourselves.',
		cta: 'Create an event',
		note: 'Free. No ads, no tracking.'
	},
	why: {
		title: 'Why this exists',
		paragraphs: [
			'Rideshare boards rarely work. People who drive don’t like taking strangers along, and a few euros for fuel aren’t worth the hassle.',
			'With people you know, it’s different. For them you’ll happily take a detour. You just need to know they’re coming from the same corner.',
			'For camps and weekends somewhere in the countryside, the sign-up asks when you arrive and when you leave anyway. toodle only adds: from where. That’s it.'
		]
	},
	steps: {
		title: 'How it works',
		items: [
			{
				lead: 'You create the event.',
				text: 'Name, place, dates, deadline. You can add questions like food preferences or T-shirt size.'
			},
			{
				lead: 'You send the link around.',
				text: 'Everyone who signs up says when they arrive and leave, and whether they’re driving or looking for a ride.'
			},
			{
				lead: 'Everyone sees who’s coming from where.',
				text: 'Then you sort it out the way you always do: by message, by phone or in the group chat.'
			}
		]
	},
	not: {
		title: 'What toodle deliberately doesn’t do',
		items: [
			'No booking seats, no counting seats',
			'No algorithm that puts you in a car',
			'No payments, no ratings'
		],
		after: 'We tried that. People still preferred to talk directly. So we dropped it.'
	},
	orga: {
		title: 'For organizers',
		items: [
			'All your events in one overview',
			'Copy last year’s event and adjust it',
			'Sign-up list with arrival and departure times, for planning food and beds',
			'Participants save their usual places once, like home and work. Next time, signing up is one click.'
		]
	},
	costs: {
		title: 'Cost and data',
		before:
			'toodle is free and will stay free. No ads, no tracking, no paid plan. It runs on its own server and is built by ',
		after: ' as a spare time project.',
		coffee: 'If you want to support me and this project, buy me a coffee:'
	},
	faq: {
		title: 'Quick questions',
		items: [
			{
				q: 'Do my guests need an account?',
				a: 'Yes, but an email address is enough. You get a link by mail and you’re in. A password is optional.'
			},
			{
				q: 'Who can see where I’m coming from?',
				a: 'Only the organizers and the other participants of that event. The rides view only shows your town or district, never your address.'
			},
			{
				q: 'What happens to the data after the event?',
				a: 'Nothing at first. The event stays so it can be reused next year. Organizers can archive or delete it. You can delete your account and all your sign-ups yourself at any time.'
			}
		]
	}
};

const fr: Landing = {
	hero: {
		title: 'S’inscrire et voir qui y va en voiture.',
		text: 'Avec toodle, tu t’inscris à un événement et tu indiques quand et d’où tu arrives. Comme ça, chacun voit qui vient du même coin. Qui monte avec qui, vous le réglez entre vous.',
		cta: 'Créer un événement',
		note: 'Gratuit. Sans publicité, sans pistage.'
	},
	why: {
		title: 'Pourquoi ça existe',
		paragraphs: [
			'Les sites de covoiturage marchent rarement. Qui prend sa voiture n’aime pas emmener des inconnus, et quelques euros d’essence ne valent pas le dérangement.',
			'Avec des gens qu’on connaît, c’est différent. Pour eux, on fait volontiers un détour. Il suffit de savoir qu’ils viennent du même coin.',
			'Pour les camps et les week-ends quelque part à la campagne, l’inscription demande de toute façon quand tu arrives et quand tu repars. toodle demande juste en plus : d’où. C’est tout.'
		]
	},
	steps: {
		title: 'Comment ça se passe',
		items: [
			{
				lead: 'Tu crées l’événement.',
				text: 'Nom, lieu, dates, date limite. Tu peux ajouter des questions comme les préférences alimentaires ou la taille de t-shirt.'
			},
			{
				lead: 'Tu fais circuler le lien.',
				text: 'Chaque personne qui s’inscrit indique quand elle arrive et repart, et si elle vient en voiture ou cherche une place.'
			},
			{
				lead: 'Tout le monde voit qui vient d’où.',
				text: 'Ensuite, vous vous organisez comme d’habitude : par message, par téléphone ou dans le groupe.'
			}
		]
	},
	not: {
		title: 'Ce que toodle ne fait pas, exprès',
		items: [
			'Pas de réservation, pas de comptage de places',
			'Pas d’algorithme qui te met dans une voiture',
			'Pas de paiement, pas d’évaluations'
		],
		after:
			'On a essayé. Les gens ont quand même préféré s’arranger directement. Alors on laisse tomber.'
	},
	orga: {
		title: 'Pour les organisateurs',
		items: [
			'Tous tes événements sur une seule page',
			'Copier l’événement de l’an dernier et l’adapter',
			'Liste des inscriptions avec heures d’arrivée et de départ, pour prévoir repas et lits',
			'Les participants enregistrent une fois leurs lieux habituels, par exemple maison et travail. À la prochaine inscription, c’est un clic.'
		]
	},
	costs: {
		title: 'Coûts et données',
		before:
			'toodle est gratuit et le restera. Pas de publicité, pas de pistage, pas d’offre payante. Le site tourne sur son propre serveur et est construit par ',
		after: ' pendant son temps libre.',
		coffee: 'Si tu veux me soutenir, ainsi que ce projet, offre-moi un café :'
	},
	faq: {
		title: 'Questions rapides',
		items: [
			{
				q: 'Mes invités ont-ils besoin d’un compte ?',
				a: 'Oui, mais une adresse e-mail suffit. On reçoit un lien par mail et c’est bon. Le mot de passe est facultatif.'
			},
			{
				q: 'Qui voit d’où je viens ?',
				a: 'Seulement l’équipe d’organisation et les autres participants de cet événement. La vue covoiturage n’affiche que la ville ou le quartier, jamais ton adresse.'
			},
			{
				q: 'Que deviennent les données après l’événement ?',
				a: 'Rien, dans un premier temps. L’événement reste pour pouvoir être réutilisé l’an prochain. L’organisation peut l’archiver ou le supprimer. Tu peux supprimer ton compte et tes inscriptions toi-même à tout moment.'
			}
		]
	}
};

const nl: Landing = {
	hero: {
		title: 'Aanmelden en zien wie er rijdt.',
		text: 'Met toodle meld je je aan voor een evenement en zeg je meteen wanneer en vanaf waar je komt. Zo ziet iedereen wie uit de buurt komt. Wie met wie meerijdt, regelen jullie onderling.',
		cta: 'Evenement aanmaken',
		note: 'Gratis. Geen reclame, geen tracking.'
	},
	why: {
		title: 'Waarom dit bestaat',
		paragraphs: [
			'Meerijdplatforms werken zelden. Wie met de auto gaat, neemt niet graag vreemden mee, en voor een paar euro benzinegeld is het de moeite niet.',
			'Bij mensen die je kent, is dat anders. Voor hen rijd je best een stukje om. Je moet alleen weten dat ze uit dezelfde hoek komen.',
			'Bij kampen en weekenden ergens op het platteland vraagt de aanmelding toch al wanneer je komt en wanneer je weer gaat. toodle vraagt er alleen bij: vanaf waar. Dat is alles.'
		]
	},
	steps: {
		title: 'Zo gaat het',
		items: [
			{
				lead: 'Je maakt het evenement aan.',
				text: 'Naam, plaats, datum, inschrijfdeadline. Vragen zoals eetwensen of T-shirtmaat kun je toevoegen.'
			},
			{
				lead: 'Je stuurt de link rond.',
				text: 'Wie zich aanmeldt, geeft aan wanneer hij aankomt en vertrekt en of hij met de auto komt of een lift zoekt.'
			},
			{
				lead: 'Iedereen ziet wie waar vandaan komt.',
				text: 'Afspreken doen jullie zoals altijd: via een bericht, een telefoontje of in de groep.'
			}
		]
	},
	not: {
		title: 'Wat toodle bewust niet doet',
		items: [
			'Geen plaatsen boeken, geen zitplaatsen tellen',
			'Geen algoritme dat je in een auto zet',
			'Geen betalingen, geen beoordelingen'
		],
		after:
			'Dat hebben we geprobeerd. Mensen spraken het toch liever direct af. Dus laten we het weg.'
	},
	orga: {
		title: 'Voor organisatoren',
		items: [
			'Al je evenementen in één overzicht',
			'Het evenement van vorig jaar kopiëren en aanpassen',
			'Aanmeldlijst met aankomst en vertrektijden, om eten en bedden te plannen',
			'Deelnemers slaan hun vaste plekken één keer op, bijvoorbeeld thuis en werk. Bij de volgende aanmelding is dat één klik.'
		]
	},
	costs: {
		title: 'Kosten en gegevens',
		before:
			'toodle is gratis en blijft dat. Geen reclame, geen tracking, geen betaald abonnement. De site draait op een eigen server en wordt in de vrije tijd gebouwd door ',
		after: '.',
		coffee: 'Wil je mij en dit project steunen? Trakteer me op een koffie:'
	},
	faq: {
		title: 'Korte vragen',
		items: [
			{
				q: 'Hebben mijn gasten een account nodig?',
				a: 'Ja, maar een e-mailadres is genoeg. Je krijgt een link per mail en je bent binnen. Een wachtwoord is optioneel.'
			},
			{
				q: 'Wie ziet waar ik vandaan kom?',
				a: 'Alleen de organisatie en de andere deelnemers van dit evenement. In het meerijdoverzicht staat alleen de plaats of wijk, nooit je adres.'
			},
			{
				q: 'Wat gebeurt er na het evenement met de gegevens?',
				a: 'Eerst niets. Het evenement blijft bestaan, zodat je het volgend jaar opnieuw kunt gebruiken. De organisatie kan het archiveren of verwijderen. Je account met al je aanmeldingen kun je altijd zelf verwijderen.'
			}
		]
	}
};

const texts: Record<Locale, Landing> = { de, en, fr, nl };

export const landing = (locale: Locale): Landing => texts[locale] ?? de;
