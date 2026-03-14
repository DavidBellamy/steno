import { requestUrl } from 'obsidian';
import { LLMService } from '../types';

export class GeminiProvider implements LLMService {
	constructor(
		private apiKey: string,
		private model: string
	) {}

	async process(transcript: string, prompt: string): Promise<string> {
		const response = await requestUrl({
			url: `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				systemInstruction: {
					parts: [{ text: prompt }],
				},
				contents: [
					{
						parts: [{ text: transcript }],
					},
				],
			}),
		});

		return response.json.candidates[0].content.parts[0].text;
	}
}
