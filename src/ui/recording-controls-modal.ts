import { App, Modal } from 'obsidian';

export class RecordingControlsModal extends Modal {
	private intervalId: number | null = null;
	private onStop: () => void;
	private getElapsed: () => number;

	constructor(app: App, getElapsed: () => number, onStop: () => void) {
		super(app);
		this.getElapsed = getElapsed;
		this.onStop = onStop;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('steno-recording-modal');

		contentEl.createEl('h2', { text: 'Recording' });

		const timerEl = contentEl.createEl('div', {
			cls: 'steno-timer',
			text: '0:00',
		});

		const stopBtn = contentEl.createEl('button', {
			text: 'Stop Recording',
			cls: 'steno-stop-button mod-cta',
		});
		stopBtn.addEventListener('click', () => {
			this.close();
			this.onStop();
		});

		this.intervalId = window.setInterval(() => {
			const seconds = this.getElapsed();
			const minutes = Math.floor(seconds / 60);
			const secs = seconds % 60;
			timerEl.setText(`${minutes}:${secs.toString().padStart(2, '0')}`);
		}, 1000);
	}

	onClose(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
		}
		this.contentEl.empty();
	}
}
