import Component from "../../components/base.js"
import SVGs from "../../components/svgs.js"
import { addEventListener, notify, user_defaults } from "../../utils/index.js"
import DATA from "../../store.js"
import API from "../../networking.js"

import { newSlapGame } from "./handslap/index.js"
import { newPongGame } from "./pong/index.js"
import { Notification } from "../Notifier.js"
import { navigate_to } from "../../router/utils.js"

const connect_socket = async (game) => {
    const res = await API.get('/api/chat/ticket/')
    if (res.ok) {
        let url = `${location.origin}/ws/games/${game}/${res.body.ticket}/`
        url = url.replace('http', 'ws')
        const socket = new WebSocket(url);
        return socket
    }
}
let socket

class Game extends Component {
    static observedAttributes = ['game']
    get styles() {
        return /*css*/ `
            @import url('/pong.css');
            @import url('/handslap.css');
            @import url('/themes.css');
            :host {
                height: 100%;
            }
            #arena .blur-bg {
                display: none;
                filter: blur(12px) !important;
            }
            #arena .blur-bg div {
                position: absolute;
                top: 0;left: 0;
                width: 100%;height: 100%;
                background: rgba(var(--dark-color-2-rgb), .6);
            }

            #arena.fullscreen .blur-bg {
                display: initial;
            }

            #arena  svg.minimize {
                display: none;
            }
            #arena.fullscreen svg.maximize {
                display: none;
            }
            #arena.fullscreen svg.minimize {
                display: initial;
            }
            .active {
                transform: scale(1.2);
                transition: all 0.3s ease;
            }
        `
    }
    constructor() {
        super()
        this.eventListeners = []
    }

    async wait_opponent(game, start_game) {
        const me = DATA.get('auth_user')
        socket = await connect_socket(game)
        socket.onmessage = async e => {
            const data = JSON.parse(e.data)
            if (data.m == 'opp') {
                const id1 = data.p1
                const id2 = data.p2
                const to_fetch = id1 == me.id ? id2 : id1
                const opp = await API.get(API.urls.user_basic(to_fetch))

                this.key = me.id == id1 ? 'first_player' : 'second_player'

                const user1 = user_defaults(id1 == me.id ? me : opp.body)
                const user2 = user_defaults(id1 == me.id ? opp.body : me)

                const left = this.shadowRoot.querySelector('#leftCircle img')
                const right = this.shadowRoot.querySelector('#rightCircle img')

                left.src = user1.profile_image
                right.src = user2.profile_image

                left.classList.remove('hidden')
                right.classList.remove('hidden')
                start_game(socket)
            } else if (data.m == 'to') {
                navigate_to('/games/')
                notify(
                    new Notification('Timeout: no user joined')
                )
            } else if (data.m == 'err') {
                navigate_to('/games/')
                notify(
                    new Notification(data.err)
                )
            }
        }
        socket.onopen = e => {
            const inv = DATA.get('invitation_id')
            const tournament = DATA.get('tournament_id')

            if (inv) {
                socket.send(JSON.stringify({
                    type: 'friend',
                    inv
                }))
                DATA.set('invitation_id', null)
            }
            else if (tournament) {
                socket.send(JSON.stringify({
                    type: 'tournament',
                    tourn: tournament
                }))
                DATA.set('tournament_id', null)
            }
            else {
                socket.send(JSON.stringify({
                    type: 'random'
                }))
            }
            window.addEventListener('gameover', e => {
                navigate_to('/games/')
                notify(
                    new Notification(e.detail[this.key] == 'win' ? 'You Have Won' : 'You Have Lost')
                )
            }, { once: true })

        }
    }

    attributeChangedCallback(name, oVal, nVal) {
        const gameArea = this.shadowRoot.getElementById('gameArea')
        this.gameArea = gameArea
        this.gameArea.innerHTML = ''

        if (nVal == 'offline_handslap') {
            this.game = newSlapGame(gameArea)
        }

        else if (nVal == 'online_handslap') {
            const startGame = (socket) => {
                this.game = newSlapGame(gameArea, true, socket)
            }
            this.wait_opponent('slap', startGame)
        }

        else if (nVal == 'online_pong') {
            const startGame = (socket) => {
                this.game = newPongGame(gameArea, true, socket)
            }
            this.wait_opponent('pong', startGame)
        }
        else if (nVal == 'offline_pong') {
            this.game = newPongGame(gameArea)
        }
    }

    connectedCallback() {
        const arena = this.shadowRoot.getElementById('arena')
        const maximizeBtn = this.shadowRoot.getElementById('maximize')
        const goalElem = this.shadowRoot.getElementById('goal')
        const scoreElems = {
            first_player: this.shadowRoot.querySelector('.left .score'),
            second_player: this.shadowRoot.querySelector('.right .score')
        }
        let fullscreen = false;

        this.eventListeners.push(
            addEventListener(maximizeBtn, 'click', () => {
                if (fullscreen) {
                    document.exitFullscreen().then(() => {
                        arena.classList.remove('fullscreen');
                        fullscreen = false;
                    })
                    return
                }

                if (arena.requestFullscreen) {
                    arena.requestFullscreen();
                } else if (arena.msRequestFullscreen) {
                    arena.msRequestFullscreen();
                } else if (arena.mozRequestFullScreen) {
                    arena.mozRequestFullScreen();
                } else if (arena.webkitRequestFullScreen) {
                    arena.webkitRequestFullScreen();
                }
                arena.classList.add('fullscreen')
                fullscreen = true;
            }),
            addEventListener(this, 'scoreupdate', e => {
                const detail = e.detail
                scoreElems.first_player.textContent = detail.first_player
                scoreElems.second_player.textContent = detail.second_player
            }),
            addEventListener(this, 'setscore', e => {
                const detail = e.detail
                goalElem.textContent = detail.score
            }),
            addEventListener(this, 'players:colors', e => {
                const left = this.shadowRoot.getElementById('leftCircle')
                const right = this.shadowRoot.getElementById('rightCircle')
                left.style.background = e.detail.playerOne
                right.style.background = e.detail.playerTwo
            })
        )
    }
    disconnectedCallback() {
        super.disconnectedCallback()
        this.game && this.game.remove()
        this.game = null
        this.gameArea.innerHtml = ''
        if (socket) {
            socket.close()
        }
        socket = null
        DATA.set('invitation_id', null)
        DATA.set('tournament_id', null)
    }

    html() {
        const html =/*html*/`
            <style> ${ this.styles } </style>
            <div id="arena" class="relative column justify-center h-100">
                <div class="blur-bg z-n1"><div></div></div>
                <div class="column p-1">
                    <div class="flex align-center justify-center gap-2 p-f1 rounded-0-5 fborder-glass">
                        <div class="left flex gap-1">
                            <div class="column align-end">
                                <h3 class="fw-300">score</h3>
                                <h2 class="score fw-400">0</h2>
                            </div>
                            <div class="flex align-end">
                                <div 
                                    id="leftCircle"
                                    class="flex align-center justify-center accent-ring rounded-pill"
                                    style="height: 3.5rem; width: 3.5rem; background: var(--glass-color)"
                                >
                                    <img class="img-cover rounded-pill hidden h-100 w-100"  />
                                </div>
                            </div>
                        </div>
                        <div class="column align-center px-1 py-0-5 rounded-0-5 bg-glass color-light-1">
                            <h3 class="fw-400">GOAL</h3>
                            <h2 id="goal" class="fw-300">X</h2>
                        </div>
                        <div class="right flex gap-1">
                            <div class="flex align-end relative">
                                <div 
                                    id="rightCircle"
                                    class="flex align-center justify-center accent-ring rounded-pill"
                                    style="height: 3.5rem; width: 3.5rem; background: var(--glass-color)"
                                >
                                    <img class="img-cover rounded-pill hidden h-100 w-100"  />
                                </div>
                            </div>
                            <div class="column align-endf">
                                <h3 class="fw-300">score</h3>
                                <h2 class="score fw-400 ">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="align-center bg-glass column mt-1 relative rounded-1">
                        <div id="gameArea"></div>
                        <button
                            class="absolute flex bg-none"
                            id="maximize"
                            style="bottom: 1rem; right: 1rem"    
                        >
                            ${
                                SVGs.maximize({
                                    width: "2rem",
                                    fill: 'white',
                                    class: 'maximize'
                                })
                            }
                            ${
                                SVGs.minimize({
                                    width: "2rem",
                                    fill: 'white',
                                    class: 'minimize'
                                })
                            }
                        </button>
                    </div>
                </div>
            </div>
        `

        return html
    }
}

customElements.define('wc-game', Game)
