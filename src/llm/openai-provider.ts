import { requestUrl } from 'obsidian';
import { LLMService } from '../types';

export class OpenAIProvider implements LLMService {
	constructor(
		private apiKey: string,
		private model: string
	) {}

	async process(transcript: string, prompt: string): Promise<string> {
		const response = await requestUrl({
			url: 'https://api.openai.com/v1/chat/completions',
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: this.model,
				messages: [
					{ role: 'system', content: prompt },
					{ role: 'user', content: transcript },
				],
			}),
		});

		return response.json.choices[0].message.content;
	}
}
