import { App, TFile, normalizePath } from 'obsidian';
import { StenoSettings, LLMService } from './types';
import { formatDateTime } from './utils/datetime';

export class OutputRouter {
	constructor(
		private app: App,
		private settings: StenoSettings
	) {}

	async route(
		diarizedMarkdown: string,
		llmOutput: string | null,
		llmService: LLMService | null,
		sourceFile: TFile | null
	): Promise<TFile> {
		const content = this.buildContent(diarizedMarkdown, llmOutput);

		if (this.settings.outputMode === 'current-note' && sourceFile) {
			await this.app.vault.process(sourceFile, (data) => {
				return data + '\n\n' + content;
			});
			return sourceFile;
		}

		// New note mode
		const title = await this.generateTitle(llmOutput || diarizedMarkdown, llmService);
		const folder = normalizePath(this.settings.outputFolder);

		// Ensure folder exists
		await this.ensureFolder(folder);

		const filePath = normalizePath(`${folder}/${title}.md`);
		const file = await this.app.vault.create(filePath, content);
		return file;
	}

	private buildContent(diarizedMarkdown: string, llmOutput: string | null): string {
		const parts: string[] = [];

		if (llmOutput) {
			parts.push(llmOutput);
			if (this.settings.includeRawTranscript) {
				parts.push('\n\n---\n\n## Raw Transcript\n\n' + diarizedMarkdown);
			}
		} else {
			parts.push(diarizedMarkdown);
		}

		return parts.join('');
	}

	private async generateTitle(
		content: string,
		llmService: LLMService | null
	): Promise<string> {
		if (this.settings.noteTitleMode === 'llm-generated' && llmService) {
			try {
				const title = await llmService.process(
					content.substring(0, 2000),
					'Generate a short, descriptive title (max 8 words) for this transcript. Return ONLY the title, no quotes or punctuation.'
				);
				// Sanitize for filename
				return title.trim().replace(/[\\/:*?"<>|]/g, '-').substring(0, 100);
			} catch {
				// Fall through to datetime
			}
		}
		return formatDateTime(new Date(), this.settings.noteTitleDateFormat);
	}

	private async ensureFolder(folderPath: string): Promise<void> {
		const normalized = normalizePath(folderPath);
		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (!existing) {
			await this.app.vault.createFolder(normalized);
		}
	}
}
