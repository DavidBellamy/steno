export interface ProcessingPrompt {
	id: string;
	name: string;
	prompt: string;
}

export interface StenoSettings {
	// Transcription
	transcriptionProvider: 'assemblyai' | 'deepgram';
	assemblyaiApiKey: string;
	deepgramApiKey: string;

	// LLM
	llmProvider: 'openai' | 'anthropic' | 'gemini';
	openaiApiKey: string;
	openaiModel: string;
	anthropicApiKey: string;
	anthropicModel: string;
	geminiApiKey: string;
	geminiModel: string;

	// Processing Prompts
	processingPrompts: ProcessingPrompt[];
	activePromptId: string;

	// Output
	outputMode: 'current-note' | 'new-note';
	outputFolder: string;
	noteTitleMode: 'datetime' | 'llm-generated';
	noteTitleDateFormat: string;
	includeRawTranscript: boolean;

	// Diarization
	speakersExpected: number;

	// Audio
	saveAudioFile: boolean;
	audioFolder: string;
}

export const DEFAULT_SETTINGS: StenoSettings = {
	transcriptionProvider: 'assemblyai',
	assemblyaiApiKey: '',
	deepgramApiKey: '',

	llmProvider: 'openai',
	openaiApiKey: '',
	openaiModel: 'gpt-4o',
	anthropicApiKey: '',
	anthropicModel: 'claude-sonnet-4-20250514',
	geminiApiKey: '',
	geminiModel: 'gemini-2.5-flash',

	processingPrompts: [
		{
			id: 'default-meeting-notes',
			name: 'Meeting Notes',
			prompt: 'You are given a diarized transcript of a meeting with speakers labeled. Extract and format:\n\n1. **Attendees** — list the speakers\n2. **Key Discussion Points** — summarize the main topics\n3. **Decisions Made** — any conclusions or agreements\n4. **Action Items** — who is responsible for what\n\nKeep it concise and well-structured in Markdown.',
		},
		{
			id: 'default-summary',
			name: 'Summary',
			prompt: 'You are given a diarized transcript with speakers labeled. Write a concise summary of the conversation in 2-4 paragraphs. Mention who said what when relevant.',
		},
		{
			id: 'default-raw',
			name: 'Raw Transcript (no LLM)',
			prompt: '',
		},
	],
	activePromptId: 'default-meeting-notes',

	outputMode: 'new-note',
	outputFolder: 'Steno',
	noteTitleMode: 'datetime',
	noteTitleDateFormat: 'YYYY-MM-DD HH-mm',
	includeRawTranscript: true,

	speakersExpected: 0,

	saveAudioFile: true,
	audioFolder: 'Steno/audio',
};

export interface Utterance {
	speaker: string;
	text: string;
	start: number;
	end: number;
}

export interface DiarizedTranscript {
	utterances: Utterance[];
}

export interface TranscriptionService {
	transcribe(audioData: ArrayBuffer, mimeType: string): Promise<DiarizedTranscript>;
}

export interface LLMService {
	process(transcript: string, prompt: string): Promise<string>;
}
