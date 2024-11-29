// Set up canvas and context
// Socket Creation
let socket = new WebSocket(`ws://localhost:8000/pong/match/`)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


canvas.width = 800;
canvas.height = 450;

let paddleWidth = 10;
let paddleHeight = 100;

let player1PaddleY = (canvas.height - paddleHeight) / 2;
let player2PaddleY = (canvas.height - paddleHeight) / 2;

let p1Score = 0
let p2Score = 0

let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballRadius = 10;

function drawBall(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#003300';
    ctx.stroke();
}

function draw()
{

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.fillRect(10, player1PaddleY, paddleWidth, paddleHeight);

    ctx.fillStyle = 'white';
    ctx.fillRect(canvas.width - paddleWidth - 10, player2PaddleY, paddleWidth, paddleHeight);

    drawBall(ctx, ballX, ballY, ballRadius)

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(p1Score, canvas.width / 4, 20);
    ctx.fillText(p2Score, 3 * canvas.width / 4, 20);
}

socket.onopen = (event) => {
    data = {
        type: "random",
    }
    socket.send(JSON.stringify(data))
}


socket.onmessage = (event) =>
{
    let r_data = JSON.parse(event.data)
    if (r_data.m == 'g') {
        player1PaddleY = r_data.p.p1.y;
        player2PaddleY = r_data.p.p2.y;
        ballX = r_data.b.x
        ballY = r_data.b.y
        p1Score = r_data.s.p1
        p2Score = r_data.s.p2
        draw();
    }
    else if (r_data.m == "opp")
    {
        ready = {
            "m": "rd"
        }
        socket.send(JSON.stringify(ready))
        
    }
    else if (r_data.m == "st")
    {
        draw()
    }
    else if (r_data.m == "win")
    {
        alert("You win")
        document.getElementById("game-container").innerHTML = "<h1>You Win</h1>"
    }
    else if (r_data.m == "lose")
    {
        alert("You lose")
        document.getElementById("game-container").innerHTML = "<h1>You Lose</h1>"
    }
    else if (r_data.m == 'to')
    {
    }
    
}

window.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowUp')
        data = {'m': 'up'}
    else if (event.key === 'ArrowDown')
        data = {'m': 'down'}
    else
        return

    socket.send(JSON.stringify(data))
});