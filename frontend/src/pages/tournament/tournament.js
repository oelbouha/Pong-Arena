import Component from "../../components/base.js";
import SVGs from "../../components/svgs.js"
import API from "../../networking.js"
import generateTournamentSvg from "./tournamentTreeGenerator.js";
import { Notification } from "../Notifier.js"
import { userItemHtml, historyItemHtml } from "../../components/htmlSnippets.js";
import { tournaments, users, history as dumbHistory } from "../dummyData.js";
import { addEventListener, games_images, history_defaults, notify, sleep, tournament_defaults } from "../../utils/index.js";
import DATA from "../../store.js";
import { navigate_to } from "../../router/utils.js";

function date_to_string(date) {
    const day = date.toLocaleDateString("en-EN", { day: 'numeric' })
    const month = date.toLocaleDateString("en-EN", { month: 'long' })
    const year = date.toLocaleDateString("en-EN", { year: 'numeric' })
    const day_name = date.toLocaleDateString("en-EN", { weekday: 'long' })

    return `${month} ${day} ${year}, ${day_name}`
}
function pendingHistoryItemHtml(entry, leftUserId = null) {
    let me, opponent
    if (leftUserId) {
        me = entry.p1.id == leftUserId ? entry.p1 : entry.p2
        opponent = entry.p1.id == leftUserId ? entry.p2 : entry.p1
    } else {
        me = entry.p1
        opponent = entry.p2
    }
    const win = me.score > opponent.score

    const meclass = entry.status == 'PEND' ? 'ong'
                        : win ? 'winner' : 'loser'
    const oppclass = entry.status == 'PEND' ? 'ong'
                        : !win ? 'winner' : 'loser'

    return /*html*/`
        <div class="history-entry flex align-center gap-1 p-1 rounded-0-5 border-glass">
            <div class="left flex gap-1 align-center">
                <div class="column gap-1 align-center">
                    <div class="flex align-end relative">
                        <img
                            class="img-cover rounded-pill ${meclass}"
                            style="height: 3.5rem; width: 3.5rem;"
                            src="${me.profile_image}">
                    </div>
                    <button
                        data-tournament="${entry.tournament}"
                        data-user="${me.id}"
                        data-match="${entry.id}"
                        data-action="assignWinner"
                        type="button"
                        class="color-light-3 fs-1-25 fw-300 bg-none">
                        assign<br>winner
                    </button>
                </div>
                <div class="column">
                    <h3 class="fw-300 fs-1-5">Score</h3>
                    <h2 class="fw-400 fs-1-5">${me.score}</h2>
                </div>
            </div>

            <div class="column align-center relative mx-auto">
                <img
                    class="img-cover rounded-1 bg-silver"
                    style="height: 3.5rem; width: 3.5rem;"
                    src="${games_images[entry.game]}">
                <h3 class="fw-400 fs-1 capitalize">${entry.game}</h3>
            </div>

            <div class="right flex gap-1 align-center">
                <div class="column align-end">
                    <h3 class="fw-300 fs-1-5">score</h3>
                    <h2 class="fw-400 fs-1-5">${opponent.score}</h2>
                </div>
                <div class="column gap-1 align-center">
                    <div class="flex align-end relative">
                        <img
                            class="img-cover rounded-pill ${oppclass}"
                            style="height: 3.5rem; width: 3.5rem;"
                            src="${opponent.profile_image}">
                    </div>
                    <button 
                        data-tournament="${entry.tournament}"
                        data-user="${opponent.id}"
                        data-match="${entry.id}"
                        data-action="assignWinner"
                        type="button"
                        class="color-light-3 fs-1-25 fw-300 bg-none">
                        assign<br>winner
                    </button>
                </div>
            </div>
        </div>
    `
}
function historyEntry(item) {
    if (item.status == "PEND") return pendingHistoryItemHtml(item)
    return historyItemHtml(item)
}


class Tournament extends Component
{
    static get observedAttributes() {
        return ['tournamentid']
    }

    constructor() {
        super()
        this.eventListeners = []
    }
    attributeChangedCallback(name, oVal, nVal) {
        this.tournamentID = nVal
        ;(async() => {
            const res = await API.get(API.urls.tournament(nVal))
            if (!res.ok) {
                navigate_to('/tournaments/')
                notify(new Notification(res.body.detail))
                return
            }

            this.tournament = tournament_defaults(res.body)
            this.createRounds()
            this.render()
            this.registerEventListeners()
        })()
    }
    registerEventListeners() {
        const actions = this.shadowRoot.querySelector('.actions')
        const participants = this.shadowRoot.getElementById('participants')
        const history = this.shadowRoot.getElementById('history')
        
        this.eventListeners.forEach(e => e.unregister())
        this.eventListeners.push(
            addEventListener(actions, 'click', e => {
                const btn = e.target.closest('button')
                if (!btn) return

                const action = btn.dataset.action
                if (action) this[action]()
            }),
            addEventListener(participants, 'click', e => {
                const btn = e.target.closest('button')
                if (!btn) return
        
                const action = btn.dataset.action
                const user_id = btn.dataset.user
                if (action) this[action](user_id)
            }),
            addEventListener(history, 'click', e => {
                const btn = e.target
                if (!btn) return

                if (btn.dataset.action == 'assignWinner')
                    this.assignWinner(btn)
            }),
            addEventListener(window, 'refresh:tournament', e => {
                if (e.detail.tournament_id == this.tournament.id)
                    this.re_render()
            })
        )
    }
    createRounds() {
        const rounds = []
        this.tournament.history.forEach(h => {
            if (!rounds[h.round - 1])
                rounds[h.round - 1] = []
            rounds[h.round - 1].push(h)
        })
        rounds.forEach(round => round.sort((a, b) => a.order > b.order ? 1 : -1))
        this.tournament.rounds = rounds.map(round => {
            const r = []
            round.forEach(h => r.push(h.p1, h.p2))
            return r
        })

        if (this.tournament.current_round > this.tournament.final_round) {
            const last_match = rounds[rounds.length - 1][0]
            if (last_match.status == "FINISH") {
                const winner = last_match.p1.score > last_match.p2.score ? 
                                    last_match.p1 : last_match.p2
                this.tournament.rounds.push([winner])
            }
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback()
        this.tournament = undefined
        this.render()
    }
    render() {
        this.style.display = 'none'
        this.style.opacity = 0
        this.style.transition = 'opacity .2s'
        super.render()
        setTimeout(()=> this.style.display = "block", 150)
        setTimeout(()=> this.style.opacity = 1, 100)
    }

    async re_render() {
        const res = await API.get(API.urls.tournament(this.tournamentID))

        if (!res.ok) {
            navigate_to('/tournaments/')
            notify(new Notification(res.body.detail))
            return
        }
        this.tournament = tournament_defaults(res.body)
        this.createRounds()
        
        const actions = this.shadowRoot.querySelector('.actions')
        actions.innerHTML = this.actionsHtml

        const participants = this.shadowRoot.getElementById('participants')
        participants.innerHTML = this.participants

        const history = this.shadowRoot.getElementById('history')
        history.innerHTML = this.history
        
        const brackets = this.shadowRoot.getElementById('brackets')
        brackets.replaceChildren(
            generateTournamentSvg(
                this.tournament.capacity * 1,
                this.tournament.rounds
            )
        )
    }
    async delete() {
        const res = await API.delete(API.urls.tournament(this.tournament.id))
        if (res.ok) {
            notify(
                new Notification(`You have DELETED the ${this.tournament.name} tournament`)
            )
            navigate_to('/tournaments/')
            DATA.update_auth_user()
        }
    }
    async join() {
        const res = await API.post(API.urls.join_tournament(this.tournament.id))
        if (res.ok) {
            notify(
                new Notification(`You have JOINED the ${this.tournament.name} tournament`)
            )
            this.re_render()
            DATA.update_auth_user()
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async leave() {
        const res = await API.post(API.urls.leave_tournament(this.tournament.id))
        if (res.ok) {
            notify(
                new Notification(`You have LEFT the ${this.tournament.name} tournament`)
            )
            this.re_render()
            DATA.update_auth_user()
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
    }
    async lock() {
        const res = await API.post(API.urls.lock_tournament(this.tournament.id))
        if (res.ok) {
            notify(
                new Notification(`You have LOCKED the ${this.tournament.name} tournament`)
            )
        }
        this.re_render()
        DATA.update_auth_user()
    }
    async kick(user_id) {
        const res = await API.post(API.urls.kick_participant(this.tournament.id, user_id))
        if (res.ok) {
            const kicked_user = this.tournament.participants.find(el => el.id == user_id)
            notify(
                new Notification(`You have KICKED ${kicked_user.username}`)
            )
            this.re_render()
        } else {
            notify(
                new Notification(res.body.detail)
                )
            }
    }
    async start() {
        const res = await API.post(API.urls.start_tournament(this.tournament.id))
        if (res.ok) {
            notify(
                new Notification(`You have Started round ${this.tournament.current_round}`)
            )
        } else {
            notify(
                new Notification(res.body.detail)
            )
        }
        this.re_render()
        DATA.update_auth_user()
    }
    async assignWinner(btn) {
        const user = btn.dataset.user
        const match = btn.dataset.match
        const tournament = btn.dataset.tournament
        if (!tournament || !match || !user) {
            notify( new Notification('Action Not Allowed'))
            return
        }
        const res = await API.post(API.urls.asign_winner(tournament), {
            user_id: parseInt(user),
            match_id: parseInt(match)
        })

        if (res.ok) {
            const item = history_defaults(res.body)
            const html = historyEntry(item)
            const entry = btn.closest('.history-entry')
            entry.outerHTML = html            
        } else {
            notify( new Notification(res.body.detail) )
        }
    }

    get actionsHtml() {
        const btn = (text, action, classes) => /*html*/ `
            <button
                class="fs-1 p-1-5 py-0-5 rounded-0-25 text-center transition-med hover-brighten capitalize ${classes}" 
                data-action="${action}"
            >
                ${text}
            </button>
        `
        const me = DATA.get('auth_user')

        const actions = []

        if (me.id == this.tournament.admin.id) {
            if (this.tournament.is_locked && this.tournament.current_round <= this.tournament.final_round)
                actions.push(btn('start round ' + this.tournament.current_round, 'start', 'bg-accent'))
            else
                actions.push(btn('delete', 'delete', 'bg-red'))
            if (this.tournament.is_lockable)
                actions.push(btn('lock', 'lock', 'bg-accent'))
        }

        if (this.tournament.participants.find(el => el.id == me.id))
            actions.push(btn('leave', 'leave', 'bg-red'))
        else if (this.tournament.is_joinable)
            actions.push(btn('join', 'join', 'bg-accent'))

        return actions.join('')
    }
    get participants() {
        const empty = /*html*/ `
            <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                No Participants Yet
            </div>
        `
        const me = DATA.get('auth_user')
        const iam_admin = me.id == this.tournament.admin.id
        const participants = this.tournament.participants.map(user => {
                    const actions = []
                    if (!this.tournament.is_locked) {
                        if (user.id == me.id) actions.push('leave')
                        else if (iam_admin) actions.push('kick')
                    }
                    return userItemHtml(user, actions)
                }).join('')
        return /*html*/ `
            
            <header class="flex align-center gap-2 mb-1">
                <h2 class="fs-2 fw-400">Participants</h2>
                <div class="fs-1-5">
                    <span>${this.tournament.participants_count}</span>
                    <span>/ ${this.tournament.capacity}</span>
                </div>
            </header>
            <div class="column gap-1">
                ${ participants || empty } 
            </div>
        `
    }
    get history() {
        const empty = /*html*/ `
            <div class="color-light-7 text-center rounded-0-5 border-glass fs-2 p-3">
                No Matches Yet
            </div>
        `
        const history = this.tournament.history.map( item => {
            if (item.status == "PEND") return pendingHistoryItemHtml(item)
            return historyItemHtml(item)
        }).join('')
        return /*html*/ `
            <div id="history" class="grow basis-0">
                <header class="flex align-center gap-2 mb-1">
                    <h2 class="fs-2 fw-400">Matches</h2>
                    <div class="fs-1-5">
                        <span>${this.tournament.history.length}</span>
                        <span>/ ${this.tournament.capacity - 1}</span>
                    </div>
                </header>
                <div id="matchesList" class="column gap-1">
                    ${ history || empty }
                </div>
            </div>
        `
    }
    get content() {
        
        const playerRegistration = Math.min(100, (this.tournament.participants_count / this.tournament.capacity) * 100)
        const bracketProgression = Math.min(100, (this.tournament.history.length / (this.tournament.capacity - 1)) * 100)

        return /*html*/`
            <style>
                @import url('/themes.css');
                #tournamentTreeSvg {
                    width: 100%;
                    max-height: 90vh;
                }               
            </style>
            <div class="column gap-1 p-1">
                <div class="summary relative overflow-hidden flex justify-center align-start gap-1 p-2">
                    <div class="flex align-end">
                        <img
                            class="img-cover rounded-0-5"
                            style="width: 20rem; max-width: 100%"
                            src="${this.tournament.image}">
                    </div>
                    <div class="column gap-1">
                        <h1 class="fs-2 fw-400">${this.tournament.name}</h1>
                        <div class="flex align-center gap-0-5">
                            <div class="flex align-end relative">
                                <img
                                    class="img-cover bg-silver rounded-0-5"
                                    style="width: 3rem; height: 3rem;" 
                                    src="${this.tournament.game.image}" />
                            </div>
                            <wc-link data-to="/users/${this.tournament.admin.username}" class="flex align-end relative">
                                <img
                                    class="img-cover rounded-0-5"
                                    style="height: 3rem; width: 3rem;"
                                    src="${this.tournament.admin.profile_image}">
                            </wc-link data-to="/chat/">
                            <h4 class="fs-1-25 fw-400 rounded-0-5 grid align-center justify-center"
                                style="border: 1px solid #c0c0c04d; width: 3rem; height: 3rem;">${this.tournament.capacity}</h4>
                        </div>
                        <div>
                            <h3 class="fs-1 fw-400 mb-0-5">Player registration</h3>
                            <div class="border-glass-1 rounded-pill p-0-25">
                                <div class="bg-accent rounded-pill" style="height:.25rem; width: ${playerRegistration}%;"></div>
                            </div>
                        </div>
                        <div>
                            <h3 class="fs-1 fw-400 mb-0-5">Bracket progression</h3>
                            <div class="border-glass-1 rounded-pill p-0-25">
                                <div class="bg-accent rounded-pill" style="height:.25rem; width: ${bracketProgression}%;"></div>
                            </div>
                        </div>
                        <div class="flex gap-0-5 align-center">
                            ${SVGs.calendar({width: '1.5rem'})}
                            <h5 class="fw-500 mt-0-15">${ date_to_string(this.tournament.date) }</h5>
                        </div>
                        <div class="actions flex wrap gap-0-5" style="max-width: 15rem">
                            ${this.actionsHtml}
                        </div>
                    </div>
                </div>
                
                <div class="main flex wrap gap-1 p-1">
                    <div id="participants" class="grow basis-0">
                        ${this.participants}
                    </div>
                    ${this.history}
                </div>
                <div id="brackets" class="mt-1">
                    ${
                        generateTournamentSvg(
                            this.tournament.capacity * 1,
                            this.tournament.rounds
                        ).outerHTML
                        }
                </div>
            </div>
        `
    }

    html() {
        const loading = /*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
            </style>
            <div class="flex justify-center align-center h-100 w-100" style="height: 100%; width: 100%">
                ${SVGs.loading({width: '3rem'})}
            </div>
        `
        return this.tournament ? this.content : loading
    }
}

customElements.define('wc-tournament', Tournament)