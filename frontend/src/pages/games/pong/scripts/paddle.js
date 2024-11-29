export class Paddle {
    constructor(x, y, width, height, image, speed) {
        this.x = x;
        this.y = y;
        this.newY = y
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.startTime = 0;
        this.lastTimestamp = 0
        this.image = new Image()
        this.isImgLoaded = false
        this.image.src = image
        this.image.onload = () => this.isImgLoaded = true
    }

    render(ctx) {
        if (this.isImgLoaded)
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height)
    }

    update(timestamp)
    {
        if (this.newY !== this.y)
        {
            if (!this.lastTimestamp) 
                this.lastTimestamp = timestamp;
    
            const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    
            
            const dy = this.speed * deltaTime
            if (this.y < this.newY)
                this.y = (this.y + Math.floor(dy) < this.newY ? this.y + Math.floor(dy) : this.newY)

            else if (this.y > this.newY)
                this.y = (this.y - Math.floor(dy) > this.newY ? this.y - Math.floor(dy) : this.newY)
            this.lastTimestamp = timestamp; 
        }
        else
            this.lastTimestamp = 0

    }
    
}