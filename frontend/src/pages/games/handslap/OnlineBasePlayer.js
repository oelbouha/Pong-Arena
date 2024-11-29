import CustomImage from "./Image.js";
import Hand from "./Hand.js";


// Variables for shaking effect
let shakeDuration = 600; // Duration of the shake in milliseconds
let shakeMagnitude = 16; // Magnitude of the shake


class OnlineBasePlayer {
	constructor(position, initialRole, canvas, PlayerHandImage, game) {
		this.game = game;
		this.state = initialRole;
		this.position = position;
		this.handImage = PlayerHandImage;
		this.canvas = canvas;
		this.opponent = null;


		this.slapEffectImage = new CustomImage("/assets/handslap/slap-effect.png");
		this.slapEffectImage1 = new CustomImage("/assets/handslap/slap.png");
		this.missedImage = new CustomImage("/assets/handslap/missed.png");

		this.hand = new Hand(this.position, this.canvas.height, this.handImage);

		this.pauseTimeOut = 400;
		this.handCurrentY = this.hnadInitialY;

		this.isPlayerHit = false
		this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.isShaking = false;
        this.wasHit = false;
		this.shakeTime = 0
		this.win = false
		this.score = 0
		this.animating = false
	}

	shakeCanvas() {
        if (this.shakeTime > 0) {
            this.isShaking = true;
            // Calculate random shake offsets
            this.shakeOffsetX = Math.random() * shakeMagnitude - shakeMagnitude / 2;
            this.shakeOffsetY = Math.random() * shakeMagnitude - shakeMagnitude / 2;

            // Reduce the shake time
            this.shakeTime -= 16; // Assuming 60 frames per second

            // Continue shaking until time runs out
            requestAnimationFrame(() => this.shakeCanvas());
        } else {
            // Reset shake offsets
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this.isShaking = false;
			this.shakeTime = 0
        }
    }
	setOpponent(opponent) {
		this.opponent = opponent;
	}

	startAnimation(type) {
		if (type!= "attack" && type != "retreat") return
		if (type== "attack") {
			if (this.position == "top")
				this.animateHand(this.getHand(), true)
			else
				this.animateHand(this.getHand())
		}
		else if (type== "retreat") {
			if (this.position == "top")
				this.animateHand(this.getHand())
			else
				this.animateHand(this.getHand(), true)
		}
	}

	shake() {
		this.wasHit = true
		this.shakeTime = shakeDuration
		this.shakeCanvas()
	}

	reset(hand) {
		hand.reset()
		this.isPlayerHit = false;
		this.opponent.isPlayerHit = false
		this.animating = false
	}
	async animateHand(hand, up = false) {
		if (this.isPlayerHit) return 
		const delta = 30, speed_up_dist = (hand.upper_limit - hand.lower_limit) * .3
		const initial_y = hand.y, initial_increment = 30
		let inc = initial_increment
		
		this.pauseTimeOut = 500
		window.hand = hand

		this.animating = true
		const animationStepper = () => {
			hand.y = hand.y + (up ? inc : -inc)
			if (Math.abs(hand.y - initial_y) < speed_up_dist) inc += initial_increment

			if (up && hand.y >= hand.upper_limit) {
				hand.y = hand.upper_limit
				this.pauseTimeOut *= 2
				setTimeout(() => {this.reset(hand)}, this.pauseTimeOut)
				return
			}
			else if (!up && hand.y <= hand.lower_limit) {
				hand.y = hand.lower_limit
				this.pauseTimeOut *= 2
				setTimeout(() => {this.reset(hand)}, this.pauseTimeOut)
				return
			}
			else {
				setTimeout(animationStepper, delta)
			}
		}
		animationStepper()
	}

	resetHandPosition() {
        this.handCurrentY = this.hand.getInitialY();
    }

	getHand() {
		return this.hand;
	}
	getHandCurrentY() {
		return this.hand.y;
	}
}

export default OnlineBasePlayer; 