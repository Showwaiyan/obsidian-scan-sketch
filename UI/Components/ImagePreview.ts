export class ImagePreview {
	private parent: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;

	constructor(parent: HTMLElement, element: HTMLCanvasElement) {
		this.parent = parent;
		this.canvas = element;
	}

	public setup(width: number, height: number) {

		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2D contect");
		this.ctx = ctx;

		this.parent.appendChild(this.canvas);

		this.resize(width, height);
	}

	private resize(width: number, height: number) {
		// How dpr work
		// It tells how many physical device's pixel(how many px canvas actually use) is equal
		// css size(how big on screen) pixel on screen
		// 2 px on physical device is equal to 1 px of css size
		// it has dpr 2
		const dpr: number = window.devicePixelRatio || 1;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		this.canvas.width = Math.floor(width * dpr);
		this.canvas.height = Math.floor(height * dpr);

		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
}
