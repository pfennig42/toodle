/**
 * CSV for spreadsheets. Semicolon-separated with UTF-8 BOM, which is what Excel and
 * LibreOffice in German locales open correctly without an import dialog.
 */

/**
 * Cells starting with = + - @ (or tab/CR) are interpreted as formulas by spreadsheet apps
 * ("CSV injection"). Those get a leading apostrophe – except plain numbers such as phone
 * numbers ("+49 170 …") or negative values, which are harmless.
 */
export function safeCell(value: string): string {
	if (/^[=@\t\r]/.test(value)) return `'${value}`;
	if (/^[+-]/.test(value) && !/^[+-][\d\s()./-]*$/.test(value)) return `'${value}`;
	return value;
}

function quote(value: string): string {
	const v = safeCell(value);
	return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(rows: string[][]): string {
	return '\uFEFF' + rows.map((r) => r.map(quote).join(';')).join('\r\n') + '\r\n';
}

/** "Sommerfreizeit 2027!" → "sommerfreizeit-2027" */
export function fileSlug(title: string): string {
	return (
		title
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/ß/g, 'ss')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'export'
	);
}
