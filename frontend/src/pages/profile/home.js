import Component from "../../components/base.js";
import { inlineTournamentItemHtml, inlineTournamentItemSkeletonHtml, userItemHtml, userItemSkeletonHtml } from "../../components/htmlSnippets.js";
import API from "../../networking.js"
import DATA from "../../store.js";
import { addEventListener, notify, sleep, tournament_defaults, user_defaults } from "../../utils/index.js";
import { Notification } from "../Notifier.js";



class Users extends Component {

    get eventListeners() {
        if (!this._evl) this._evl = []
        return this._evl
    }
    set eventListeners(v) {
        this._evl = v
    }

    connectedCallback() {
        const searchBtn = this.shadowRoot.getElementById('searchBtn')
        const searchInput = this.shadowRoot.getElementById('searchInput')
        const content = this.shadowRoot.getElementById('content')

        const usersList = this.shadowRoot.getElementById('usersList')
        const tournamentsList = this.shadowRoot.getElementById('tournamentsList')

        const tournament_actions = {
            join: this.join,
            leave: this.leave,
            lock: this.lock
        }

        const users_actions = {
            'remove friend': this.removeFriend,
            'add friend': this.addFriend,
            'unblock': this.unblockUser,
            'cancel request': this.cancelRequest,
            'accept request': this.acceptRequest
        }

        const search = () => {
            if (searchInput.value.length <= 3) return
            if (!content.classList.contains('grow')) {
                content.classList.add('grow')
                setTimeout(() => {
                    content.classList.remove('overflow-hidden')
                }, 1000)
            }
            this.search(searchInput.value)
        }
        this.eventListeners.push(
            addEventListener(searchBtn, 'click', search),
            addEventListener(searchInput, 'keydown', (e) => {
                if (e.key == 'Enter') search()
            }),
            addEventListener(tournamentsList, 'click', e => {
                const target = e.target
                if (target.dataset.action) {
                    const action = tournament_actions[target.dataset.action.toLowerCase()]
                    if (action)
                        action(target.dataset.tournament, target)
                }
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

    async search(q) {
        const usersList = this.shadowRoot.getElementById('usersList')
        const tournamentsList = this.shadowRoot.getElementById('tournamentsList')
        usersList.innerHTML = userItemSkeletonHtml(5)
        tournamentsList.innerHTML = inlineTournamentItemSkeletonHtml(5)


        const users_res = await API.get(API.urls.user_search(q))
        const tournaments_res = await API.get(API.urls.tournament_search(q))
        await sleep(1000)
        const me = DATA.get('auth_user')

        if (users_res.ok) {
            const actions = {
                yes: 'remove friend',
                no: 'add friend',
                blocked: 'unblock',
                request_sent: 'cancel request',
                request_received: 'accept request'
            }
            const users = users_res.body.map(u => user_defaults(u))
            const html = users.map(u => userItemHtml(u, [actions[u.is_friend]])).join('')
            usersList.innerHTML = html || /*html*/ `
                <div class="p-2 text-center fs-1-5 border-glass color-glass rounded-0-5">No Users Found</div>
            `
        }
        if (tournaments_res.ok) {
            const ts = tournaments_res.body.map(t => tournament_defaults(t))
            const html = ts.map(t => {
                return inlineTournamentItemHtml(t, [t.action(me.id)])
            }).join('')
            tournamentsList.innerHTML = html|| /*html*/ `
                <div class="p-2 text-center fs-1-5 border-glass color-glass rounded-0-5">No Tournaments Found</div>
            `
        }
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
    async addFriend(id, btn) {
        const res = await API.post(API.urls.add_friend, {
            to_user: id
        })
        if (res.ok) {
            btn.innerText = 'cancel request'
            btn.dataset.action = 'cancel request'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async removeFriend(id, btn) {
        const res = await API.delete(API.urls.friendship(id))
        if (res.ok) {
            btn.innerText = 'add friend'
            btn.dataset.action = 'add friend'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async acceptRequest(id, btn) {
        const res = await API.post(API.urls.accept_friend_request, {
            from_user: id
        })
        if (res.ok) {
            btn.innerText = 'remove friend'
            btn.dataset.action = 'remove friend'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async cancelRequest(id, btn) {
        const res = await API.post(API.urls.cancel_friend_request, {
            to_user: id
        })
        if (res.ok) {
            btn.innerText = 'add friend'
            btn.dataset.action = 'add friend'
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async unblockUser(id, btn) {
        const res = await API.post(API.urls.unblock_user(id))
        if (res.ok) {
            btn.remove()
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
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
                <div class="search column gap-1 wrap align-center mb-2">
                    <p class="color-light-4 fs-1-5 fw-300 bg-none capitalize">
                        Search for Users and Trounaments
                    </p>
                    <input 
                        type="search"
                        placeholder="Search..."
                        class="grow bg-glass p-1 border-0 rounded-0-5 fs-1 color-light-1 fw-300 outline-0"
                        style="width: 35rem; max-width: min(100%, 35rem);"
                        id="searchInput" 
                    />
                    <button type="button" id="searchBtn" class="color-light-3 fs-1-5 fw-300 bg-none capitalize">search</button>
                </div>

                <div id="content" class="main flex wrap gap-1 basis-0 overflow-hidden grow-0 transition-slow">
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">Users</h2>
                        <div id="usersList" class="column gap-1">
                            ${ userItemSkeletonHtml(5) }
                        </div>
                    </div>
                    <div class="grow basis-0">
                        <h2 class="mb-1 fs-2 fw-400">Tournaments</h2>
                        <div id="tournamentsList" class="column gap-1">
                            ${ 
                                inlineTournamentItemSkeletonHtml(5)    
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

customElements.define('wc-users', Users)