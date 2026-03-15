import { requestUrl } from 'obsidian';
import { TranscriptionService, DiarizedTranscript } from '../types';

const BASE_URL = 'https://api.assemblyai.com/v2';

interface AssemblyAIUploadResponse {
	upload_url: string;
}

interface AssemblyAIUtterance {
	speaker: string;
	text: string;
	start: number;
	end: number;
}

interface AssemblyAITranscriptResponse {
	id: string;
	status: string;
	error?: string;
	utterances?: AssemblyAIUtterance[];
}

export class AssemblyAIProvider implements TranscriptionService {
	constructor(
		private apiKey: string,
		private speakersExpected: number = 0
	) {}

	async transcribe(audioData: ArrayBuffer, mimeType: string): Promise<DiarizedTranscript> {
		// Step 1: Upload audio
		const audioUrl = await this.uploadAudio(audioData);

		// Step 2: Create transcript with speaker diarization
		const transcriptRes = await requestUrl({
			url: `${BASE_URL}/transcript`,
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				audio_url: audioUrl,
				speaker_labels: true,
				speech_models: ['universal-3-pro'],
				...(this.speakersExpected > 0 && { speakers_expected: this.speakersExpected }),
			}),
		});
		const transcriptJson: AssemblyAITranscriptResponse = transcriptRes.json;
		const transcriptId = transcriptJson.id;

		// Step 3: Poll for completion
		let result: AssemblyAITranscriptResponse = transcriptJson;
		while (result.status !== 'completed' && result.status !== 'error') {
			await this.sleep(3000);
			const pollRes = await requestUrl({
				url: `${BASE_URL}/transcript/${transcriptId}`,
				method: 'GET',
				headers: {
					authorization: this.apiKey,
				},
			});
			result = pollRes.json;
		}

		if (result.status === 'error') {
			throw new Error(`Transcription failed: ${result.error}`);
		}

		// Step 4: Parse utterances
		const utterances = (result.utterances || []).map((u: AssemblyAIUtterance) => ({
			speaker: `Speaker ${u.speaker}`,
			text: u.text,
			start: u.start,
			end: u.end,
		}));

		return { utterances };
	}

	private async uploadAudio(audioData: ArrayBuffer): Promise<string> {
		const res = await requestUrl({
			url: `${BASE_URL}/upload`,
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/octet-stream',
			},
			body: audioData,
		});
		const json: AssemblyAIUploadResponse = res.json;
		if (!json.upload_url) {
			throw new Error(`Upload response missing upload_url`);
		}
		return json.upload_url;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
