export class Recorder {
	private mediaRecorder: MediaRecorder | null = null;
	private chunks: Blob[] = [];
	private stream: MediaStream | null = null;
	private startTime: number = 0;
	private _isRecording: boolean = false;

	get isRecording(): boolean {
		return this._isRecording;
	}

	get elapsedSeconds(): number {
		if (!this._isRecording) return 0;
		return Math.floor((Date.now() - this.startTime) / 1000);
	}

	getSupportedMimeType(): string {
		// iOS WebView supports mp4/aac, desktop Electron supports webm/opus
		const types = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/mp4',
			'audio/aac',
			'audio/ogg;codecs=opus',
		];
		for (const type of types) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}
		return 'audio/webm'; // fallback
	}

	getFileExtension(mimeType: string): string {
		if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'mp4';
		if (mimeType.includes('ogg')) return 'ogg';
		return 'webm';
	}

	async start(): Promise<void> {
		if (this._isRecording) {
			throw new Error('Already recording');
		}

		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const mimeType = this.getSupportedMimeType();

		this.chunks = [];
		this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

		this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0) {
				this.chunks.push(e.data);
			}
		};

		// Collect data every 1 second for progressive saving
		this.mediaRecorder.start(1000);
		this.startTime = Date.now();
		this._isRecording = true;
	}

	async stop(): Promise<{ blob: Blob; mimeType: string }> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder || !this._isRecording) {
				reject(new Error('Not recording'));
				return;
			}

			const mimeType = this.mediaRecorder.mimeType;

			this.mediaRecorder.onstop = () => {
				const blob = new Blob(this.chunks, { type: mimeType });
				this.cleanup();
				resolve({ blob, mimeType });
			};

			this.mediaRecorder.onerror = (e) => {
				this.cleanup();
				reject(new Error(`Recording error: ${e}`));
			};

			this.mediaRecorder.stop();
		});
	}

	abort(): void {
		if (this.mediaRecorder && this._isRecording) {
			this.mediaRecorder.stop();
		}
		this.cleanup();
	}

	private cleanup(): void {
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}
		this.mediaRecorder = null;
		this.chunks = [];
		this._isRecording = false;
	}
}
