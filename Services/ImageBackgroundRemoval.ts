/**
 * Background removal utilities for document scanning
 * Removes uniform background colors (e.g., paper) by making them transparent
 */

export interface RGB {
	r: number;
	g: number;
	b: number;
}

/**
 * Sample the color at a specific point in the image
 * @param imageData - Image data to sample from
 * @param x - X coordinate in image pixels (not CSS pixels)
 * @param y - Y coordinate in image pixels (not CSS pixels)
 * @returns RGB color at the point, or null if out of bounds
 */
export function sampleColorAtPoint(
	imageData: ImageData,
	x: number,
	y: number,
): RGB | null {
	// Convert to integer coordinates
	const actualX = Math.floor(x);
	const actualY = Math.floor(y);

	// Bounds check
	if (
		actualX < 0 ||
		actualX >= imageData.width ||
		actualY < 0 ||
		actualY >= imageData.height
	) {
		return null;
	}

	// Get pixel data (RGBA format, 4 bytes per pixel)
	const index = (actualY * imageData.width + actualX) * 4;

	return {
		r: imageData.data[index],
		g: imageData.data[index + 1],
		b: imageData.data[index + 2],
	};
}

/**
 * Calculate Euclidean color distance in RGB space
 * @param r1 - Red component of first color (0-255)
 * @param g1 - Green component of first color (0-255)
 * @param b1 - Blue component of first color (0-255)
 * @param r2 - Red component of second color (0-255)
 * @param g2 - Green component of second color (0-255)
 * @param b2 - Blue component of second color (0-255)
 * @returns Distance value from 0 (identical) to ~441 (opposite colors)
 */
export function calculateColorDistance(
	r1: number,
	g1: number,
	b1: number,
	r2: number,
	g2: number,
	b2: number,
): number {
	return Math.sqrt(
		Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2),
	);
}

/**
 * Remove background by making matching pixels transparent
 * Creates a new ImageData object without modifying the original
 * @param imageData - Source image data
 * @param targetColor - Background color to remove
 * @param tolerance - Color matching tolerance (0-50)
 * @returns New ImageData with transparent background
 */
export function removeBackground(
	imageData: ImageData,
	targetColor: RGB,
	tolerance: number,
): ImageData {
	// Create a copy to avoid modifying original
	const result = new ImageData(
		new Uint8ClampedArray(imageData.data),
		imageData.width,
		imageData.height,
	);

	const data = result.data;
	
	// Map tolerance (0-50) to max color distance (0-220)
	// Maximum RGB distance is ~441, so 50% is ~220
	const maxDistance = tolerance * 4.41;

	// Process each pixel
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];

		const distance = calculateColorDistance(
			r,
			g,
			b,
			targetColor.r,
			targetColor.g,
			targetColor.b,
		);

		if (distance <= maxDistance) {
			// Make pixel fully transparent
			data[i + 3] = 0;
		}
		// else: keep original alpha (usually 255)
	}

	return result;
}

/**
 * Create a preview of background removal without modifying original
 * This is an alias for removeBackground for clarity in code
 * @param imageData - Source image data
 * @param targetColor - Background color to remove
 * @param tolerance - Color matching tolerance (0-50)
 * @returns New ImageData with transparent background
 */
export function createBackgroundRemovalPreview(
	imageData: ImageData,
	targetColor: RGB,
	tolerance: number,
): ImageData {
	return removeBackground(imageData, targetColor, tolerance);
}

/**
 * Format RGB color for display
 * @param color - RGB color object
 * @returns Formatted string like "RGB(255, 255, 255)"
 */
export function formatRGBColor(color: RGB): string {
	return `RGB(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert RGB color to CSS color string
 * @param color - RGB color object
 * @returns CSS rgb() string
 */
export function rgbToCSSColor(color: RGB): string {
	return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
