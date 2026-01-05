import { App, ButtonComponent, Modal, Notice } from "obsidian";
import { uploadImageToCanvas } from "Services/ImageUpload";
import { ImagePreview } from "UI/Components/ImagePreview";

export class ScannerModal extends Modal {
	private container: HTMLElement;
	private buttonWrapper: HTMLElement;
	private confirmButtonWrapper: HTMLElement;
	private canvas: ImagePreview;
	private btnPhotoUpload: ButtonComponent;
	private btnPhotoRotateCW: ButtonComponent;
	private btnPhotoRotateACW: ButtonComponent;
	private btnCrop: ButtonComponent;
	private btnConfirm: ButtonComponent;
	private btnCancel: ButtonComponent;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.modalEl.addClass("scanner-modal");

		this.container = this.contentEl.createDiv("scanner-modal-container");
		this.canvas = new ImagePreview(
			this.container,
			this.container.createEl("canvas"),
			4 / 3,
		);

		this.buttonWrapper = this.contentEl.createDiv("button-wrapper");
		this.confirmButtonWrapper = this.contentEl.createDiv(
			"confirm-button-wrapper",
		);
		this.confirmButtonWrapper.hide();
	}

	async onOpen() {
		try {
			this.canvas.setup();
		} catch (error) {
			console.log(`Error: ${error.message}`);
			new Notice(
				"Cannot Create Image Preview Canvas\nPlease review details in Console",
			);
		}

		//btn setup
		this.btnPhotoUpload = new ButtonComponent(this.buttonWrapper)
			.setIcon("image")
			.setTooltip("Upload image from gallery")
			.setCta()
			.onClick(() =>
				uploadImageToCanvas(this.canvas.darawImage.bind(this.canvas)),
			);

		this.btnPhotoRotateCW = new ButtonComponent(this.buttonWrapper)
			.setIcon("rotate-cw")
			.setTooltip("Rotate image 90° clockwise")
			.onClick(() => this.canvas.rotate(90));
		this.btnPhotoRotateACW = new ButtonComponent(this.buttonWrapper)
			.setIcon("rotate-ccw")
			.setTooltip("Rotate image 90° counter-clockwise")
			.onClick(() => this.canvas.rotate(-90));

		this.btnCrop = new ButtonComponent(this.buttonWrapper)
			.setIcon("crop")
			.setTooltip("Crop image")
			.onClick(() => this.toggleCropMode());

		// Confirmation buttons
		this.btnConfirm = new ButtonComponent(this.confirmButtonWrapper)
			.setIcon("check")
			.setTooltip("Confirm")
			.setCta()
			.onClick(() => this.confirmCrop());

		this.btnCancel = new ButtonComponent(this.confirmButtonWrapper)
			.setIcon("x")
			.setTooltip("Cancel")
			.onClick(() => this.cancelCrop());
	}

	private toggleCropMode() {
		const { state, message } = this.canvas.toggleCroppingPoints(true);
		new Notice(message);
		if (!state) {
			return;
		}
		this.buttonWrapper.hide();
		this.confirmButtonWrapper.show();
	}

	private confirmCrop() {
		// TEMPORARY TEST: Call the perspective crop function
		console.log("=== TESTING PERSPECTIVE CROP ===");
		const result = this.canvas.performPerspectiveCrop();
		console.log("Crop result:", result);
		new Notice(result.message);
		
		if (result.success) {
			this.confirmButtonWrapper.hide();
			this.buttonWrapper.show();
		}
	}

	private cancelCrop() {
		// TODO: Implement crop cancellation logic
		const { message } = this.canvas.toggleCroppingPoints(false);
		new Notice(message);
		this.confirmButtonWrapper.hide();
		this.buttonWrapper.show();
	}

	async onClose() {}
}
