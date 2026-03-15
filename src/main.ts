import { Notice, Plugin, TFile, normalizePath, Platform } from 'obsidian';
import { StenoSettings, DEFAULT_SETTINGS } from './types';
import { StenoSettingTab } from './settings';
import { RecordingController } from './recording-controller';
import { RecordingStatusBar } from './ui/recording-status-bar';
import { RecordingControlsModal } from './ui/recording-controls-modal';
import { PromptSelectorModal } from './ui/prompt-selector-modal';
import { AudioFileSelectorModal } from './ui/audio-file-selector-modal';

export default class StenoPlugin extends Plugin {
	settings: StenoSettings = DEFAULT_SETTINGS;
	private controller!: RecordingController;
	private statusBar!: RecordingStatusBar;
	private selfCreatedFiles: Set<string> = new Set();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.controller = new RecordingController(this.app, () => this.settings);
		this.statusBar = new RecordingStatusBar(this, this.controller.recorder);

		// Ribbon icon
		this.addRibbonIcon('microphone', 'Steno: Toggle recording', async () => {
			await this.toggleRecording();
		});

		// Commands
		this.addCommand({
			id: 'start-recording',
			name: 'Start recording',
			callback: async () => {
				if (!this.controller.isRecording) {
					await this.startRecording();
				}
			},
		});

		this.addCommand({
			id: 'stop-recording',
			name: 'Stop recording',
			callback: async () => {
				if (this.controller.isRecording) {
					await this.stopRecording();
				}
			},
		});

		this.addCommand({
			id: 'toggle-recording',
			name: 'Toggle recording',
			callback: async () => {
				await this.toggleRecording();
			},
		});

		this.addCommand({
			id: 'import-audio',
			name: 'Import audio file for transcription',
			callback: () => {
				this.importAudioFromVault();
			},
		});

		this.addCommand({
			id: 'select-prompt',
			name: 'Select processing prompt',
			callback: () => {
				new PromptSelectorModal(
					this.app,
					this.settings.processingPrompts,
					(prompt) => {
						this.settings.activePromptId = prompt.id;
						void this.saveSettings().then(() => {
							new Notice(`Steno: Active prompt set to "${prompt.name}"`);
						});
					}
				).open();
			},
		});

		// URI protocol handler for iOS Shortcuts
		this.registerObsidianProtocolHandler('steno', async (params) => {
			const action = params.action || 'toggle';

			if (params.prompt) {
				const found = this.settings.processingPrompts.find(
					(p) => p.name.toLowerCase() === decodeURIComponent(params.prompt).toLowerCase()
				);
				if (found) {
					this.settings.activePromptId = found.id;
					await this.saveSettings();
				}
			}

			switch (action) {
				case 'start':
					if (!this.controller.isRecording) {
						await this.startRecording();
					}
					break;
				case 'stop':
					if (this.controller.isRecording) {
						await this.stopRecording();
					}
					break;
				case 'toggle':
					await this.toggleRecording();
					break;
				case 'import':
					// For iOS Shortcut flow: audio saved to vault externally
					if (params.file) {
						const file = this.app.vault.getAbstractFileByPath(
							normalizePath(decodeURIComponent(params.file))
						);
						if (file instanceof TFile) {
							await this.controller.importAudio(file);
						} else {
							new Notice('Steno: Audio file not found in vault');
						}
					} else {
						this.importAudioFromVault();
					}
					break;
			}
		});

		// Settings tab
		this.addSettingTab(new StenoSettingTab(this.app, this));

		// Auto-import: watch for new audio files in the audio folder
		// Only on mobile — desktop receives files via iCloud sync and would duplicate work
		// Wait until vault is fully indexed to avoid triggering on existing files at startup
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on('create', (file) => {
					if (!(file instanceof TFile)) return;
					if (!Platform.isMobile) return;
					if (!this.settings.autoImport) return;
					if (this.controller.isRecording) return;

					// Skip files created by Steno's own recording
					if (this.selfCreatedFiles.has(file.path)) {
						this.selfCreatedFiles.delete(file.path);
						return;
					}

					const audioExtensions = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac'];
					if (!audioExtensions.includes(file.extension.toLowerCase())) return;

					const audioFolder = normalizePath(this.settings.audioFolder);
					if (!file.path.startsWith(audioFolder)) return;

					// Small delay to ensure file is fully synced
					window.setTimeout(() => {
						new Notice(`Steno: Auto-transcribing ${file.name}...`);
						void this.controller.importAudio(file);
					}, 2000);
				})
			);
		});

		// Handle app visibility change (iOS backgrounding)
		this.registerDomEvent(document, 'visibilitychange', () => {
			if (document.hidden && this.controller.isRecording) {
				new Notice('Steno: App is going to background — recording may stop. Consider using import for longer recordings.');
			}
		});
	}

	onunload(): void {
		if (this.controller.isRecording) {
			this.controller.recorder.abort();
			this.statusBar.hide();
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<StenoSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async toggleRecording(): Promise<void> {
		if (this.controller.isRecording) {
			await this.stopRecording();
		} else {
			await this.startRecording();
		}
	}

	private async startRecording(): Promise<void> {
		try {
			await this.controller.startRecording();
			this.statusBar.show();

			// Show controls modal on mobile for easy stopping
			if (Platform.isMobile) {
				new RecordingControlsModal(
					this.app,
					() => this.controller.recorder.elapsedSeconds,
					() => { void this.stopRecording(); }
				).open();
			}
		} catch (e) {
			new Notice(`Steno: Failed to start recording — ${e}`);
		}
	}

	private async stopRecording(): Promise<void> {
		this.statusBar.hide();
		try {
			await this.controller.stopRecording((filePath: string) => {
				this.selfCreatedFiles.add(filePath);
			});
		} catch (e) {
			new Notice(`Steno: Error during processing — ${e}`);
		}
	}

	private importAudioFromVault(): void {
		// Get all audio files in the vault
		const audioExtensions = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac'];
		const audioFiles = this.app.vault.getFiles().filter((f) =>
			audioExtensions.includes(f.extension.toLowerCase())
		);

		if (audioFiles.length === 0) {
			new Notice('Steno: No audio files found in vault');
			return;
		}

		// Sort by modification time, most recent first
		audioFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);

		new AudioFileSelectorModal(this.app, audioFiles, (file) => {
			void this.controller.importAudio(file);
		}).open();
	}
}
