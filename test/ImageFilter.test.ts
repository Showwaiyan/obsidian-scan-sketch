import { describe, it, expect, beforeEach } from "vitest";
import {
	DEFAULT_FILTER_CONFIG,
	applyBrightnessContrast,
	applySaturation,
	convertToBlackAndWhite,
	hasActiveFilters,
	applyFilters,
	cloneImageData,
} from "../Services/ImageFilter";
import type { ImageFilterConfig } from "../Services/types";

describe("ImageFilter", () => {
	let testImageData: ImageData;

	beforeEach(() => {
		// Create a 2x2 test image with known values
		testImageData = new ImageData(2, 2);
		const data = testImageData.data;
		
		// Pixel 0: Red (255, 0, 0, 255)
		data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255;
		
		// Pixel 1: Green (0, 255, 0, 255)
		data[4] = 0; data[5] = 255; data[6] = 0; data[7] = 255;
		
		// Pixel 2: Blue (0, 0, 255, 255)
		data[8] = 0; data[9] = 0; data[10] = 255; data[11] = 255;
		
		// Pixel 3: White (255, 255, 255, 255)
		data[12] = 255; data[13] = 255; data[14] = 255; data[15] = 255;
	});

	describe("DEFAULT_FILTER_CONFIG", () => {
		it("should have no active filters", () => {
			expect(DEFAULT_FILTER_CONFIG.brightness).toBe(0);
			expect(DEFAULT_FILTER_CONFIG.contrast).toBe(0);
			expect(DEFAULT_FILTER_CONFIG.saturation).toBe(0);
			expect(DEFAULT_FILTER_CONFIG.blackAndWhite).toBe(false);
		});
	});

	describe("applyBrightnessContrast", () => {
		it("should increase brightness", () => {
			const imageData = cloneImageData(testImageData);
			applyBrightnessContrast(imageData, 50, 0);

			// Brightness of 50 should add ~127 to each channel
			// Red pixel (255,0,0) will be clamped at (255, 127, 127)
			expect(imageData.data[0]).toBe(255); // Clamped
			expect(imageData.data[1]).toBeGreaterThan(0);
			expect(imageData.data[2]).toBeGreaterThan(0);
		});

		it("should decrease brightness", () => {
			const imageData = cloneImageData(testImageData);
			applyBrightnessContrast(imageData, -50, 0);

			// White pixel should become gray
			expect(imageData.data[12]).toBeLessThan(255);
			expect(imageData.data[13]).toBeLessThan(255);
			expect(imageData.data[14]).toBeLessThan(255);
		});

		it("should increase contrast", () => {
			const imageData = new ImageData(2, 1);
			// Create gray pixels (128, 128, 128)
			imageData.data[0] = 128; imageData.data[1] = 128; imageData.data[2] = 128; imageData.data[3] = 255;
			imageData.data[4] = 128; imageData.data[5] = 128; imageData.data[6] = 128; imageData.data[7] = 255;

			applyBrightnessContrast(imageData, 0, 50);

			// Mid-gray (128) should stay around 128, but contrast should be applied
			// Values should still be close to 128 since they're at the midpoint
			expect(imageData.data[0]).toBeGreaterThanOrEqual(100);
			expect(imageData.data[0]).toBeLessThanOrEqual(156);
		});

		it("should handle brightness=0 and contrast=0 (no change)", () => {
			const original = cloneImageData(testImageData);
			applyBrightnessContrast(testImageData, 0, 0);

			// Data should be unchanged
			for (let i = 0; i < testImageData.data.length; i++) {
				expect(testImageData.data[i]).toBe(original.data[i]);
			}
		});

		it("should clamp values to 0-255 range", () => {
			const imageData = cloneImageData(testImageData);
			applyBrightnessContrast(imageData, 100, 100);

			// All values should be within valid range
			for (let i = 0; i < imageData.data.length; i += 4) {
				expect(imageData.data[i]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i]).toBeLessThanOrEqual(255);
				expect(imageData.data[i + 1]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i + 1]).toBeLessThanOrEqual(255);
				expect(imageData.data[i + 2]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i + 2]).toBeLessThanOrEqual(255);
			}
		});

		it("should preserve alpha channel", () => {
			const imageData = cloneImageData(testImageData);
			applyBrightnessContrast(imageData, 50, 50);

			// Alpha values should remain 255
			expect(imageData.data[3]).toBe(255);
			expect(imageData.data[7]).toBe(255);
			expect(imageData.data[11]).toBe(255);
			expect(imageData.data[15]).toBe(255);
		});
	});

	describe("applySaturation", () => {
		it("should desaturate to grayscale when saturation=-100", () => {
			const imageData = cloneImageData(testImageData);
			applySaturation(imageData, -100);

			// Red pixel should become gray
			const r = imageData.data[0];
			const g = imageData.data[1];
			const b = imageData.data[2];
			expect(r).toBe(g);
			expect(g).toBe(b);
			expect(r).toBeGreaterThan(0); // Should be grayscale, not black
		});

		it("should increase saturation", () => {
			const imageData = cloneImageData(testImageData);
			const originalRed = imageData.data[0];
			
			applySaturation(imageData, 50);

			// Red channel in red pixel should be more vibrant
			expect(imageData.data[0]).toBeGreaterThanOrEqual(originalRed);
		});

		it("should handle saturation=0 (no change)", () => {
			const original = cloneImageData(testImageData);
			applySaturation(testImageData, 0);

			// Data should be unchanged (within rounding error)
			for (let i = 0; i < testImageData.data.length; i++) {
				expect(Math.abs(testImageData.data[i] - original.data[i])).toBeLessThan(1);
			}
		});

		it("should preserve alpha channel", () => {
			const imageData = cloneImageData(testImageData);
			applySaturation(imageData, 50);

			// Alpha values should remain 255
			expect(imageData.data[3]).toBe(255);
			expect(imageData.data[7]).toBe(255);
			expect(imageData.data[11]).toBe(255);
			expect(imageData.data[15]).toBe(255);
		});

		it("should clamp values to 0-255 range", () => {
			const imageData = cloneImageData(testImageData);
			applySaturation(imageData, 100);

			// All values should be within valid range
			for (let i = 0; i < imageData.data.length; i += 4) {
				expect(imageData.data[i]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i]).toBeLessThanOrEqual(255);
				expect(imageData.data[i + 1]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i + 1]).toBeLessThanOrEqual(255);
				expect(imageData.data[i + 2]).toBeGreaterThanOrEqual(0);
				expect(imageData.data[i + 2]).toBeLessThanOrEqual(255);
			}
		});
	});

	describe("convertToBlackAndWhite", () => {
		it("should convert image to pure black and white", () => {
			const imageData = cloneImageData(testImageData);
			convertToBlackAndWhite(imageData);

			// All pixels should be either 0 or 255 (black or white)
			for (let i = 0; i < imageData.data.length; i += 4) {
				const r = imageData.data[i];
				const g = imageData.data[i + 1];
				const b = imageData.data[i + 2];
				
				expect(r === 0 || r === 255).toBe(true);
				expect(g === 0 || g === 255).toBe(true);
				expect(b === 0 || b === 255).toBe(true);
				
				// R, G, B should all be the same (grayscale)
				expect(r).toBe(g);
				expect(g).toBe(b);
			}
		});

		it("should preserve alpha channel", () => {
			const imageData = cloneImageData(testImageData);
			convertToBlackAndWhite(imageData);

			// Alpha values should remain 255
			expect(imageData.data[3]).toBe(255);
			expect(imageData.data[7]).toBe(255);
			expect(imageData.data[11]).toBe(255);
			expect(imageData.data[15]).toBe(255);
		});

		it("should convert white pixel to white", () => {
			const imageData = new ImageData(1, 1);
			imageData.data[0] = 255;
			imageData.data[1] = 255;
			imageData.data[2] = 255;
			imageData.data[3] = 255;

			convertToBlackAndWhite(imageData);

			expect(imageData.data[0]).toBe(255);
			expect(imageData.data[1]).toBe(255);
			expect(imageData.data[2]).toBe(255);
		});

		it("should convert black pixel to black", () => {
			const imageData = new ImageData(1, 1);
			imageData.data[0] = 0;
			imageData.data[1] = 0;
			imageData.data[2] = 0;
			imageData.data[3] = 255;

			convertToBlackAndWhite(imageData);

			expect(imageData.data[0]).toBe(0);
			expect(imageData.data[1]).toBe(0);
			expect(imageData.data[2]).toBe(0);
		});
	});

	describe("hasActiveFilters", () => {
		it("should return false for default config", () => {
			expect(hasActiveFilters(DEFAULT_FILTER_CONFIG)).toBe(false);
		});

		it("should return true when brightness is set", () => {
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				brightness: 50,
			};
			expect(hasActiveFilters(config)).toBe(true);
		});

		it("should return true when contrast is set", () => {
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				contrast: 50,
			};
			expect(hasActiveFilters(config)).toBe(true);
		});

		it("should return true when saturation is set", () => {
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				saturation: 50,
			};
			expect(hasActiveFilters(config)).toBe(true);
		});

		it("should return true when blackAndWhite is enabled", () => {
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				blackAndWhite: true,
			};
			expect(hasActiveFilters(config)).toBe(true);
		});

		it("should return true when multiple filters are set", () => {
			const config: ImageFilterConfig = {
				brightness: 20,
				contrast: 30,
				saturation: -50,
				blackAndWhite: false,
			};
			expect(hasActiveFilters(config)).toBe(true);
		});
	});

	describe("applyFilters", () => {
		it("should apply no changes with default config", () => {
			const original = cloneImageData(testImageData);
			applyFilters(testImageData, DEFAULT_FILTER_CONFIG);

			// Data should be unchanged
			for (let i = 0; i < testImageData.data.length; i++) {
				expect(testImageData.data[i]).toBe(original.data[i]);
			}
		});

		it("should apply brightness only", () => {
			const imageData = cloneImageData(testImageData);
			const original = cloneImageData(testImageData);
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				brightness: 50,
			};

			applyFilters(imageData, config);

			// White pixel (255,255,255) can't get brighter, so it stays at 255
			// But other pixels should be brighter
			expect(imageData.data[1]).toBeGreaterThan(original.data[1]); // Green channel of red pixel
		});

		it("should apply black and white conversion", () => {
			const imageData = cloneImageData(testImageData);
			const config: ImageFilterConfig = {
				...DEFAULT_FILTER_CONFIG,
				blackAndWhite: true,
			};

			applyFilters(imageData, config);

			// All pixels should be black or white
			for (let i = 0; i < imageData.data.length; i += 4) {
				const r = imageData.data[i];
				expect(r === 0 || r === 255).toBe(true);
			}
		});

		it("should skip saturation when B&W is enabled", () => {
			const imageData = cloneImageData(testImageData);
			const config: ImageFilterConfig = {
				brightness: 0,
				contrast: 0,
				saturation: 100, // This should be ignored
				blackAndWhite: true,
			};

			applyFilters(imageData, config);

			// Result should be black and white (saturation ignored)
			for (let i = 0; i < imageData.data.length; i += 4) {
				const r = imageData.data[i];
				expect(r === 0 || r === 255).toBe(true);
			}
		});

		it("should apply multiple filters in correct order", () => {
			const imageData = cloneImageData(testImageData);
			const config: ImageFilterConfig = {
				brightness: 20,
				contrast: 30,
				saturation: -50,
				blackAndWhite: false,
			};

			// Should not throw error
			expect(() => applyFilters(imageData, config)).not.toThrow();
			
			// Should modify the image
			let hasChanged = false;
			for (let i = 0; i < imageData.data.length; i++) {
				if (imageData.data[i] !== testImageData.data[i]) {
					hasChanged = true;
					break;
				}
			}
			expect(hasChanged).toBe(true);
		});
	});

	describe("cloneImageData", () => {
		it("should create a copy with same dimensions", () => {
			const cloned = cloneImageData(testImageData);

			expect(cloned.width).toBe(testImageData.width);
			expect(cloned.height).toBe(testImageData.height);
		});

		it("should create a copy with same data", () => {
			const cloned = cloneImageData(testImageData);

			for (let i = 0; i < testImageData.data.length; i++) {
				expect(cloned.data[i]).toBe(testImageData.data[i]);
			}
		});

		it("should create independent copy (modifying clone doesn't affect original)", () => {
			const cloned = cloneImageData(testImageData);
			
			// Modify the clone
			cloned.data[0] = 100;

			// Original should be unchanged
			expect(testImageData.data[0]).toBe(255);
		});
	});
});
