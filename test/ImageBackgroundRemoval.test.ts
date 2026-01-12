import { describe, it, expect, beforeEach } from "vitest";
import {
	sampleColorAtPoint,
	calculateColorDistance,
	removeBackground,
	createBackgroundRemovalPreview,
	formatRGBColor,
	rgbToCSSColor,
	type RGB,
} from "../Services/ImageBackgroundRemoval";

describe("ImageBackgroundRemoval", () => {
	describe("sampleColorAtPoint", () => {
		let imageData: ImageData;

		beforeEach(() => {
			// Create a 4x4 test image with known colors
			imageData = new ImageData(4, 4);
			const data = imageData.data;

			// Fill with a pattern:
			// Top-left pixel (0,0) = Red (255, 0, 0, 255)
			data[0] = 255;
			data[1] = 0;
			data[2] = 0;
			data[3] = 255;

			// Pixel (1,0) = Green (0, 255, 0, 255)
			data[4] = 0;
			data[5] = 255;
			data[6] = 0;
			data[7] = 255;

			// Pixel (0,1) = Blue (0, 0, 255, 255)
			data[16] = 0;
			data[17] = 0;
			data[18] = 255;
			data[19] = 255;

			// Pixel (2,2) = White (255, 255, 255, 255)
			data[40] = 255;
			data[41] = 255;
			data[42] = 255;
			data[43] = 255;
		});

		it("should sample correct color at given coordinates", () => {
			// Note: Coordinates are in CSS pixels, but our test uses DPR=1
			const color = sampleColorAtPoint(imageData, 0, 0);

			expect(color).toEqual({ r: 255, g: 0, b: 0 });
		});

		it("should sample different colors at different coordinates", () => {
			const green = sampleColorAtPoint(imageData, 1, 0);
			const blue = sampleColorAtPoint(imageData, 0, 1);
			const white = sampleColorAtPoint(imageData, 2, 2);

			expect(green).toEqual({ r: 0, g: 255, b: 0 });
			expect(blue).toEqual({ r: 0, g: 0, b: 255 });
			expect(white).toEqual({ r: 255, g: 255, b: 255 });
		});

		it("should return null for out-of-bounds coordinates", () => {
			expect(sampleColorAtPoint(imageData, -1, 0)).toBeNull();
			expect(sampleColorAtPoint(imageData, 0, -1)).toBeNull();
			expect(sampleColorAtPoint(imageData, 100, 0)).toBeNull();
			expect(sampleColorAtPoint(imageData, 0, 100)).toBeNull();
		});

		it("should handle edge pixels correctly", () => {
			const lastPixel = sampleColorAtPoint(imageData, 3, 3);
			expect(lastPixel).not.toBeNull();
		});
	});

	describe("calculateColorDistance", () => {
		it("should return 0 for identical colors", () => {
			const distance = calculateColorDistance(255, 0, 0, 255, 0, 0);
			expect(distance).toBe(0);
		});

		it("should return correct distance for different colors", () => {
			// Black (0,0,0) to White (255,255,255)
			// Distance = sqrt(255^2 + 255^2 + 255^2) ≈ 441.67
			const distance = calculateColorDistance(0, 0, 0, 255, 255, 255);
			expect(distance).toBeCloseTo(441.67, 1);
		});

		it("should calculate distance between similar colors", () => {
			// White (255,255,255) to Off-white (250,250,250)
			// Distance = sqrt(5^2 + 5^2 + 5^2) ≈ 8.66
			const distance = calculateColorDistance(
				255,
				255,
				255,
				250,
				250,
				250,
			);
			expect(distance).toBeCloseTo(8.66, 1);
		});

		it("should be commutative (distance(A,B) = distance(B,A))", () => {
			const dist1 = calculateColorDistance(100, 150, 200, 50, 75, 100);
			const dist2 = calculateColorDistance(50, 75, 100, 100, 150, 200);
			expect(dist1).toBe(dist2);
		});

		it("should calculate partial channel differences", () => {
			// Only red channel differs
			const distance = calculateColorDistance(255, 100, 100, 200, 100, 100);
			expect(distance).toBe(55);
		});
	});

	describe("removeBackground", () => {
		let imageData: ImageData;

		beforeEach(() => {
			// Create a simple 3x3 image with white background and red center
			imageData = new ImageData(3, 3);
			const data = imageData.data;

			// Fill all pixels with white (255, 255, 255, 255)
			for (let i = 0; i < data.length; i += 4) {
				data[i] = 255; // R
				data[i + 1] = 255; // G
				data[i + 2] = 255; // B
				data[i + 3] = 255; // A
			}

			// Center pixel (1,1) = Red (255, 0, 0, 255)
			const centerIndex = (1 * 3 + 1) * 4;
			data[centerIndex] = 255;
			data[centerIndex + 1] = 0;
			data[centerIndex + 2] = 0;
			data[centerIndex + 3] = 255;
		});

		it("should make exact matching pixels transparent", () => {
			const targetColor: RGB = { r: 255, g: 255, b: 255 };
			const result = removeBackground(imageData, targetColor, 0);

			// Check center pixel (red) is NOT transparent
			const centerIndex = (1 * 3 + 1) * 4;
			expect(result.data[centerIndex + 3]).toBe(255);

			// Check first pixel (white) IS transparent
			expect(result.data[3]).toBe(0);

			// Check last pixel (white) IS transparent
			const lastIndex = (3 * 3 - 1) * 4;
			expect(result.data[lastIndex + 3]).toBe(0);
		});

		it("should respect tolerance threshold", () => {
			// Create image with slight variations
			const data = imageData.data;
			data[0] = 250; // Slightly off-white (250, 255, 255)
			data[1] = 255;
			data[2] = 255;

			const targetColor: RGB = { r: 255, g: 255, b: 255 };

			// With tolerance 0, should NOT remove (250, 255, 255)
			const result1 = removeBackground(imageData, targetColor, 0);
			expect(result1.data[3]).toBe(255); // Not transparent

			// With tolerance 15, SHOULD remove (250, 255, 255)
			// Distance ≈ 5, threshold = 15 * 4.41 = 66.15
			const result2 = removeBackground(imageData, targetColor, 15);
			expect(result2.data[3]).toBe(0); // Transparent
		});

		it("should preserve non-matching pixels", () => {
			const targetColor: RGB = { r: 255, g: 255, b: 255 };
			const result = removeBackground(imageData, targetColor, 10);

			// Center pixel (red) should be preserved
			const centerIndex = (1 * 3 + 1) * 4;
			expect(result.data[centerIndex]).toBe(255); // R
			expect(result.data[centerIndex + 1]).toBe(0); // G
			expect(result.data[centerIndex + 2]).toBe(0); // B
			expect(result.data[centerIndex + 3]).toBe(255); // A (not transparent)
		});

		it("should not modify original imageData", () => {
			const originalData = new Uint8ClampedArray(imageData.data);
			const targetColor: RGB = { r: 255, g: 255, b: 255 };

			removeBackground(imageData, targetColor, 15);

			// Original should be unchanged
			expect(imageData.data).toEqual(originalData);
		});

		it("should handle all pixels matching", () => {
			// All pixels are white
			const targetColor: RGB = { r: 255, g: 255, b: 255 };

			// Set center pixel to white too
			const centerIndex = (1 * 3 + 1) * 4;
			imageData.data[centerIndex] = 255;
			imageData.data[centerIndex + 1] = 255;
			imageData.data[centerIndex + 2] = 255;

			const result = removeBackground(imageData, targetColor, 15);

			// All pixels should be transparent
			for (let i = 3; i < result.data.length; i += 4) {
				expect(result.data[i]).toBe(0);
			}
		});

		it("should handle no pixels matching", () => {
			const targetColor: RGB = { r: 0, g: 0, b: 0 }; // Black (no pixel is black)
			const result = removeBackground(imageData, targetColor, 10);

			// No pixels should be transparent
			for (let i = 3; i < result.data.length; i += 4) {
				expect(result.data[i]).toBe(255);
			}
		});

		it("should handle tolerance at edges (0 and 50)", () => {
			const targetColor: RGB = { r: 255, g: 255, b: 255 };

			// Tolerance 0 = exact match only
			const result1 = removeBackground(imageData, targetColor, 0);
			const centerIndex = (1 * 3 + 1) * 4;
			expect(result1.data[3]).toBe(0); // White pixel transparent
			expect(result1.data[centerIndex + 3]).toBe(255); // Red pixel opaque

			// Tolerance 50 = very permissive (max distance ~220)
			const result2 = removeBackground(imageData, targetColor, 50);
			expect(result2.data[3]).toBe(0); // White pixel transparent
			// Red pixel distance from white ≈ 360, exceeds threshold, so should stay opaque
			expect(result2.data[centerIndex + 3]).toBe(255); // Red pixel opaque
		});
	});

	describe("createBackgroundRemovalPreview", () => {
		it("should create preview without modifying original", () => {
			const imageData = new ImageData(2, 2);
			imageData.data.fill(255); // All white

			const originalData = new Uint8ClampedArray(imageData.data);
			const targetColor: RGB = { r: 255, g: 255, b: 255 };

			const preview = createBackgroundRemovalPreview(
				imageData,
				targetColor,
				15,
			);

			// Original unchanged
			expect(imageData.data).toEqual(originalData);

			// Preview has transparency
			for (let i = 3; i < preview.data.length; i += 4) {
				expect(preview.data[i]).toBe(0);
			}
		});
	});

	describe("formatRGBColor", () => {
		it("should format RGB color correctly", () => {
			const color: RGB = { r: 255, g: 128, b: 0 };
			expect(formatRGBColor(color)).toBe("RGB(255, 128, 0)");
		});

		it("should handle black color", () => {
			const color: RGB = { r: 0, g: 0, b: 0 };
			expect(formatRGBColor(color)).toBe("RGB(0, 0, 0)");
		});

		it("should handle white color", () => {
			const color: RGB = { r: 255, g: 255, b: 255 };
			expect(formatRGBColor(color)).toBe("RGB(255, 255, 255)");
		});
	});

	describe("rgbToCSSColor", () => {
		it("should convert to CSS rgb() format", () => {
			const color: RGB = { r: 255, g: 128, b: 0 };
			expect(rgbToCSSColor(color)).toBe("rgb(255, 128, 0)");
		});

		it("should handle edge values", () => {
			expect(rgbToCSSColor({ r: 0, g: 0, b: 0 })).toBe("rgb(0, 0, 0)");
			expect(rgbToCSSColor({ r: 255, g: 255, b: 255 })).toBe(
				"rgb(255, 255, 255)",
			);
		});
	});
});
