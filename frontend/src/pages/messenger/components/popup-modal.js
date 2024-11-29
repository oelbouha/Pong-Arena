import { addEventListener } from "../../../utils/index.js";

export class popUpModal extends HTMLElement {
	constructor() {
		super()
		this.attachShadow({mode:'open'});
        this.container = document.createElement('div')
        this.container.innerHTML = this.html()
		this.shadowRoot.appendChild(this.container);

		this.eventListeners = []
	}

	handleClick() {
		const modal = this.shadowRoot.querySelector('.modal-container');
		if (modal){
			modal.style.display = "none";
			const overlay = this.shadowRoot.querySelector("#overlay")
			overlay.style.display = "none";
		}
	}

	addMessage(content) {
		const body = this.shadowRoot.querySelector(".body-content")
		body.textContent = content
	}


	connectedCallback() {
        const closeBtn = this.shadowRoot.querySelector('.close-btn');
		const overlay = this.shadowRoot.querySelector('#overlay');

		this.eventListeners.push(
			addEventListener(overlay, 'click', this.handleClick.bind(this)),
			addEventListener(closeBtn, 'click', this.handleClick.bind(this)),
		)
	}

    disconnectedCallback() {
        this.eventListeners.forEach(ev => ev.unregister())
        this.eventListeners = []
    }

	html() {
		return (
			/*html*/
			`
			<style>
				@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');

				.modal-container {
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					min-width: 400px;
					box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
					background-color: #213c51;
					border-radius: 14px;
					display: flex;
					flex-direction: column;
					padding: 14px;
					gap: 10px;
					z-index: 6;
					transition: all 0.3s ease-in-out;
				}
				.body-content , .header{
					color: white;
				}
				.body-container {
					display: flex;
					justify-content: center;
					align-items: center;
				}
				.header {
					display: flex;
					flex-direction: column;
					border-bottom: 1px solid #FFF;
					padding-bottom: 6px;
				}
				.close-btn {
					align-self: end;
					cursor: pointer;
				}
				.overlay {
               		position: fixed;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					background-color: rgba(0, 0, 0, 0.5);
					z-index: 5;
					display: block;
            }
			</style>

			<div class="modal-container">
				<div class="header">
					<svg class="close-btn" width="25" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM8.96963 8.96965C9.26252 8.67676 9.73739 8.67676 10.0303 8.96965L12 10.9393L13.9696 8.96967C14.2625 8.67678 14.7374 8.67678 15.0303 8.96967C15.3232 9.26256 15.3232 9.73744 15.0303 10.0303L13.0606 12L15.0303 13.9696C15.3232 14.2625 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2625 15.3232 13.9696 15.0303L12 13.0607L10.0303 15.0303C9.73742 15.3232 9.26254 15.3232 8.96965 15.0303C8.67676 14.7374 8.67676 14.2625 8.96965 13.9697L10.9393 12L8.96963 10.0303C8.67673 9.73742 8.67673 9.26254 8.96963 8.96965Z" fill="#FFF"/>
					</svg>
				</div>
				<div class="body-container">
					<div class="body-content">
						this is the error message to be displayed
					</div>
				</div>
			</div>
			<div class="overlay" id="overlay" ></div>
			`
		)
	}
}