import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	initializeCropPoints,
	updateCropPoint,
	setCropPointDragging,
	validateCropPoints,
	calculateDistance,
	calculateOutputDimensions,
	orderCropPoints,
} from "../Services/CropPointManager";
import { CropPoint } from "../Services/types";

describe("CropPointManager", () => {
	describe("initializeCropPoints", () => {
		it("should create 4 crop points at rectangle corners", () => {
			const rect = { x: 10, y: 20, width: 100, height: 80 };
			const points = initializeCropPoints(rect);

			expect(points).toHaveLength(4);
			expect(points[0]).toEqual({ x: 10, y: 20, isDragging: false }); // Top-left
			expect(points[1]).toEqual({ x: 110, y: 20, isDragging: false }); // Top-right
			expect(points[2]).toEqual({ x: 10, y: 100, isDragging: false }); // Bottom-left
			expect(points[3]).toEqual({ x: 110, y: 100, isDragging: false }); // Bottom-right
		});

		it("should initialize all points as not dragging", () => {
			const rect = { x: 0, y: 0, width: 50, height: 50 };
			const points = initializeCropPoints(rect);

			points.forEach(point => {
				expect(point.isDragging).toBe(false);
			});
		});
	});

	describe("updateCropPoint", () => {
		let points: CropPoint[];

		beforeEach(() => {
			points = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: false },
				{ x: 100, y: 100, isDragging: false },
			];
		});

		it("should update the specified point's position", () => {
			const updated = updateCropPoint(points, 0, 50, 60);

			expect(updated[0].x).toBe(50);
			expect(updated[0].y).toBe(60);
		});

		it("should not modify other points", () => {
			const updated = updateCropPoint(points, 0, 50, 60);

			expect(updated[1]).toEqual(points[1]);
			expect(updated[2]).toEqual(points[2]);
			expect(updated[3]).toEqual(points[3]);
		});

		it("should return unchanged array for invalid index", () => {
			const updated = updateCropPoint(points, 10, 50, 60);

			expect(updated).toEqual(points);
		});

		it("should return unchanged array for negative index", () => {
			const updated = updateCropPoint(points, -1, 50, 60);

			expect(updated).toEqual(points);
		});
	});

	describe("setCropPointDragging", () => {
		let points: CropPoint[];

		beforeEach(() => {
			points = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: true },
				{ x: 100, y: 100, isDragging: false },
			];
		});

		it("should set dragging state for specified point", () => {
			const updated = setCropPointDragging(points, 1, true);

			expect(updated[1].isDragging).toBe(true);
		});

		it("should clear all dragging states when index is -1", () => {
			const updated = setCropPointDragging(points, -1, false);

			updated.forEach(point => {
				expect(point.isDragging).toBe(false);
			});
		});

		it("should return unchanged array for invalid positive index", () => {
			const updated = setCropPointDragging(points, 10, true);

			expect(updated).toEqual(points);
		});
	});

	describe("validateCropPoints", () => {
		it("should return true for 4 valid points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: false },
				{ x: 100, y: 100, isDragging: false },
			];

			expect(validateCropPoints(points)).toBe(true);
		});

		it("should return false for less than 4 points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
			];

			expect(validateCropPoints(points)).toBe(false);
		});

		it("should return false for more than 4 points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: false },
				{ x: 100, y: 100, isDragging: false },
				{ x: 50, y: 50, isDragging: false },
			];

			expect(validateCropPoints(points)).toBe(false);
		});

		it("should return false for points with NaN coordinates", () => {
			const points: CropPoint[] = [
				{ x: NaN, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: false },
				{ x: 100, y: 100, isDragging: false },
			];

			expect(validateCropPoints(points)).toBe(false);
		});
	});

	describe("calculateDistance", () => {
		it("should calculate distance between two points", () => {
			const p1 = { x: 0, y: 0 };
			const p2 = { x: 3, y: 4 };

			const distance = calculateDistance(p1, p2);

			expect(distance).toBe(5); // 3-4-5 triangle
		});

		it("should return 0 for same point", () => {
			const p1 = { x: 10, y: 20 };
			const p2 = { x: 10, y: 20 };

			const distance = calculateDistance(p1, p2);

			expect(distance).toBe(0);
		});

		it("should handle negative coordinates", () => {
			const p1 = { x: -3, y: -4 };
			const p2 = { x: 0, y: 0 };

			const distance = calculateDistance(p1, p2);

			expect(distance).toBe(5);
		});
	});

	describe("calculateOutputDimensions", () => {
		it("should calculate dimensions from crop points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },     // TL
				{ x: 100, y: 0, isDragging: false },   // TR
				{ x: 0, y: 80, isDragging: false },    // BL
				{ x: 100, y: 80, isDragging: false },  // BR
			];

			const dimensions = calculateOutputDimensions(points, 1);

			expect(dimensions.width).toBe(100);
			expect(dimensions.height).toBe(80);
		});

		it("should apply DPR to dimensions", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
				{ x: 0, y: 100, isDragging: false },
				{ x: 100, y: 100, isDragging: false },
			];

			const dimensions = calculateOutputDimensions(points, 2);

			expect(dimensions.width).toBe(200);
			expect(dimensions.height).toBe(200);
		});

		it("should throw error for less than 4 points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
			];

			expect(() => calculateOutputDimensions(points, 1)).toThrow();
		});

		it("should use maximum dimensions for trapezoid", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },     // TL
				{ x: 80, y: 0, isDragging: false },    // TR (narrower top)
				{ x: 0, y: 100, isDragging: false },   // BL
				{ x: 100, y: 100, isDragging: false }, // BR (wider bottom)
			];

			const dimensions = calculateOutputDimensions(points, 1);

			expect(dimensions.width).toBe(100); // Max of top (80) and bottom (100)
		});
	});

	describe("orderCropPoints", () => {
		it("should order points as TL, TR, BL, BR", () => {
			// Points in random order
			const points: CropPoint[] = [
				{ x: 100, y: 100, isDragging: false }, // BR
				{ x: 0, y: 0, isDragging: false },     // TL
				{ x: 100, y: 0, isDragging: false },   // TR
				{ x: 0, y: 100, isDragging: false },   // BL
			];

			const ordered = orderCropPoints(points);

			expect(ordered[0].x).toBe(0);   // TL
			expect(ordered[0].y).toBe(0);
			expect(ordered[1].x).toBe(100); // TR
			expect(ordered[1].y).toBe(0);
			expect(ordered[2].x).toBe(0);   // BL
			expect(ordered[2].y).toBe(100);
			expect(ordered[3].x).toBe(100); // BR
			expect(ordered[3].y).toBe(100);
		});

		it("should throw error for less than 4 points", () => {
			const points: CropPoint[] = [
				{ x: 0, y: 0, isDragging: false },
				{ x: 100, y: 0, isDragging: false },
			];

			expect(() => orderCropPoints(points)).toThrow();
		});

		it("should handle rotated quadrilateral", () => {
			// Quadrilateral rotated 45 degrees (diamond shape)
			const points: CropPoint[] = [
				{ x: 50, y: 100, isDragging: false }, // Bottom (x+y = 150)
				{ x: 0, y: 50, isDragging: false },   // Left (x+y = 50) - This is TL
				{ x: 50, y: 0, isDragging: false },   // Top (x+y = 50) - This is also TL candidate
				{ x: 100, y: 50, isDragging: false }, // Right (x+y = 150)
			];

			const ordered = orderCropPoints(points);

			// One of the points with smallest x+y (TL)
			expect(ordered[0].x + ordered[0].y).toBe(50);
			// One of the points with largest x+y (BR)
			expect(ordered[3].x + ordered[3].y).toBe(150);
			// All points should be present
			expect(ordered).toHaveLength(4);
		});
	});
});
