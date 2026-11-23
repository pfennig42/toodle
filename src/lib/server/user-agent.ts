/**
 * How toodle introduces itself to the services it uses (tiles, address search, routing). The OSM
 * tile usage policy asks for a way to reach whoever runs the app.
 */
import { ORIGIN } from '$app/env/private';
import { OPERATOR } from '../legal.js';

export const userAgent = (origin = ORIGIN, contact = OPERATOR.email) =>
	`toodle (+${origin}; ${contact})`;
