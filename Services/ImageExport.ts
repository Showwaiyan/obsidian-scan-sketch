/**
 * Image export utilities for PNG and SVG formats
 * Pure functions with no Obsidian API dependencies
 */

export type ExportFormat = "png" | "svg";

/**
 * Generate default filename with timestamp
 * @param prefix - Filename prefix (default: "scan")
 * @returns Filename like "scan-2026-01-12-095123"
 */
export function generateDefaultFilename(prefix: string = "scan"): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");

	return `${prefix}-${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Validate filename for filesystem compatibility
 * Rejects: empty, /, \, :, *, ?, <, >, |, "
 * @param filename - Filename to validate (without extension)
 * @returns Validation result with message
 */
export function validateFilename(
	filename: string,
): { valid: boolean; message: string } {
	if (!filename || filename.trim() === "") {
		return { valid: false, message: "Filename cannot be empty" };
	}

	const invalidChars = /[/\\:*?"<>|]/;
	if (invalidChars.test(filename)) {
		const matches = filename.match(invalidChars);
		const char = matches ? matches[0] : "";
		return {
			valid: false,
			message: `Filename contains invalid character: ${char}`,
		};
	}

	return { valid: true, message: "" };
}

/**
 * Export canvas to PNG blob with transparent background
 * @param canvas - Canvas element to export
 * @returns PNG blob with maximum quality
 */
export function exportCanvasToPNG(
	canvas: HTMLCanvasElement,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Failed to create PNG blob"));
				}
			},
			"image/png",
			1.0, // Maximum quality
		);
	});
}

/**
 * Export canvas to SVG blob (PNG embedded in SVG wrapper)
 * @param canvas - Canvas element to export
 * @returns SVG blob with embedded PNG
 */
export function exportCanvasToSVG(
	canvas: HTMLCanvasElement,
): Blob {
	// Convert canvas to PNG data URL
	const pngDataURL = canvas.toDataURL("image/png", 1.0);

	// Create SVG with embedded PNG
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${canvas.width}" 
     height="${canvas.height}"
     viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image href="${pngDataURL}" 
         width="${canvas.width}" 
         height="${canvas.height}"/>
</svg>`;

	return new Blob([svg], { type: "image/svg+xml" });
}

/**
 * Convert blob to ArrayBuffer for vault.createBinary()
 * @param blob - Blob to convert
 * @returns ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
	return await blob.arrayBuffer();
}

/**
 * Get file extension for export format
 * @param format - "png" or "svg"
 * @returns File extension with dot (e.g., ".png")
 */
export function getFileExtension(format: ExportFormat): string {
	return format === "png" ? ".png" : ".svg";
}
