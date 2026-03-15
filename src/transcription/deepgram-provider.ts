import { requestUrl } from 'obsidian';
import { TranscriptionService, DiarizedTranscript } from '../types';

export class DeepgramProvider implements TranscriptionService {
	constructor(private apiKey: string) {}

	async transcribe(audioData: ArrayBuffer, mimeType: string): Promise<DiarizedTranscript> {
		const response = await requestUrl({
			url: 'https://api.deepgram.com/v1/listen?diarize=true&punctuate=true&utterances=true',
			method: 'POST',
			headers: {
				Authorization: `Token ${this.apiKey}`,
				'Content-Type': mimeType,
			},
			body: audioData,
		});

		interface DeepgramUtterance {
			speaker: number;
			transcript: string;
			start: number;
			end: number;
		}
		interface DeepgramResponse {
			results?: { utterances?: DeepgramUtterance[] };
		}
		const result = response.json as DeepgramResponse;
		const utterances = (result.results?.utterances ?? []).map((u) => ({
			speaker: `Speaker ${u.speaker}`,
			text: u.transcript,
			start: Math.round(u.start * 1000),
			end: Math.round(u.end * 1000),
		}));

		return { utterances };
	}
}
