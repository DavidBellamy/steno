import { App, Notice, TFile } from 'obsidian';
import { StenoSettings, DiarizedTranscript, TranscriptionService, LLMService } from './types';
import { Recorder } from './recorder';
import { AssemblyAIProvider } from './transcription/assemblyai-provider';
import { DeepgramProvider } from './transcription/deepgram-provider';
import { OpenAIProvider } from './llm/openai-provider';
import { AnthropicProvider } from './llm/anthropic-provider';
import { GeminiProvider } from './llm/gemini-provider';
import { OutputRouter } from './output-router';

export class RecordingController {
	recorder: Recorder;
	private outputRouter: OutputRouter;

	constructor(
		private app: App,
		private getSettings: () => StenoSettings
	) {
		this.recorder = new Recorder();
		this.outputRouter = new OutputRouter(app, getSettings());
	}

	get isRecording(): boolean {
		return this.recorder.isRecording;
	}

	async startRecording(): Promise<void> {
		await this.recorder.start();
		new Notice('Steno: Recording started');
	}

	async stopRecording(): Promise<void> {
		const settings = this.getSettings();
		const sourceFile = this.app.workspace.getActiveFile();

		new Notice('Steno: Stopping recording...');
		const { blob, mimeType } = await this.recorder.stop();
		const audioData = await blob.arrayBuffer();

		// Optionally save audio file
		if (settings.saveAudioFile) {
			await this.saveAudioFile(audioData, mimeType);
		}

		// Process pipeline
		await this.processPipeline(audioData, mimeType, sourceFile);
	}

	async importAudio(file: TFile): Promise<void> {
		const settings = this.getSettings();
		const sourceFile = this.app.workspace.getActiveFile();

		new Notice('Steno: Reading audio file...');
		const audioData = await this.app.vault.readBinary(file);
		const mimeType = this.guessMimeType(file.extension);

		await this.processPipeline(audioData, mimeType, sourceFile);
	}

	async importAudioFromBuffer(audioData: ArrayBuffer, mimeType: string): Promise<void> {
		const sourceFile = this.app.workspace.getActiveFile();
		await this.processPipeline(audioData, mimeType, sourceFile);
	}

	private async processPipeline(
		audioData: ArrayBuffer,
		mimeType: string,
		sourceFile: TFile | null
	): Promise<void> {
		const settings = this.getSettings();

		// Step 1: Transcribe
		new Notice('Steno: Transcribing audio (this may take a moment)...');
		const transcriptionService = this.getTranscriptionService(settings);
		let transcript: DiarizedTranscript;
		try {
			transcript = await transcriptionService.transcribe(audioData, mimeType);
		} catch (e) {
			new Notice(`Steno: Transcription failed — ${e}`);
			return;
		}

		const diarizedMarkdown = this.formatTranscript(transcript);

		// Step 2: LLM processing (if a prompt is configured)
		const activePrompt = settings.processingPrompts.find(
			(p) => p.id === settings.activePromptId
		);
		let llmOutput: string | null = null;
		let llmService: LLMService | null = null;

		if (activePrompt && activePrompt.prompt.trim()) {
			new Notice(`Steno: Processing with "${activePrompt.name}"...`);
			llmService = this.getLLMService(settings);
			try {
				llmOutput = await llmService.process(diarizedMarkdown, activePrompt.prompt);
			} catch (e) {
				new Notice(`Steno: LLM processing failed — ${e}. Saving raw transcript.`);
			}
		}

		// Step 3: Output
		new Notice('Steno: Saving output...');
		this.outputRouter = new OutputRouter(this.app, settings);
		try {
			const outputFile = await this.outputRouter.route(
				diarizedMarkdown,
				llmOutput,
				llmService,
				sourceFile
			);
			new Notice(`Steno: Done! Saved to ${outputFile.path}`);

			// Open the file if it's a new note
			if (settings.outputMode === 'new-note') {
				await this.app.workspace.openLinkText(outputFile.path, '', true);
			}
		} catch (e) {
			new Notice(`Steno: Failed to save output — ${e}`);
		}
	}

	private formatTranscript(transcript: DiarizedTranscript): string {
		return transcript.utterances
			.map((u) => `**${u.speaker}:** ${u.text}`)
			.join('\n\n');
	}

	private getTranscriptionService(settings: StenoSettings): TranscriptionService {
		switch (settings.transcriptionProvider) {
			case 'deepgram':
				return new DeepgramProvider(settings.deepgramApiKey);
			case 'assemblyai':
			default:
				return new AssemblyAIProvider(settings.assemblyaiApiKey);
		}
	}

	private getLLMService(settings: StenoSettings): LLMService {
		switch (settings.llmProvider) {
			case 'anthropic':
				return new AnthropicProvider(settings.anthropicApiKey, settings.anthropicModel);
			case 'gemini':
				return new GeminiProvider(settings.geminiApiKey, settings.geminiModel);
			case 'openai':
			default:
				return new OpenAIProvider(settings.openaiApiKey, settings.openaiModel);
		}
	}

	private async saveAudioFile(audioData: ArrayBuffer, mimeType: string): Promise<void> {
		const settings = this.getSettings();
		const ext = this.recorder.getFileExtension(mimeType);
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const folder = settings.audioFolder;

		// Ensure folder exists
		const existing = this.app.vault.getAbstractFileByPath(folder);
		if (!existing) {
			await this.app.vault.createFolder(folder);
		}

		const filePath = `${folder}/recording-${timestamp}.${ext}`;
		await this.app.vault.createBinary(filePath, audioData);
	}

	private guessMimeType(ext: string): string {
		const map: Record<string, string> = {
			mp3: 'audio/mpeg',
			mp4: 'audio/mp4',
			m4a: 'audio/mp4',
			wav: 'audio/wav',
			webm: 'audio/webm',
			ogg: 'audio/ogg',
			flac: 'audio/flac',
		};
		return map[ext.toLowerCase()] || 'audio/mpeg';
	}
}
