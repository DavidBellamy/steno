import { requestUrl } from 'obsidian';
import { TranscriptionService, DiarizedTranscript } from '../types';

const BASE_URL = 'https://api.assemblyai.com/v2';

export class AssemblyAIProvider implements TranscriptionService {
	constructor(private apiKey: string) {}

	async transcribe(audioData: ArrayBuffer, mimeType: string): Promise<DiarizedTranscript> {
		// Step 1: Upload audio
		const uploadResponse = await requestUrl({
			url: `${BASE_URL}/upload`,
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/octet-stream',
			},
			body: audioData,
		});
		const audioUrl = uploadResponse.json.upload_url;

		// Step 2: Create transcript with speaker diarization
		const transcriptResponse = await requestUrl({
			url: `${BASE_URL}/transcript`,
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				audio_url: audioUrl,
				speaker_labels: true,
			}),
		});
		const transcriptId = transcriptResponse.json.id;

		// Step 3: Poll for completion
		let result = transcriptResponse.json;
		while (result.status !== 'completed' && result.status !== 'error') {
			await this.sleep(3000);
			const pollResponse = await requestUrl({
				url: `${BASE_URL}/transcript/${transcriptId}`,
				method: 'GET',
				headers: {
					authorization: this.apiKey,
				},
			});
			result = pollResponse.json;
		}

		if (result.status === 'error') {
			throw new Error(`Transcription failed: ${result.error}`);
		}

		// Step 4: Parse utterances
		const utterances = (result.utterances || []).map((u: { speaker: string; text: string; start: number; end: number }) => ({
			speaker: `Speaker ${u.speaker}`,
			text: u.text,
			start: u.start,
			end: u.end,
		}));

		return { utterances };
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
