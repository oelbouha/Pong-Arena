
import { getData, formatTime, getCurrentTime, replaceChar } from "./net.js"

const userMessageTemplate = document.createElement('template');

userMessageTemplate.innerHTML = /*html*/ `
	<style>
		@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
        @import url('/themes.css');
         

        .message {
            display: flex;
            flex-direction: column;
            margin-bottom: 4px;
        }

        #msg-status-container {
            display: flex;
            align-self: flex-end;
            justify-content: end;
            flex-shrink: 0;
            gap: 2px;
        }

        .message-status-icon {
            width:  15px;
            height: 15px;
        }

        .msg-container {
            display: flex;
            flex-direction: row;
            background-color: red;
            background-color: #005c4b;
            background-color: #213c51;
            border-radius: 7.5px;
            max-width: 80%;
            padding: 6px 7px 8px 9px;
            box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
            gap: 4px;
        }

        .user-message {
            color: #fff;
            align-items: flex-end;
        }

        .message-time {
            align-self: flex-end;
            font-size: 12px;
            color: #cdd3d7;
        }
        .message-content {
            word-break: break-word;
        }
        .error {
            color: #ff0000;
        }
		
	</style>
	<div class="message user-message">
        <div class="msg-container" >
            <div class="message-content"></div>
            <div id="msg-status-container" >
                <div class="message-time"></div>
                <div class="message-status">
                    <img class="message-status-icon" src="/assets/not-send.svg" />
                </div>
            </div>
        </div>
        <div class="error fs-6 text-red"><slot name="error"></slot>
    </div>
`;

export class textMessage extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({mode:'open'});
        this.shadowRoot.appendChild(userMessageTemplate.content.cloneNode(true));
        this.messageData = {
            "content": "",
            "time": "",
            "status": "",
            "type": ""
        }
	}

    addMessage(message, type="user") {
        this.messageData.content = message.cnt
        this.messageData.status = message.status
        this.messageData.time = formatTime(message.time)
        this.messageData.type = type
        this.render()
    }
    
    getMessageStatusIcon() {
        const status = this.messageData.status.toLowerCase()
        if (['sn', 'seen'].includes(status)) return "/assets/read.svg";
        else if (['recv', 'recieved'].includes(status)) return "/assets/delivered.svg";
        else if (['st'].includes(status)) return "/assets/send-to-server.svg";
        else if (status == 'err') return "/assets/message-error.svg";
        return "/assets/not-send.svg"
    }

    updateMessage(message) {
        if (message && message.status) {
            this.messageData.status = message.status
        }
        this.render()
    }

    render() {
        const userMessage = this.shadowRoot.querySelector('.message-content');
        const messageSts = this.shadowRoot.querySelector('.message-status-icon');
        const userMessageTime = this.shadowRoot.querySelector('.message-time');
        
        if (this.messageData.content)
        userMessage.textContent = this.messageData.content;
    
        if (this.messageData.time)
        userMessageTime.textContent = this.messageData.time;
    
        if (this.messageData.status)
            messageSts.src = this.getMessageStatusIcon()

        if (this.messageData.type == "client") {
            const msg = this.shadowRoot.querySelector('.user-message')
            msg.style["align-items"] = "flex-start"
            
            const messageStatusIcon = this.shadowRoot.querySelector(".message-status")
            this.shadowRoot.querySelector('.msg-container').style["background-color"] = "#21292f"
            messageSts.style.display = "none"
            messageStatusIcon.style.display = "none"
        }
    }

}