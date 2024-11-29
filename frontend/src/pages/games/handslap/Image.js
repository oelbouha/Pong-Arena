class CustomImage {
    constructor(src) {
        this.img = new Image();
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.loaded = false;
        
        this.img.onload = () => {
            this.width = this.img.width;
            this.height = this.img.height;
            this.loaded = true;
            if (this.onLoadCallback) {
                this.onLoadCallback();
            }
        };

        this.img.src = src;
    }

    getSize() {
        return { width: this.width, height: this.height, loaded: this.loaded };
    }

	getHeight() {
		return this.height;
	}

    rotateAndPaintImage ( context, image, angleInRad , positionX, positionY, axisX, axisY ) {
        context.translate( positionX, positionY );
        context.rotate( angleInRad );
        context.drawImage( image, -axisX, -axisY );
        context.rotate( -angleInRad );
        context.translate( -positionX, -positionY );
    }
	
    draw(context, x, y, rotate = false) {
        this.x = x;
        this.y = y;

        
        if (this.loaded) {
            if (rotate)
                this.rotateAndPaintImage ( context, this.img, 3.14 , x, y, this.width, this.height);
            else
                context.drawImage(this.img, this.x, this.y, this.width, this.height);
        } else {
            this.onLoadCallback = () => {
                context.drawImage(this.img, this.x, this.y, this.width, this.height);
            };
        }
    }

    isClicked(x, y) {
        return (
            this.loaded &&
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        );
    }
}

export default CustomImage;