/**
 * Shared type definitions for the image processing services
 */

/**
 * Represents a 2D point with optional dragging state
 */
export interface CropPoint {
	x: number;
	y: number;
	isDragging: boolean;
}

/**
 * Represents image dimensions
 */
export interface ImageDimensions {
	width: number;
	height: number;
}

/**
 * Represents a rectangle area
 */
export interface Rectangle {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Configuration for the magnifier loupe
 */
export interface MagnifierConfig {
	radius: number;
	zoom: number;
	offset: number;
}

/**
 * Style configuration for rendering crop points
 */
export interface CropPointStyle {
	outerRadius: number;
	innerRadius: number;
	outerColor: string;
	innerColor: string;
	lineColor: string;
	lineWidth: number;
}

/**
 * Result of an operation with success status and message
 */
export interface OperationResult {
	success: boolean;
	message: string;
}

/**
 * Configuration for placeholder rendering
 */
export interface PlaceholderConfig {
	primaryText: string;
	secondaryText: string;
	backgroundColor: string;
	iconColor: string;
	textColor: string;
	secondaryTextColor: string;
}
