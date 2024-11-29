
class game_Canvas {
	constructor(root) {
		this.canvas = root.querySelector("#gameCanvas");
		this.context = this.canvas.getContext("2d");
		if (!this.context) {
			console.error("Unable to get 2D context for canvas");
		}
		
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.widthScale = 0.6;
		this.heightScale = 0.5;
	}

	getCanvas() {
		return this.canvas;
	}

	getContext() {
		return this.context;
	}

	getWidth() {
		return this.width;
	}

	getHeight() {
		return this.height;
	}

	getCanvasWidth() {
		return this.canvas.width;
	}
	getCanvasHeight() {
		return this.canvas.height;
	}
	
	getCenterX(imageWidth) {
		return (this.width - imageWidth) / 2;
	}

	getCenterY(imageHeight) {
		return this.height / 2 - imageHeight / 2;
	}

	minWidth(width) {
		return Math.min(width, this.width * this.widthScale);
	}

	minHeight(height) {
		return Math.min(height, this.height * this.heightScale);
	}
}


export default game_Canvas;