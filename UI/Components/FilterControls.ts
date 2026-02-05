import { ButtonComponent, Notice } from "obsidian";
import type { ImageFilterConfig } from "../../Services/types";

/**
 * FilterControls component for managing image filters
 * Provides UI controls for brightness, contrast, saturation, and B&W conversion
 */
export class FilterControls {
	private panelContainer: HTMLElement;
	private gridContainer: HTMLElement;
	private isExpanded: boolean;
	private onFilterChange: (config: Partial<ImageFilterConfig>) => void;
	private onResetFilters: () => void;
	private checkImageLoaded: () => boolean;

	// Current filter values
	private brightness: number;
	private contrast: number;
	private saturation: number;
	private blackAndWhite: boolean;

	// UI elements
	private brightnessSlider: HTMLInputElement | null;
	private contrastSlider: HTMLInputElement | null;
	private saturationSlider: HTMLInputElement | null;
	private bwToggle: HTMLInputElement | null;

	constructor(
		panelContainer: HTMLElement,
		onFilterChange: (config: Partial<ImageFilterConfig>) => void,
		onResetFilters: () => void,
		checkImageLoaded: () => boolean,
	) {
		this.panelContainer = panelContainer;
		this.gridContainer = this.panelContainer.createDiv();
		this.onFilterChange = onFilterChange;
		this.onResetFilters = onResetFilters;
		this.checkImageLoaded = checkImageLoaded;
		this.isExpanded = false;

		// Initialize filter values
		this.brightness = 0;
		this.contrast = 0;
		this.saturation = 0;
		this.blackAndWhite = false;

		// Initialize UI element references
		this.brightnessSlider = null;
		this.contrastSlider = null;
		this.saturationSlider = null;
		this.bwToggle = null;

		// Build the panel immediately
		this.buildPanel();
	}

	/**
	 * Create the Edit button that toggles the filter panel
	 * @param buttonContainer - Container where the button should be added
	 */
	public createEditButton(buttonContainer: HTMLElement): ButtonComponent {
		const btn = new ButtonComponent(buttonContainer)
			.setIcon("sliders-horizontal")
			.setTooltip("Edit image (filters)")
			.onClick(() => this.togglePanel());

		return btn;
	}

	/**
	 * Toggle the filter panel visibility
	 */
	public togglePanel() {
		// Check if image is loaded before showing panel
		if (!this.isExpanded && !this.checkImageLoaded()) {
			new Notice("Please upload photo first!");
			return;
		}
		
		if (this.isExpanded) {
			this.panelContainer.hide();
		} else {
			this.panelContainer.show();
		}
		this.isExpanded = !this.isExpanded;
	}

	/**
	 * Build the filter panel with all controls
	 */
	private buildPanel() {
		// Create filter controls
		this.createBrightnessControl();
		this.createContrastControl();
		this.createSaturationControl();
		this.createBlackAndWhiteToggle();

		// Create reset button
		this.createResetButton();
	}

	/**
	 * Create brightness slider control
	 */
	private createBrightnessControl() {
		if (!this.gridContainer) return;

		const wrapper = this.gridContainer.createDiv("filter-control");
		
		const label = wrapper.createDiv("filter-label");
		label.createSpan({ text: "Brightness" });
		const valueDisplay = label.createSpan({ text: "0", cls: "filter-value" });

		this.brightnessSlider = wrapper.createEl("input", {
			type: "range",
			cls: "filter-slider",
			attr: {
				min: "-100",
				max: "100",
				value: "0",
				step: "1",
			},
		});

		this.brightnessSlider.addEventListener("input", (e) => {
			const value = parseInt((e.target as HTMLInputElement).value);
			this.brightness = value;
			valueDisplay.setText(value.toString());
			this.onFilterChange({ brightness: value });
		});
	}

	/**
	 * Create contrast slider control
	 */
	private createContrastControl() {
		if (!this.gridContainer) return;

		const wrapper = this.gridContainer.createDiv("filter-control");
		
		const label = wrapper.createDiv("filter-label");
		label.createSpan({ text: "Contrast" });
		const valueDisplay = label.createSpan({ text: "0", cls: "filter-value" });

		this.contrastSlider = wrapper.createEl("input", {
			type: "range",
			cls: "filter-slider",
			attr: {
				min: "-100",
				max: "100",
				value: "0",
				step: "1",
			},
		});

		this.contrastSlider.addEventListener("input", (e) => {
			const value = parseInt((e.target as HTMLInputElement).value);
			this.contrast = value;
			valueDisplay.setText(value.toString());
			this.onFilterChange({ contrast: value });
		});
	}

	/**
	 * Create saturation slider control
	 */
	private createSaturationControl() {
		if (!this.gridContainer) return;

		const wrapper = this.gridContainer.createDiv("filter-control");
		
		const label = wrapper.createDiv("filter-label");
		label.createSpan({ text: "Saturation" });
		const valueDisplay = label.createSpan({ text: "0", cls: "filter-value" });

		this.saturationSlider = wrapper.createEl("input", {
			type: "range",
			cls: "filter-slider",
			attr: {
				min: "-100",
				max: "100",
				value: "0",
				step: "1",
			},
		});

		this.saturationSlider.addEventListener("input", (e) => {
			const value = parseInt((e.target as HTMLInputElement).value);
			this.saturation = value;
			valueDisplay.setText(value.toString());
			this.onFilterChange({ saturation: value });
		});
	}

	/**
	 * Create black and white toggle
	 */
	private createBlackAndWhiteToggle() {
		if (!this.gridContainer) return;

		const wrapper = this.gridContainer.createDiv("filter-control");
		
		const label = wrapper.createDiv("filter-label");
		label.createSpan({ text: "Black & White (Document Mode)" });

		const toggleWrapper = wrapper.createDiv("filter-toggle-wrapper");
		
		this.bwToggle = toggleWrapper.createEl("input", {
			type: "checkbox",
			cls: "filter-checkbox",
		});

		this.bwToggle.addEventListener("change", (e) => {
			const checked = (e.target as HTMLInputElement).checked;
			this.blackAndWhite = checked;
			this.onFilterChange({ blackAndWhite: checked });

			// Disable saturation when B&W is enabled
			if (this.saturationSlider) {
				this.saturationSlider.disabled = checked;
			}
		});
	}

	/**
	 * Create reset button
	 */
	private createResetButton() {
		if (!this.gridContainer) return;

		const btnWrapper = this.gridContainer.createDiv("filter-reset-wrapper");
		
		new ButtonComponent(btnWrapper)
			.setButtonText("Reset filters")
			.setTooltip("Reset all filters to default")
			.onClick(() => {
				this.resetAllControls();
				this.onResetFilters();
			});
	}

	/**
	 * Reset all control values to default
	 */
	private resetAllControls() {
		this.brightness = 0;
		this.contrast = 0;
		this.saturation = 0;
		this.blackAndWhite = false;

		if (this.brightnessSlider) {
			this.brightnessSlider.value = "0";
			const valueDisplay = this.brightnessSlider.parentElement?.querySelector(".filter-value");
			if (valueDisplay) valueDisplay.setText("0");
		}

		if (this.contrastSlider) {
			this.contrastSlider.value = "0";
			const valueDisplay = this.contrastSlider.parentElement?.querySelector(".filter-value");
			if (valueDisplay) valueDisplay.setText("0");
		}

		if (this.saturationSlider) {
			this.saturationSlider.value = "0";
			this.saturationSlider.disabled = false;
			const valueDisplay = this.saturationSlider.parentElement?.querySelector(".filter-value");
			if (valueDisplay) valueDisplay.setText("0");
		}

		if (this.bwToggle) {
			this.bwToggle.checked = false;
		}
	}

	/**
	 * Clean up the component
	 */
	public destroy() {
		this.panelContainer.empty();
	}
}
