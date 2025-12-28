import { beforeEach, vi } from "vitest";

// Create a shared mock context that persists across operations
let mockCtx: any;

// Mock HTMLCanvasElement methods that are not available in happy-dom
beforeEach(() => {
	// Initialize fresh mocks for each test
	mockCtx = {
		canvas: document.createElement("canvas"),
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 0,
		lineCap: "",
		lineJoin: "",
		textAlign: "",
		textBaseline: "",
		font: "",
		setTransform: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		translate: vi.fn(),
		rotate: vi.fn(),
		scale: vi.fn(),
		drawImage: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		closePath: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
		arc: vi.fn(),
		fillText: vi.fn(),
		strokeRect: vi.fn(),
	};

	// Mock canvas getContext to return our shared mock
	HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
		if (contextType === "2d") {
			return mockCtx as unknown as CanvasRenderingContext2D;
		}
		return null;
	});

	// Mock Image
	global.Image = class Image {
		src = "";
		width = 800;
		height = 600;
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;

		constructor() {
			setTimeout(() => {
				if (this.onload) {
					this.onload();
				}
			}, 0);
		}
	} as any;

	// Mock URL.createObjectURL and revokeObjectURL
	global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
	global.URL.revokeObjectURL = vi.fn();

	// Mock window.devicePixelRatio
	Object.defineProperty(window, "devicePixelRatio", {
		writable: true,
		configurable: true,
		value: 2,
	});

	// Mock requestAnimationFrame
	global.requestAnimationFrame = vi.fn((cb) => {
		cb(0);
		return 0;
	});
});
