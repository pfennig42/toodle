export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'toodle-theme';

export function parseTheme(value: string | undefined | null): Theme {
	return THEMES.includes(value as Theme) ? (value as Theme) : 'system';
}

export function nextTheme(current: Theme): Theme {
	return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}
