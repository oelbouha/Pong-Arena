import { Paddle } from "./paddle.js"

export class Player {
    constructor(name, x, y, paddleWidth, paddleHeight, paddleImage, paddleSpeed) {
        this.name = name;
        this.paddle = new Paddle(x, y, paddleWidth, paddleHeight, paddleImage, paddleSpeed);
    }

    addPowerUp(powerUp) {
    
        this.powerUps.push(powerUp);
    }

}