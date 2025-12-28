/**
 * Check if a point is inside a circular shape
 * @param mouseX - X coordinate of the mouse click
 * @param mouseY - Y coordinate of the mouse click
 * @param shapeX - X coordinate of the shape center
 * @param shapeY - Y coordinate of the shape center
 * @param radius - Radius of the circular shape
 * @returns true if the point is inside the shape, false otherwise
 */
export function isPointInsideCircle(
	mouseX: number,
	mouseY: number,
	shapeX: number,
	shapeY: number,
	radius: number,
): boolean {
	const distance = Math.sqrt(
		Math.pow(mouseX - shapeX, 2) + Math.pow(mouseY - shapeY, 2),
	);
	return distance <= radius;
}

/**
 * Check if a point is inside a rectangular shape
 * @param mouseX - X coordinate of the mouse click
 * @param mouseY - Y coordinate of the mouse click
 * @param rectX - X coordinate of the rectangle's top-left corner
 * @param rectY - Y coordinate of the rectangle's top-left corner
 * @param rectWidth - Width of the rectangle
 * @param rectHeight - Height of the rectangle
 * @returns true if the point is inside the rectangle, false otherwise
 */
export function isPointInsideRectangle(
	mouseX: number,
	mouseY: number,
	rectX: number,
	rectY: number,
	rectWidth: number,
	rectHeight: number,
): boolean {
	return (
		mouseX >= rectX &&
		mouseX <= rectX + rectWidth &&
		mouseY >= rectY &&
		mouseY <= rectY + rectHeight
	);
}

/**
 * Check if a point is inside any of the crop points (circular shapes)
 * @param mouseX - X coordinate of the mouse click
 * @param mouseY - Y coordinate of the mouse click
 * @param cropPoints - Array of crop point objects with x, y coordinates
 * @param radius - Radius of the crop point circles (default: 10)
 * @returns Index of the crop point if found, -1 otherwise
 */
export function findCropPointAtPosition(
	mouseX: number,
	mouseY: number,
	cropPoints: { x: number; y: number }[],
	radius: number = 10,
): number {
	for (let i = 0; i < cropPoints.length; i++) {
		if (
			isPointInsideCircle(
				mouseX,
				mouseY,
				cropPoints[i].x,
				cropPoints[i].y,
				radius,
			)
		) {
			return i;
		}
	}
	return -1;
}
