import { offlineGame } from "./offline.js"
import { onlineGame } from "./online.js";


const game = new onlineGame()

game.launch({
    'type': 'random'
})
// game.launch()


// window.addEventListener('keydown', function(event) {
//     if (event.key == 'ArrowUp' || event.key == 'w')
//         game.moveUp(event.key)
//     else if (event.key == 'ArrowDown' || event.key == 's')
//         game.moveDown(event.key)
// });