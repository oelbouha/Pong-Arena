import Component from "../../components/base.js";
import SVGs from "../../components/svgs.js";
import DATA from "../../store.js";
import API from "../../networking.js"
import { addEventListener, create_element, games_images, history_defaults, notify, user_defaults } from "../../utils/index.js";
import { users } from "../dummyData.js";
import { Notification } from "../Notifier.js";
import { userItemHtml, tournamentItemHtml, historyItemHtml } from "../../components/htmlSnippets.js";

class Profile extends Component {

    static get observedAttributes() {
        return ['username']
    }
    get eventListeners() {
        if (!this._evl) this._evl = []
        return this._evl
    }
    set eventListeners(v) {
        this._evl = v
    }
    connectedCallback() {
        if (!this.state) return

        this.eventListeners.forEach(l => l.unregister())
        this.eventListeners = []

        const me = DATA.get('auth_user')
        const actions = this.shadowRoot.querySelector('.actions')
        const gamesList = this.shadowRoot.querySelector('.games-stats .games-list')
        const historyList = this.shadowRoot.getElementById('historyList')
        const tournamentsList = this.shadowRoot.getElementById('tournamentsList')
        const usersList = this.shadowRoot.getElementById('friendsList')

        const tournament_actions = {
            join: this.join,
            leave: this.leave,
            lock: this.lock
        }
        const users_actions = {
            'remove friend': this.listRemoveFriend,
            'add friend': this.listAddFriend,
            'unblock': this.listUnblockUser,
            'cancel request': this.listCancelRequest
        }
        const allowedActions = {
            moreHistory: this.moreHistory,
        }

        this.eventListeners.push(
            addEventListener(gamesList, 'click', e => {
                const closestGame = e.target.closest('.game')
                if (!closestGame) return

                const active = gamesList.querySelector('.game.active')
                const gameMatches = this.shadowRoot.querySelector('.games-stats .game-matches')
                const gameWins = this.shadowRoot.querySelector('.games-stats .game-wins')
                const gameLosses = this.shadowRoot.querySelector('.games-stats .game-losses')
                const gameName = closestGame.dataset.gameName
                const svg = create_element(this.statsSvgHtml(gameName))
                const statsSvg = this.shadowRoot.getElementById('progress')

                gameMatches.textContent = this.state[gameName].matches
                gameWins.textContent = this.state[gameName].wins
                gameLosses.textContent = this.state[gameName].losses
                statsSvg.replaceWith(svg)

                active.classList.remove('active')
                closestGame.classList.add('active')
            }),
            addEventListener(actions, 'click', e => {
                const btn = e.target.closest('button')
                if (!btn) return
                this[btn.id]()
            }),
            addEventListener(historyList, 'click', e => {
                if (!e.target.dataset.action) return
                const action = allowedActions[e.target.dataset.action]
                if (action) action.call(this, e.target)
            }),
            addEventListener(tournamentsList, 'click', e => {
                const target = e.target
                if (target.dataset.action) {
                    const action = tournament_actions[target.dataset.action.toLowerCase()]
                    if (action)
                        action(target.dataset.tournament, target)
                }
            }),
            addEventListener(window, 'friendrequestaccepted', e => {
                if (e.detail.user_id == this.state.id || me.id == this.state.id)
                    this.re_render()
            }),
            addEventListener(window, 'friendrequestdeclined', e => {
                if (e.detail.user_id == this.state.id || me.id == this.state.id)
                    this.re_render()
            }),
            addEventListener(window, 'friendrequestreceived', e => {
                if (e.detail.user_id == this.state.id || me.id == this.state.id)
                    this.re_render()
            }),
            addEventListener(usersList, 'click', e => {
                const target = e.target
                if (target.dataset.action) {
                    const action = users_actions[target.dataset.action.toLowerCase()]
                    if (action)
                        action(target.dataset.user, target)
                }
            }),
        )
    }
    attributeChangedCallback(name, oVal, nVal) {
        if (name == 'username' && nVal) {
            ;(async()=> {
                const me = DATA.get('auth_user')
    
                if (nVal == me.username) this.state = me
                else {
                    const res = await API.get(API.urls.user(nVal))
                    if (res.ok) this.state = user_defaults(res.body)
                }
    
                this.render()
                this.connectedCallback()
                if (!this.state) { /*Error*/}
            })()
        }
    }

    async re_render(rerender_friends=true) {
        const me = DATA.get('auth_user')
        const username = this.getAttribute('username')
        const res = await API.get(API.urls.user(username))
        if (res.ok) {
            this.state = user_defaults(res.body)
            if (me.id == this.state.id) DATA.set_authenticated_user(res.body)

            const actions = this.shadowRoot.querySelector('.actions')
            actions.innerHTML = this.actionsHtml(true)

            if (rerender_friends) {
                const friends = this.shadowRoot.getElementById('friendsList')
                friends.innerHTML = this.friendsHtml
            }
        }
    }
    async addFriend() {
        const res = await API.post(API.urls.add_friend, {
            to_user: this.state.id
        })
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async removeFriend() {
        const res = await API.delete(API.urls.friendship(this.state.id))
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async acceptRequest() {
        const res = await API.post(API.urls.accept_friend_request, {
            from_user: this.state.id
        })
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async declineRequest() {
        const res = await API.post(API.urls.decline_friend_request, {
            from_user: this.state.id
        })
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async cancelRequest() {
        const res = await API.post(API.urls.cancel_friend_request, {
            to_user: this.state.id
        })
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async blockUser() {
        const res = await API.post(API.urls.block_user(this.state.id))
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }
    async unblockUser() {
        const res = await API.post(API.urls.unblock_user(this.state.id))
        if (!res.ok) notify( new Notification(res.body.detail) )
        this.re_render()
    }

    async moreHistory(btn) {
        const res = await API.get(API.urls.history(this.state.id, btn.dataset.page))
        if (!res.ok) {
            btn.remove()
            return
        }

        const more = res.body
        if (more.length == 0) {
            btn.remove()
            return
        }
        const me = DATA.get('auth_user')
        const html = more.map(item => historyItemHtml(history_defaults(item), me.id)).join('')+ /*html*/ `
            <button
                class="color-light-3 fs-1-25 fw-300 bg-none capitalize"
                data-action="moreHistory"
                data-page="${parseInt(btn.dataset.page) + 1} "
            >
                more
            </button>
        `
        const childrenWrapper = create_element('<div>' + html + '</div>')
        const parent = btn.parentElement
        btn.remove()
        parent.append(...childrenWrapper.childNodes)
    }
    async join(id, btn) {
        const res = await API.post(API.urls.join_tournament(id))
        if (res.ok) {
            btn.innerText = 'leave'
            btn.dataset.action = 'leave'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async leave(id, btn) {
        const res = await API.post(API.urls.leave_tournament(id))
        if (res.ok) {
            btn.innerText = 'join'
            btn.dataset.action = 'join'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async lock(id, btn) {
        const res = await API.post(API.urls.join_tournament(id))
        if (res.ok) {
            btn.remove()
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async listAddFriend(id, btn) {
        const res = await API.post(API.urls.add_friend, {
            to_user: id
        })
        if (res.ok) {
            btn.innerText = 'cancel request'
            btn.dataset.action = 'cancel request'
        }
    }
    async listRemoveFriend(id, btn) {
        const res = await API.delete(API.urls.friendship(id))
        if (res.ok) {
            btn.innerText = 'add friend'
            btn.dataset.action = 'add friend'
        }
    }
    async listCancelRequest(id, btn) {
        const res = await API.post(API.urls.cancel_friend_request, {
            to_user: id
        })
        if (res.ok) {
            btn.innerText = 'add friend'
            btn.dataset.action = 'add friend'
        }
    }
    async listUnblockUser(id, btn) {
        const res = await API.post(API.urls.unblock_user(id))
        if (res.ok) {
            btn.remove()
        }
    }


    html() {
        const loadingHtml = /*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
            </style>
            <div class="flex justify-center align-center h-100 w-100">
                ${SVGs.loading({width: '3rem'})}
            </div>
        `
        return this.state ? this.profileHtml() : loadingHtml
    }

    statsSvgHtml(game='pong') {

        const x_start = 40, x_end = 490, y_start = 246, y_end = 25
        const step_dist = 22

        const steps = () => {
            let s = y_start - step_dist
            let ret = ''
            while (s > y_end) {
                ret += `M${x_start - 1},${s} h2 `
                s -= step_dist
            }
            return ret
        }
        const stepsText = (increment) => {
            let val = increment
            let s = y_start - step_dist
            let ret = ''
            while (s > y_end) {
                ret += /*html*/`
                    <text x="20" y="${s + 2}" style="font-size: 8px" fill="#c0c0c0ad">
                        ${val}
                    </text>
                `
                s -= step_dist
                val += increment
            }
            return ret
        }
        const progress = () => {
            const his = this.state[game + '_his']
            if (his.length == 0) return ''
            const history = his.map(h => {
                h.ratio = (h.p1_exchange + h.p2_exchange) / h.winning_score;
                const me = h.p1.id == this.state.id ? h.p1 : h.p2
                const opponent = h.p1.id == this.state.id ? h.p2 : h.p1
                h.win = me.score > opponent.score
                return h
            })
            const max = history.reduce((p, c) => p.ratio > c.ratio? p : c ).ratio

            const _x_step = (x_end - x_start) / (history.length - 1)
            const x_step = _x_step > 30 ? 30 : _x_step
            const y_range = y_start - y_end

            const rects = history.map((item, idx) => {
                const x = idx * x_step + x_start
                const y = y_start - (item.ratio / max) * y_range

                const h = y_start - y
                if (h == 0) {
                    const y = y_start - y_range
                    return /*html*/`
                        <rect fill="gray" x="${x}" y="${y}" height="${y_start - y}" width="${x_step - 1}" rx="4" />
                    ` 
                }

                return /*html*/`
                    <rect fill="${item.win?'green':'red'}" x="${x}" y="${y}" height="${y_start - y}" width="${x_step - 1}" rx="4" />
                `
            })

            return rects
        }
        

        return /*html*/`
            <svg id="progress" viewBox="0 0 512 260">
                <path d="M40,10 V246 H502" stroke-linejoin="round" stroke="#c0c0c0ad" fill="none"></path>
                <path d="M38,12 L40,10 L42,12" stroke-linecap="round" stroke-linejoin="round" style="stroke:#c0c0c0ad; fill: none;"></path>
                <path d="M500,244 L502,246 L500,248" stroke-linecap="round" stroke-linejoin="round" style="stroke:#c0c0c0ad; fill: none;"></path>
                <path d="${steps()}" stroke-linecap="round" stroke="#c0c0c0ad" fill="none"></path>
                <text x="220" y="-115" style="font-size: 10px;transform: rotate(-90deg);transform-origin: center;" fill="#c0c0c0ad">Exchanges / Goal</text>
                <text x="220" y="258" style="font-size: 10px;" fill="#c0c0c0ad">Last Matches</text>

                <circle r="4" cx="360" cy="255" fill="green" />
                <text x="368" y="258" style="font-size: 10px;" fill="#c0c0c0cd">win</text>

                <circle r="4" cx="410" cy="255" fill="red" />
                <text x="418" y="258" style="font-size: 10px;" fill="#c0c0c0cd">loss</text>

                <circle r="4" cx="460" cy="255" fill="gray" />
                <text x="468" y="258" style="font-size: 10px;" fill="#c0c0c0cd">forfiet</text>
                ${ stepsText(35) }
                ${ progress() }
            </svg>
        `
    }
    actionsHtml(inner=false) {
        const auth_user = DATA.get('auth_user')
        const btns = {
            SettingsLink: /*html*/`
                <wc-link class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-accent transition-med hover-brighten" data-to="/settings">Settings</wc-link>
            `,
            AddFriend: /*html*/`
                <button id="addFriend" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-accent transition-med hover-brighten">Add Friend</button>
            `,
            RemoveFriend: /*html*/`
                <button id="removeFriend" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten">Remove Friend</button>
            `,
            CancelRequest: /*html*/`
                <button id="cancelRequest" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten">Cancel Request</button>
            `,
            AcceptRequest: /*html*/`
                <button id="acceptRequest" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-accent transition-med hover-brighten">Accept Request</button>
            `,
            DeclineRequest: /*html*/`
                <button id="declineRequest" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten">Decline Request</button>
            `,
            BlockUser: /*html*/`
                <button id="blockUser" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten">Block</button>
            `,
            UnblockUser: /*html*/`
                <button id="unblockUser" class="fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten">Unblock</button>
            `
        }
        const map = {
            yes: btns.RemoveFriend + btns.BlockUser,
            no: btns.AddFriend + btns.BlockUser,
            request_sent: btns.CancelRequest + btns.BlockUser,
            request_received: btns.AcceptRequest + btns.DeclineRequest + btns.BlockUser,
            blocked: btns.UnblockUser
        }
        const actions = []

        this.state.id == auth_user.id && actions.push(btns.SettingsLink)
        if (this.state.id != auth_user.id) 
            actions.push(map[this.state.is_friend])

        if (inner) return actions.join('')

        return /*html*/ `
            <div class="actions flex align-start gap-0-5 ml-auto py-0-5">
                ${ actions.join('') }
            </div>
        `
    }
    get styles() {
        return /*css*/ `
            @import url("/themes.css");
            :host {
                position: relative;
            }
            .games-stats .game {
                filter: brightness(.5);
            }
            .games-stats .game.active {
                filter: brightness(1);
            }
            #progress {
                width: 50rem;
                max-width: min(100%, 50rem);
            }

            .winner {
                outline: 3px solid green;
                outline-offset: 4px;
            }
            .loser {
                outline: 3px solid red;
                outline-offset: 4px;
            }
            .leave {
                background-color: var(--accent-color);
                border: none;
                border-radius: .25rem;
                padding: .5rem 1rem;
            }
        `
    }
    get friendsHtml() {
        const friends = this.state.friends
                .map(user => userItemHtml(user_defaults(user), ['remove friend']))
                .join('')
        const empty = /*html*/ `
                    <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                        You Don't Have Friends :)
                    </div>
                `
        return friends || empty
    }
    get historyHtml() {
        const history = () => {
            const entries = this.state.history
                .map(item => historyItemHtml(item, this.state.id))
                .join('')
            const moreBtn =  /*html*/ `
                <button
                    class="color-light-3 fs-1-25 fw-300 bg-none capitalize"
                    data-action="moreHistory"
                    data-page="2"
                >
                    more
                </button>
            `
            return entries + moreBtn
        }
        const empty = /*html*/ `
            <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                You Havn't Plyed Yet :(
            </div>
        `
        return this.state.history.length ? history() : empty
    }
    get statsHtml() {
        return /*html*/`
            <div class="column gap-1 m-1 rounded-0-5 border-glass">
                
                <div class="stats flex wrap justify-center gap-2">
                    <div class="column align-center gap-0-5 p-1">
                        <h2 class="fw-400">Matches</h2>
                        <h3 class="fs-2 fw-300">${this.state.pong.matches + this.state.slap.matches}</h3>
                    </div>
                    <div class="column align-center gap-0-5 p-1">
                        <h2 class="fw-400">Wins</h2>
                        <h3 class="fs-2 fw-300">${this.state.pong.wins + this.state.slap.wins}</h3>
                    </div>
                    <div class="column align-center gap-0-5 p-1">
                        <h2 class="fw-400">Losses</h2>
                        <h3 class="fs-2 fw-300">${this.state.pong.losses + this.state.slap.losses}</h3>
                    </div>
                </div>
                
                <div class="games-stats flex justify-center wrap gap-1 p-1">
                    <div class="games-list column justify-center gap-1">
                        <div
                            data-game-name="pong"
                            class="game active column align-center gap-0-5 border-glass pointer relative p-1 rounded-0-5">
                            <img
                                class="img-cover bg-silver rounded-0-5"
                                style="width: 4rem; height: 4rem;" 
                                src="${games_images['pong']}" />
                            <h2 class="fs-1-25 fw-400 pointer">Pong</h2>
                        </div>
                        <div
                            data-game-name="slap"
                            class="game column align-center gap-0-5 border-glass pointer relative p-1 rounded-0-5">
                            <img
                                class="img-cover bg-silver rounded-0-5"
                                style="width: 4rem; height: 4rem;" 
                                src="${games_images['slap']}" />
                            <h2 class="fs-1-25 fw-400 pointer">HandSlap</h2>
                        </div>
                    </div>
                    
                    <div class="column justify-center gap-1">
                        <div class="column align-center gap-0-5 p-1">
                            <h2 class="fs-1-5 fw-400">Matches</h2>
                            <h3 class="game-matches fs-1-5 fw-300">${this.state.pong.matches}</h3>
                        </div>
                        <div class="column align-center gap-0-5 p-1">
                            <h2 class="fs-1-5 fw-400">Wins</h2>
                            <h3 class="game-wins fs-1-5 fw-300">${this.state.pong.wins}</h3>
                        </div>
                        <div class="column align-center gap-0-5 p-1">
                            <h2 class="fs-1-5 fw-400">Losses</h2>
                            <h3 class="game-losses fs-1-5 fw-300">${this.state.pong.losses}</h3>
                        </div>
                    </div>
                    ${ this.statsSvgHtml() } 
                </div>
            </div>
        `
    }
    get tournamentsHtml() {
        const me_id = DATA.get('auth_user').id
        return this.state.tournaments.map(tournament => {
            const actions = []
            let classes = ''

            if (tournament.is_joinable && !tournament.participants.find(u => u.id == me_id))
                actions.push('Join')
            else if (tournament.is_joinable)
                actions.push('leave')
            return tournamentItemHtml(tournament, actions, classes)
        }).join('') || /*html*/ `
            <div class="text-center fs-2 color-glass p-2">You dont have tournaments</div>
        `
    }
    profileHtml() {
        return /*html*/`
            <style> ${this.styles} </style>
            <div id="profile" class="pb-2">
                <div class="header p-1">
                    <div class="grid w-100 mw-100 rounded-1 overflow-hidden">
                        <img
                            class="w-100 img-cover"
                            style="max-height: 20rem;"
                            src="${this.state.profile_banner}">
                    </div>
                    <div class="flex wrap gap-1 w-100 px-1">
                        <div class="flex align-end relative" style="height: 7.5rem;">
                            <img
                                class="img-cover rounded-pill"
                                style="height: 15rem; width: 15rem;"
                                src="${this.state.profile_image}">
                        </div>
                        <div class="py-0-5">
                            <h1 class="fw-400 capitalize">${this.state.name}</h1>
                            <h2 class="fw-300">@${this.state.username}</h2>
                        </div>
                        ${ this.actionsHtml() }
                    </div>
                </div>
                
                ${ this.statsHtml }

                <div class="tournaments column p-1 rounded-0-5">
                    <h2 class="mb-1 fs-2 fw-400">Tournaments</h2>
                    <div id="tournamentsList" class="flex wrap gap-1 align-start p-1 rounded-1 border-glass justify-center">
                        ${ this.tournamentsHtml }
                    </div>
                </div>
                
                <div class="main flex wrap gap-1 p-1">
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">Friends</h2>
                        <div id="friendsList" class="column gap-1">
                            ${ this.friendsHtml } 
                        </div>
                    </div>
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">History</h2>
                        <div id="historyList"class="column gap-1">
                            ${ this.historyHtml }
                        </div>
                    </div>
                </div>
            </div>
        `
    }
}

customElements.define('wc-profile', Profile)