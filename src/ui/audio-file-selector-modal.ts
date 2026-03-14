import { App, SuggestModal, TFile } from 'obsidian';

export class AudioFileSelectorModal extends SuggestModal<TFile> {
	private onChooseFile: (file: TFile) => void;
	private files: TFile[];

	constructor(app: App, files: TFile[], onChoose: (file: TFile) => void) {
		super(app);
		this.files = files;
		this.onChooseFile = onChoose;
		this.setPlaceholder('Select an audio file to transcribe...');
	}

	getSuggestions(query: string): TFile[] {
		return this.files.filter((f) =>
			f.path.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createEl('div', { text: file.name });
		el.createEl('small', { text: file.path });
	}

	onChooseSuggestion(file: TFile): void {
		this.onChooseFile(file);
	}
}
