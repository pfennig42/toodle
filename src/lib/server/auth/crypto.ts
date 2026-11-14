import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions) {
	return new Promise<Buffer>((resolve, reject) =>
		scrypt(password.normalize('NFKC'), salt, keylen, options, (err, key) =>
			err ? reject(err) : resolve(key)
		)
	);
}

/** Random URL-safe token (256 bit). */
export function generateToken(): string {
	return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

/** Format: scrypt$N$r$p$salt$hash (base64url) */
export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const { N, r, p, keylen, maxmem } = SCRYPT;
	const key = await scryptAsync(password, salt, keylen, { N, r, p, maxmem });
	return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [algo, n, r, p, salt, hash] = stored.split('$');
	if (algo !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64url');
	const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {
		N: Number(n),
		r: Number(r),
		p: Number(p),
		maxmem: SCRYPT.maxmem
	});
	return timingSafeEqual(key, expected);
}

/** Hash used to keep login timing constant when the user has no password. */
export const DUMMY_HASH =
	'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + Buffer.alloc(64).toString('base64url');
