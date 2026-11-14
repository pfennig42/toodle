import nodemailer, { type Transporter } from 'nodemailer';
import { MAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '$app/env/private';

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

export type Mail = { to: string; subject: string; text: string; html: string };

/** Sends a mail – or prints it to the console when no SMTP server is configured (development). */
export async function sendMail(mail: Mail) {
	const t = getTransporter();
	if (!t) {
		console.info(`\n[mail] to=${mail.to} subject=${mail.subject}\n${mail.text}\n`);
		return;
	}
	await t.sendMail({ from: MAIL_FROM ?? SMTP_USER, ...mail });
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Minimal, neutral HTML layout: a paragraph list plus one button. */
export function renderMail(opts: {
	paragraphs: string[];
	action: { label: string; url: string };
	footer: string;
}): { text: string; html: string } {
	const text = [
		...opts.paragraphs,
		`${opts.action.label}: ${opts.action.url}`,
		'',
		opts.footer
	].join('\n\n');
	const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f5f0;font-family:system-ui,sans-serif;color:#1e2a24">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #ddd8ce;border-radius:10px;padding:24px">
<p style="margin:0 0 16px;font-weight:700;font-size:18px;color:#2f6b4f">toodle</p>
${opts.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escape(p)}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${escape(opts.action.url)}" style="background:#2f6b4f;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${escape(opts.action.label)}</a></p>
<p style="margin:0;font-size:13px;color:#5d635f;line-height:1.5">${escape(opts.footer)}</p>
</div></body></html>`;
	return { text, html };
}
