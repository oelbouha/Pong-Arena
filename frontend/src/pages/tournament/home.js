import Component from "../../components/base.js";
import API from "../../networking.js"
import SVGs from "../../components/svgs.js"
import { tournamentItemHtml } from "../../components/htmlSnippets.js";
import { tournaments } from "../dummyData.js";
import { Notification } from "../Notifier.js"
import { addEventListener, games_images, get_validated_data, notify, sleep, tournament_defaults } from "../../utils/index.js";
import { navigate_to } from "../../router/utils.js";
import DATA from "../../store.js";


function randInt(max) {
    return parseInt(Math.random() * max)
}

const ONE_MB = 1024 * 1024
const IMAGE_MAX_SIZE_MB = 1.5
const IMAGE_MAX_SIZE = IMAGE_MAX_SIZE_MB * ONE_MB

class TournamentsHome extends Component {
    constructor() {
        super()
        this.eventListeners = []
        this.onTournamentImageChange = this.onTournamentImageChange.bind(this)
    }
    get loading() {
        return this._state == undefined
    }
    get state() {
        if (!this._state)
            this._state = {}
        return this._state
    }

    connectedCallback() {
        ;(async () => {
            const res = await API.get(API.urls.tournaments)
            if (res.ok) {
                this.state.tournaments = res.body
                this.render()
                this.registerEventListeners()
            }

        })()
    }
    disconnectedCallback() {
        super.disconnectedCallback()
        this._state = undefined
        this.render()
        this.style.opacity = 0
    }
    render() {
        const old_display =  this.style.display
        this.style.display = 'none'
        this.style.opacity = 0
        this.style.transition = 'opacity .2s'
        super.render()
        setTimeout(()=> this.style.display = old_display, 150)
        setTimeout(()=> this.style.opacity = 1, 100)
    }

    registerEventListeners() {
        const tournamentImageInput = this.shadowRoot.getElementById('tournamentImageInput')
        const createTrounamentBtn = this.shadowRoot.getElementById('createTrounament')
        const tournamentsList = this.shadowRoot.getElementById('tournamentsList')

        const tournament_actions = {
            join: this.join,
            leave: this.leave,
            lock: this.lock
        }

        this.eventListeners.push(
            addEventListener(tournamentImageInput, 'change', this.onTournamentImageChange),
            addEventListener(createTrounamentBtn, 'click', () => {
                this.create(createTrounamentBtn)
            }),
            addEventListener(tournamentsList, 'click', e => {
                const target = e.target
                if (target.dataset.action) {
                    const action = tournament_actions[target.dataset.action.toLowerCase()]
                    if (action)
                        action(target.dataset.tournament, target)
                }
            })
        )
    }

    onTournamentImageChange(e) {
        const tournamentImageInput = e.target
        const tournamentImage = this.shadowRoot.getElementById('tournamentImage')
        const file = tournamentImageInput.files[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            notify( new Notification(`Tournament image should be an IMAGE`))
            return
        }
        if (file.size > IMAGE_MAX_SIZE) {
            notify( new Notification(`Tournament image size should not exceed ${IMAGE_MAX_SIZE_MB}mb`))
            return
        }
        const src = URL.createObjectURL(file)
        tournamentImage.src = src
        tournamentImage.classList.remove('hidden')

        this.state.tournament_image = file
    }

    async create(createTrounamentBtn) {
        const nodes = [...createTrounamentBtn.childNodes]
        createTrounamentBtn.replaceChildren(
            SVGs.make(
                SVGs.loading({
                    width: `calc(${createTrounamentBtn.clientHeight}px - 1rem)`,
                    fill: 'black'
                })
            )
        )
        setTimeout(() => createTrounamentBtn.replaceChildren(...nodes), 1000)

        const createTournamentWrapper = this.shadowRoot.getElementById('createTournament')
        let data = get_validated_data(createTournamentWrapper)
        if (!data || !this.state.tournament_image) {
            notify( new Notification('Make sure to fill the required fields:\n name, image, game, capacity, and win_goal') )
        }

        data = {
            name: data['tournament-name'],
            image: this.state.tournament_image,
            game: this.shadowRoot.querySelector('input.game:checked').value.toUpperCase(),
            capacity: this.shadowRoot.querySelector('input.capacity:checked').value,
            win_score: data['tournament-goal']
        }

        const res = await API.post(API.urls.tournaments, data)
        if (res.ok) {
            navigate_to(`/tournaments/${res.body.id}/`)
            notify(
                new Notification(`Tournament ${res.body.name} has been created`)
            )
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

    get tournaments() {
        const me = DATA.get('auth_user')
        const tournaments = this.state.tournaments.map(
                    tournament => {
                        tournament = tournament_defaults(tournament)
                        return tournamentItemHtml(
                                tournament, 
                                [tournament.action(me.id)]
                            )
                        }
                ).join('')
        const html = /*html*/ `
            <div id="tournamentsList" class="flex wrap gap-1">
                ${tournaments}
            </div>
        `

        const empty = /*html*/`
            <div class="flex align-center justify-center h-100 p-3 basis-100 rounded-0-5 border-glass">
                <div class="color-light-7 text-center fs-2" >
                    No Tournament Has Been Created Yet :(
                    <br>
                    <div class="fs-1">Create a tournament to view</div>
                </div>
            </div>
        `

        return html || empty
    }
    get content() {
        return /*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    height: 100%;
                    transition: opacity .2s
                }
                .game-option:has(input:checked), .capacity-option:has(input:checked) {
                    background-color: var(--glass-color);
                    border-color: var(--accent-color) !important;
                }             
            </style>
            <div class="column gap-1 p-1 h-100">
                <div id="createTournament">
                    <div class="flex justify-center align-start wrap gap-1 p-1">
                        <label class="relative grid justify-center align-center w-15r square rounded-0-5 border-glass p-1 pointer transition-fast hover-brighten">
                            <input class="hidden" type="file" id="tournamentImageInput">
                            <div class="absolute w-100 h-100 top-0 left-0 p-0-5 z-n1">
                                <img id="tournamentImage" class="img-cover h-100 w-100 bg-dark-1 rounded-0-5 hidden">
                            </div>
                            ${SVGs.plus({ width: '2rem', class: "stroke-glass" })}
                        </label>
                        <div class="column gap-0-5">
                            <wc-input
                                id="tournamentNameInput"
                                name="tournament-name" data-input-class="bg-glass color-light-1 fs-1"
                                placeholder="Name"
                                constraints="required | min:5 | max:30"
                            ></wc-input>

                            <div class="flex gap-0-5">
                                <label class="game-option grow column align-center gap-0-5 pointer border-glass p-1 rounded-0-5">
                                    <input type="radio" checked class="game hidden" name="tournament-game" value="Pong" />
                                    <img class="img-cover bg-silver rounded-0-5 transition-med" style="width: 3rem; height: 3rem;"
                                        src="${games_images['pong']}">
                                    <div class="grid">
                                        <h5 class="fw-400 opacity-0" style="grid-column: 1; grid-row: 1;">HandSlap</h5>
                                        <h5 class="fw-400 text-center" style="grid-column: 1; grid-row: 1;">Pong</h5>
                                    </div>
                                </label>
                                <label class="game-option grow column align-center gap-0-5 pointer border-glass p-1 rounded-0-5">
                                    <input type="radio" class="game hidden" name="tournament-game" value="Slap" />
                                    <img class="img-cover bg-silver rounded-0-5 transition-med" style="width: 3rem; height: 3rem;" src="${games_images['slap']}">
                                    <h5 class="fw-400">HandSlap</h5>
                                </label>
                            </div>

                            <div class="flex space-between gap-0-5">
                                <label class="capacity-option fs-1-25 fw-400 rounded-0-5 grid align-center justify-center border-glass pointer" style="width: 3rem; height: 3rem;">
                                    <input type="radio" checked name="tournament-capacity" class="capacity hidden" value="4">
                                    4
                                </label>
                                <label class="capacity-option fs-1-25 fw-400 rounded-0-5 grid align-center justify-center border-glass pointer" style="width: 3rem; height: 3rem;">
                                    <input type="radio" name="tournament-capacity" class="capacity hidden" value="8">
                                    8
                                </label>
                                <label class="capacity-option fs-1-25 fw-400 rounded-0-5 grid align-center justify-center border-glass pointer" style="width: 3rem; height: 3rem;">
                                    <input type="radio" name="tournament-capacity" class="capacity hidden" value="16">
                                    16
                                </label>
                                <label class="capacity-option fs-1-25 fw-400 rounded-0-5 grid align-center justify-center border-glass pointer" style="width: 3rem; height: 3rem;">
                                    <input type="radio" name="tournament-capacity" class="capacity hidden" value="32">
                                    32
                                </label>
                            </div>

                            <div>
                                <wc-input
                                    type="number" value="5" name="tournament-goal" 
                                    data-input-class="bg-glass color-light-1 fs-1"
                                    placeholder="Goal"
                                    constraints="required"
                                ></wc-input>
                                <p class="m-0 fs-0-75">The score to decide the winner</p>
                            </div>

                            <button id="createTrounament" class="flex justify-center align-center fs-1 p-1-5 py-0-5 rounded-0-25 text-center bg-accent transition-med hover-brighten capitalize" data-to="/settings">create</button>
                        </div>
                    </div>
                </div>
                ${this.tournaments}
            </div>
        `
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
                ${SVGs.loading({ width: '3rem' })}
            </div>
        `

        return this.loading ? loadingHtml : this.content
    }
}

customElements.define('wc-tournaments', TournamentsHome)