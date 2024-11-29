import Component from "../components/base.js";
import API from "../networking.js";
import SVGs from "./svgs.js";
import { addEventListener, media, user_defaults } from "../utils/index.js"
import DATA from "../store.js";
import { navigate_to } from "../router/utils.js";

class Notifications extends Component {
    get state() {
        if (!this._state)
            this._state = {}
        return this._state
    }
    

    get styles() {
        return /*css*/ `
            @import url('/themes.css');
            :host {
                display: flex;
                position: absolute;
                left: calc(100% + 12px);
                top: 0;
                overflow: hidden;
                background: conic-gradient(from 45deg, var(--dark-color-1), var(--dark-color-5), var(--dark-color-1), var(--dark-color-5), var(--dark-color-1));
                border-radius: .5rem;
                padding: 1px;
                z-index: 3;
            }

            #wrapper {
                width: 25rem;
                height: 30rem;
                max-height: calc(100vh - 32px);
                min-height: 20rem;
            }
            #content {
                height: 100%;
                max-height: 100%;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--dark-color-5) transparent;
            }
            #content::-webkit-scrollbar-thumb {
                background: var(--dark-color-5);
                border-radius: 4rem;
            }

            #content::-webkit-scrollbar {
                background: transparent;
                width: 4px;
            }
            .notification {
                --color: var(--text-light-2);
            }
        `
    }

    constructor() {
        super()
        this.eventListeners = []
    }

    connectedCallback() {
        this.getNotifications()

        const friendRequests = this.shadowRoot.getElementById('friendRequestsContent')
        const otherNotifications = this.shadowRoot.getElementById('otherNotifications')
        this.eventListeners.push(
            addEventListener(friendRequests, 'click', e => {
                const btn = e.target.closest('button.action')
                if (!btn) return

                const action = btn.dataset.action
                if (!action) return

                const friendRequest = btn.closest('.friend_request')
                this[action](friendRequest)

            }),
            addEventListener(otherNotifications, 'click', e => {
                const btn = e.target.closest('button.action')
                if (!btn) return

                const action = btn.dataset.action
                if (!action || !btn.dataset.tournament) return

                if (action == "playTournament")
                {
                    DATA.set('tournament_id', btn.dataset.tournament)
                    const redir = btn.dataset.game == 'pong'? 'online_pong' : 'online_handslap'
                    window.dispatchEvent(new CustomEvent('remove:overlay', {
                        composed: true,
                        bubbles: true
                    }))
                    navigate_to(`/games/${redir}/`)
                }

            }),
            addEventListener(window, "friendrequestaccepted", () => {
                this.getNotifications()
            }),
            addEventListener(window, "friendrequestreceived", () => {
                this.getNotifications()
            }),
            addEventListener(window, 'notification', () => this.getOtherNotifications())
        )
    }

    async getNotifications() {
        await this.getFriendRequests()
        await this.getOtherNotifications()
    }
    async getFriendRequests() {
        const res = await API.get(API.urls.friend_requests)
        
        if (res.ok) {
            this.state.requests = res.body
            const content = this.shadowRoot.getElementById('friendRequestsContent')
            content.innerHTML = this.requestsHtml
        }
    }
    async getOtherNotifications() {
        const res = await API.get(API.urls.notifications)
        
        if (res.ok) {
            this.state.notifications = res.body.notifications
            const notifs = this.state.notifications.map(notif => {
                notif = JSON.parse(notif.content)
                return notif.type + '' + notif.name || ''
            })
            const content = this.shadowRoot.getElementById('otherNotifications')
            content.innerHTML = this.notificationHtml
            
        }
    }
    async acceptRequest(requestElem) {
        const user_id = requestElem.dataset.user
        const res = await API.post(API.urls.accept_friend_request, {
            from_user: user_id
        })
        if (res.ok) {
            requestElem.remove()
            this.dispatchEvent('friendrequestaccepted', {
                user_id
            })
        }
    }
    async declineRequest(requestElem) {
        const user_id = requestElem.dataset.user
        const res = await API.post(API.urls.accept_friend_request, {
            from_user: user_id
        })
        if (res.ok) {
            requestElem.remove()
            this.dispatchEvent('friendrequestdeclined', {
                user_id
            })
        }
    }
    dispatchEvent(event, detail) {
        window.dispatchEvent(new CustomEvent(event, {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail
        }))
    }

    html() {
        return /*html*/`
            <style> ${this.styles} </style>
            <div id="wrapper" class="bg-dark-3 rounded-0-5 overflow-hidden">
                <div id="content">
                    <div class="column p-1 gap-1">
                        <h3 class="fw-300 fs-1-5">Friend requests</h3>
                        <div id="friendRequestsContent" class="column gap-1">
                            ${ 
                                SVGs.loading({
                                    width: '2rem',
                                    style: 'align-self: center'
                                })
                            }
                        </div>
                    </div>
                    <div class="column gap-1 mb-1">
                        <h3 class="fw-300 fs-1-5 px-1">Other</h3>
                        <div id="otherNotifications" class="column gap-0-25">
                            ${ 
                                SVGs.loading({
                                    width: '2rem',
                                    style: 'align-self: center'
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    
    get requestsHtml() {
        const html = this.state.requests.map(
            req => this.friendRequestHtml(user_defaults(req.sent_from))
        ).join('')

        const empty = /*html*/ `
            <div class="color-light-7 text-center rounded-0-5 border-glass p-1">
                You Don't Have Friend Requests :)
            </div>
        `
        return html || empty
    }
    get buttonsHtml() {
        return {
            AcceptRequest: /*html*/`
                <button
                    data-action="acceptRequest"
                    class="action fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-accent transition-med hover-brighten"
                >
                    Accept
                </button>
            `,
            DeclineRequest: /*html*/`
                <button
                    data-action="declineRequest"
                    class="action fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-red transition-med hover-brighten"
                >
                    Decline
                </button>
            `,
        }
    }
    get notificationHtml() {
        const transformers = {
            friend_accepted: (raw) => {
                const user = {
                    id: raw.content.id,
                    name: raw.content.name,
                    profile_image: raw.content.image ? media(raw.content.image) : "/assets/default-avatar.avif"
                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}" data-user="${user.id}">
                        <wc-link data-to="/users/${user.username || 'not_found'}" class="no-shrink" style="width: 3rem;">
                            <img src="${user.profile_image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">${user.name} <span class="fw-300">accepted your friend request</span></h3>
                        </div>
                    </div>
                `
            },
            new_friend_request: (raw) => {
                const user = {
                    id: raw.content.id,
                    username: raw.content.username,
                    name: raw.content.name,
                    profile_image: raw.content.image ? media(raw.content.image) : "/assets/default-avatar.avif"
                }
                const request = this.state.requests.find(r => r.id = raw.content.request_id)
                if (!request) {

                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}" data-user="${user.id}">
                        <wc-link data-to="/users/${user.username || 'not_found'}" class="no-shrink" style="width: 3rem;">
                            <img src="${user.profile_image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">${user.name} <span class="fw-300">sent you a friend request</span></h3>
                        </div>
                    </div>
                `
            },
            tournament_user_joined: (raw) => {
                const tournament = {
                    id: raw.content.tournament_id,
                    name: raw.content.tournament_name,
                    image: media(raw.content.tournament_image),
                    user: raw.content.user
                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}">
                        <wc-link data-to="/tournaments/${tournament.id || ''}" class="no-shrink" style="width: 3rem;">
                            <img src="${tournament.image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">
                                <wc-link data-to="/users/${tournament.user.username}/" style="display: inline">
                                    <a style="font-style: italic;">${tournament.user.name}</a>
                                </wc-link>
                                <span class="fw-300">has joined <strong>${tournament.name}</strong></span>
                            </h3>
                        </div>
                    </div>
                `
            },
            tournament_user_left: (raw) => {
                const tournament = {
                    id: raw.content.tournament_id,
                    name: raw.content.tournament_name,
                    image: media(raw.content.tournament_image),
                    user: raw.content.user
                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}">
                        <wc-link data-to="/tournaments/${tournament.id || ''}" class="no-shrink" style="width: 3rem;">
                            <img src="${tournament.image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">
                                <wc-link data-to="/users/${tournament.user.username}/" style="display: inline">
                                    <a style="font-style: italic;">${tournament.user.name}</a>
                                </wc-link>
                                <span class="fw-300">has left <strong>${tournament.name}</strong></span>
                            </h3>
                        </div>
                    </div>
                `
            },
            tournament_locked: (raw) => {
                const tournament = {
                    id: raw.content.tournament_id,
                    name: raw.content.tournament_name,
                    image: media(raw.content.tournament_image)
                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}">
                        <wc-link data-to="/tournaments/${tournament.id || ''}" class="no-shrink" style="width: 3rem;">
                            <img src="${tournament.image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">
                                ${tournament.name}
                                <span class="fw-300">has been locked</strong></span>
                            </h3>
                        </div>
                    </div>
                `
            },
            tournament_round_start: (raw) => {
                const tournament = {
                    id: raw.content.tournament_id,
                    name: raw.content.tournament_name,
                    image: media(raw.content.tournament_image),
                    round: raw.content.tournament_round,
                    game: raw.content.tournament_game.toLowerCase()
                }
                return /*html*/ `
                    <div class="notification friend_request flex gap-1 align-center p-0-5 ${raw.seen?'':'bg-glass'}">
                        <wc-link data-to="/tournaments/${tournament.id || ''}" class="no-shrink" style="width: 3rem;">
                            <img src="${tournament.image}" class="rounded-pill img-cover" style="width: 3rem;height:3rem;" />
                        </wc-link>
                        <div class="body">
                            <h3 class="mb-0-25 fw-400 fs-1">
                                <span class="capitalize">${tournament.name}</span>
                                <span class="fw-300">tournament round ${tournament.round - 1} started</strong></span>
                            </h3>
                            <button
                                data-action="playTournament"
                                class="action fs-1 p-1-5 py-0-5 rounded-0-5 text-center bg-accent transition-med hover-brighten"
                                data-tournament="${tournament.id}"
                                data-game="${tournament.game}"
                            >
                                Play
                            </button>
                        </div>
                    </div>
                `
            }
        }
        return this.state.notifications.map(raw => {
            const content = JSON.parse(raw.content)
            const notif = {
                seen: raw.seen,
                content
            }
            const transformer = transformers[notif.content.type] || ((a) => '')
            return transformer(notif)
        }).join('')
    }
    friendRequestHtml(user) {
        return /*html*/ `
            <div class="notification friend_request flex gap-1 align-start" data-user="${user.id}">
                <wc-link data-to="/users/${user.username}" style="width: 4rem;">
                    <img src="${user.profile_image}" class="rounded-pill img-cover" style="width: 4rem;height:4rem;" />
                </wc-link>
                <div class="body">
                    <h3 class="mb-0-25 fw-500 fs-1">friend request from ${user.username}</h3>
                    <div class="flex wrap gap-0-5">
                        ${ this.buttonsHtml.AcceptRequest }
                        ${ this.buttonsHtml.DeclineRequest }
                    </div>
                </div>
            </div>
        `
    }
}

export default Notifications