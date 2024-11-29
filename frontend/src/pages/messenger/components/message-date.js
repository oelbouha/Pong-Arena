

export class messageDate extends HTMLElement {
	constructor() {
		super()
		this.attachShadow({mode:'open'});
        this.container = document.createElement('div')
        this.container.innerHTML = this.html()
		this.shadowRoot.appendChild(this.container);

	}

	addMessageDate(date) {
		const body = this.shadowRoot.querySelector(".date")
		if (body)
			body.textContent = date
	}

	connectedCallback() {
	}

	disconnectedCallback() {
    }

	html() {
		return (
			/*html*/
			`
				<style>
					@import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');

					.date-container {
						display: flex;
						flex-direction: row;
						justify-content: center;
						align-items: center;
						margin-bottom: 4px;
						
					}
					.date {
						font-size: 12px;
						background: #022f40;
						padding: 3px 14px;
						border-radius: 7.5px;
						color: white;
						box-shadow: 0 1px 0.5px rgba(0,0,0,0.13);
					}
				</style>

				<div class="date-container">
					<div class="date"> November 15, 2024 </div>
				</div>
			`
		)
	}
}