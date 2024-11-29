import Player from './Player.js';
import OfflineBaseGame from './OfflineBaseGame.js'

const imageAnimationTime = 500
const animationTime = imageAnimationTime * 2 + 100

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class offlineGame extends OfflineBaseGame {
	constructor(root, playerOneHand, playerTwoHand, winScore, playerOneName, playerTwoName) {
		super(root, playerOneHand, playerTwoHand, winScore, playerOneName, playerTwoName);
		this.playerOneName = playerOneName
		this.playerTwoName = playerTwoName
		this.canvasDiv = root.querySelector("#canvasContainer");

		this.loadingContainer = root.querySelector("#loading-container")
		this.loading = root.querySelector("#loading-info")
		this.gameSelectionDiv = root.querySelector("#game-home")
		this.fronDiv = root.querySelector("#gameFront");
		this.loadingHeader = root.querySelector("#loading-header")
		this.loadingBody =   root.querySelector("#loading-body")
	}

	async initGame() {
		this.gameSelectionDiv.style.display = "none"
		this.canvasDiv.style.display = "none"
		this.fronDiv.style.display = "flex";
		this.loadingContainer.style.display = "flex"
		
		this.loading.classList.remove('animate-out-left')
		this.loading.classList.add('animate-in');
		
		this.loadingHeader.textContent = "starting game"
		this.loadingBody.textContent = `${this.playerOneName} vs ${this.playerTwoName}`

		await sleep(animationTime)
		while (!this.waitForImagesToLoad()) {
			await sleep(300);
		}
		this.loading.classList.add('animate-out-left')
		await sleep(animationTime)
		this.fronDiv.style.display = "none";


		this.playerOne = new Player("top", "retreat", this.gameCanvas, this.playerOneHand, this.context, this.assets, this);
		this.playerTwo = new Player("bottom", "attack", this.gameCanvas, this.playerTwoHand, this.context, this.assets, this);

		
		this.playerOne.initPlayer();
		this.playerTwo.initPlayer();

		this.playerOne.setOpponent(this.playerTwo);
		this.playerTwo.setOpponent(this.playerOne);
		this.canvasDiv.style.display = "flex";

		this.canvas.focus()
	}

	async startGame() {
		await this.initGame();
		this.gameLoop();
	}

	handlePlayeAction(action, key) {
		if (this.gameOver) return 
		const attackPLayer = this.playerOne.getState() === "attack" ? this.playerOne : this.playerTwo;
		const retreatPlayer = this.playerTwo.getState() === "retreat" ? this.playerTwo : this.playerOne;

		if (action == "attack")
			return attackPLayer.startAnimation(action);
		else if (action == "retreat")
			retreatPlayer.startAnimation(action);
	}

	cleanup() {
		this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
	}
}

export default offlineGame;

