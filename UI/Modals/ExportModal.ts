/**
 * Export modal for PNG/SVG export options
 * Provides UI for format selection, filename input, and folder configuration
 */

import { App, Modal, Notice, ButtonComponent, TextComponent } from "obsidian";
import {
	generateDefaultFilename,
	validateFilename,
	exportCanvasToPNG,
	exportCanvasToSVG,
	getFileExtension,
	type ExportFormat,
} from "../../Services/ImageExport";
import { saveToVault } from "../../Services/VaultExport";

export class ExportModal extends Modal {
	private canvas: HTMLCanvasElement;
	private defaultFolder: string;
	private selectedFormat: ExportFormat = "png";
	private filenameInput: TextComponent;
	private extensionDisplay: HTMLElement;
	private pngRadio: HTMLInputElement;
	private svgRadio: HTMLInputElement;

	constructor(app: App, canvas: HTMLCanvasElement, defaultFolder: string) {
		super(app);
		this.canvas = canvas;
		this.defaultFolder = defaultFolder;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("export-modal");
		this.setTitle("Export scanned image");

		// Format selector
		this.buildFormatSelector(contentEl);

		// Filename input
		this.buildFilenameInput(contentEl);

		// Folder display
		this.buildFolderDisplay(contentEl);

		// Action buttons
		this.buildActionButtons(contentEl);
	}

	private buildFormatSelector(container: HTMLElement): void {
		const section = container.createDiv("export-format-section");

		const heading = section.createEl("h4");
		heading.textContent = "Format:";

		const optionsWrapper = section.createDiv("export-format-options");

		// PNG radio option
		const pngOption = optionsWrapper.createDiv("export-format-option");
		this.pngRadio = pngOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-png" },
		});
		this.pngRadio.checked = true;
		this.pngRadio.addEventListener("change", () => {
			this.selectedFormat = "png";
			this.updateExtensionDisplay();
		});

		const pngLabel = pngOption.createEl("label", {
			attr: { for: "format-png" },
		});
		pngLabel.textContent = "PNG";

		// SVG radio option
		const svgOption = optionsWrapper.createDiv("export-format-option");
		this.svgRadio = svgOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-svg" },
		});
		this.svgRadio.addEventListener("change", () => {
			this.selectedFormat = "svg";
			this.updateExtensionDisplay();
		});

		const svgLabel = svgOption.createEl("label", {
			attr: { for: "format-svg" },
		});
		svgLabel.textContent = "SVG";
	}

	private buildFilenameInput(container: HTMLElement): void {
		const section = container.createDiv("export-filename-section");

		const heading = section.createEl("h4");
		heading.textContent = "Filename:";

		const inputWrapper = section.createDiv("export-filename-wrapper");

		// Filename input
		this.filenameInput = new TextComponent(inputWrapper);
		this.filenameInput.inputEl.addClass("export-filename-input");
		this.filenameInput.setPlaceholder(generateDefaultFilename());

		// Extension display
		this.extensionDisplay = inputWrapper.createDiv(
			"export-filename-extension",
		);
		this.updateExtensionDisplay();
	}

	private buildFolderDisplay(container: HTMLElement): void {
		const section = container.createDiv("export-folder-section");

		const heading = section.createEl("h4");
		heading.textContent = "Save to:";

		const folderPath = section.createDiv("export-folder-path");
		folderPath.textContent = this.defaultFolder || "Root folder";

		const note = section.createDiv("export-folder-note");
		note.textContent = "(change default folder in plugin settings)";
	}

	private buildActionButtons(container: HTMLElement): void {
		const buttonWrapper = container.createDiv("export-buttons");

		// Export button
		new ButtonComponent(buttonWrapper)
			.setButtonText("Export")
			.setIcon("download")
			.setCta()
			.onClick(() => this.handleExport());

		// Cancel button
		new ButtonComponent(buttonWrapper)
			.setButtonText("Cancel")
			.onClick(() => this.close());
	}

	private updateExtensionDisplay(): void {
		if (this.extensionDisplay) {
			this.extensionDisplay.textContent = getFileExtension(
				this.selectedFormat,
			);
		}
	}

	private async handleExport(): Promise<void> {
		try {
			// Get filename (use placeholder if empty)
			let filename = this.filenameInput.getValue().trim();
			if (!filename) {
				filename = this.filenameInput.inputEl.placeholder;
			}

			// Validate filename
			const validation = validateFilename(filename);
			if (!validation.valid) {
				new Notice(validation.message, 5000);
				return;
			}

			// Add extension
			const filenameWithExtension =
				filename + getFileExtension(this.selectedFormat);

			// Show processing notice
			const processingNotice = new Notice("Exporting...", 0);

		try {
			// Export canvas based on format
			let blob: Blob;
			if (this.selectedFormat === "png") {
				blob = await exportCanvasToPNG(this.canvas);
			} else {
				blob = exportCanvasToSVG(this.canvas);
			}

				// Save to vault
				const file = await saveToVault(
					this.app.vault,
					this.defaultFolder,
					filenameWithExtension,
					blob,
				);

				// Hide processing notice
				processingNotice.hide();

				// Show success notice
				new Notice(`Exported to ${file.path}`, 3000);

				// Close modal
				this.close();
			} catch (error) {
				// Hide processing notice
				processingNotice.hide();

				// Show error notice
				new Notice(error.message, 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			new Notice(
				`Export failed: ${error.message}\nCheck console for details.`,
				6000,
			);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
