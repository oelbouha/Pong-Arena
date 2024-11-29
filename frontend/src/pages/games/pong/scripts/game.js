import { assets } from "./assets.js";

export class Game {

    constructor(root) {
        this.root = root
        this.gameOver = false
        this.metaData = {
            tableWidth: 2000,
            tableHeight: 1000,

            paddleWidth: 18,
            paddleHeight: 300,

            paddleVelocity: 1000,
            paddleMargin: 10,

            ballVelocity: 800,
            ballRadius: 20,


            ballIndex: 0,
            paddleIndex: {
                L: 0,
                R: 0
            },
            tableIndex: 0,
        }


        this.callbacks = {
            balls: this.ballsCallback.bind(this),
            paddles: this.paddlesCallback.bind(this),
            tables: this.tablesCallBack.bind(this)
        }

        this.animating = {
            balls: false,
            paddles: false,
            tables: false
        }

        this.layers = undefined
        this.context = undefined

        this.gameContainer = this.root.querySelector('#game-container')
    }



    async chooseAssets() {

        const handler = e => {
            const btn = e.target.closest('.slider-cntl')
            const ready = e.target.closest('#ready')

            if (btn) {
                const next = e.target.classList.contains('next')
                const root = e.target.closest('.slider')
                const action = root.dataset.action

                const callback = this.callbacks[action]

                callback(root, next)
            }
            else if (ready) {
                this.gameContainer.removeEventListener('click', handler)
                this.handleReadyClick()
            }
        }
        this.gameContainer.addEventListener('click', handler)

    }


    start() {
        requestAnimationFrame(this.gameLoop.bind(this))
    }

    gameLoop(timestamp) {
        if (this.score1 >= this.winning_score || this.score2 >= this.winning_score) {
            return
        } 
        if (this.gameOver) {
            return
        } 
        this.layers.one.dispatchEvent(new CustomEvent('scoreupdate', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                first_player: this.score1,
                second_player: this.score2
            }

        }))
        this.render()

        this.p1.paddle.update(timestamp)
        this.p2.paddle.update(timestamp)


        this.ball.update({
            width: this.metaData.tableWidth,
            height: this.metaData.tableHeight
        }, this.p1.paddle, this.p2.paddle, timestamp)


        requestAnimationFrame(this.gameLoop.bind(this))
    }

    render() {
        this.context.two.clearRect(0, 0, this.metaData.tableWidth, this.metaData.tableHeight);

        this.p1.paddle.render(this.context.two);
        this.p2.paddle.render(this.context.two);
        this.ball.render(this.context.two);
    }

    set_score(score) {
        this.score1 = score.p1
        this.score2 = score.p2
    }


    ballsCallback(root, next) {
        if (this.animating.balls) return
        this.animating.balls = true


        this.metaData.ballIndex += (next ? 1 : -1)
        if (this.metaData.ballIndex == assets.balls.length)
            this.metaData.ballIndex = 0
        else if (this.metaData.ballIndex < 0)
            this.metaData.ballIndex = assets.balls.length - 1

        this.animate(root, next, assets.balls[this.metaData.ballIndex], 'balls')

    }


    paddlesCallback(root, next) {
        if (this.animating.paddles) return
        this.animating.paddles = true

        const side = root.dataset.side
        this.metaData.paddleIndex[side] += (next ? 1 : -1)



        if (this.metaData.paddleIndex[side] == assets.paddles.length)
            this.metaData.paddleIndex[side] = 0
        else if (this.metaData.paddleIndex[side] < 0)
            this.metaData.paddleIndex[side] = assets.paddles.length - 1

        this.animate(root, next, assets.paddles[this.metaData.paddleIndex[side]], 'paddles')

    }


    tablesCallBack(root, next) {
        if (this.animating.tables) return
        this.animating.tables = true


        this.metaData.tableIndex += (next ? 1 : -1)
        if (this.metaData.tableIndex == assets.tables.length)
            this.metaData.tableIndex = 0
        else if (this.metaData.tableIndex < 0)
            this.metaData.tableIndex = assets.tables.length - 1
        this.animate(root, next, assets.tables[this.metaData.tableIndex], 'tables')

    }


    animate(root, next, asset, animating) {

        const old = root.querySelector('img')
        const image = new Image()

        image.src = asset

        next ? image.classList.add('translate-100') : image.classList.add('translate-n100')

        root.append(image)


        setTimeout(() => {
            next ? old.classList.add('translate-n100') : old.classList.add('translate-100')
            next ? image.classList.remove('translate-100') : image.classList.remove('translate-n100')
            setTimeout(() => {
                old.remove()
                this.animating[animating] = false
            }, 500)
        }, 100)
    }


    loadingScreen() {

        this.gameContainer.innerHTML = `<div class="pong-loader"><p>LOADING</p></div>`
    }

    renderCounter(count) {
        this.context.two.clearRect(0, 0, this.metaData.tableWidth, this.metaData.tableHeight);
        this.context.two.fillStyle = '#4f443a85';
        this.context.two.fillRect(0, 0, this.metaData.tableWidth, this.metaData.tableHeight)
        this.context.two.fillStyle = 'white';
        this.context.two.font = '100px Arial';
        this.context.two.fillText(count, (this.metaData.tableWidth / 2), this.metaData.tableHeight / 2);
    }

    renderCanvas() {
        this.gameContainer.innerHTML = `
            <canvas id="gameCanvaslayerOne" width="2000" height="1000"></canvas>
            <canvas id="gameCanvaslayerTwo" width="2000" height="1000"></canvas>
        `
        this.layers = {
            one: this.root.querySelector('#gameCanvaslayerOne'),
            two: this.root.querySelector('#gameCanvaslayerTwo'),
        }

        this.context = {
            one: this.layers.one.getContext('2d'),
            two: this.layers.two.getContext('2d'),
        }

        this.keydownHandler = (event) => {
            if (event.key == 'ArrowUp' || event.key == 'w')
                this.moveUp(event.key)
            else if (event.key == 'ArrowDown' || event.key == 's')
                this.moveDown(event.key)
        }
        this.keydownHandler = this.keydownHandler.bind(this)
        window.addEventListener('keydown', this.keydownHandler);
    }

    renderSliders() {

        this.gameContainer.innerHTML = `
            <div class="slider" data-action="paddles" data-side="L">
                <button class="slider-cntl next">next</button>
                <img src="/assets/pong/images/p1.jpg" alt="">
                <button class="slider-cntl prev">prev</button>
            </div>

            <div class="ball-slider">
                <div class="slider" data-action="balls">
                    <button class="slider-cntl next">next</button>
                    <img src="/assets/pong/images/b1.png" alt="">
                    <button class="slider-cntl prev">prev</button>
                </div>
                <button id="ready">Ready</button>
            </div>


            <div class="slider" data-action="paddles" data-side="R">
                <button class="slider-cntl next">next</button>
                <img src="/assets/pong/images/p1.jpg" alt="">
                <button class="slider-cntl prev">prev</button>
            </div>


            <div class="slider row" data-action="tables">
                <div
                    style="position: absolute; width: 100%; height: 100%; top:0; left:0; display: flex; justify-content: space-between;padding: 2rem;">
                    <button class="slider-cntl prev" style="position: static;">prev</button>
                    <button class="slider-cntl next" style="position: static;">next</button>
                </div>
                <img src="/assets/pong/images/t1.jpg" alt="">
            </div>
        `
        this.chooseAssets()
    }

    cleanup() {
        window.removeEventListener('keydown', this.keydownHandler)
    }
}

