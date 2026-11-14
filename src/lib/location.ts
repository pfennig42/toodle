/** Address for display – without the venue name if the geocoder already put it in front. */
export function addressWithoutName(name: string, address: string | null): string | null {
	if (!address) return null;
	const n = name.trim();
	if (n && address.toLowerCase().startsWith(n.toLowerCase())) {
		return address.slice(n.length).replace(/^[\s,·-]+/, '') || null;
	}
	return address;
}
