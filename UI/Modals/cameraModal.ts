import { App, Modal, Notice } from "obsidian";

export class ScannerModal extends Modal {
	stream: MediaStream;
	videoElement: HTMLElement;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.setTitle("Scan Your Note");
	}

	async onOpen() {
		// Create video element
		this.videoElement = this.contentEl.createEl("video");
		// Get User Media
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
		} catch (error) {
			new Notice(`Something Went Wrong.\nError: ${error.message}`);
			return;
		}
		// Get the Stream
		// Set video srcObject to that media
	}

	async onClose() {
		// Close steam's each track
		if (!this.stream) return;
		const tracks = this.stream.getTracks();
		tracks.forEach((track) => {
			track.stop();
		});
		this.close();
	}
}
