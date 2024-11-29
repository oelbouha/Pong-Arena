import Component from "../../components/base.js"
import './game.js'

class Games extends Component {

    constructor() {
        super()
        this.eventListeners = []
    }

    connectedCallback() {
    }

    html() {
        const html =/*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    height: 100%;
                }
            </style>
            <div class="flex justify-center align-center p-1 h-100">
                <div class="flex wrap align-start gap-1">
                    <div class="column p-1 gap-0-5 rounded-1 bg-glass">
                        <img src="https://imgcdn.stablediffusionweb.com/2024/10/10/ff4e030a-cd55-4d18-bfdb-5c33e8564f59.jpg" class="rounded-1" style="width: 20rem; height: 20rem; max-width: 100%;"/>
                        <div class="column gap-0-5">
                            <h3 class="fw-300 fs-2">Pong</h3>
                            <p class="m-0 fw-200" style="width: 20rem; max-width: 100%;">
                                Pong is a simple game where two players hit a ball back and forth, scoring points when the opponent misses.
                            </p>
                            <wc-link 
                                id="createTrounament" 
                                class="flex justify-center align-center fs-1 p-1-5 py-0-5 rounded-0-25 text-center bg-accent transition-med hover-brighten capitalize" data-to="/games/online_pong/"
                            >Play Online</wc-link>
                            <wc-link 
                                id="createTrounament" 
                                class="flex justify-center align-center fs-1 p-1-5 py-0-5 rounded-0-25 text-center bg-glass color-light-1 transition-med hover-brighten capitalize" data-to="/games/offline_pong/"
                            >Play Offline</wc-link>
                        </div>
                    </div>
                    <div class="column p-1 gap-0-5 rounded-1 bg-glass">
                        <img src="https://m.media-amazon.com/images/I/81ZCczQf25L.png" class="rounded-1" style="height: 20rem; width: 20rem; max-width: 100%;"/>
                        <div class="column gap-0-5">
                            <h3 class="fw-300 fs-2">HandSlap</h3>
                            <p class="m-0 fw-200" style="width: 20rem; max-width: 100%;">
                                An online adaptation of the classic hand-slap game where players virtually clash hands, testing their reflexes and timing.
                            </p>
                            <wc-link
                                id="createTrounament"
                                class="flex justify-center align-center fs-1 p-1-5 py-0-5 rounded-0-25 text-center bg-accent transition-med hover-brighten capitalize" data-to="/games/online_handslap"
                            >Play Online</wc-link>
                            <wc-link
                                id="createTrounament"
                                class="flex justify-center align-center fs-1 p-1-5 py-0-5 rounded-0-25 text-center bg-glass color-light-1 transition-med hover-brighten capitalize" data-to="/games/offline_handslap"
                            >Play Offline</wc-link>
                        </div>
                    </div>
                </div>
            </div>
        `

        return html
    }
}

customElements.define('wc-games', Games)
