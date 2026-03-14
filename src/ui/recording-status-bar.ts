import { Plugin } from 'obsidian';
import { Recorder } from '../recorder';

export class RecordingStatusBar {
	private statusBarItem: HTMLElement | null = null;
	private intervalId: number | null = null;

	constructor(
		private plugin: Plugin,
		private recorder: Recorder
	) {}

	show(): void {
		if (this.statusBarItem) return;

		this.statusBarItem = this.plugin.addStatusBarItem();
		this.statusBarItem.addClass('steno-status-bar');
		this.update();

		this.intervalId = window.setInterval(() => this.update(), 1000);
		this.plugin.registerInterval(this.intervalId);
	}

	hide(): void {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId);
			this.intervalId = null;
		}
		if (this.statusBarItem) {
			this.statusBarItem.remove();
			this.statusBarItem = null;
		}
	}

	private update(): void {
		if (!this.statusBarItem) return;
		const seconds = this.recorder.elapsedSeconds;
		const minutes = Math.floor(seconds / 60);
		const secs = seconds % 60;
		const time = `${minutes}:${secs.toString().padStart(2, '0')}`;
		this.statusBarItem.empty();
		this.statusBarItem.createSpan({ cls: 'steno-recording-dot' });
		this.statusBarItem.appendText(` Recording ${time}`);
	}
}
