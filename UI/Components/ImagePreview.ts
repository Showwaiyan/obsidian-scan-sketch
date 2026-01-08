import { findCropPointAtPosition } from "Services/Interaction";
// @ts-ignore - No type definitions available for perspective-transform
import PerspT from "perspective-transform";

export class ImagePreview {
	private parent: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private ratio: number;
	private img: HTMLImageElement;

	// Store image position and dimensions for future reference
	private imgX: number;
	private imgY: number;
	private imgWidth: number;
	private imgHeight: number;

	// for continous rotation
	private toRotateDegree: number;

	// for cropping points
	private croppingPointsVisible: boolean;
	private cropPoints: { x: number; y: number; isDragging: boolean }[];
	private draggedPointIndex: number;

	// for magnifier loupe
	private magnifierRadius: number;
	private magnifierZoom: number;
	private magnifierOffset: number;

	constructor(
		parent: HTMLElement,
		element: HTMLCanvasElement,
		ratio: number,
	) {
		this.parent = parent;
		this.canvas = element;
		this.ratio = ratio;
	}

	public setup() {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2D contect");
		this.ctx = ctx;

		this.parent.appendChild(this.canvas);
		this.toRotateDegree = 0;
		this.croppingPointsVisible = false;
		this.cropPoints = [];
		this.draggedPointIndex = -1;

		// Initialize magnifier settings
		this.magnifierRadius = 60;      // Size of magnifier circle (radius in pixels)
		this.magnifierZoom = 2.5;       // Magnification level
		this.magnifierOffset = 90;      // Distance from touch point (pixels)

		// Setup input event handlers (mouse and touch)
		this.setupInputEvents();

		// Wait for next frame to ensure parent has dimensions
		requestAnimationFrame(() => {
			this.resize();
			this.initializePlaceholder();
		});
	}

	private setupInputEvents() {
		// Mouse events (desktop)
		this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
		this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));

		// Touch events (mobile)
		this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
		this.canvas.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
		this.canvas.addEventListener("touchend", this.onTouchEnd.bind(this));
	}

	/**
	 * Get pointer position from mouse or touch event
	 * @param event - Mouse or Touch event
	 * @returns Position {x, y} relative to canvas, or null if invalid
	 */
	private getPointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
		const rect = this.canvas.getBoundingClientRect();

		if (event instanceof MouseEvent) {
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
		} else if (event instanceof TouchEvent && event.touches.length > 0) {
			return {
				x: event.touches[0].clientX - rect.left,
				y: event.touches[0].clientY - rect.top,
			};
		}

		return null;
	}

	private onMouseDown(event: MouseEvent) {
		// Only handle mouse events if cropping points are visible
		if (!this.croppingPointsVisible || this.cropPoints.length === 0) {
			return;
		}

		// Get mouse position relative to canvas
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		// Find which crop point (if any) was clicked
		// Use larger hit area (20px) for better precision
		const clickedIndex = findCropPointAtPosition(mouseX, mouseY, this.cropPoints, 20);

		if (clickedIndex !== -1) {
			// A crop point was clicked
			this.draggedPointIndex = clickedIndex;
			this.cropPoints[clickedIndex].isDragging = true;
			console.log(`Crop point ${clickedIndex} clicked at (${mouseX}, ${mouseY})`);
		} else {
			// No crop point was clicked
			this.draggedPointIndex = -1;
		}
	}

	private onMouseMove(event: MouseEvent) {
		// Only handle if we're currently dragging a point
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Get mouse position relative to canvas
		const rect = this.canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		// Update the dragged crop point's position
		this.cropPoints[this.draggedPointIndex].x = mouseX;
		this.cropPoints[this.draggedPointIndex].y = mouseY;

		// Redraw the image and crop points with updated positions
		this.redrawCroppingPoints();

		// Draw magnifier loupe (useful for desktop precision too)
		this.renderMagnifier(mouseX, mouseY);
	}

	private onMouseUp(event: MouseEvent) {
		// Only handle if we're currently dragging a point
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Reset dragging state for all points
		this.cropPoints.forEach(point => {
			point.isDragging = false;
		});

		// Reset the dragged point index
		this.draggedPointIndex = -1;

		// Redraw without magnifier
		this.redrawCroppingPoints();
	}

	private onTouchStart(event: TouchEvent) {
		// Only handle touch events if cropping points are visible
		if (!this.croppingPointsVisible || this.cropPoints.length === 0) {
			return;
		}

		// Prevent default to avoid scrolling while dragging
		event.preventDefault();

		// Get touch position relative to canvas
		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Find which crop point (if any) was touched
		// Use larger hit area (30px) for easier mobile touch
		const clickedIndex = findCropPointAtPosition(pos.x, pos.y, this.cropPoints, 30);

		if (clickedIndex !== -1) {
			// A crop point was touched
			this.draggedPointIndex = clickedIndex;
			this.cropPoints[clickedIndex].isDragging = true;
			console.log(`Crop point ${clickedIndex} touched at (${pos.x}, ${pos.y})`);
		} else {
			// No crop point was touched
			this.draggedPointIndex = -1;
		}
	}

	private onTouchMove(event: TouchEvent) {
		// Only handle if we're currently dragging a point
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Prevent scrolling while dragging
		event.preventDefault();

		// Get touch position relative to canvas
		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Update the dragged crop point's position
		this.cropPoints[this.draggedPointIndex].x = pos.x;
		this.cropPoints[this.draggedPointIndex].y = pos.y;

		// Redraw the image and crop points with updated positions
		this.redrawCroppingPoints();

		// Draw magnifier loupe to help with precision
		this.renderMagnifier(pos.x, pos.y);
	}

	private onTouchEnd(event: TouchEvent) {
		// Only handle if we're currently dragging a point
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Reset dragging state for all points
		this.cropPoints.forEach(point => {
			point.isDragging = false;
		});

		// Reset the dragged point index
		this.draggedPointIndex = -1;

		// Redraw without magnifier
		this.redrawCroppingPoints();
	}

	private resize() {
		const parentWidth = this.parent.clientWidth;

		// Reduced divisor from 1.4 to 1.15 for larger canvas on all devices
		const width: number = parentWidth / 1.15;
		const height: number = width / this.ratio;

		/*
		How dpr works?
			It tells you
			How many physical device's pixel(how many px canvas actually use) is equal to
			css size's pixel(how big on screen) on screen
			2 px on physical device is equal to 1 px of css size
			So, it has dpr 2.
		*/
		const dpr: number = window.devicePixelRatio || 1;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		this.canvas.width = Math.floor(width * dpr);
		this.canvas.height = Math.floor(height * dpr);

		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	/**
	 * Resize canvas to match the uploaded image's aspect ratio
	 * This ensures maximum resolution usage with no letterboxing
	 * @param imageWidth - Width of the source image
	 * @param imageHeight - Height of the source image
	 */
	private resizeToImage(imageWidth: number, imageHeight: number) {
		const parentWidth = this.parent.clientWidth;
		const parentHeight = this.parent.clientHeight;
		
		// Calculate image aspect ratio
		const imageRatio = imageWidth / imageHeight;
		
		// Start with width-constrained size
		let canvasWidth = parentWidth / 1.15;
		let canvasHeight = canvasWidth / imageRatio;
		
		// Cap maximum height at 80% of parent to leave space for buttons
		// This prevents extremely tall canvases from pushing UI off-screen
		const maxHeight = parentHeight * 0.8;
		if (canvasHeight > maxHeight) {
			canvasHeight = maxHeight;
			canvasWidth = canvasHeight * imageRatio;
		}
		
		// Apply DPR for sharp rendering
		const dpr: number = window.devicePixelRatio || 1;
		
		this.canvas.style.width = `${canvasWidth}px`;
		this.canvas.style.height = `${canvasHeight}px`;
		
		this.canvas.width = Math.floor(canvasWidth * dpr);
		this.canvas.height = Math.floor(canvasHeight * dpr);
		
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	private initializePlaceholder() {
		// Get CSS dimensions for calculations
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;

		console.log("Canvas dimensions:", cssWidth, cssHeight, "DPR:", dpr);

		// Clear canvas (use CSS dimensions because of DPR transform)
		this.ctx.clearRect(0, 0, cssWidth, cssHeight);

		// Set background color with fallback
		this.ctx.fillStyle = "#f5f5f5";
		this.ctx.fillRect(0, 0, cssWidth, cssHeight);

		const centerX = cssWidth / 2;
		const centerY = cssHeight / 2;

		// Draw icon (camera/image icon)
		const iconSize = Math.min(cssWidth, cssHeight) / 8;
		this.drawImageIcon(centerX, centerY - iconSize, iconSize);

		// Draw placeholder text
		this.ctx.fillStyle = "#888888";
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "top";

		// Primary text
		const primaryFontSize = Math.max(
			16,
			Math.min(cssWidth, cssHeight) / 20,
		);
		this.ctx.font = `${primaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		this.ctx.fillText(
			"Upload or take a picture",
			centerX,
			centerY + iconSize / 2,
		);

		// Secondary text
		const secondaryFontSize = Math.max(
			12,
			Math.min(cssWidth, cssHeight) / 40,
		);
		this.ctx.font = `${secondaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		this.ctx.fillStyle = "#aaaaaa";
		this.ctx.fillText(
			"to process your handwritten note",
			centerX,
			centerY + iconSize / 2 + primaryFontSize * 1.5,
		);
	}

	private drawImageIcon(x: number, y: number, size: number) {
		const ctx = this.ctx;

		ctx.save();
		ctx.strokeStyle = "#888888";
		ctx.fillStyle = "#888888";
		ctx.lineWidth = 2;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// Draw image frame (rectangle)
		const frameSize = size;
		const frameX = x - frameSize / 2;
		const frameY = y - frameSize / 2;

		ctx.strokeRect(frameX, frameY, frameSize, frameSize);

		// Draw mountain/landscape icon inside
		ctx.beginPath();
		// Mountain peak
		ctx.moveTo(frameX + frameSize * 0.15, frameY + frameSize * 0.7);
		ctx.lineTo(frameX + frameSize * 0.4, frameY + frameSize * 0.4);
		ctx.lineTo(frameX + frameSize * 0.65, frameY + frameSize * 0.7);
		ctx.stroke();

		// Second smaller mountain
		ctx.beginPath();
		ctx.moveTo(frameX + frameSize * 0.5, frameY + frameSize * 0.7);
		ctx.lineTo(frameX + frameSize * 0.7, frameY + frameSize * 0.5);
		ctx.lineTo(frameX + frameSize * 0.9, frameY + frameSize * 0.7);
		ctx.stroke();

		// Sun/circle in top right
		ctx.beginPath();
		ctx.arc(
			frameX + frameSize * 0.75,
			frameY + frameSize * 0.25,
			frameSize * 0.1,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		ctx.restore();
	}

	public darawImage(file: File) {
		this.img = new Image();

		this.img.onload = () => {
			// Resize canvas to match image aspect ratio (eliminates letterboxing)
			this.resizeToImage(this.img.width, this.img.height);

			// Get NEW canvas dimensions after resize
			const cssWidth = parseInt(this.canvas.style.width);
			const cssHeight = parseInt(this.canvas.style.height);

			// Clear canvas with black background
			this.ctx.clearRect(0, 0, cssWidth, cssHeight);
			this.ctx.fillStyle = "#000000";
			this.ctx.fillRect(0, 0, cssWidth, cssHeight);

			// Image fills entire canvas (no letterboxing, maximum resolution)
			this.imgX = 0;
			this.imgY = 0;
			this.imgWidth = cssWidth;
			this.imgHeight = cssHeight;

			// Draw image at full canvas size
			this.ctx.drawImage(this.img, 0, 0, cssWidth, cssHeight);

			URL.revokeObjectURL(this.img.src);
		};

		this.img.src = URL.createObjectURL(file);
	}

	private redrawImage() {
		// Get CSS dimensions
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		// Clear canvas and fill with black background
		this.ctx.clearRect(0, 0, cssWidth, cssHeight);
		this.ctx.fillStyle = "#000000";
		this.ctx.fillRect(0, 0, cssWidth, cssHeight);

		// Check if image was rotated
		if (this.toRotateDegree !== 0) {
			// Redraw with rotation
			const rad = (this.toRotateDegree * Math.PI) / 180;

			// Rotate around center of canvas
			this.ctx.save();
			this.ctx.translate(cssWidth / 2, cssHeight / 2);
			this.ctx.rotate(rad);

			// Draw image centered (fills entire canvas)
			this.ctx.drawImage(
				this.img,
				-cssWidth / 2,
				-cssHeight / 2,
				cssWidth,
				cssHeight,
			);

			this.ctx.restore();
		} else {
			// Redraw without rotation (fills entire canvas)
			this.ctx.drawImage(this.img, 0, 0, cssWidth, cssHeight);
		}
	}

	public rotate(degree: number) {
		console.log("Rotation count:", this.toRotateDegree);
		
		// Clear crop points for safety (positions become invalid after rotation)
		this.removeCroppingPoints();
		
		// Update rotation degree
		this.toRotateDegree = this.toRotateDegree + degree;
		
		// Normalize to 0-360 range
		const normalizedDegree = ((this.toRotateDegree % 360) + 360) % 360;
		
		// If at 90° or 270°, swap canvas dimensions (portrait ↔ landscape)
		if (normalizedDegree === 90 || normalizedDegree === 270) {
			// Swap: use image height as canvas width, and vice versa
			this.resizeToImage(this.img.height, this.img.width);
		} else {
			// 0° or 180°: use original image dimensions
			this.resizeToImage(this.img.width, this.img.height);
		}
		
		// Redraw the image with new rotation
		this.redrawImage();
	}

	private drawCroppingPoints() {
		// Initialize crop points at four corners of the image
		this.cropPoints = [
			{ x: this.imgX, y: this.imgY, isDragging: false }, // Top-left
			{ x: this.imgX + this.imgWidth, y: this.imgY, isDragging: false }, // Top-right
			{ x: this.imgX, y: this.imgY + this.imgHeight, isDragging: false }, // Bottom-left
			{ x: this.imgX + this.imgWidth, y: this.imgY + this.imgHeight, isDragging: false }, // Bottom-right
		];

		this.renderCroppingPoints();
		this.croppingPointsVisible = true;
	}

	private renderCroppingPoints() {
		this.ctx.save();

		// Draw connecting lines between points
		this.ctx.beginPath();
		this.ctx.moveTo(this.cropPoints[0].x, this.cropPoints[0].y); // Top-left
		this.ctx.lineTo(this.cropPoints[1].x, this.cropPoints[1].y); // Top-right
		this.ctx.lineTo(this.cropPoints[3].x, this.cropPoints[3].y); // Bottom-right
		this.ctx.lineTo(this.cropPoints[2].x, this.cropPoints[2].y); // Bottom-left
		this.ctx.closePath();
		this.ctx.strokeStyle = "#3b82f6";
		this.ctx.lineWidth = 2;
		this.ctx.stroke();

		// Draw the crop points - reduced size for better usability
		this.cropPoints.forEach((point) => {
			// Draw outer circle (white) - reduced from 15 to 12
			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
			this.ctx.fillStyle = "#ffffff";
			this.ctx.fill();
			this.ctx.strokeStyle = "#000000";
			this.ctx.lineWidth = 2;
			this.ctx.stroke();

			// Draw inner circle (blue) - reduced from 9 to 7
			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
			this.ctx.fillStyle = "#3b82f6";
			this.ctx.fill();
		});
		this.ctx.restore();
	}

	private redrawCroppingPoints() {
		// Redraw the image (this clears the old crop points)
		this.redrawImage();

		// Render crop points at their updated positions
		this.renderCroppingPoints();
	}

	/**
	 * Render a magnifying loupe at the specified position
	 * Shows a zoomed view of the area around the point being dragged
	 * @param pointX - X coordinate of the point being dragged
	 * @param pointY - Y coordinate of the point being dragged
	 */
	private renderMagnifier(pointX: number, pointY: number) {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		// Calculate magnifier position (smart positioning to avoid edges)
		let magnifierX = pointX;
		let magnifierY = pointY - this.magnifierOffset;

		// Adjust if near top edge - position below instead
		if (magnifierY - this.magnifierRadius < 0) {
			magnifierY = pointY + this.magnifierOffset;
		}

		// Adjust if near left edge
		if (magnifierX - this.magnifierRadius < 0) {
			magnifierX = this.magnifierRadius + 10;
		}

		// Adjust if near right edge
		if (magnifierX + this.magnifierRadius > cssWidth) {
			magnifierX = cssWidth - this.magnifierRadius - 10;
		}

		// Adjust if near bottom edge
		if (magnifierY + this.magnifierRadius > cssHeight) {
			magnifierY = cssHeight - this.magnifierRadius - 10;
		}

		// Save context state
		this.ctx.save();

		// Create circular clipping path for magnifier
		this.ctx.beginPath();
		this.ctx.arc(magnifierX, magnifierY, this.magnifierRadius, 0, Math.PI * 2);
		this.ctx.clip();

		// Draw magnified content
		// Calculate the source area to magnify (area around the dragged point)
		const sourceSize = (this.magnifierRadius * 2) / this.magnifierZoom;
		const sourceX = pointX - sourceSize / 2;
		const sourceY = pointY - sourceSize / 2;

		// Destination area (the magnifier circle)
		const destX = magnifierX - this.magnifierRadius;
		const destY = magnifierY - this.magnifierRadius;
		const destSize = this.magnifierRadius * 2;

		// Draw the magnified image content WITHOUT crop points
		// We need to draw directly from the source image, not from the canvas
		// Calculate the corresponding position on the original image
		
		// Convert canvas coordinates to image coordinates
		const imgRelX = sourceX - this.imgX;
		const imgRelY = sourceY - this.imgY;
		const imgRelSize = sourceSize;

		// Calculate the scale factor between displayed image and original image
		const scaleX = this.img.width / this.imgWidth;
		const scaleY = this.img.height / this.imgHeight;

		// Convert to original image coordinates
		const origX = imgRelX * scaleX;
		const origY = imgRelY * scaleY;
		const origSize = imgRelSize * scaleX;

		// Use a temporary canvas to draw clean magnified content
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = destSize;
		tempCanvas.height = destSize;
		const tempCtx = tempCanvas.getContext("2d");

		if (tempCtx) {
			// Draw directly from the original image (no crop points)
			tempCtx.drawImage(
				this.img,
				origX, origY,           // Source position on original image
				origSize, origSize,     // Source size
				0, 0,                   // Destination position
				destSize, destSize      // Destination size (magnified)
			);

			// Draw the magnified content onto main canvas
			this.ctx.drawImage(tempCanvas, destX, destY, destSize, destSize);
		}

		// Restore context (removes clipping)
		this.ctx.restore();

		// Draw magnifier border and styling
		this.ctx.save();

		// Outer shadow for depth
		this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		this.ctx.shadowBlur = 10;
		this.ctx.shadowOffsetX = 0;
		this.ctx.shadowOffsetY = 2;

		// Draw white border
		this.ctx.beginPath();
		this.ctx.arc(magnifierX, magnifierY, this.magnifierRadius, 0, Math.PI * 2);
		this.ctx.strokeStyle = "#ffffff";
		this.ctx.lineWidth = 4;
		this.ctx.stroke();

		// Draw black outer ring
		this.ctx.shadowColor = "transparent";
		this.ctx.beginPath();
		this.ctx.arc(magnifierX, magnifierY, this.magnifierRadius + 2, 0, Math.PI * 2);
		this.ctx.strokeStyle = "#000000";
		this.ctx.lineWidth = 2;
		this.ctx.stroke();

		// Draw crosshair at center to show exact position
		this.ctx.strokeStyle = "#00ff00";
		this.ctx.lineWidth = 1.5;
		this.ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
		this.ctx.shadowBlur = 2;

		// Horizontal line
		this.ctx.beginPath();
		this.ctx.moveTo(magnifierX - 12, magnifierY);
		this.ctx.lineTo(magnifierX + 12, magnifierY);
		this.ctx.stroke();

		// Vertical line
		this.ctx.beginPath();
		this.ctx.moveTo(magnifierX, magnifierY - 12);
		this.ctx.lineTo(magnifierX, magnifierY + 12);
		this.ctx.stroke();

		this.ctx.restore();
	}

	private removeCroppingPoints() {
		if (!this.croppingPointsVisible) return;


		// Redraw the image to remove the crop points
		this.redrawImage();

		this.cropPoints = [];
		this.croppingPointsVisible = false;
	}

	public toggleCroppingPoints(show: boolean): { state: boolean; message: string } {
		let state = false;
		let message = "";
		if (this.img == null) {
			state = false;
			message = "Please upload photo first!";
		} else {
			if (show) {
				this.drawCroppingPoints();
				state = true;
				message = "Cropping points displayed";
			} else {
				this.removeCroppingPoints();
				state = true;
				message = "Cropping points removed";
			}
		}
		return { state, message };
	}

	/**
	 * Helper: Calculate the distance between two points
	 */
	private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
		return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
	}

	/**
	 * Helper: Calculate output dimensions based on crop points
	 * Uses the maximum of opposite sides to preserve aspect ratio
	 */
	private calculateOutputDimensions(): { width: number; height: number } {
		if (this.cropPoints.length !== 4) {
			throw new Error("Need exactly 4 crop points to calculate dimensions");
		}

		// Calculate distances between points
		// Top edge: point 0 to point 1
		const topWidth = this.calculateDistance(this.cropPoints[0], this.cropPoints[1]);
		
		// Bottom edge: point 2 to point 3
		const bottomWidth = this.calculateDistance(this.cropPoints[2], this.cropPoints[3]);
		
		// Left edge: point 0 to point 2
		const leftHeight = this.calculateDistance(this.cropPoints[0], this.cropPoints[2]);
		
		// Right edge: point 1 to point 3
		const rightHeight = this.calculateDistance(this.cropPoints[1], this.cropPoints[3]);

		// Use maximum dimensions to avoid losing content
		const width = Math.max(topWidth, bottomWidth);
		const height = Math.max(leftHeight, rightHeight);

		// Multiply by DPR to preserve full resolution on high-DPI displays
		const dpr = window.devicePixelRatio || 1;

		return { 
			width: Math.round(width * dpr), 
			height: Math.round(height * dpr) 
		};
	}

	/**
	 * Helper: Order crop points in correct sequence (TL, TR, BL, BR)
	 * This ensures the perspective transform works correctly
	 */
	private getOrderedCropPoints(): { x: number; y: number }[] {
		if (this.cropPoints.length !== 4) {
			throw new Error("Need exactly 4 crop points");
		}

		// Copy points to avoid modifying original
		const points = [...this.cropPoints];

		// Find the top-left point (smallest sum of x + y)
		points.sort((a, b) => (a.x + a.y) - (b.x + b.y));
		const topLeft = points[0];

		// Find the bottom-right point (largest sum of x + y)
		const bottomRight = points[3];

		// Of the remaining two points, find top-right and bottom-left
		const remaining = [points[1], points[2]];
		
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

	/**
	 * Perform perspective crop transformation
	 * Transforms the quadrilateral defined by crop points into a rectangle
	 * @returns Object with success status and message
	 */
	public performPerspectiveCrop(): { success: boolean; message: string } {
		try {
			// Validate crop points exist
			if (!this.cropPoints || this.cropPoints.length !== 4) {
				return {
					success: false,
					message: "Need exactly 4 crop points. Please show crop points first.",
				};
			}

			// Validate image exists
			if (!this.img) {
				return {
					success: false,
					message: "No image loaded. Please upload an image first.",
				};
			}

			// Get ordered crop points (TL, TR, BL, BR)
			const orderedPoints = this.getOrderedCropPoints();

			// Calculate output dimensions
			const { width, height } = this.calculateOutputDimensions();

			// Validate dimensions
			if (width < 50 || height < 50) {
				return {
					success: false,
					message: "Crop area too small. Minimum dimensions: 50x50 pixels.",
				};
			}

			if (width > 5000 || height > 5000) {
				return {
					success: false,
					message: "Crop area too large. Maximum dimensions: 5000x5000 pixels.",
				};
			}

			console.log("Performing perspective crop:", {
				points: orderedPoints,
				outputDimensions: { width, height },
			});

			// IMPORTANT: Redraw the image WITHOUT crop points before capturing
			// This prevents crop points from being included in the final cropped image
			this.redrawImage();

			// Create source coordinates (current crop point positions)
			const srcPoints = [
				orderedPoints[0].x, orderedPoints[0].y, // Top-left
				orderedPoints[1].x, orderedPoints[1].y, // Top-right
				orderedPoints[2].x, orderedPoints[2].y, // Bottom-left
				orderedPoints[3].x, orderedPoints[3].y, // Bottom-right
			];

			// Create destination coordinates (corners of output rectangle)
			const dstPoints = [
				0, 0,           // Top-left
				width, 0,       // Top-right
				0, height,      // Bottom-left
				width, height,  // Bottom-right
			];

			// Create perspective transform
			const perspT = PerspT(srcPoints, dstPoints);

			// Create temporary canvas for the cropped output
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = width;
			tempCanvas.height = height;
			const tempCtx = tempCanvas.getContext("2d");

			if (!tempCtx) {
				return {
					success: false,
					message: "Failed to create temporary canvas context.",
				};
			}

			// Get current canvas state as image data for transformation
			const cssWidth = parseInt(this.canvas.style.width);
			const cssHeight = parseInt(this.canvas.style.height);
			const dpr = window.devicePixelRatio || 1;
			
			// IMPORTANT: Get image data using actual canvas dimensions (accounting for DPR)
			// The canvas internal dimensions are cssWidth * dpr × cssHeight * dpr
			const actualWidth = Math.floor(cssWidth * dpr);
			const actualHeight = Math.floor(cssHeight * dpr);
			
			// Get the current image data from the main canvas (now without crop points)
			const sourceImageData = this.ctx.getImageData(0, 0, actualWidth, actualHeight);

			// Apply perspective transformation pixel by pixel
			const outputImageData = tempCtx.createImageData(width, height);
			
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					// Transform destination coordinates to source coordinates
					const srcCoords = perspT.transformInverse(x, y);
					
					// Scale coordinates by DPR to match the actual canvas dimensions
					const srcX = Math.round(srcCoords[0] * dpr);
					const srcY = Math.round(srcCoords[1] * dpr);

					// Check if source coordinates are within bounds (using actual canvas dimensions)
					if (srcX >= 0 && srcX < actualWidth && srcY >= 0 && srcY < actualHeight) {
						// Copy pixel from source to destination
						const srcIdx = (srcY * actualWidth + srcX) * 4;
						const dstIdx = (y * width + x) * 4;

						outputImageData.data[dstIdx] = sourceImageData.data[srcIdx];         // R
						outputImageData.data[dstIdx + 1] = sourceImageData.data[srcIdx + 1]; // G
						outputImageData.data[dstIdx + 2] = sourceImageData.data[srcIdx + 2]; // B
						outputImageData.data[dstIdx + 3] = sourceImageData.data[srcIdx + 3]; // A
					} else {
						// Outside bounds - set to transparent/black
						const dstIdx = (y * width + x) * 4;
						outputImageData.data[dstIdx + 3] = 0; // Transparent
					}
				}
			}

			// Put the transformed image data onto the temporary canvas
			tempCtx.putImageData(outputImageData, 0, 0);

			// Create a new image from the cropped result
			const croppedImage = new Image();
			croppedImage.onload = () => {
				// Replace the current image with the cropped version
				this.img = croppedImage;
				
				// Reset rotation
				this.toRotateDegree = 0;

				// Resize canvas to match the cropped image dimensions
				this.resizeToImage(this.img.width, this.img.height);

				// Redraw the cropped image (fills entire canvas)
				this.redrawImage();

				// Hide crop points
				this.cropPoints = [];
				this.croppingPointsVisible = false;

				console.log("Perspective crop completed successfully");
			};

			croppedImage.src = tempCanvas.toDataURL();

			return {
				success: true,
				message: "Perspective crop applied successfully",
			};

		} catch (error) {
			console.error("Error during perspective crop:", error);
			return {
				success: false,
				message: `Crop failed: ${error.message}`,
			};
		}
	}
}
