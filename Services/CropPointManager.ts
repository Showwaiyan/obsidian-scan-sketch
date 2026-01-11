import { CropPoint, Rectangle, ImageDimensions } from "./types";

/**
 * Initialize crop points at the four corners of an image rectangle
 * @param imageRect - Rectangle representing the image area
 * @returns Array of 4 crop points at corners (TL, TR, BL, BR)
 */
export function initializeCropPoints(imageRect: Rectangle): CropPoint[] {
	return [
		{ x: imageRect.x, y: imageRect.y, isDragging: false }, // Top-left
		{ x: imageRect.x + imageRect.width, y: imageRect.y, isDragging: false }, // Top-right
		{ x: imageRect.x, y: imageRect.y + imageRect.height, isDragging: false }, // Bottom-left
		{ x: imageRect.x + imageRect.width, y: imageRect.y + imageRect.height, isDragging: false }, // Bottom-right
	];
}

/**
 * Update a specific crop point's position
 * @param points - Array of crop points
 * @param index - Index of the point to update
 * @param x - New x coordinate
 * @param y - New y coordinate
 * @returns Updated array of crop points
 */
export function updateCropPoint(
	points: CropPoint[],
	index: number,
	x: number,
	y: number,
): CropPoint[] {
	if (index < 0 || index >= points.length) {
		return points;
	}

	const updated = [...points];
	updated[index] = { ...updated[index], x, y };
	return updated;
}

/**
 * Set the dragging state for a specific crop point
 * @param points - Array of crop points
 * @param index - Index of the point to update (-1 to clear all)
 * @param isDragging - New dragging state
 * @returns Updated array of crop points
 */
export function setCropPointDragging(
	points: CropPoint[],
	index: number,
	isDragging: boolean,
): CropPoint[] {
	if (index === -1) {
		// Clear all dragging states
		return points.map(p => ({ ...p, isDragging: false }));
	}

	if (index < 0 || index >= points.length) {
		return points;
	}

	const updated = [...points];
	updated[index] = { ...updated[index], isDragging };
	return updated;
}

/**
 * Validate that crop points form a valid quadrilateral
 * @param points - Array of crop points
 * @returns true if points are valid
 */
export function validateCropPoints(points: CropPoint[]): boolean {
	if (points.length !== 4) {
		return false;
	}

	// Check that all points have valid coordinates
	return points.every(p => 
		typeof p.x === "number" && 
		typeof p.y === "number" && 
		!isNaN(p.x) && 
		!isNaN(p.y)
	);
}

/**
 * Calculate the distance between two points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance between the points
 */
export function calculateDistance(
	p1: { x: number; y: number },
	p2: { x: number; y: number },
): number {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate output dimensions based on crop points
 * Uses the maximum of opposite sides to preserve aspect ratio
 * @param points - Array of 4 crop points
 * @param dpr - Device pixel ratio for high-DPI displays
 * @returns Calculated dimensions
 */
export function calculateOutputDimensions(
	points: CropPoint[],
	dpr: number = 1,
): ImageDimensions {
	if (points.length !== 4) {
		throw new Error("Need exactly 4 crop points to calculate dimensions");
	}

	// Calculate distances between points
	// Top edge: point 0 to point 1
	const topWidth = calculateDistance(points[0], points[1]);
	
	// Bottom edge: point 2 to point 3
	const bottomWidth = calculateDistance(points[2], points[3]);
	
	// Left edge: point 0 to point 2
	const leftHeight = calculateDistance(points[0], points[2]);
	
	// Right edge: point 1 to point 3
	const rightHeight = calculateDistance(points[1], points[3]);

	// Use maximum dimensions to avoid losing content
	const width = Math.max(topWidth, bottomWidth);
	const height = Math.max(leftHeight, rightHeight);

	return { 
		width: Math.round(width * dpr), 
		height: Math.round(height * dpr),
	};
}

/**
 * Order crop points in correct sequence (TL, TR, BL, BR)
 * This ensures the perspective transform works correctly
 * @param points - Array of 4 crop points (unordered)
 * @returns Ordered array of crop points [TL, TR, BL, BR]
 */
export function orderCropPoints(points: CropPoint[]): CropPoint[] {
	if (points.length !== 4) {
		throw new Error("Need exactly 4 crop points");
	}

	// Copy points to avoid modifying original
	const sortedPoints = [...points];

	// Find the top-left point (smallest sum of x + y)
	sortedPoints.sort((a, b) => (a.x + a.y) - (b.x + b.y));
	const topLeft = sortedPoints[0];

	// Find the bottom-right point (largest sum of x + y)
	const bottomRight = sortedPoints[3];

	// Of the remaining two points, find top-right and bottom-left
	const remaining = [sortedPoints[1], sortedPoints[2]];
	
	// Top-right has smaller y (or larger x if y is similar)
	// Bottom-left has larger y (or smaller x if y is similar)
	remaining.sort((a, b) => {
		const diffY = a.y - b.y;
		if (Math.abs(diffY) > 10) return diffY; // Use y if significantly different
		return b.x - a.x; // Otherwise use x (descending)
	});

	const topRight = remaining[0];
	const bottomLeft = remaining[1];

	// Return in order: TL, TR, BL, BR
	return [topLeft, topRight, bottomLeft, bottomRight];
}
