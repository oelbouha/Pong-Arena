import Component from "../components/base.js";
import { historyItemHtml, inlineTournamentItemHtml, inlineTournamentItemSkeletonHtml, userItemHtml, userItemSkeletonHtml } from "../components/htmlSnippets.js";
import API from "../networking.js"
import DATA from "../store.js";
import { addEventListener, sleep, tournament_defaults, user_defaults } from "../utils/index.js";



class Home extends Component {

    get eventListeners() {
        if (!this._evl) this._evl = []
        return this._evl
    }
    set eventListeners(v) {
        this._evl = v
    }

    connectedCallback() {
    }
    get onlineFriendsHtml() {
        const me = DATA.get('auth_user')
        const online = DATA.get('online_users')
        const friends = me.friends.filter(u => online.includes(u.id))
        const html = friends
                .map(user => userItemHtml(user_defaults(user), ['remove friend']))
                .join('')

        const msg = friends.length ? "No One Of Your Friends Is Online"
                        : "You Dont Have Friends :) <br><small>think of adding some</small>"
        const empty = /*html*/ `
                    <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                        ${msg}
                    </div>
                `
        return html || empty
    }
    get historyHtml() {
        const me = DATA.get('auth_user')
        const historyarray = me.history.slice(0, 5)
        const history = () => {
            const entries = historyarray.map(item => historyItemHtml(item, me.id))
                                .join('')
            return entries
        }
        const empty = /*html*/ `
            <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                You Havn't Plyed Yet :(
            </div>
        `
        return historyarray.length ? history() : empty
    }

    get styles() {
        return /*css*/ `
            @import url('/themes.css');
            :host { height: 100%; }
            #searchInput::placeholder {
                color: white;
                opacity: .6;
            }
              
            #searchInput::-ms-input-placeholder { /* Edge 12 -18 */
                color: white;
                opacity: .8;
            }
        `
    }
    get content() {
        return /*html*/ `
            <style>${this.styles}</style>
            <div class="column p-1 gap-1 h-100 justify-center">
                <div class="search flex gap-1 justify-center mb-2">
                    <div class="flex wrap p-1 gap-1 rounded-1 bg-glass">
                        <img 
                            src="https://imgcdn.stablediffusionweb.com/2024/10/10/ff4e030a-cd55-4d18-bfdb-5c33e8564f59.jpg"
                            class="rounded-1"
                            style="width: 20rem; height: 20rem; max-width: 100%;"
                        >
                        <div class="column gap-0-5">
                            <h3 class="fw-300 fs-2">Pong</h3>
                            <p class="m-0 fw-200" style="width: 20rem; max-width: 100%;">
                                Pong is a simple game where two players hit a ball back and forth, scoring points when the opponent misses.
                            </p>
                        </div>
                        <wc-link
                            class="fs-1-5 color-light-3"
                            style="margin-top: auto; margin-lef: auto"
                            data-to="/games/online_pong/"
                        >
                            Play Now
                        </wc-link>
                    </div>
                </div>

                <div id="content" class="main flex wrap gap-1 basis-0 transition-slow">
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">Online Friends</h2>
                        <div id="usersList" class="column gap-1">
                            ${ this.onlineFriendsHtml }
                        </div>
                    </div>
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">Latest Matches</h2>
                        <div id="tournamentsList" class="column gap-1">
                            ${ 
                                this.historyHtml
                            } 
                        </div>
                    </div>
                </div>
            </div>
        `
    }
    html() {
        return this.content
    }
}

customElements.define('wc-home', Home)