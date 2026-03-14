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
	constructor(private apiKey: string) {}

	async transcribe(audioData: ArrayBuffer, mimeType: string): Promise<DiarizedTranscript> {
		// Step 1: Upload audio
		const uploadRes = await fetch(`${BASE_URL}/upload`, {
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/octet-stream',
			},
			body: audioData,
		});
		if (!uploadRes.ok) {
			const errText = await uploadRes.text();
			throw new Error(`Upload failed (${uploadRes.status}): ${errText}`);
		}
		const uploadJson: AssemblyAIUploadResponse = await uploadRes.json();
		const audioUrl = uploadJson.upload_url;

		// Step 2: Create transcript with speaker diarization
		const transcriptRes = await fetch(`${BASE_URL}/transcript`, {
			method: 'POST',
			headers: {
				authorization: this.apiKey,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				audio_url: audioUrl,
				speaker_labels: true,
				speech_models: ['universal-3-pro'],
			}),
		});
		if (!transcriptRes.ok) {
			const errText = await transcriptRes.text();
			throw new Error(`Transcript creation failed (${transcriptRes.status}): ${errText}`);
		}
		const transcriptJson: AssemblyAITranscriptResponse = await transcriptRes.json();
		const transcriptId = transcriptJson.id;

		// Step 3: Poll for completion
		let result: AssemblyAITranscriptResponse = transcriptJson;
		while (result.status !== 'completed' && result.status !== 'error') {
			await this.sleep(3000);
			const pollRes = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
				method: 'GET',
				headers: {
					authorization: this.apiKey,
				},
			});
			if (!pollRes.ok) {
				const errText = await pollRes.text();
				throw new Error(`Poll failed (${pollRes.status}): ${errText}`);
			}
			result = await pollRes.json();
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

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
