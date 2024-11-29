import {  assets } from "./assets.js";
import { Game } from "./game.js";
import { offlineBall } from "./ball.js"
import { Player } from "./player.js"


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export class offlineGame extends Game
{
    constructor(root)
    {
        super(root)
        this.root = root
        this.score1 = 0
        this.score2 = 0

        this.dy = 100
        this.ball = undefined
        this.p1 = undefined
        this.p2 = undefined

        this.winning_score = 3

        this.type = "offline"

    }

    launch()
    {
        this.root.dispatchEvent(new CustomEvent('setscore', {
			composed: true,
			bubbles: true,
			detail: {
				score: this.winning_score
			}
		}))
        this.chooseAssets()
    }


    async start()
    {
        for (let i = 3 ; i > 0; i--)
        {
            this.renderCounter(i)
            await sleep(1000)
        }
        super.start()
    }


    async setupGame()
    {
        const image = new Image()
        image.src = assets.tables[this.metaData.tableIndex]
        image.onload = () => this.context.one.drawImage(image, 0, 0, this.layers.one.width, this.layers.one.height);


        this.init()
        await this.start()
    }
    

    init()
    {
        const paddleY = (this.metaData.tableHeight - this.metaData.paddleHeight) / 2
        const rightPlayerPaddleX = this.metaData.tableWidth - this.metaData.paddleWidth - this.metaData.paddleMargin

        this.p1 = new Player("Player 1", this.metaData.paddleMargin, paddleY, this.metaData.paddleWidth, this.metaData.paddleHeight, assets.paddles[this.metaData.paddleIndex.L], this.metaData.paddleVelocity);
        this.p2 = new Player("Player 2 ", rightPlayerPaddleX, paddleY, this.metaData.paddleWidth, this.metaData.paddleHeight, assets.paddles[this.metaData.paddleIndex.R], this.metaData.paddleVelocity);
       
        this.ball = new offlineBall(this, this.metaData.tableWidth / 2, this.metaData.tableHeight / 2 , this.metaData.ballRadius, this.metaData.ballVelocity, assets.balls[this.metaData.ballIndex]);
    }


    async handleReadyClick()
    {
        this.loadingScreen()
        await sleep(1000)
        this.renderCanvas()
        await this.setupGame()

        
    }


    moveUp(key)
    {
        if (key == 'ArrowUp' && this.p2.paddle.y > 0)
            this.p2.paddle.newY = this.p2.paddle.y - this.dy < 0 ? 0 : this.p2.paddle.y - this.dy
        else if (key == 'w' && this.p1.paddle.y > 0)
            this.p1.paddle.newY = this.p1.paddle.y - this.dy < 0 ? 0 : this.p1.paddle.y - this.dy


    }

    moveDown(key)
    {
        if (key == 'ArrowDown' && this.p2.paddle.y + this.metaData.paddleHeight < this.metaData.tableHeight)
            this.p2.paddle.newY = (this.p2.paddle.y + this.metaData.paddleHeight + this.dy > this.metaData.tableHeight) ? (this.metaData.tableHeight - this.metaData.paddleHeight) : (this.p2.paddle.y + this.dy)
        else if (key == 's' && this.p1.paddle.y + this.metaData.paddleHeight < this.metaData.tableHeight)
            this.p1.paddle.newY = (this.p1.paddle.y + this.metaData.paddleHeight + this.dy > this.metaData.tableHeight) ? (this.metaData.tableHeight - this.metaData.paddleHeight) : (this.p1.paddle.y + this.dy)
    }


    remove() {
        this.cleanup()
    }
}


