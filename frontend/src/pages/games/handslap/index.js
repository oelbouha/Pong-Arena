import offlineGame from "./offlineGame.js";
import {animationTime, backgroundColors , handImages, sleep} from "./config.js"
import { addEventListener } from "../../../utils/index.js";
import OnlineGame from "./onlineGame.js";



class HandSelection {
    constructor(root) {
        this.eventListeners = []
        this.root = root
        this.gameContainerElement = root.querySelector("#game");
        this.slideContainer = root.querySelector("#slide-container");
        this.background = root.querySelector("#image-container");
        this.playerHandImage = root.querySelector("#playerHandImage");
        this.playerContainer = root.querySelector("#player-container");
        this.readyBtn = root.querySelector("#readyBtn");
        this.counter = root.querySelector("#counter");
        this.imageContainer = root.querySelector("#image");
        this.gameHome = root.querySelector("#game-home");
        this.playerText = root.querySelector("#info");
        this.frontDiv = root.querySelector("#gameFront");
        this.nextBtn = root.querySelector("#nextBtn");
        this.prevBtn = root.querySelector("#prevBtn");
        this.scoreRange = root.querySelector("#score-range")
        this.rangeValue = root.querySelector("#rangeValue")
        this.loadingContainer = root.querySelector("#loading-container")
        this.canvas = root.querySelector("#canvasContainer");
        this.retryBotton = root.querySelector("#retry")
        this.gameIntroContainer = root.querySelector("#game-intro")
		

        if (this.loadingContainer)
            this.loadingContainer.style.display = "none"

        this.playerNameInput = root.querySelector("#player-name")
        this.startOverBtn = root.querySelector("#start-over-btn")

        this.winScore = 1
        this.playerOneWinScore = null
        this.playerTwoWinScore = null
        // State variables
        this.isAnimating = false;
        this.imageIsAnimating = false;
        this.currentIndex = 0;
        this.playerTwoIndex = null;
        this.playerOneIndex = null;

        this.playerOneName = null
        this.playerTwoName = null
        this.playerName = null

        this.imageAnimationTime = 300; // milliseconds
        this.animationTime = this.imageAnimationTime * 3;

        this.handlePlayerOneClick = this.handlePlayerOneClick.bind(this);
        this.handlePlayerTwoClick = this.handlePlayerTwoClick.bind(this);
        this.handleNextClick = this.handleNextClick.bind(this);
        this.handlePrevClick = this.handlePrevClick.bind(this);
      
        this.offline_game = null
        // Initialize 
        this.initIntroAnimation()
		this.initializeUI();
		this.setupEventListeners();
		this.initAnimation()
    }
	
    handleStartOverButton() {
        const gameResult = this.root.querySelector("#game-result")
        gameResult.style.display = "none"
        this.frontDiv.style.display = "flex"
        this.loadingContainer.style.display = "none"
        this.gameHome.style.display = "flex"
        this.playerName = null

        this.cleanup()
        this.initializeUI()
        this.setupEventListeners();
        this.scoreRange.value = 1
        this.rangeValue.value = 1
        this.initAnimation()
        this.start()
    }
    handlePlayerName(event) {
        const name = event.target.value
        if (!name) return
        this.playerName = name
    }

    handleRetryGame() {
		const gameResult = this.root.querySelector("#game-result");

		this.canvas.style.display = "none";
		gameResult.style.display = "flex";
		this.canvas.style.display = "flex";
		gameResult.style.display = "none";
		if (this.offline_game)
            this.offline_game.restartGame()
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
		this.setupPlayerOneHand()
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

    updateWinScore(event) {
        this.rangeValue.textContent = event.target.value
        this.winScore = event.target.value
    }

    setupEventListeners() {
        this.eventListeners.push(
            addEventListener(this.nextBtn, 'click', this.handleNextClick),
            addEventListener(this.prevBtn, 'click', this.handlePrevClick),
            addEventListener(this.scoreRange, 'input', this.updateWinScore.bind(this)),
            addEventListener(this.playerNameInput, 'input', this.handlePlayerName.bind(this)),
        )
    }

    handleNextClick() {
        if (this.imageIsAnimating) return;

        this.playerHandImage.classList.add('animate-handOut');
        
        this.currentIndex = (this.currentIndex + 1) % handImages.length;
        this.updateImage();
        this.setActive(this.currentIndex);
    }

    handlePrevClick() {
        if (this.imageIsAnimating) return;

        this.playerHandImage.classList.add('animate-handOut');
        
        this.currentIndex = (this.currentIndex - 1 + handImages.length) % handImages.length;
        this.updateImage();
        this.setActive(this.currentIndex);
    }

    setupPlayerOneHand() {
        this.playerText.textContent = "Choose Your Hand";
        this.gameHome.style.flexDirection = "row";
        this.eventListeners.push(
            addEventListener(this.readyBtn, 'click', this.handlePlayerOneClick)
        )
    }
    
    setupPlayerTwoHand() {
        // Remove the correct bound method reference
        this.readyBtn.removeEventListener('click', this.handlePlayerOneClick);
        this.playerText.textContent = "Choose Your Hand";
        this.playerText.style.display = "block";
        this.currentIndex = 0;
        this.setActive(0);
        
        // Add the new bound method reference
        this.eventListeners.push(
            addEventListener(this.readyBtn, 'click', this.handlePlayerTwoClick)
        )
    }

    handlePlayerOneClick() {
        if (!this.playerName) {
            this.playerNameInput.classList.add('field-empty')
            return
        }
        this.playerNameInput.value = ""
        this.playerOneName = this.playerName
        this.playerName = null
        this.playerNameInput.classList.remove('field-empty')
        this.playerContainer.classList.add('slideOut');
        this.playerContainer.classList.remove(this.animateIn, this.animateOut);
        void this.playerContainer.offsetWidth; // Trigger reflow
        this.playerContainer.classList.add(this.animateIn);
        
        this.gameHome.style.flexDirection = "row-reverse";
        this.playerOneIndex = this.currentIndex
        this.animateIn = this.animateInRight
        this.animateOut = this.animateOutLeft
        this.playerOneWinScore = this.winScore
        this.setupPlayerTwoHand();
    }

    handlePlayerTwoClick() {
        if (!this.playerName) {
            this.playerNameInput.classList.add('field-empty')
            return
        }
        this.playerNameInput.value = ""
        this.playerTwoName = this.playerName
        this.playerNameInput.classList.remove('field-empty')
        this.playerTwoIndex = this.currentIndex
        this.playerTwoWinScore = this.winScore

        this.winScore = this.playerOneWinScore > this.playerTwoWinScore ? this.playerTwoWinScore : this.playerOneWinScore
        this.startGame();
    }

    initAnimation() {
        this.background.classList.add(this.animateIn);
        this.background.style.background = backgroundColors[this.currentIndex];
        this.imageIsAnimating = true;
        
        setTimeout(() => {
            this.imageContainer.style.display = "flex";
            this.imageContainer.classList.add(this.animateIn);
            this.imageIsAnimating = false;
            this.playerHandImage.classList.add('animate-handIn');
        }, this.imageAnimationTime);
        
        this.imageContainer.style.background = backgroundColors[this.currentIndex];
    }

    setActive(index) {
        const dots = this.slideContainer.children;
        Array.from(dots).forEach(dot => {
            dot.style.background = backgroundColors[0]
            dot.classList.remove('active')
        });
        
        // dots[index].classList.add('active');
        dots[index].style.background = backgroundColors[index]
        this.currentIndex = index;
        this.updateImage();
        
        setTimeout(() => {
            this.imageIsAnimating = false;
        }, this.animationTime);
    }

    updateImage() {
        this.gameContainerElement.style.background = "#00203f";
        this.background.classList.remove('animate-in', 'animate-out');
        void this.background.offsetWidth; // Trigger reflow
        this.background.classList.add('animate-in');
        this.background.style.background = backgroundColors[this.currentIndex];
        
        this.imageContainer.classList.remove('animate-in', 'animate-out');
        void this.imageContainer.offsetWidth; // Trigger reflow
        this.imageContainer.classList.add('animate-in');
        this.imageContainer.style.background = backgroundColors[this.currentIndex];
        
        this.imageIsAnimating = true;
        
        setTimeout(() => {
            this.playerHandImage.classList.remove('animate-handIn', 'animate-handOut');
            void this.playerHandImage.offsetWidth; // Trigger reflow
            this.playerHandImage.src = handImages[this.currentIndex];
            this.playerHandImage.classList.add('animate-handIn');
        }, this.imageAnimationTime);
        
        setTimeout(() => {
            this.imageIsAnimating = false;
        }, this.animationTime);
    }

    startGame() {
        this.cleanup()
		this.frontDiv.style.display = 'none';
		
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
                winnerName.textContent = winner.name
                winnerScore.textContent = this.winScore

                this.eventListeners.push(
                    addEventListener(this.startOverBtn, 'click', this.handleStartOverButton.bind(this)),
                    addEventListener(this.retryBotton, 'click', this.handleRetryGame.bind(this))
                )
            })
        )

        this.offline_game = new offlineGame(
            this.root,
            handImages[this.playerOneIndex],
            handImages[this.playerTwoIndex],
            this.winScore,
            this.playerTwoName,
            this.playerOneName
        );
		this.offline_game.startGame();

        const canvasContainer = this.root.querySelector('#canvasContainer canvas')
        canvasContainer.focus()
    }

    cleanup() {
        this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
    }

    remove() {
        this.cleanup()
        this.offline_game && this.offline_game.cleanup()
    }

}

const handslapHtml = /*html*/ `
    <div id="game">
        <div id="gameFront">
            <div id="game-intro">
                <div id="first-name" class="display-1">Hand</div>
                <img id="game-logo"  width="200px" height="200px" src="/assets/handslap/game-logo.jpg" alt=""/>
                <div id="last-name" class="display-1">Slap</div>
            </div>
            <div id="loading-container">
                <div id="loading-info">
                    <img id="loading-icon"  src="/assets/handslap/rec.svg" alt="">
                    <h1 id="loading-header">Preparing your game</h1>
                    <p id="loading-body">Waiting for other player to join the game...</p>
                </div>
            </div>
            <div id="game-home">
                <div id="slide-container"></div>
                <div id="image-container">
                    <div id="image">
                        <img id="playerHandImage" src="/assets/handslap/hands/hand5.png" alt="">
                    </div>
                </div>
                <div id="player-container">
                    <div id="info"></div>
                    <input id="player-name"  type="text" placeholder="Enter your name">
                    <span class="win-score">win score:</span>
                    <div id="score-info-container">
                        <input id="score-range" type="range" min="1" max="15" value="1" />
                        <span id="rangeValue">1</span>
                    </div>
                    <div id="counter">	1 / 16 </div>

                    <div id="game-info">Hand Slap game is an entertaining game which is almost known and played by everyone in real life. What about having the same excitement on your phone, tablet or PC against your friend? First of all choose the hand model and then let the struggle begin! </div>
                    <button id="readyBtn">confirm</button>
                    <img class="navBtn" id="nextBtn" src="/assets/handslap/next.svg">
                    <img class="navBtn" id="prevBtn" src="/assets/handslap/prev.svg">
                </div>
            </div>

        </div>

        <div id="canvasContainer">
            <canvas width="1200" height="1000" id="gameCanvas" style="outline: 0"></canvas>
        </div>

        <div id="game-result">
            <div id="winner">
                <img id="game-over-icon" src="/assets/handslap/game-over.png" alt="">
                <div id="winner-container">
                    <p>winner: </p>
                    <p id="winner-name">othman</p>
                </div>
                <div id="score-container">
                    <p>score: </p>
                    <p id="winner-score">10</p>
                </div>
                <button id="retry"  >play again</button>
                <button id="start-over-btn"  >start over</button>
            </div>
        </div>
    </div>
`

const onlineHnadSlapHtml = /*html*/`
    <div id="game">
        <div id="gameFront">
            <div id="game-intro">
                <div id="first-name" class="display-1">Hand</div>
                <img id="game-logo"  width="200px" height="200px" src="/assets/handslap/game-logo.jpg" alt=""/>
                <div id="last-name" class="display-1">Slap</div>
            </div>
            <div id="loading-container">
                <div id="loading-info">
                    <img id="loading-icon"  src="/assets/handslap/rec.svg" alt="">
                    <h1 id="loading-header">Preparing your game</h1>
                    <p id="loading-body">Waiting for other player to join the game...</p>
                </div>
            </div>
            <div id="game-home">
                <div id="slide-container"></div>
                <div id="image-container">
                    <div id="image">
                        <img id="playerHandImage" src="/assets/handslap/hands/hand5.png" alt="">
                    </div>
                </div>
                <div id="player-container">
                    <div id="info">Choose your Hand</div>
                    <div id="counter">	1 / 16 </div>

                    <div id="game-info">Hand Slap game is an entertaining game which is almost known and played by everyone in real life. What about having the same excitement on your phone, tablet or PC against your friend? First of all choose the hand model and then let the struggle begin! </div>
                    <button id="readyBtn">confirm</button>
                    <img class="navBtn" id="nextBtn" src="/assets/handslap/next.svg">
                    <img class="navBtn" id="prevBtn" src="/assets/handslap/prev.svg">
                </div>
            </div>

        </div>
        
        <div id="canvasContainer">
            <canvas width="1200" height="1000" id="gameCanvas"></canvas>
        </div>

        <div class="switch-container ">
            <div class="top"></div>
            <div class="bottom"></div>
	    </div>

        <div id="game-result">
            <div id="winner">
                <img id="game-over-icon" src="/assets/handslap/game-over.png" alt="">
                <div id="winner-container">
                    <p></p>
                    <p id="winner-name"></p>
                </div>
                <div id="score-container">
                    <p></p>
                    <p id="winner-score"></p>
                </div>
                <button id="retry" >play again</button>
            </div>
        </div>
    </div>
`
export const newSlapGame = (root, online=false, socket) => {
    let area = document.createElement('div')
    area.innerHTML = handslapHtml
    area = area.firstElementChild

    root.replaceChildren(area)

    let game;
    if (online) {
        area.innerHTML = onlineHnadSlapHtml
        game = new OnlineGame(area.parentElement, socket)
        game.start()
    } else {
        game = new HandSelection(area.parentElement)
        game.start()
    }
    return game
}

