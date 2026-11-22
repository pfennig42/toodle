import { m } from '../../paraglide/messages.js';
import { renderMail, sendMail } from '../mail.js';
import { createLoginToken } from './index.js';

/**
 * Mails a magic link (log in, and prove the address). `next`: where to go afterwards – already
 * checked with safeNext. Throws when the mail can't be sent.
 */
export async function sendLoginLink(email: string, next: string | null, origin: string) {
	const token = createLoginToken(email, next);
	const link = `${origin}/auth/link?token=${encodeURIComponent(token)}`;
	await sendMail({
		to: email,
		subject: m.mail_login_subject(),
		...renderMail({
			paragraphs: [m.mail_login_intro(), m.mail_login_validity()],
			action: { label: m.mail_login_button(), url: link },
			footer: m.mail_login_footer()
		})
	});
}
