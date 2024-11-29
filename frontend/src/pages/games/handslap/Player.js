import CustomImage from "./Image.js";
import Hand from "./Hand.js";
import game  from "./OfflineBaseGame.js";


// Variables for shaking effect
let shakeDuration = 600; // Duration of the shake in milliseconds
let shakeMagnitude = 16; // Magnitude of the shake


// const colorContainer = document.getElementById("color-container")

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


class Player {
	constructor(position, initialRole, canvas, PlayerHandImage, context, assets, game) {
		this.game = game;
		this.assets = assets;
		this.context = context;
		this.state = initialRole;
		this.position = position;
		this.handImage = PlayerHandImage;
		this.canvas = canvas;
		this.opponent = null;
		// this.canvasWidth = canvas.width;
		this.canvasHeight = canvas.height;
		
		this.slapEffectImage = new CustomImage("/assets/handslap/slap-effect.png");
		this.slapEffectImage1 = new CustomImage("/assets/handslap/slap.png");
		this.missedImage = new CustomImage("/assets/handslap/missed.png");
		this.win = false;
		this.winScore = this.game.winScore;
		this.gameOver = false


		this.isPlayerHit = false
		this.animating = false
		this.shakeTime = 0
		this.score = 0;
	}
	
	initPlayer() {
		this.hand = new Hand(this.position, this.canvasHeight, this.handImage);
		
		if (this.position === "top") {
			this.maxAttackHeight = this.hand.getInitialY() + this.maxAtack;
			this.maxRetreat = this.hand.getInitialY() - this.maxRetreat;
		}
		if (this.position === "bottom") {
			this.maxAttackHeight = this.hand.getInitialY() - this.maxAtack;
			this.maxRetreat = this.hand.getInitialY() + this.maxRetreat;
		}
		this.hnadInitialY = this.hand.getInitialY();
		this.handCurrentY = this.hnadInitialY;

		this.isPlayerHit = false

		this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.isShaking = false;
	}

	shake() {
		this.wasHit = true
		this.shakeTime = shakeDuration
		this.shakeCanvas()
	}
	setOpponent(opponent) {
		this.opponent = opponent;
	}

	shakeCanvas() {
        if (this.shakeTime > 0) {
            this.isShaking = true;
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
        }
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

	isHitTheOpponent() {
		const range = 80;
		let res = false
		if (this.position == "bottom") {
			res = this.hand.y  < this.opponent.hand.y + this.opponent.hand.height - range
		}
		else if (this.position == "top") {
			res = this.hand.y + this.hand.height  > this.opponent.hand.y  + range
		}
		return res;
	}

	async switchRoles() {
		await sleep(100)
		await this.game.loadGame("Switching Roles", 300);
		const temp = this.state
		this.state = this.opponent.state
		this.opponent.state = temp
		this.game.gameLoop();
	}

	async checkCollision() {
		if (this.isHitTheOpponent()) {
			this.wasHit = true
			this.score++
			if (this.score >= this.winScore) {
				this.gameOver = true
				await sleep(2000)
				this.win = true
			}
			this.isPlayerHit = true;
			this.shake()
			this.opponent.shake()
		}
		else if (this.state == "attack")
			this.switchRoles()
	}
	reset(hand) {
		hand.reset()
		this.isPlayerHit = false;
		this.animating = false
	}
	animateHand(hand, up = false) {
		if (this.isPlayerHit || this.opponent.isPlayerHit || this.animating || this.gameOver)   return 
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
				this.checkCollision()
				this.pauseTimeOut *= 2
				setTimeout(() => {this.reset(hand)}, this.pauseTimeOut)
				return
			}
			else if (!up && hand.y <= hand.lower_limit) {
				hand.y = hand.lower_limit
				this.pauseTimeOut *= 2
				this.checkCollision()
				setTimeout(() => {this.reset(hand)}, this.pauseTimeOut)
				return
				}
			else {
				setTimeout(animationStepper, delta)
			}
		}
		animationStepper()
	}

	getHand() {
		return this.hand;
	}

	getState() {
		return this.state;
	}

	setState(state) {
		this.state = state;
	}
	getPlayerState() {
		return this.isInAction
	}
	getHandCurrentY() {
		return this.handCurrentY;
	}
}

export default Player; 



