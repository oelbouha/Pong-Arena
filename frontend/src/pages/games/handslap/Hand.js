

class Hand {
	constructor(state, canvasHeight, PlayerHandImage) {
		this.PlayerHandImage = PlayerHandImage;
		this.height = PlayerHandImage.height
		this.state = state;
		this.bottom = state == "bottom"
		this.canvasHeight = canvasHeight

		this.initialY = -(this.PlayerHandImage.getHeight() / 2);
		if (state === "bottom")
			this.initialY = canvasHeight - (this.PlayerHandImage.getHeight() / 2);
		this.firstY = this.initialY;
		this.currentY = this.initialY;

		this.cur_y = this.initialY + this.height

		this.delta = 30
		this.initial_increment = 20
		this.hasHit = false

	}

	getWidth() {
		return this.PlayerHandImage.width;
	}
	getHeight() {
		return this.PlayerHandImage.height;
	}
	getImage() {
		return this.PlayerHandImage;
	}
	getcurrentY() {
		return this.currentY;
	}
	getInitialY() {
		return this.firstY;
	}
	setcurrentY(y) {
		this.currentY = y;
	}
	setInitialY(y) {
		this.initialY = y;
	}
	reset() { this.currentY = this.initialY }
	get y() {
		return this.currentY;
	} 
	set y(v) {
		this.currentY = v;
	}
	get upper_limit() {
		return !this.bottom ?  this.initialY + (this.height / 2 - 70) : this.initialY + 250;
	}
	get lower_limit() {
		return !this.bottom ? this.initialY - 250 : this.initialY - (this.height / 2 - 70);
	}
}

export default Hand;