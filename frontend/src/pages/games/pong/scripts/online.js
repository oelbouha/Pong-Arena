import { Game } from "./game.js";
import { Player } from "./player.js";
import { Ball } from "./ball.js";
import { assets } from "./assets.js";

export class onlineGame extends Game
{
    constructor(root, socket)
    {
        super(root)
        this.root = root
        this.metaData  = {
            ballIndex: 0,
            paddleIndex: {
                L: 0,
                R: 0
            },
            tableIndex: 0,
        }

        this.score1 = 0
        this.score2 = 0

        this.ball = undefined
        this.p1 = undefined
        this.p2 = undefined
        this.side = undefined

        this.socket = socket

        this.isGameSetup = false
        this.isReady = false


        this.type = "online"
    }

    async launch()
    {
        this.root.dispatchEvent(new CustomEvent('setscore', {
			composed: true,
			bubbles: true,
			detail: {
				score: this.winning_score
			}
		}))
        this.socket.onclose = () => console.log("socket closed")
        this.socket.onmessage = async (event) => await this.handleIncomingMessage(JSON.parse(event.data))
        this.socket.send(JSON.stringify({ m: 'meta' }))
        this.renderSliders()
    }

    setupGame(data)
    {
        const image = new Image()
        image.src = assets.tables[this.metaData.tableIndex]
        image.onload = () => this.context.one.drawImage(image, 0, 0, this.layers.one.width, this.layers.one.height);
        this.init("yassine", "ajallal", data.side)
    }

    async handleIncomingMessage(data)
    {
        if (data.m == "meta")
        {
            this.metaData = {...data.meta, ...this.metaData}
        }
        else if (data.m == "g")
            this.handleGameStateMethod(data)
        else if (data.m == "opp")
            await this.handleOpponenetMethod(data)
        else if (data.m == "count")
        {
            if (!this.isGameSetup)
            {
                this.renderCanvas()
                this.setupGame(data)
                this.isGameSetup = true
            }

            if (data.count != 0)
                this.renderCounter(data.count)
            else
                this.start()
        }
        else if (data.m == "end")
            this.gameover(data)

    }

    handleGameStateMethod(data)
    {
        if ('b' in data)
            this.ball.set_info(data.b)
        if ('p' in data)
        {
            this.p1.paddle.newY = data.p.p1.y;
            this.p2.paddle.newY = data.p.p2.y;
        }
        if ('s' in data)
            this.set_score(data.s)
    }

    handleEndGameMethod(data)
    {
        
    }

    init(leftPlayerName, rightPlayerName, currentPlayerSide)
    {
        const paddleY = (this.metaData.tableHeight - this.metaData.paddleHeight) / 2
        const rightPlayerPaddleX = this.metaData.tableWidth - this.metaData.paddleWidth - this.metaData.paddleMargin

        this.p1 = new Player(leftPlayerName, this.metaData.paddleMargin, paddleY, this.metaData.paddleWidth, this.metaData.paddleHeight, assets.paddles[this.metaData.paddleIndex.L], this.metaData.paddleVelocity);
        this.p2 = new Player(rightPlayerName, rightPlayerPaddleX, paddleY, this.metaData.paddleWidth, this.metaData.paddleHeight, assets.paddles[this.metaData.paddleIndex.R], this.metaData.paddleVelocity);
        this.ball = new Ball(this.metaData.tableWidth / 2, this.metaData.tableHeight / 2 , this.metaData.ballRadius, this.metaData.ballVelocity, assets.balls[this.metaData.ballIndex]);

        this.side = currentPlayerSide
    }

    handleReadyClick()
    {
        this.socket.send(JSON.stringify({
            "m": "rd"
        }))
        this.loadingScreen()
    }

    moveUp(key)
    {
        const data = {'m': 'up'}
        this.socket.send(JSON.stringify(data))
    }

    moveDown(key)
    {
        const data = {'m': 'down'}
        this.socket.send(JSON.stringify(data))
    }

    gameover(data)
    {
        this.gameOver = true
        this.gameContainer.dispatchEvent(new CustomEvent('gameover', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                first_player: data.p1,
                second_player: data.p2 
            }
        }))
        this.gameContainer.innerHTML = `
            <div id="winner">
                <img id="game-over-icon" src="/assets/handslap/game-over.png" alt="">
            </div>
        `
    }

    remove() {
        this.socket.close()
        this.cleanup()
    }
}