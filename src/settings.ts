import { App, Modal, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';
import { StenoSettings, ProcessingPrompt } from './types';
import StenoPlugin from './main';

export class StenoSettingTab extends PluginSettingTab {
	plugin: StenoPlugin;

	constructor(app: App, plugin: StenoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- Transcription ---
		containerEl.createEl('h2', { text: 'Transcription' });

		new Setting(containerEl)
			.setName('Provider')
			.setDesc('Service used for diarized transcription')
			.addDropdown((dd) =>
				dd
					.addOption('assemblyai', 'AssemblyAI')
					.addOption('deepgram', 'Deepgram')
					.setValue(this.plugin.settings.transcriptionProvider)
					.onChange(async (v) => {
						this.plugin.settings.transcriptionProvider = v as 'assemblyai' | 'deepgram';
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.transcriptionProvider === 'assemblyai') {
			new Setting(containerEl)
				.setName('AssemblyAI API key')
				.addText((text) =>
					text
						.setPlaceholder('Enter API key')
						.setValue(this.plugin.settings.assemblyaiApiKey)
						.onChange(async (v) => {
							this.plugin.settings.assemblyaiApiKey = v;
							await this.plugin.saveSettings();
						})
				)
				.then((s) => s.controlEl.querySelector('input')?.setAttribute('type', 'password'));
		} else {
			new Setting(containerEl)
				.setName('Deepgram API key')
				.addText((text) =>
					text
						.setPlaceholder('Enter API key')
						.setValue(this.plugin.settings.deepgramApiKey)
						.onChange(async (v) => {
							this.plugin.settings.deepgramApiKey = v;
							await this.plugin.saveSettings();
						})
				)
				.then((s) => s.controlEl.querySelector('input')?.setAttribute('type', 'password'));
		}

		// --- LLM ---
		containerEl.createEl('h2', { text: 'LLM Post-Processing' });

		new Setting(containerEl)
			.setName('Provider')
			.setDesc('LLM used to process transcripts')
			.addDropdown((dd) =>
				dd
					.addOption('openai', 'OpenAI')
					.addOption('anthropic', 'Anthropic')
					.addOption('gemini', 'Google Gemini')
					.setValue(this.plugin.settings.llmProvider)
					.onChange(async (v) => {
						this.plugin.settings.llmProvider = v as 'openai' | 'anthropic' | 'gemini';
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.llmProvider === 'openai') {
			new Setting(containerEl)
				.setName('OpenAI API key')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.openaiApiKey)
						.setPlaceholder('sk-...')
						.onChange(async (v) => {
							this.plugin.settings.openaiApiKey = v;
							await this.plugin.saveSettings();
						})
				)
				.then((s) => s.controlEl.querySelector('input')?.setAttribute('type', 'password'));

			new Setting(containerEl)
				.setName('Model')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.openaiModel)
						.onChange(async (v) => {
							this.plugin.settings.openaiModel = v;
							await this.plugin.saveSettings();
						})
				);
		} else if (this.plugin.settings.llmProvider === 'anthropic') {
			new Setting(containerEl)
				.setName('Anthropic API key')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.anthropicApiKey)
						.setPlaceholder('sk-ant-...')
						.onChange(async (v) => {
							this.plugin.settings.anthropicApiKey = v;
							await this.plugin.saveSettings();
						})
				)
				.then((s) => s.controlEl.querySelector('input')?.setAttribute('type', 'password'));

			new Setting(containerEl)
				.setName('Model')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.anthropicModel)
						.onChange(async (v) => {
							this.plugin.settings.anthropicModel = v;
							await this.plugin.saveSettings();
						})
				);
		} else {
			new Setting(containerEl)
				.setName('Gemini API key')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.geminiApiKey)
						.setPlaceholder('AI...')
						.onChange(async (v) => {
							this.plugin.settings.geminiApiKey = v;
							await this.plugin.saveSettings();
						})
				)
				.then((s) => s.controlEl.querySelector('input')?.setAttribute('type', 'password'));

			new Setting(containerEl)
				.setName('Model')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.geminiModel)
						.onChange(async (v) => {
							this.plugin.settings.geminiModel = v;
							await this.plugin.saveSettings();
						})
				);
		}

		// --- Processing Prompts ---
		containerEl.createEl('h2', { text: 'Processing Prompts' });

		new Setting(containerEl)
			.setName('Active prompt')
			.setDesc('Which prompt to run on transcripts')
			.addDropdown((dd) => {
				for (const p of this.plugin.settings.processingPrompts) {
					dd.addOption(p.id, p.name);
				}
				dd.setValue(this.plugin.settings.activePromptId);
				dd.onChange(async (v) => {
					this.plugin.settings.activePromptId = v;
					await this.plugin.saveSettings();
				});
			});

		for (const prompt of this.plugin.settings.processingPrompts) {
			const s = new Setting(containerEl)
				.setName(prompt.name)
				.setDesc(prompt.prompt ? prompt.prompt.substring(0, 60) + '...' : '(no LLM processing)');

			s.addButton((btn) =>
				btn.setButtonText('Edit').onClick(() => {
					new EditPromptModal(this.app, prompt, async (updated) => {
						const idx = this.plugin.settings.processingPrompts.findIndex(
							(p) => p.id === prompt.id
						);
						if (idx >= 0) {
							this.plugin.settings.processingPrompts[idx] = updated;
							await this.plugin.saveSettings();
							this.display();
						}
					}).open();
				})
			);

			// Don't allow deleting default prompts if they're the last ones
			if (!prompt.id.startsWith('default-')) {
				s.addButton((btn) =>
					btn
						.setButtonText('Delete')
						.setWarning()
						.onClick(async () => {
							this.plugin.settings.processingPrompts =
								this.plugin.settings.processingPrompts.filter((p) => p.id !== prompt.id);
							if (this.plugin.settings.activePromptId === prompt.id) {
								this.plugin.settings.activePromptId =
									this.plugin.settings.processingPrompts[0]?.id || '';
							}
							await this.plugin.saveSettings();
							this.display();
						})
				);
			}
		}

		new Setting(containerEl).addButton((btn) =>
			btn.setButtonText('Add Prompt').setCta().onClick(() => {
				const newPrompt: ProcessingPrompt = {
					id: crypto.randomUUID(),
					name: 'New Prompt',
					prompt: '',
				};
				new EditPromptModal(this.app, newPrompt, async (updated) => {
					this.plugin.settings.processingPrompts.push(updated);
					await this.plugin.saveSettings();
					this.display();
				}).open();
			})
		);

		// --- Output ---
		containerEl.createEl('h2', { text: 'Output' });

		new Setting(containerEl)
			.setName('Output mode')
			.setDesc('Where to save the processed transcript')
			.addDropdown((dd) =>
				dd
					.addOption('current-note', 'Append to current note')
					.addOption('new-note', 'Create new note')
					.setValue(this.plugin.settings.outputMode)
					.onChange(async (v) => {
						this.plugin.settings.outputMode = v as 'current-note' | 'new-note';
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.outputMode === 'new-note') {
			new Setting(containerEl)
				.setName('Output folder')
				.setDesc('Folder for new transcript notes')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.outputFolder)
						.setPlaceholder('Steno')
						.onChange(async (v) => {
							this.plugin.settings.outputFolder = v;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Note title')
				.addDropdown((dd) =>
					dd
						.addOption('datetime', 'Date/time')
						.addOption('llm-generated', 'LLM-generated title')
						.setValue(this.plugin.settings.noteTitleMode)
						.onChange(async (v) => {
							this.plugin.settings.noteTitleMode = v as 'datetime' | 'llm-generated';
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName('Date format')
				.setDesc('Used for datetime titles')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.noteTitleDateFormat)
						.setPlaceholder('YYYY-MM-DD HH-mm')
						.onChange(async (v) => {
							this.plugin.settings.noteTitleDateFormat = v;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName('Include raw transcript')
			.setDesc('Append the raw diarized transcript below LLM output')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeRawTranscript).onChange(async (v) => {
					this.plugin.settings.includeRawTranscript = v;
					await this.plugin.saveSettings();
				})
			);

		// --- Audio ---
		containerEl.createEl('h2', { text: 'Audio' });

		new Setting(containerEl)
			.setName('Save audio files')
			.setDesc('Keep recorded audio files in the vault')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.saveAudioFile).onChange(async (v) => {
					this.plugin.settings.saveAudioFile = v;
					await this.plugin.saveSettings();
					this.display();
				})
			);

		if (this.plugin.settings.saveAudioFile) {
			new Setting(containerEl)
				.setName('Audio folder')
				.addText((text) =>
					text
						.setValue(this.plugin.settings.audioFolder)
						.setPlaceholder('Steno/audio')
						.onChange(async (v) => {
							this.plugin.settings.audioFolder = v;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}

class EditPromptModal extends Modal {
	private prompt: ProcessingPrompt;
	private onSave: (prompt: ProcessingPrompt) => void;

	constructor(app: App, prompt: ProcessingPrompt, onSave: (prompt: ProcessingPrompt) => void) {
		super(app);
		this.prompt = { ...prompt };
		this.onSave = onSave;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Edit Processing Prompt' });

		new Setting(contentEl).setName('Name').addText((text) =>
			text.setValue(this.prompt.name).onChange((v) => {
				this.prompt.name = v;
			})
		);

		contentEl.createEl('label', { text: 'Prompt', cls: 'setting-item-name' });
		const textArea = new TextAreaComponent(contentEl);
		textArea.setValue(this.prompt.prompt);
		textArea.setPlaceholder('Leave empty for raw transcript (no LLM processing)');
		textArea.onChange((v) => {
			this.prompt.prompt = v;
		});
		textArea.inputEl.rows = 8;
		textArea.inputEl.style.width = '100%';

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText('Save')
				.setCta()
				.onClick(() => {
					this.onSave(this.prompt);
					this.close();
				})
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
