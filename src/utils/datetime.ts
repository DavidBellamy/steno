export function formatDateTime(date: Date, format: string): string {
	const pad = (n: number) => n.toString().padStart(2, '0');

	const replacements: Record<string, string> = {
		'YYYY': date.getFullYear().toString(),
		'MM': pad(date.getMonth() + 1),
		'DD': pad(date.getDate()),
		'HH': pad(date.getHours()),
		'mm': pad(date.getMinutes()),
		'ss': pad(date.getSeconds()),
	};

	let result = format;
	for (const [token, value] of Object.entries(replacements)) {
		result = result.replace(token, value);
	}
	return result;
}
