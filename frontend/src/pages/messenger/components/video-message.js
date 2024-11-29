import {formatTime} from "./net.js"

const userMessageTemplate = document.createElement('template');

userMessageTemplate.innerHTML = /*html*/ `
	<style>
		 @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
         
		:host {
            width: 100%;
            height: 100%;
        }

         .message {
            display: flex;
            flex-direction: column;
            margin-bottom: 4px;
        }

        #msg-status-container {
            position: absolute;
            bottom: 1%;
            right: 2.5%;
            display: flex;
        }


        .message-status-icon {
            width:  15px;
            height: 15px;
        }

        .user-video-container {
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-radius: 7.5px;
        }

        #video-tag {
            border-radius: 7.5px;
            object-fit: contain;
            background: #000; /* Optional: for letterboxing */
        }

        .msg-container {
            display: flex;
            flex-direction: column;
            background-color: #005c4b;
            background-color: #213c51;
            border-radius: 7.5px;
            padding: 3px 4px 3px 4px;
            box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
        }

        .user-message {
            align-items: flex-end;
        }

        .message-time {
            align-self: flex-end;
            font-size: 12px;
            color: #fff;
            min-width: 50px;
            text-shadow: 0 0 5px rgba(9, 9, 9, 0.95);
        }
		
        #video-play-icon {
            display: block;
            color: white;
            width: 30px;
            height: 30px;
        }

        #icon-contaienr {
            display: none;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.59);
            border-radius: 50%;
            padding: 10px;
            cursor: pointer;
        }

        #image-preview {
            display: none;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-radius: 7.5px;
        }
        
        #img-prev-src {
            border-radius: 7.5px;
            object-fit: contain;
        }

        .spinner-container {
            display: flex;
            justify-content: center;
            align-items: center;
            background-color:  #022f40;
            height: 150px;
            width: 150px;
            transition: all 0.3s ease;
        }
        .spinner {
            width: 50px;
            height: 50px;
        }

        #video-tag {
            max-width: 90dvw;
            max-height: 90dvh;
        }

        #modal-container {
            display: none;
            position: fixed;
            inset: 0; /* Shorthand for top: 0; right: 0; bottom: 0; left: 0; */
            background-color: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            justify-content: center;
            padding: 20px;
        }

        #close-btn {
            position: fixed;
            top: 1%;
            right: 1%;
        }

	</style>
    <div class="message user-message">
        <div class="msg-container">
            <div id="video-preview" class="position-relative">
                <div id="image-preview">
                    <img id="img-prev-src" src="" />
                </div>
                <div id="icon-contaienr">
                    <svg id="video-play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
                        <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01   1.233-.697l6.363   3.692a.802.802 0 0 1 0 1.393z"/>
                    </svg>
                </div>
                <div class="spinner-container">
                    <svg class="spinner"  xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g stroke="white"><circle cx="12" cy="12" r="9.5" fill="none" stroke-linecap="round" stroke-width="3"><animate attributeName="stroke-dasharray" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0 150;42 150;42 150;42 150"/><animate attributeName="stroke-dashoffset" calcMode="spline" dur="1.5s" keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1" keyTimes="0;0.475;0.95;1" repeatCount="indefinite" values="0;-16;-59;-59"/></circle><animateTransform attributeName="transform" dur="2s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></g></svg>
                </div>
                <div id="msg-status-container">
                    <div class="message-time"></div>
                    <div class="message-status">
                        <img class="message-status-icon" src="/assets/not-send.svg" />
                    </div>
                </div>
            </div>
            
        </div>

    </div>

    <div id="modal-container">
        <div id="image-modal">
            <button id="close-btn" type="button" class="btn-close btn-close-white" aria-label="Close"></button>
            <video controls id="video-tag">
                <source id="video-src" src="" type="">
                browser does not support the video tag.
            </video>
        </div>
    </div>
`;

export class videoMessage extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode:'open'});
        this.shadowRoot.appendChild(userMessageTemplate.content.cloneNode(true));
        this.setupEventListner()

        this.videoData = {
            "file": "",
            "prev_file": "",
            "status": "",
            "time" : "",
            "msg_id": "",
            "type": "",
            dimensions: {width: 0, height: 0}
        }
        this.hasRendred = false
	}

    setupEventListner() {
        const videoPlayIcon = this.shadowRoot.querySelector("#video-play-icon")
        const modal = this.shadowRoot.querySelector("#modal-container")

        const videoTag = this.shadowRoot.querySelector("#video-src")
        const videoContainer = this.shadowRoot.querySelector("#video-tag")
        
        videoPlayIcon.addEventListener('click', (e) => {
            modal.style.display = "flex"
            videoTag.src = `http://127.0.0.1:8000/message/${this.videoData.msg_id}/full/`
            
            videoContainer.style.display = "flex"
            videoContainer.load()
            
            // Play the video after it's loaded
            videoContainer.addEventListener('loadeddata', () => {
                videoContainer.play()
                .catch(error => {
                    videoContainer.controls = true; // Ensure controls are visible if autoplay fails
                });
            }, { once: true });
        })
        
        const closeBtn = this.shadowRoot.querySelector("#close-btn")
        closeBtn.addEventListener('click', () => {
            modal.style.display = "none"
            videoContainer.pause();
            videoContainer.currentTime = 0;
        })
    }

    connectedCallback() {
        const imageTag = this.shadowRoot.querySelector("#img-prev-src")
        imageTag.addEventListener('load', this.handleImageLoad.bind(this))
    }  
    
    handleImageLoad() {
        const imageTag = this.shadowRoot.querySelector('#img-prev-src');
        const iamgePreview = this.shadowRoot.querySelector('#image-preview');
        const msgContainer = this.shadowRoot.querySelector('.msg-container');
        const playIconContainer = this.shadowRoot.querySelector("#icon-contaienr")

        const naturalWidth = imageTag.naturalWidth;
        const naturalHeight = imageTag.naturalHeight;
        // console.log("natural size ", naturalHeight, naturalWidth)

        this.videoData.dimensions = this.calculateImageDimensions(naturalWidth, naturalHeight)
        const spinner = this.shadowRoot.querySelector(".spinner-container")

        imageTag.style.width = `${this.videoData.dimensions.width}px`
        imageTag.style.height = `${this.videoData.dimensions.height}px`
        spinner.style.width = `${this.videoData.dimensions.width}px`
        spinner.style.height = `${this.videoData.dimensions.height}px`
        
        // console.log("image div :", imageTag, this.videoData.prev_file)
        
        setTimeout(() => {
            spinner.style.display = "none";
            iamgePreview.style.display = "block";
            playIconContainer.style.display = "block"
        }, 300)
    }

    calculateImageDimensions(naturalWidth, naturalHeight) {
        const maxWidth = 350;
        const maxHeight = 350;
        
        if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
            const widthScale = maxWidth / naturalWidth;
            const heightScale = maxHeight / naturalHeight;
            const scale = Math.min(widthScale, heightScale);
            
            return {
                width: Math.floor(naturalWidth * scale),
                height: Math.floor(naturalHeight * scale)
            };
        }
        
        return {
            width: naturalWidth,
            height: naturalHeight
        };
    }

    getMessageStatusIcon(status) {
        if (!status) return 
        const iconStatus = status.toLowerCase()
        if (['sn', 'seen'].includes(iconStatus)) return "/assets/read.svg";
        else if (['recv', 'recieved'].includes(iconStatus)) return "/assets/delivered.svg";
        else if (['st'].includes(iconStatus)) return "/assets/send-to-server.svg";
        return "/assets/not-send.svg"
    }

    updateMessage(message) {
        if (message.status) this.videoData.status = message.status
        if (message.msg) this.videoData.msg_id = message.msg
        
        console.log(this.videoData)
        this.render()
    }

    addMessage(video, message, type="user") {

        this.videoData.file = video.f
        this.videoData.prev_file = video.prev_f
        this.videoData.time = formatTime(message.time)
        this.videoData.type = type
        this.videoData.status = message.status
        if (message.msg)
            this.videoData.msg_id = message.msg
        this.render()
    }
    
    render() {
        const userMessageTime = this.shadowRoot.querySelector('.message-time');
        userMessageTime.textContent = this.videoData.time;


            const videoImagePreview = this.shadowRoot.querySelector("#img-prev-src")
            if (this.videoData.prev_file && this.videoData.msg_id) {
                videoImagePreview.src = `http://127.0.0.1:8000/message/${this.videoData.msg_id}/preview/`
                this.hasRendred = true
            }

        const messageSts = this.shadowRoot.querySelector('.message-status-icon');
        if (messageSts) {
            messageSts.src = this.getMessageStatusIcon(this.videoData.status)
        }

        if (this.videoData.type == "client") {
            const msg = this.shadowRoot.querySelector('.user-message')
            msg.style["align-items"] = "flex-start"
            
            this.shadowRoot.querySelector('.msg-container').style["background-color"] = " #022f40"
            messageSts.style.display = "none"
        }
    }

    static getAttribute() {
        return ["user"];
    }
}
