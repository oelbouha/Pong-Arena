import { navigate_to } from "../../../router/utils.js";
import DATA from "../../../store.js";


export class gameRequest extends HTMLElement {
	constructor() {
		super()
		this.attachShadow({mode:'open'});
        this.container = document.createElement('div')
        this.container.innerHTML = this.html()
		this.shadowRoot.appendChild(this.container);

		this.messageData = {
            "status": "",
            "time" : "",
            "type": "",
		}
	}
	connectedCallback() {
		this.onclick = e => {
			const invite = this.dataset.invite
			const game = this.dataset.game
			const redir = game == 'slap' ? '/games/online_handslap/' : '/games/online_pong/'
			DATA.set('invitation_id', invite)
			navigate_to(redir)
		}
	}
	addMessage(message, type="user") {
		if (!message) return 
		if (message.status) this.messageData.status = message.status
		if (message.time) this.messageData.time = message.time
		this.messageData.type = type
		this.render()
	}

	getMessageStatusIcon(sts) {
    }

    updateMessage(message) {
    }
    
    render() {
    }

	html() {
		return (
		/*html*/
		`
			<style>
				@import url('/themes.css');

				:host {
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
				.invite-message-image-container {
					width: 50px;
					height: 50px;
				}
				#invite-game-container {
					background-color: #213c51;
					display: flex;
					flex-direction: row;
					justify-content: center;
					align-items: center;
					font-style: oblique;
					font-size: 18px;
					max-width: 80%;
					border-radius: 7.5px;
					box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
					gap: 16px;
				}
				#icon-image {
					width:  50px;
					box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
				}

				#msg-status-container {
					display: flex;
					align-self: flex-end;
					flex-direction: row;
					justify-content: end;
					gap: 2px;
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

			</style>
			<div class="message user-message">
				<div id="invite-game-container" class="p-1">
					<div class="invite-message-image-container">
						<img id="icon-image" src="/assets/game-icon.svg" />
					</div>
					<div class="invite-message">Game Invite</div>
					<button class="bg-accent p-0-5 px-1 fs-1-5 hover-brighten transition-med rounded-0-5 mt-1 border-0">
						play ${this.dataset.game}
					</button>
				</div>
			</div>
			`
		)
	}
}