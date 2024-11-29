export class Ball {
    constructor(x, y, radius,  speed, image) {
        this.x = x;
        this.y = y;
        this.old_x = x
        this.old_y = y
        this.initialX = x;
        this.initialY = y;
        this.radius = radius;
        this.speed = speed;
        this.score1 = 0;
        this.score2 = 0;
        this.velocity_x = speed
        this.velocity_y = speed
        this.lastTimestamp = 0

        this.image = new Image()
        this.isImgLoaded = false
        this.image.src = image
        this.image.onload = () => this.isImgLoaded = true
    }

    render(ctx) {
        if (this.isImgLoaded)
        {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(this.image, this.x - this.radius, this.y - this.radius, 2 * this.radius, 2 * this.radius);
            ctx.restore();
        }
    }

    update(table, paddle1, paddle2, timestamp) 
    {
        if (!this.lastTimestamp) this.lastTimestamp = timestamp; 


        const deltaTime = (timestamp - this.lastTimestamp) / 1000;

        this.lastTimestamp = timestamp; 


        const dx = this.velocity_x * deltaTime;
        const dy = this.velocity_y * deltaTime

        this.old_x = this.x
        this.old_y = this.y
        this.x += dx;
        this.y += dy;
        
        // Wall collision
        if (this.y + this.radius >= table.height && this.velocity_y > 0)
            this.velocity_y = -this.velocity_y
        
        if (this.y - this.radius <= 0 && this.velocity_y < 0)
            this.velocity_y = -this.velocity_y

        if (this.velocity_x < 0)
            this.checkPaddleCollision(table, paddle1);
        else
            this.checkPaddleCollision(table, paddle2);

    }


    checkPaddleCollision(table, paddle) {
        if (this.velocity_x > 0) {
            if (this.x + this.radius > paddle.x && 
                this.x - this.radius < paddle.x + paddle.width &&
                this.y + this.radius > paddle.y && 
                this.y - this.radius < paddle.y + paddle.height) {
                
                this.velocity_x = -this.velocity_x;
                this.x = paddle.x - this.radius;
            }
        } 
        else {
            if (this.x - this.radius < paddle.x + paddle.width && 
                this.x + this.radius > paddle.x &&
                this.y + this.radius > paddle.y && 
                this.y - this.radius < paddle.y + paddle.height) {
                
                this.velocity_x = -this.velocity_x;
                this.x = paddle.x + paddle.width + this.radius;
            }
        }
    }

    getScore() {
        return { score1: this.score1, score2:this.score2 };
    }

    reset() {
        this.x = this.initialX;
        this.y = this.initialY;
        this.velocity_x = this.speed
        this.velocity_y = this.speed
    }


    set_info(info)
    {
        this.x = info.x
        this.y = info.y
        this.velocity_x = info.vx
        this.velocity_y = info.vy
    }
}



export class offlineBall extends Ball
{
    constructor(game, x, y, radius, speed, image) 
    {
        super(x, y, radius, speed, image)
        this.game = game
        this.type = "offline"
    }

    checkPaddleCollision(table, paddle) 
    {
        super.checkPaddleCollision(table, paddle)


        if (this.x - this.radius < 0)
        {
            this.game.score2 += 1
            this.checkScore(2)
        }
        else if (this.x + this.radius > table.width)
        {
            this.game.score1 += 1
            this.checkScore(1)
        }
        else
            return

        this.reset()
    }


    checkScore(player)
    {
        const score = (player == 1 ? this.game.score1 : this.game.score2)
        if (score == this.game.winning_score) {
            this.game.layers.one.dispatchEvent(new CustomEvent('scoreupdate', {
                composed: true,
                bubbles: true,
                cancelable: true,
                detail: {
                    first_player: this.game.score1,
                    second_player: this.game.score2
                }
    
            }))
            // alert(`player ${player} win`)
            this.game.gameContainer.innerHTML = `
                <div id="winner" >
                    <img id="game-over-icon" src="/assets/handslap/game-over.png" alt="">
                </div>
            `
        }
    }
}
