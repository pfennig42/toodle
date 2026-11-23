/**
 * Push services of the common browsers. The server sends requests to the endpoint a browser
 * hands in – limiting it to these hosts keeps the server from being used to reach other hosts.
 */
const PUSH_HOST_SUFFIXES = [
	'.googleapis.com', // Chrome, Edge (FCM), most Android browsers
	'.mozilla.com', // Firefox
	'.push.apple.com', // Safari / iOS
	'.notify.windows.com' // legacy Edge
];

export function isAllowedEndpoint(endpoint: string): boolean {
	let url: URL;
	try {
		url = new URL(endpoint);
	} catch {
		return false;
	}
	if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
	const host = url.hostname.toLowerCase();
	return PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s));
}
