import { ImageFilterConfig } from "./types";

/**
 * Default filter configuration (no filters applied)
 */
export const DEFAULT_FILTER_CONFIG: ImageFilterConfig = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	blackAndWhite: false,
};

/**
 * Apply brightness and contrast adjustments to image data
 * @param imageData - Image data to modify (modified in place)
 * @param brightness - Brightness adjustment (-100 to +100)
 * @param contrast - Contrast adjustment (-100 to +100)
 */
export function applyBrightnessContrast(
	imageData: ImageData,
	brightness: number,
	contrast: number,
): void {
	const data = imageData.data;
	
	// Convert brightness from -100/+100 to additive value
	const brightnessValue = (brightness / 100) * 255;
	
	// Convert contrast from -100/+100 to multiplicative factor
	// Formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
	const contrastFactor = ((contrast + 100) / 100);
	
	for (let i = 0; i < data.length; i += 4) {
		// Apply contrast first (around midpoint 128)
		let r = data[i];
		let g = data[i + 1];
		let b = data[i + 2];
		
		// Contrast adjustment
		r = ((r - 128) * contrastFactor) + 128;
		g = ((g - 128) * contrastFactor) + 128;
		b = ((b - 128) * contrastFactor) + 128;
		
		// Brightness adjustment
		r += brightnessValue;
		g += brightnessValue;
		b += brightnessValue;
		
		// Clamp values to 0-255
		data[i] = Math.max(0, Math.min(255, r));
		data[i + 1] = Math.max(0, Math.min(255, g));
		data[i + 2] = Math.max(0, Math.min(255, b));
		// Alpha channel (data[i + 3]) remains unchanged
	}
}

/**
 * Apply saturation adjustment to image data
 * @param imageData - Image data to modify (modified in place)
 * @param saturation - Saturation adjustment (-100 to +100)
 */
export function applySaturation(
	imageData: ImageData,
	saturation: number,
): void {
	const data = imageData.data;
	
	// Convert saturation from -100/+100 to factor (0 = grayscale, 1 = original, 2 = double)
	const saturationFactor = (saturation + 100) / 100;
	
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		
		// Calculate grayscale value using luminance formula
		const gray = 0.299 * r + 0.587 * g + 0.114 * b;
		
		// Interpolate between grayscale and original color
		data[i] = Math.max(0, Math.min(255, gray + saturationFactor * (r - gray)));
		data[i + 1] = Math.max(0, Math.min(255, gray + saturationFactor * (g - gray)));
		data[i + 2] = Math.max(0, Math.min(255, gray + saturationFactor * (b - gray)));
		// Alpha channel (data[i + 3]) remains unchanged
	}
}

/**
 * Convert image to high-contrast black and white (optimized for documents/sketches)
 * Uses adaptive thresholding and contrast enhancement
 * @param imageData - Image data to modify (modified in place)
 */
export function convertToBlackAndWhite(imageData: ImageData): void {
	const data = imageData.data;
	
	// First pass: Convert to grayscale and calculate histogram
	const grayValues = new Uint8Array(data.length / 4);
	let sum = 0;
	
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		
		// Calculate grayscale using luminance formula
		const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
		grayValues[i / 4] = gray;
		sum += gray;
	}
	
	// Calculate average intensity for adaptive threshold
	const avg = sum / grayValues.length;
	
	// Use Otsu's method inspired threshold (favor darker threshold for sketches)
	// This makes text/sketches appear darker and backgrounds lighter
	const threshold = Math.max(128, avg * 0.85);
	
	// Second pass: Apply high-contrast black and white with threshold
	for (let i = 0; i < data.length; i += 4) {
		const gray = grayValues[i / 4];
		
		// Apply threshold with slight sharpening
		const bw = gray > threshold ? 255 : 0;
		
		data[i] = bw;
		data[i + 1] = bw;
		data[i + 2] = bw;
		// Alpha channel (data[i + 3]) remains unchanged
	}
}

/**
 * Check if filter config has any active filters
 * @param config - Filter configuration to check
 * @returns true if any filters are active
 */
export function hasActiveFilters(config: ImageFilterConfig): boolean {
	return config.brightness !== 0 
		|| config.contrast !== 0 
		|| config.saturation !== 0 
		|| config.blackAndWhite;
}

/**
 * Apply all filters from config to image data
 * @param imageData - Image data to filter (modified in place)
 * @param config - Filter configuration
 */
export function applyFilters(
	imageData: ImageData,
	config: ImageFilterConfig,
): void {
	// Apply in optimal order for best results
	
	// 1. Black & White conversion (if enabled)
	//    This should be done first as it's a fundamental transformation
	if (config.blackAndWhite) {
		convertToBlackAndWhite(imageData);
		// If B&W is enabled, skip saturation (no point adjusting saturation on B&W)
	} else {
		// 2. Saturation (only if not B&W)
		if (config.saturation !== 0) {
			applySaturation(imageData, config.saturation);
		}
	}
	
	// 3. Brightness and Contrast (always apply last for best control)
	if (config.brightness !== 0 || config.contrast !== 0) {
		applyBrightnessContrast(imageData, config.brightness, config.contrast);
	}
}

/**
 * Create a copy of ImageData
 * @param imageData - Source image data
 * @returns A new ImageData object with copied data
 */
export function cloneImageData(imageData: ImageData): ImageData {
	const cloned = new ImageData(imageData.width, imageData.height);
	cloned.data.set(imageData.data);
	return cloned;
}
