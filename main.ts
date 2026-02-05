import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface HandwrittenScannerSettings {
	exportDefaultFolder: string;
}

const DEFAULT_SETTINGS: HandwrittenScannerSettings = {
	exportDefaultFolder: "Scanned",
};

export default class HandWrittenPlugin extends Plugin {
	settings: HandwrittenScannerSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("scan", "Scanner", async (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			// Lazy load ScannerModal only when needed
			const { ScannerModal } = await import("./UI/Modals/scannerModal");
			new ScannerModal(this.app, this).open();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "scan-sketch",
			name: "Scan sketch",
			callback: async () => {
				// Lazy load ScannerModal only when needed
				const { ScannerModal } = await import("./UI/Modals/scannerModal");
				new ScannerModal(this.app, this).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HandwrittenScannerSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HandwrittenScannerSettingTab extends PluginSettingTab {
	plugin: HandWrittenPlugin;

	constructor(app: App, plugin: HandWrittenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Default export folder")
			.setDesc("Folder path where scanned images will be saved (e.g., 'Scanned' or 'Notes/Scans')")
			.addText((text) =>
				text
					.setPlaceholder("Scanned")
					.setValue(this.plugin.settings.exportDefaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.exportDefaultFolder = value || "Scanned";
						await this.plugin.saveSettings();
					}),
			);
	}
}
