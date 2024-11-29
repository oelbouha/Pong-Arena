import { addEventListener } from "../../../utils/index.js";

export class gameInvite extends HTMLElement {
	static get observedAttributes() {
		return ['data-game']
	}
	constructor() {
		super()

		this.attachShadow({mode:'open'});
        this.container = document.createElement('div')
        this.container.innerHTML = this.html()
		this.shadowRoot.appendChild(this.container);

		this.eventListeners = []

		this.messageData = {
            "status": "",
            "time" : "",
            "type": "",
		}
	}
	connectedCallback() {
		this.addEventListeners()
	}
	disconnectedCallback() {
		this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
	}
	addEventListeners() {
	}

	addMessage(message, type="user") {
		if (!message) return 
		// if (message.status) this.messageData.status = message.status
		// if (message.time) this.messageData.time = message.time
		// this.messageData.type = type
		this.messageData = JSON.parse(message.cnt)
		this.render()
	}

	getMessageStatusIcon(sts) {
        const status = sts.toLowerCase()
        if (['sn', 'seen'].includes(status)) return "/assets/read.svg";
        else if (['recv', 'recieved'].includes(status)) return "/assets/delivered.svg";
        else if (['st'].includes(status)) return "/assets/send-to-server.svg";
        return "/assets/not-send.svg"
    }

    updateMessage(message) {
        if (message.status) this.messageData.status = message.status
        this.render()
    }
    
    render() {
		this.shadowRoot.innerHTML = this.html()
		return
        const messageSts = this.shadowRoot.querySelector('.message-status-icon');
        const messageTime = this.shadowRoot.querySelector('.message-time');

        if (this.messageData.time) {
            messageTime.textContent = this.messageData.time;
        }

        if (this.messageData.status) {
            messageSts.src = this.getMessageStatusIcon(this.messageData.status)
        }

        if (this.messageData.type == "client") {
            const msg = this.shadowRoot.querySelector('.user-message')
            if (msg)
				msg.style["align-items"] = "flex-start"
            
			const inviteContainer = this.shadowRoot.querySelector('#invite-game-container')
            if (inviteContainer)
				inviteContainer.style["background-color"] = " #022f40"
            messageSts.style.display = "none"

			const spinnerContainer = this.shadowRoot.querySelector(".spinner-container")
			if (spinnerContainer) {
				spinnerContainer.style.display = "none"
			}
			const btnContainer = this.shadowRoot.querySelector(".btn-container")
			if (btnContainer) {
				btnContainer.style.display = "flex"
			}
        }
    }

	get styles() {
		return /*html*/ `
		<style>
		@import url('/themes.css');
		:host {
			width: 100%;
			height: 100%;
		}
		.user-message {
			align-items: flex-end;
		}
		.message {
			color: #fff;
			display: flex;
			flex-direction: column;
			margin-bottom: 4px;
			transition: all 0.3s ease;
		}
		.invite-icon-container {
			display: flex;
			justify-content: center;
		}
		#invite-game-container {
			background: #005c4b;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			font-style: oblique;
			  font-size: 18px;
			max-width: 80%;
			border-radius: 7.5px;
			box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
		}
		#remote-game-icon, #game-icon {
			width:  50px;
			box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
		}

		#msg-status-container {
			display: flex;
			align-self: flex-end;
			flex-direction: row;
			justify-content: end;
			gap: 2px;
			min-width: 80px;
		}

		.message-status-icon {
			width:  15px;
			height: 15px;
		}
		.message-time {
			align-self: flex-end;
			font-size: 12px;
			color: #cdd3d7;
		}
		.btn-container, .invite-message-container {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}
		.btn-container {
			display: none;
			justify-content: center;
			align-items: center;
		}
		.invite-container {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 10px;
		}
		
		#icon, #spinner-icon {
			width:  25px;
			height: 25px;
		}

		.spinner-container {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

	</style>
		`
	}

	html() {
		return (
		/*html*/
		`
			${this.styles}
			<div class="message user-message">
				<div id="invite-game-container" class="p-1">
					<div class="invite-container">
						<div class="invite-message-container">
							<div class="invite-message">
								Game Invitation
							</div>
							<div class="invite-icon-container">
								<img id="game-icon" src="/assets/ping-pong.svg" />
							</div>
						</div>
						<button class="bg-accent p-0-5 px-1 hover-brighten transition-med rounded-pill mt-1 border-0">
							play ${this.messageData.game}
						</button>
					</div>
					
				</div>
			</div>
		`
		)
	}
}