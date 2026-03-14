import { requestUrl } from 'obsidian';
import { LLMService } from '../types';

export class AnthropicProvider implements LLMService {
	constructor(
		private apiKey: string,
		private model: string
	) {}

	async process(transcript: string, prompt: string): Promise<string> {
		const response = await requestUrl({
			url: 'https://api.anthropic.com/v1/messages',
			method: 'POST',
			headers: {
				'x-api-key': this.apiKey,
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				model: this.model,
				max_tokens: 4096,
				system: prompt,
				messages: [{ role: 'user', content: transcript }],
			}),
		});

		return response.json.content[0].text;
	}
}
