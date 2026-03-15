import { App, SuggestModal } from 'obsidian';
import { ProcessingPrompt } from '../types';

export class PromptSelectorModal extends SuggestModal<ProcessingPrompt> {
	private onChoose: (prompt: ProcessingPrompt) => void;
	private prompts: ProcessingPrompt[];

	constructor(app: App, prompts: ProcessingPrompt[], onChoose: (prompt: ProcessingPrompt) => void) {
		super(app);
		this.prompts = prompts;
		this.onChoose = onChoose;
		this.setPlaceholder('Select a processing prompt...');
	}

	getSuggestions(query: string): ProcessingPrompt[] {
		return this.prompts.filter((p) =>
			p.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(prompt: ProcessingPrompt, el: HTMLElement): void {
		el.createEl('div', { text: prompt.name });
		if (prompt.prompt) {
			el.createEl('small', {
				text: prompt.prompt.substring(0, 80) + (prompt.prompt.length > 80 ? '...' : ''),
			});
		} else {
			el.createEl('small', { text: '(No LLM processing)' });
		}
	}

	onChooseSuggestion(prompt: ProcessingPrompt): void {
		this.onChoose(prompt);
	}
}
