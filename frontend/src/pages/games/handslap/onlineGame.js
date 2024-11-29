import CustomImage from './Image.js';
import OnlineBaseGame from './OnlineBaseGame.js'
import OnlineBasePlayer from './OnlineBasePlayer.js'
import { backgroundColors, handImages, imageAnimationTime, animationTime, sleep } from "./config.js"
import { addEventListener } from "../../../utils/index.js";


let handIndex = null
let index = 0;

let socket

class gameCustomizer {
	constructor(root) {
		this.eventListeners = []
		this.root = root
		this.gameSelectionDiv = this.root.querySelector("#game-home")
		this.slideContainer = this.root.querySelector("#slide-container")
		this.background = this.root.querySelector("#image-container")
		this.playerHandImage = this.root.querySelector("#playerHandImage")
		this.imageContainer = this.root.querySelector("#image")
		this.readybtn = this.root.querySelector("#readyBtn");
		this.fronDiv = this.root.querySelector("#gameFront");
		this.gameIntroContainer = root.querySelector("#game-intro")
		this.gameHome = root.querySelector("#game-home");
		this.nextBtn = this.root.querySelector("#nextBtn");
		this.prevBtn = this.root.querySelector("#prevBtn");


		this.imageIsAnimating = false
		this.setupEventListeners()
	}

	setupEventListeners() {
		this.eventListeners.push(
			addEventListener(this.nextBtn, 'click', this.handleNextClick.bind(this)),
			addEventListener(this.prevBtn, 'click', this.handlePrevClick.bind(this)),
		)
	}

	handlePrevClick() {
		if (this.imageIsAnimating) return
		this.playerHandImage.classList.add('animate-handOut');

		--index;
		if (index < 0) {
			index = handImages.length - 1;
		}
		this.updateImage();
		this.setActive(index);
		setTimeout(() => {

		}, imageAnimationTime);
	}
	handleNextClick() {
		if (this.imageIsAnimating) return

		this.playerHandImage.classList.add('animate-handOut');

		++index;
		if (index >= handImages.length) {
			index = 0;
		}
		this.updateImage();
		this.setActive(index);
		setTimeout(() => {
		}, imageAnimationTime);
	}
	async initIntroAnimation() {
		this.gameHome.style.display = "none"
		this.gameIntroContainer.style.display = "flex"

		const firstName = this.root.querySelector("#first-name")
		const lastName = this.root.querySelector("#last-name")
		const gameLogo = this.root.querySelector("#game-logo")

		firstName.classList.add('animate-in-top')
		lastName.classList.add('animate-in-bottom')
		gameLogo.classList.add('animate-in-right')
		await sleep(animationTime)
		gameLogo.classList.add('animate-out-left')
		lastName.classList.add('animate-out-bottom')
		firstName.classList.add('animate-out-top')
		await sleep(animationTime)
		this.gameHome.style.display = "flex"
		this.gameIntroContainer.style.display = "none"
	}
	start() {
		this.initIntroAnimation()
		this.initializeUI()
		this.initAnimation()
	}
	initAnimation() {
		this.background.classList.add('animate-in');
		this.background.style["background"] = backgroundColors[index]
		this.imageIsAnimating = true;

		setTimeout(() => {
			this.imageContainer.style.display = "flex"
			this.imageContainer.classList.add('animate-in');
			this.imageIsAnimating = false

			this.playerHandImage.classList.add('animate-handIn');
		}, imageAnimationTime)

		this.imageContainer.style["background"] = backgroundColors[index]
	}

	setActive(currentIndex) {
		const dots = this.slideContainer.children;
		Array.from(dots).forEach(dot => {
			dot.style.background = backgroundColors[0]
			dot.classList.remove('active')
		});

		dots[currentIndex].style.background = backgroundColors[currentIndex]
		index = currentIndex;
		this.updateImage();

		setTimeout(() => {
			this.imageIsAnimating = false;
		}, this.animationTime);
	}

	initializeUI() {
		this.slideContainer.innerHTML = ``
		this.imageContainer.style.display = "none";

		// Create progress dots
		for (let i = 0; i < handImages.length; i++) {
			const dot = document.createElement('div');
			dot.className = 'progress-dot';
			if (i === 0) {
				// dot.classList.add('active');
				dot.style.background = backgroundColors[0]
			}
			this.eventListeners.push(
				addEventListener(dot, 'click', () => {
					if (!this.imageIsAnimating) {
						this.imageIsAnimating = true;
						this.setActive(i);
					}
				})
			)
			this.slideContainer.appendChild(dot);
		}
	}

	updateImage() {
		this.background.classList.remove('animate-in', 'animate-out');
		void this.background.offsetWidth;
		this.background.classList.add('animate-in');
		this.background.style.background = backgroundColors[index];

		this.imageContainer.classList.remove('animate-in', 'animate-out');
		void this.imageContainer.offsetWidth;
		this.imageContainer.classList.add('animate-in');
		this.imageContainer.style.background = backgroundColors[index];

		this.imageIsAnimating = true;

		setTimeout(() => {
			this.playerHandImage.classList.remove('animate-handIn', 'animate-handOut');
			void this.playerHandImage.offsetWidth;
			this.playerHandImage.src = handImages[index];
			this.playerHandImage.classList.add('animate-handIn');
		}, this.imageAnimationTime);

		setTimeout(() => {
			this.imageIsAnimating = false;
		}, this.animationTime);
	}

	cleanup() {
		this.eventListeners.forEach(ev => ev.unregister())
		this.eventListeners = []
	}

}


class OnlineGame extends OnlineBaseGame {
	constructor(root, soc) {
		super(root);

		socket = soc
		this.root = root;
		this.eventListeners = []
		this.playerIsHit = false
		this.pauseTimeOut = 500

		this.readybtn = this.root.querySelector("#readyBtn");
		this.gameSelectionDiv = this.root.querySelector("#game-home")
		this.fronDiv = this.root.querySelector("#gameFront");
		this.loadingContainer = this.root.querySelector("#loading-container")
		this.loadingInfo = this.root.querySelector("#loading-info")
		this.loadingHeader = this.root.querySelector("#loading-header")
		this.loadingBody = this.root.querySelector("#loading-body")
		this.winScoreElem = this.root.querySelector('.win-score')

		this.start_game = false;
		this.playerOneHandPath = null;
		this.playerTwoHandPath = null;
		this.playerOne = null;
		this.playerTwo = null;
		this.gameOver = false
		this.gamePaused = false

		this.playAgainBtn = this.root.querySelector("#retry")
		this.playAgainBtn.addEventListener('click', this.handlePlayAgain.bind(this), { once: true })

		this.winScore = null
		this.gameCustomizer = new gameCustomizer(root)
		this.setupEventListener();
		this.connectWebSocket();
	}

	setupEventListener() {
		this.eventListeners.push(
            addEventListener(this.canvas, 'click', this.handleCanvasClick.bind(this)),
            addEventListener(this.canvas, 'keydown', this.handleKeyPress.bind(this)),
        )
	}
	handlePlayAgain() {
		this.cleanup()
	}

	async setupHands() {
		index = 0;
		this.gameCustomizer.updateImage();
		this.readybtn.addEventListener('click', () => {
			handIndex = index;
			this.gameSelectionDiv.style.display = "none"
			this.loadingContainer.style.display = "flex"
			this.loadingHeader.textContent = "Waiting ... "
			this.loadingBody.textContent = "Waiting for other player to be ready ..."
			this.loadingInfo.classList.add('animate-in');
		}, { once: true });

		while (handIndex == null) {
			await sleep(200);
		}

		return handIndex
	}

	async initGame() {
		const playerOneHand = new CustomImage(this.playerOneHandPath);
		const playerTwoHand = new CustomImage(this.playerTwoHandPath);
		this.loadingInfo.classList.remove('animate-in')
		this.loadingInfo.classList.add('animate-out-left');
		await sleep(animationTime / 2)
		this.loadingInfo.classList.remove('animate-out-left');
		this.loadingInfo.classList.remove('animate-in');
		this.loadingContainer.style.display = "flex"
		this.loadingHeader.textContent = "Starting game"
		this.loadingBody.textContent = `${this.playerOneName} vs ${this.playerTwoName}`
		this.loadingInfo.classList.add('animate-in');
		await sleep(animationTime)
		this.fronDiv.style.display = "none"
		this.loadingContainer.style.display = "none"
		super.setPlayerOneHand(playerTwoHand);
		super.setPlayerTwoHand(playerOneHand);

		this.playerOne = new OnlineBasePlayer("top", "retreat", this.gameCanvas, playerOneHand, this);
		this.playerTwo = new OnlineBasePlayer("bottom", "attack", this.gameCanvas, playerTwoHand, this);

		this.playerOne.setOpponent(this.playerTwo);
		this.playerTwo.setOpponent(this.playerOne);
	}

	async startGame(data) {
		this.winScore = data.score
		this.playerOneHandPath = handImages[data.hands.p1]
			this.playerTwoHandPath = handImages[data.hands.p2]

			this.playerOneName = "othman"
			this.playerTwoName = "jawad"

			this.root.dispatchEvent(new CustomEvent('setscore', {
				composed: true,
				bubbles: true,
				detail: {
					score: this.winScore
				}
		}))
		await this.initGame();
		this.start_game = true;
		this.gameCustomizer.cleanup()
		this.gameLoop();
	}

	async connectWebSocket() {
		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this.handleServerMessage(data);
		};

		socket.onerror = (error) => {
			console.log("WebSocket Error: ", error);
		};

		socket.onclose = (event) => {
			if (event.wasClean) {
				console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
			} else {
				console.log('Connection died');
			}
		};

		const handIndex = await this.setupHands()
		socket.send(JSON.stringify({
			"m": "rd",
			"h": handIndex
		}))
	}

	canMakeAnAction() {
		if (!this.start_game || this.gameOver || this.gamePaused) return false
		if (this.playerOne.isPlayerHit || this.playerTwo.isPlayerHit) return false
		return true
	}
	async switchRoles(data) {
		this.gamePaused = true
		await sleep(200)
		await this.loadGame("you missed , switching roles", 250);

		this.playerOne.resetHandPosition();
		this.playerTwo.resetHandPosition();

		this.playerOne.state = data.a.p1
		this.playerTwo.state = data.a.p2
		await sleep(200)
		this.gamePaused = false
		this.gameLoop();
	}

	updateScore(data) {
		if (!this.playerOne || !this.playerTwo) return

		this.playerOne.score = data.s.p1
		this.playerTwo.score = data.s.p2

		if (this.playerOne.score >= this.winScore || this.playerTwo.winScore >= this.winScore){
			this.gameOver = true	
			return
		}
		
		setTimeout(() => {
			this.playerOne.wasHit = true
			this.playerTwo.wasHit = true
			if (this.playerOne.state == "attack") {
				this.playerOne.shake()
				this.playerTwo.isPlayerHit = true
			}
			else {
				this.playerOne.isPlayerHit = true
				this.playerTwo.shake()
			}
			this.playerOne.isHitOponent = true
			this.playerTwo.isHitOponent = true
		}, 200)
	}

	async handleServerMessage(data) {
		if (data.m == 'g') {
			if ('h' in data) {
				this.playerOne.startAnimation(data.h.p1)
				this.playerTwo.startAnimation(data.h.p2)
			}
			if ('s' in data) {
				this.updateScore(data)
			}
			if ('a' in data) {
				await this.switchRoles(data)
			}
		}
		else if (data.m == "st")
			this.startGame(data)
		else if (data.m == "end")
			this.updateWinner(data)
	}

	async updateWinner(data) {
		this.gameOver = true
		if (!this.playerOne || !this.playerTwo) {
			this.root.dispatchEvent(new CustomEvent('gameover', {
				composed: true,
				bubbles: true,
				detail: {
					first_player: data.p1,
					second_player: data.p2
				}
			}))
			return
		}
		await sleep(animationTime)
		if (data.p1 == "win") {
			this.playerOne.win = true
			this.playerTwo.win = false
		}
		else {
			this.playerOne.win = false
			this.playerTwo.win = true
		}
		this.root.dispatchEvent(new CustomEvent('gameover', {
			composed: true,
			bubbles: true,
			detail: {
				first_player: data.p1,
				second_player: data.p2
			}
		}))
	}

	handleKeyPress(event) {
		if (!this.canMakeAnAction()) return

		const key = event.key;
		if (key == "ArrowDown") {
			socket.send(JSON.stringify({ m: "retreat" }));
		}
		else if (key == "ArrowUp") {
			socket.send(JSON.stringify({ m: "attack" }));
		}
	}

	handleCanvasClick(event) {
		if (!this.canMakeAnAction()) return

		let rect = this.canvas.getBoundingClientRect();
		let x = event.pageX - rect.left;
		let y = event.pageY - rect.top;

		if (this.isButtonClicked(x, y)) {
			if (this.playerOne.state && !this.playerOne.animating)
				socket.send(JSON.stringify({ m: this.playerOne.state }));
		}
		if (this.isButtonClicked(x, y) && !this.playerTwo.animating) {
			if (this.playerTwo.state)
				socket.send(JSON.stringify({ m: this.playerTwo.state }));
		}
	}

	cleanup() {
		this.eventListeners.forEach(ev => ev.unregister())
		this.eventListeners = []
	}
	start() {
		this.gameCustomizer.start()

		this.root.dispatchEvent(new CustomEvent('setscore', {
			composed: true,
			bubbles: true,
			detail: {
				score: this.winScore
			}
		}))

		this.eventListeners.push(
			addEventListener(this.root, 'gameover', e => {
				const winner = e.detail.winner

				const gameResult = this.root.querySelector("#game-result");
				const canvas = this.root.querySelector("#canvasContainer");
				const winnerContainer = this.root.querySelector("#winner")
				const winnerName = this.root.querySelector("#winner-name")
				const winnerScore = this.root.querySelector("#winner-score")

				canvas.style.display = "none";
				gameResult.style.display = "flex";
				winnerContainer.classList.add('animate-in')
			})
		)

		const canvasContainer = this.root.querySelector('#canvasContainer canvas')
		canvasContainer.focus()
	}

	remove() {
		this.cleanup()
		socket.close()
		socket = null
	}
}

export default OnlineGame;
