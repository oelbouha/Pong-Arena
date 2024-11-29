
class Button {
	constructor(x, y, width, height, text, color) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.text = text;
		this.color = color;
	}
	
	draw(context) {
		const canvasWidth = context.canvas.width;
		const canvasHeight = context.canvas.height;
		
		const xpos = (canvasWidth - this.width) / 2;
		const ypos = (canvasHeight - this.height) / 2 + 230;
		
		context.fillStyle = this.color || "red";
		context.fillRect(xpos, ypos, this.width, this.height);
		
		context.strokeStyle = "black";
		context.lineWidth = 10;
		
		context.fillStyle = "black";
		context.font = "30px Arial";
		
		
		context.textAlign = "center";
		context.textBaseline = "middle";
		
		const textXpos =  xpos + this.width / 2;
		const textYpos = ypos + this.height / 2;
		context.fillText(this.text, textXpos, textYpos);
	}

	isClicked(x, y) {
		const canvasWidth = context.canvas.width;
		const canvasHeight = context.canvas.height;
		
		const buttonX = (canvasWidth - this.width) / 2;
		const buttonY = (canvasHeight - this.height) / 2 + 230;

		return (
			x >= buttonX &&
			x <= buttonX + this.width &&
			y >= buttonY &&
			y <= buttonY + this.height
			);
		}
}

export default Button;