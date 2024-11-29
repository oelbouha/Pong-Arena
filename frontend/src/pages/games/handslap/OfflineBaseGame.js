import game_Canvas from './Canvas.js';
import CustomImage from './Image.js';
import { addEventListener } from "../../../utils/index.js";

import {imageAnimationTime, animationTime } from "./config.js"

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



class OfflineBaseGame {
	constructor(root, playerOneHand = null, playerTwoHand = null, winScore, playerOneName, playerTwoName) {
		this.root = root
		this.eventListeners = []
		this.gameCanvas = new game_Canvas(root);
		this.context = this.gameCanvas.getContext();
		this.canvas = this.gameCanvas.getCanvas();
		this.canvas.tabIndex = 0;
		this.canvas.focus();

		this.gameOver = false

		this.playerOneName = playerOneName
		this.playerTwoName = playerTwoName

		this.colorTransitionActive = false;

		this.winScore = winScore
		this.isLoading = false;


		this.effectImage = new CustomImage("/assets/handslap/slap-effect.png");
		if (playerOneHand)
			this.playerOneHand = new CustomImage(playerOneHand);
		if (playerTwoHand)
			this.playerTwoHand = new CustomImage(playerTwoHand);

		this.topAttackButton = new CustomImage("/assets/handslap/topattack.png");
		this.bottomAttackButton = new CustomImage("/assets/handslap/attack-green.png");
		
		this.topRetreatButton = new CustomImage("/assets/handslap/attack-blue.png");
		this.bottomRetreatButton = new CustomImage("/assets/handslap/buttom-retreat.png");

		this.playerOneAttackButton = new CustomImage("/assets/handslap/attack-green.png");
		this.playerTwoAttackButton = new CustomImage("/assets/handslap/attack-blue.png");
		
		this.assets = [this.effectImage, this.topAttackButton, this.bottomAttackButton, this.topRetreatButton, this.bottomRetreatButton, this.playerOneAttackButton, this.playerTwoAttackButton];
		
		this.attackColor = "#ba499f";
		this.retreatColor = "#317abf";

		this.topButton = this.topRetreatButton;
		this.bottomButton = this.bottomAttackButton;

		this.topBackgroundColor = "#ba499f";
		this.bottomBackgroundColor = "#E69A8DFF";

		this.cooldownPeriod = 800;
        this.playerOneLastActionTime = 0;
        this.playerTwoLastActionTime = 0;
		this.count = 0
		this.waitForImagesToLoad()
		this.setupEventListener()
	}

	setupEventListener() {
		this.eventListeners.push(
            addEventListener(this.canvas, 'click', this.handleCanvasClick.bind(this)),
            addEventListener(this.canvas, 'keydown', this.handleKeyPress.bind(this)),
        )
	}
	setPlayerOneHand(hand) {
		this.playerOneHand = hand;
	}
	
	setPlayerTwoHand(hand) {
		this.playerTwoHand = hand;
	}

	async  loadGame(message, timeToSleep) {
		this.isLoading = true;
		this.showLoadingScreen(message + " ... 0%");
		for (let i = 0; i < 5; i++) {
			this.showLoadingScreen(message + ` ... ${i * 20}%`);
			await sleep(timeToSleep);
		}
		this.showLoadingScreen(message + " ... 100%");
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

	async resetPlayers() {
		this.clearCanvas();
		if (this.playerTwo.win) {
			this.playerOne.state = "attack";
			this.playerTwo.state = "retreat";
			this.topBackgroundColor = this.attackColor;
			this.bottomBackgroundColor = this.retreatColor;
			this.topButton = this.topAttackButton;
			this.bottomButton = this.bottomRetreatButton;
		}
		else {
			this.playerOne.state = "retreat";
			this.playerTwo.state = "attack";
			this.topBackgroundColor = this.retreatColor;
			this.bottomBackgroundColor = this.attackColor;
			this.topButton = this.topRetreatButton;
			this.bottomButton = this.bottomAttackButton;
		}

		this.playerOne.handCurrentY = this.playerOne.hand.getInitialY();
		this.playerTwo.handCurrentY = this.playerTwo.hand.getInitialY();
		this.playerOne.score = 0;
		this.playerTwo.score = 0;
		this.playerOne.win = false;
		this.playerTwo.win = false;
		this.isLoading = false;
		this.playerOne.isFrozen = false;
		this.playerTwo.isFrozen = false;
		this.playerOne.gameOver = false
		this.playerTwo.gameOver = false
		this.playerTwo.wasHit = false
		this.playerOne.wasHit = false
		this.playerOne.isPlayerHit = false
		this.playerTwo.isPlayerHit = false
	}

	async restartGame() {
		this.gameOver = false
		await this.resetPlayers();
		
		const loadingContainer = this.root.querySelector("#loading-container")
		const loading = this.root.querySelector("#loading-info")
		const loadingHeader = this.root.querySelector("#loading-header")
		const loadingBody =   this.root.querySelector("#loading-body")
		const gameSelectionDiv = this.root.querySelector("#game-home")
		const fronDiv = this.root.querySelector("#gameFront");
		const canvasContainer = this.root.querySelector("#canvasContainer");
		
		// await this.loadGame("Restarting Game", 400);
		gameSelectionDiv.style.display = "none"
		canvasContainer.style.display = "none"
		fronDiv.style.display = "flex";
		loadingContainer.style.display = "flex"
		
		loading.classList.remove('animate-out-left')
		loading.classList.add('animate-in');
		
		loadingHeader.textContent = "restarting game"
		loadingBody.textContent = ""
		await sleep(animationTime)
		loading.classList.remove('animate-in')
		loading.classList.add('animate-out-left')
		await sleep(imageAnimationTime)
		fronDiv.style.display = "none";
		loadingContainer.style.display = "none"
		canvasContainer.style.display = "flex"

		this.gameLoop();
	}

	gameLoop() {
		
		if (this.topBackgroundColor != this.oldTopColor) {
			this.root.dispatchEvent(new CustomEvent('players:colors', {
				composed: true,
				bubbles: true,
				detail: {
					playerOne: this.topBackgroundColor,
					playerTwo: this.bottomBackgroundColor
				}
			}))
			this.oldTopColor = this.topBackgroundColor
		}
		
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
		let playerTwoHandY = this.playerOne.hand.y;
		
		let playerOneHandX = this.gameCanvas.getCenterX(this.playerOneHand.width);
		let playerOneHandY = this.playerTwo.hand.y
		
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

	drawWinner() {
		let winnerY = this.gameCanvas.getHeight() - this.playerOne.handHeight / 2;
		let loserY = this.playerOne.handHeight / 2 - this.winImage.height;
		if (this.playerOne.win) {
			winnerY = this.playerOne.handHeight / 2 - this.winImage.height;
			loserY = this.gameCanvas.getHeight() - this.playerOne.handHeight / 2;
		}
		this.winImage.draw(this.context, this.gameCanvas.getCenterX(this.winImage.width), winnerY);
		this.loseImage.draw(this.context, this.gameCanvas.getCenterX(this.loseImage.width), loserY);
		
		this.topButton = this.topRematchButton;
		this.bottomButton = this.bottomRematchButton;
	}

	drawAll() {
		this.clearCanvas();
        if (this.playerOne.state === "attack" && this.playerOne.position === "top") {
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

	async switchColors() {
		
		this.colorTransitionActive = true;
		let temp = this.topBackgroundColor;
		this.topBackgroundColor = this.bottomBackgroundColor;
		this.bottomBackgroundColor = temp;
	  
	}

	handleKeyPress(event) {
		const key = event.key;

		if (this.gameOver) return
		if (key == "w" && this.playerOne.state == "retreat")
			this.handlePlayeAction("retreat", key)
		else if (key == "ArrowDown" && this.playerTwo.state == "retreat")
			this.handlePlayeAction("retreat", key)
		else if (key == "s" && this.playerOne.state == "attack")
			this.handlePlayeAction("attack", key)
		else if (key == "ArrowUp" && this.playerTwo.state == "attack")
			this.handlePlayeAction("attack", key)
	}

	handleCanvasClick(event) {
        let rect = this.canvas.getBoundingClientRect();
        let x = event.pageX - rect.left;
        let y = event.pageY - rect.top;

        if (this.isButtonClicked(x, y, this.topButton)) {
			if (this.playerOne.win || this.playerTwo.win) {
				return this.handlePlayeAction("game over", "mouseTop");
			}
			this.handlePlayeAction(this.playerOne.state, "mouseTop");
		}
		if (this.isButtonClicked(x, y, this.bottomButton)) {
			if (this.playerOne.win || this.playerTwo.win) {
				return this.handlePlayeAction("game over", "mouseButtom");
			}
			this.handlePlayeAction(this.playerTwo.state, "mouseButtom");
        }
    }

	drawScore() {
		const	margin = 10;
		const	fontSize = 50;
		const	scoreX = this.gameCanvas.getCanvasWidth() - 100;
		const	canvasCenter = this.gameCanvas.getCanvasHeight() / 2 - margin;

		this.context.font = "50px Arial";
		this.context.fillStyle = "white";
		this.context.fillText(this.playerOne.score, scoreX, canvasCenter - 50 - margin);
		this.context.fillText(this.playerTwo.score, scoreX, canvasCenter + 50  + fontSize);
		
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

	isButtonClicked(x, y, image) {
		let imgX = image.x < 0 ? 0 : image.x;
		let imgY = image.y < 0 ? 0 : image.y;
		let res = x >= imgX && x <= imgX + image.width && y >= imgY && y <= imgY + image.height;
		return res;
	}

	getCanvas() {
		return this.canvas;
	}
}

export default OfflineBaseGame;



