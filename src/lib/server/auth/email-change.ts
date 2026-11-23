/**
 * Changing the e-mail address of an account: a link goes to the NEW address; only clicking it
 * changes anything (the address is proven at the same time). The old address hears about it.
 */
import { and, eq, gt, lt } from 'drizzle-orm';
import { ORIGIN } from '$app/env/private';
import { OPERATOR } from '../../legal.js';
import { m } from '../../paraglide/messages.js';
import { db } from '../db/index.js';
import { emailChange, user } from '../db/schema.js';
import { withLocale } from '../locale-context.js';
import { renderMail, sendMail, trySendMail } from '../mail.js';
import { generateToken, hashToken } from './crypto.js';

const VALID_MINUTES = 60;
const CONTACT = OPERATOR.email;

const emailTaken = (email: string) =>
	!!db.select({ id: user.id }).from(user).where(eq(user.email, email)).get();

/**
 * Starts the change. When the new address already has an account, nothing can change – that
 * address gets a note instead of a link (the page says the same either way, so nobody can find
 * out which addresses have an account). Throws when the mail can't be sent.
 */
export async function requestEmailChange(
	account: { id: string; locale: string | null },
	newEmail: string
) {
	db.delete(emailChange).where(lt(emailChange.expiresAt, new Date())).run();
	if (emailTaken(newEmail)) {
		await sendMail(
			withLocale(account.locale, () => ({
				to: newEmail,
				subject: m.mail_email_change_subject(),
				...renderMail({
					paragraphs: [m.mail_email_change_taken({ email: newEmail })],
					action: { label: m.mail_login_button(), url: `${ORIGIN}/login` },
					footer: m.mail_email_change_footer()
				})
			}))
		);
		return;
	}
	const token = generateToken();
	db.delete(emailChange).where(eq(emailChange.userId, account.id)).run();
	db.insert(emailChange)
		.values({
			id: hashToken(token),
			userId: account.id,
			newEmail,
			expiresAt: new Date(Date.now() + VALID_MINUTES * 60 * 1000)
		})
		.run();
	await sendMail(
		withLocale(account.locale, () => ({
			to: newEmail,
			subject: m.mail_email_change_subject(),
			...renderMail({
				paragraphs: [
					m.mail_email_change_intro({ email: newEmail }),
					m.mail_email_change_validity()
				],
				action: {
					label: m.mail_email_change_button(),
					url: `${ORIGIN}/auth/email?token=${encodeURIComponent(token)}`
				},
				footer: m.mail_email_change_footer()
			})
		}))
	);
}

function findChange(token: string) {
	return (
		db
			.select()
			.from(emailChange)
			.where(and(eq(emailChange.id, hashToken(token)), gt(emailChange.expiresAt, new Date())))
			.get() ?? null
	);
}

export function pendingEmailChange(token: string): string | null {
	return findChange(token)?.newEmail ?? null;
}

/** Applies the change. 'taken' if somebody registered that address in the meantime. */
export function confirmEmailChange(token: string): 'changed' | 'invalid' | 'taken' {
	const result = db.transaction(() => {
		const change = findChange(token);
		if (!change) return null;
		db.delete(emailChange).where(eq(emailChange.id, change.id)).run();
		if (emailTaken(change.newEmail)) return 'taken' as const;
		const before = db.select().from(user).where(eq(user.id, change.userId)).get();
		if (!before) return null;
		db.update(user)
			.set({ email: change.newEmail, emailVerifiedAt: new Date() })
			.where(eq(user.id, before.id))
			.run();
		return { before, newEmail: change.newEmail };
	});
	if (!result) return 'invalid';
	if (result === 'taken') return 'taken';
	// the old address hears about it – in case it wasn't its owner
	const { before, newEmail } = result;
	void trySendMail(
		withLocale(before.locale, () => ({
			to: before.email,
			subject: m.mail_email_changed_subject(),
			...renderMail({
				paragraphs: [m.mail_email_changed_text({ email: newEmail, contact: CONTACT })],
				footer: m.mail_email_change_footer()
			})
		}))
	);
	return 'changed';
}
