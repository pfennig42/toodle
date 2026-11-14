export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 256;

export function normalizeEmail(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const email = value.trim().toLowerCase();
	if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
	return email;
}

/** Only allow same-origin, absolute paths as redirect targets. */
export function safeNext(value: unknown): string | null {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
	if (value.includes('\\') || /[\r\n]/.test(value)) return null;
	return value;
}

export function isValidPassword(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length >= PASSWORD_MIN_LENGTH &&
		value.length <= PASSWORD_MAX_LENGTH
	);
}
