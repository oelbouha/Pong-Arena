import game_Canvas from './Canvas.js';
import CustomImage from './Image.js';

import {imageAnimationTime, animationTime, sleep } from "./config.js" 



class OnlineBaseGame {
	constructor(root) {
		this.root = root
		this.gameCanvas = new game_Canvas(root);
		this.context = this.gameCanvas.getContext();
		this.canvas = this.gameCanvas.getCanvas();
		this.canvas.tabIndex = 0;
		this.canvas.focus();

		this.playerOneName = null
		this.playerTwoName = null
		this.isLoading = false;

		this.effectImage = new CustomImage("/assets/handslap/slap-effect.png");
		this.topAttackButton = new CustomImage("/assets/handslap/topattack.png");
		this.bottomAttackButton = new CustomImage("/assets/handslap/attack-green.png");
		
		this.topRetreatButton = new CustomImage("/assets/handslap/attack-blue.png");
		this.bottomRetreatButton = new CustomImage("/assets/handslap/buttom-retreat.png");

		this.topRematchButton = new CustomImage("/assets/handslap/top-attack.png");
		this.bottomRematchButton = new CustomImage("/assets/handslap/buttom-rematch.png");

		this.playerOneAttackButton = new CustomImage("/assets/handslap/attack-green.png");
		this.playerTwoAttackButton = new CustomImage("/assets/handslap/attack-blue.png");
		
		this.assets = [this.topAttackButton, this.bottomAttackButton, this.topRetreatButton, this.bottomRetreatButton, this.playerOneAttackButton, this.playerTwoAttackButton];
		
		this.attackColor = "#ba499f";
        this.retreatColor = "#317abf";

		this.topButton = this.topRetreatButton;
		this.bottomButton = this.bottomAttackButton;

		this.topBackgroundColor = this.retreatColor;
		this.bottomBackgroundColor = this.retreatColor

		this.waitForImagesToLoad();
		this.count = 0;
	}


	
	setPlayerOneHand(hand) {
		this.playerOneHand = hand;
	}
	
	setPlayerTwoHand(hand) {
		this.playerTwoHand = hand;
	}

	async  loadGame(message, timeToSleep) {
		this.isLoading = true;
		this.showLoadingScreen(message + " ... ");
		for (let i = 0; i < 5; i++) {
			this.showLoadingScreen(message + ` ... `);
			await sleep(timeToSleep);
		}
		this.showLoadingScreen(message + " ... ");
		this.isLoading = false;
	}

	showLoadingScreen(message) {
		this.context.fillStyle = this.retreatColor;
		this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.context.fillStyle = 'white';
		this.context.font = '35px Arial';
		this.context.textAlign = 'center';
		this.context.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
	}

	waitForImagesToLoad() {
		let loadedImages = 0;

		this.assets.forEach((image) => {
			if (image.loaded) {
				loadedImages++;
			}
		});
		if (loadedImages === this.assets.length) {
			return true;
		}
		return false;
	}

	gameLoop() {
		 // First check if game is over
		 if (this.playerOne.win || this.playerTwo.win) {
			const winner = this.playerOne.win == true ? {
				id: 'first_player', 
				name: this.playerOneName
			} : {
				id: 'second_player', 
				name: this.playerTwoName
			}
			
			this.canvas.dispatchEvent(new CustomEvent('gameover', {
				composed: true,
				bubbles: true,
				detail: {
					winner
				}
			}))

            return
        }
        if (!this.isLoading) {
            this.drawAll();
            requestAnimationFrame(() => this.gameLoop());
        }
	}

	drawBackground() {
		let canvasWidth = this.gameCanvas.getWidth();
		let canvasHeight = this.gameCanvas.getHeight();

		let shakeOffsetX = this.playerOne.shakeOffsetX || 0;
		let shakeOffsetY = this.playerOne.shakeOffsetY || 0;
		if (this.playerTwo.state === "attack") {
			shakeOffsetX = this.playerTwo.shakeOffsetX || 0;
			shakeOffsetY = this.playerTwo.shakeOffsetY || 0;
		}
		let margin = 10;
		let tophalf = canvasHeight / 2 - margin;
		let bottomhalf = canvasHeight / 2 + margin;

		this.context.fillStyle = this.topBackgroundColor;
		this.context.fillRect(shakeOffsetX, shakeOffsetY, canvasWidth, tophalf);
	
		this.context.fillStyle = this.bottomBackgroundColor;
		this.context.fillRect(shakeOffsetX, canvasHeight / 2 + shakeOffsetY, canvasWidth, bottomhalf);
	}

	drawButtons() {
		let canvasWidth = this.gameCanvas.getWidth();
		let canvasHeight = this.gameCanvas.getHeight();

		let shakeOffsetX = this.playerOne.shakeOffsetX || 0;
		if (this.playerTwo.state === "attack")
			shakeOffsetX = this.playerTwo.shakeOffsetX || 0;

		let buttonX = this.gameCanvas.getCenterX(this.topButton.width) + shakeOffsetX;
		
		let buttonY = -20 + (this.playerOne.shakeOffsetY || 0);
		
		this.topButton.draw(this.context, buttonX, buttonY);
		
		buttonX = this.gameCanvas.getCenterX(this.bottomButton.width) + shakeOffsetX;
		buttonY = canvasHeight - 110 + (this.playerTwo.shakeOffsetY || 0);
		this.bottomButton.draw(this.context, buttonX, buttonY);
	}

	drawHands() {
		let playerTwoHandX = this.gameCanvas.getCenterX(this.playerOneHand.width);
		let playerTwoHandY = this.playerOne.getHandCurrentY();
		
		let playerOneHandX = this.gameCanvas.getCenterX(this.playerOneHand.width);
		let playerOneHandY = this.playerTwo.getHandCurrentY()
		
		if (this.playerOne.state === "attack") {
			this.playerOneHand.draw(this.context, playerOneHandX, playerOneHandY);
			this.playerTwoHand.draw(this.context, playerTwoHandX, playerTwoHandY, true);
		}
		else {
			this.playerTwoHand.draw(this.context, playerTwoHandX, playerTwoHandY, true);
			this.playerOneHand.draw(this.context, playerOneHandX, playerOneHandY);
		}
	}

	clearCanvas() {
		let canvasWidth = this.gameCanvas.getWidth();
		let canvasHeight = this.gameCanvas.getHeight();
		this.context.clearRect(0, 0, canvasWidth, canvasHeight);
	}


	drawAll() {
		this.clearCanvas();
        if (this.playerOne.state === "attack") {
			this.topBackgroundColor = this.attackColor;
            this.bottomBackgroundColor = this.retreatColor;
            this.topButton = this.topAttackButton;
            this.bottomButton = this.bottomRetreatButton;
        } else {
			this.topBackgroundColor = this.retreatColor;
            this.bottomBackgroundColor = this.attackColor;
            this.topButton = this.topRetreatButton;
            this.bottomButton = this.bottomAttackButton;
        }
        
        this.drawBackground();
        this.drawScore();
        
        // Only draw hands if game is not over
        if (!this.playerOne.win && !this.playerTwo.win) {
			this.drawHands();
            this.drawButtons();
        }
		if (this.playerOne.wasHit || this.playerTwo.wasHit) {
			const player = this.playerOne.state == "attack" ? this.playerOne: this.playerTwo

			const x = (this.canvas.width / 2) - (player.slapEffectImage.width / 2)
			let y = player.opponent.hand.y  + player.opponent.hand.height - player.slapEffectImage.height + 20
			if (player.position == "top")
				y = player.opponent.getHandCurrentY() - 20

			player.slapEffectImage.draw(this.context, x, y);
			player.slapEffectImage1.draw(this.context, x,  y);
			this.count++
			if (this.count == 3) {
				this.count = 0
				this.playerOne.wasHit = false
				this.playerTwo.wasHit = false
			}
		}
	}
	drawScore() {
		this.canvas.dispatchEvent(new CustomEvent('scoreupdate', {
			composed: true,
			bubbles: true,
			cancelable: true,
			detail: {
				first_player: this.playerOne.score,
				second_player: this.playerTwo.score
			}
		}))
	}

	isButtonClicked(x, y) {
		let res = x <=  this.gameCanvas.getWidth() && y <=  this.gameCanvas.getHeight();
		return res;
	}

	getCanvas() {
		return this.canvas;
	}
}

export default OnlineBaseGame;
