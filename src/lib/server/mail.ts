import { appendFileSync } from 'node:fs';
import nodemailer, { type Transporter } from 'nodemailer';
import {
	MAIL_FROM,
	MAIL_OUTBOX,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_USER
} from '$app/env/private';
import { m } from '../paraglide/messages.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
	if (!SMTP_HOST) return null;
	transporter ??= nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_PORT === 465,
		auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
	});
	return transporter;
}

export type Mail = {
	to: string;
	subject: string;
	text: string;
	html: string;
	/** Where answers go – the organizers of the event (the sender itself is a no-reply address) */
	replyTo?: string;
	/** one-click-ish unsubscribe target (shown by many mail clients as "Abbestellen") */
	unsubscribeUrl?: string;
	attachments?: { filename: string; content: string; contentType: string }[];
};

/** Sends a mail – or prints it to the console when no SMTP server is configured (development). */
export async function sendMail(mail: Mail) {
	if (MAIL_OUTBOX) {
		appendFileSync(
			MAIL_OUTBOX,
			JSON.stringify({
				to: mail.to,
				replyTo: mail.replyTo,
				subject: mail.subject,
				text: mail.text
			}) + '\n'
		);
	}
	const t = getTransporter();
	if (!t) {
		console.info(
			`\n[mail] to=${mail.to}${mail.replyTo ? ` reply-to=${mail.replyTo}` : ''} subject=${mail.subject}\n${mail.text}\n`
		);
		return;
	}
	const { unsubscribeUrl, attachments, ...rest } = mail;
	await t.sendMail({
		from: MAIL_FROM ?? SMTP_USER,
		...rest,
		attachments,
		headers: unsubscribeUrl ? { 'List-Unsubscribe': `<${unsubscribeUrl}>` } : undefined
	});
}

/** Sends without failing the caller – notifications must never break a registration. */
export async function trySendMail(mail: Mail): Promise<boolean> {
	try {
		await sendMail(mail);
		return true;
	} catch (err) {
		console.error('[mail] sending failed', err);
		return false;
	}
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Minimal, neutral HTML layout: paragraphs, an optional list, one button and a footer. */
export function renderMail(opts: {
	paragraphs: string[];
	items?: string[];
	after?: string[];
	/** the button – none e.g. for a cancelled event (there's nothing left to open) */
	action?: { label: string; url: string };
	footer: string;
	unsubscribe?: { label: string; url: string };
}): { text: string; html: string } {
	const text = [
		...opts.paragraphs,
		...(opts.items?.length ? [opts.items.map((i) => `• ${i}`).join('\n')] : []),
		...(opts.after ?? []),
		...(opts.action ? [`${opts.action.label}: ${opts.action.url}`] : []),
		m.tagline(),
		opts.footer,
		...(opts.unsubscribe ? [`${opts.unsubscribe.label}: ${opts.unsubscribe.url}`] : [])
	].join('\n\n');
	const p = (s: string) => `<p style="margin:0 0 16px;line-height:1.5">${escape(s)}</p>`;
	const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f5f0;font-family:system-ui,sans-serif;color:#1e2a24">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #ddd8ce;border-radius:10px;padding:24px">
<p style="margin:0 0 16px;font-weight:700;font-size:18px;color:#2f6b4f">toodle<span style="color:#c4472e">.</span><span style="font-weight:400">lu</span></p>
${opts.paragraphs.map(p).join('\n')}
${opts.items?.length ? `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6">${opts.items.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>` : ''}
${(opts.after ?? []).map(p).join('\n')}
${opts.action ? `<p style="margin:24px 0"><a href="${escape(opts.action.url)}" style="background:#2f6b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escape(opts.action.label)}</a></p>` : ''}
<p style="margin:0 0 16px;font-weight:600;color:#2f6b4f">${escape(m.tagline())}</p>
<p style="margin:0;font-size:13px;color:#5d635f;line-height:1.5">${escape(opts.footer)}${
		opts.unsubscribe
			? `<br><a href="${escape(opts.unsubscribe.url)}" style="color:#5d635f">${escape(opts.unsubscribe.label)}</a>`
			: ''
	}</p>
</div></body></html>`;
	return { text, html };
}
