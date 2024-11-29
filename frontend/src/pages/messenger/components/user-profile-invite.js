import { addEventListener } from "../../../utils/index.js";


export class userProfileInvite extends HTMLElement {
	constructor() {
		super()

		const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = this.html()

		this.eventListeners = []

		this.messageData = {
            "icon" : "",
            "type": "",
		}
	}
	connectedCallback() {
	}
    disconnectedCallback() {
        this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
    }

	addMessage(type="user", icon="/assets/slap.svg") {
		this.messageData.type = type
		this.messageData.icon = icon
		this.render()
	}

	getMessageStatusIcon(sts) {
        const status = sts.toLowerCase()
        if (['sn', 'seen'].includes(status)) return "/assets/read.svg";
        else if (['recv', 'recieved'].includes(status)) return "/assets/delivered.svg";
        else if (['st'].includes(status)) return "/assets/send-to-server.svg";
        return "/assets/not-send.svg"
    }

    updateMessage(result) {
		const btnContainer = this.shadowRoot.querySelector('.btn-container');
		const spinner = this.shadowRoot.querySelector('.spinner-container');

		spinner.style.display = "none"
		btnContainer.style.display = "none"

		if (result == "rejected") {
			const rejected = this.shadowRoot.querySelector("#rejected-icon")
			rejected.style.display = "block"
		}
		else {
			const play = this.shadowRoot.querySelector("#play-btn")
			play.style.display = "block"
		}

    }
    
    render() {
        const btnContainer = this.shadowRoot.querySelector('.btn-container');
        const spinner = this.shadowRoot.querySelector('.spinner-container');
		
		if (this.messageData.type == "client" && btnContainer) {
			btnContainer.style.display= "flex"
			spinner.style.display= "none"
		}
		const gameIcon = this.shadowRoot.querySelector('#game-icon');
		gameIcon.src = this.messageData.icon
    }

	html() {
		return (
		/*html*/
		`
		<style>
			@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
			:host {
            	width: 100%;
            	height: 100%;
        	}
			.invite-icon-container {
				display: flex;
				justify-content: center;
			}
			#invite-game-container {
				color: white;
				background: #022f40;
				background-color: var(--glass-color);
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
  				font-size: 18px;
				width: 100%;
				border-radius: 14px;
				box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
			}
			#remote-game-icon, #game-icon {
				width:  50px;
				box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
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
				justify-content: space-between;
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
			#play-btn {
				display: none;
				height: 50px;
				width: 100px;
				align-self: center;
			}
			#rejected-icon {
				display: none;
				width: 110px;
			}

		</style>
				<div id="invite-game-container" class="p-2">
					<div class="invite-container">
						<div class="invite-message-container">
							<div class="invite-message">game Invitation
							</div>
							<div class="invite-icon-container">
								<img id="game-icon" src="/assets/ping-pong.svg" />
							</div>
						</div>
						<div class="btn-container">
							<button id="accept-btn" class="btn btn-success"> Accept </button>
							<button id="refuse-btn" class="btn btn-danger"> Refuse </button>
						</div>
						<div class="spinner-container">
							waiting for approval
							<img id="spinner-icon" src="/assets/spinner.svg"/>
						</div>
						<button id="play-btn" class="btn btn-success"> Play </button>
						<img id="rejected-icon" src="/assets/rejected.svg" />
					</div>
					
				</div>
		`
		)
	}
}