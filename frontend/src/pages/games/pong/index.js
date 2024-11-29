import { onlineGame } from "./scripts/online.js"
import { offlineGame } from "./scripts/offline.js"
import SVGs from "../../../components/svgs.js"




const pongHtml = /*html*/`
		<div id="game-container">
		<div class="slider" data-action="paddles" data-side="L">
			<button class="slider-cntl next bg-none">
				${SVGs.chevron_up({width: '4rem', stroke: 'white'})}
			</button>
			<img src="/assets/pong/images/r1.png" alt="">
			<button class="slider-cntl prev bg-none">
				${SVGs.chevron_down({
					width: '4rem',
					stroke: 'white'
				})}
			</button>
		</div>

		<div class="ball-slider">
			<div class="slider" data-action="balls">
				<button class="slider-cntl next">next</button>
				<img src="/assets/pong/images/b1.png" alt="">
				<button class="slider-cntl prev">prev</button>
			</div>
			<button id="ready">Ready</button>
		</div>


		<div class="slider" data-action="paddles" data-side="R">
			<button class="slider-cntl next">next</button>
			<img src="/assets/pong/images/r1.png" alt="">
			<button class="slider-cntl prev">prev</button>
		</div>


		<div class="slider row" data-action="tables">
			<div
				style="position: absolute; width: 100%; height: 100%; top:0; left:0; display: flex; justify-content: space-between;padding: 2rem;">
				<button class="slider-cntl prev" style="position: static;">prev</button>
				<button class="slider-cntl next" style="position: static;">next</button>
			</div>
			<img src="/assets/pong/images/basket.avif" alt="">
		</div>

		</div>
`

export const newPongGame = (root, online=false, socket) => {
    let area = document.createElement('div')
    area.innerHTML = pongHtml
    area = area.firstElementChild

    root.replaceChildren(area)
    let game;
    if (online) {
        game = new onlineGame(area.parentElement, socket)
        game.launch()
    } else {
        game = new offlineGame(area.parentElement)
        game.launch()
    }
    return game
}