const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const top5ListEl = document.getElementById('top5List');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('finalScore');
const rankInfoEl = document.getElementById('rankInfo');
const top10ListEl = document.getElementById('top10List');
const retryBtn = document.getElementById('retryBtn');
const backBtn = document.getElementById('backBtn');

const SCORES_KEY = 'breakoutTopScores';

let paddle = { x: 150, y: 460, width: 100, height: 12, speed: 6 };
let ball = { x: 200, y: 300, radius: 8, dx: 3, dy: -3 };
let bricks = [];
let score = 0;
let gameLoop;
let isGameOver = false;
let isPaused = false;
let keys = {};

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 45;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 15;

function initBricks() {
    bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            bricks.push({
                x: BRICK_OFFSET_LEFT + c * (BRICK_WIDTH + BRICK_PADDING),
                y: BRICK_OFFSET_TOP + r * (BRICK_HEIGHT + BRICK_PADDING),
                width: BRICK_WIDTH,
                height: BRICK_HEIGHT,
                alive: true
            });
        }
    }
}

function getTopScores() {
    const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    return scores.sort((a, b) => b - a).slice(0, 10);
}

function saveScore(newScore) {
    let scores = getTopScores();
    scores.push(newScore);
    scores = scores.sort((a, b) => b - a).slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    return scores;
}

function updateTop5Display() {
    const scores = getTopScores();
    top5ListEl.innerHTML = '';
    scores.slice(0, 5).forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">${s}</span>`;
        li.classList.add('top5');
        top5ListEl.appendChild(li);
    });
    for (let i = scores.length; i < 5; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">---</span>`;
        top5ListEl.appendChild(li);
    }
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bricks
    bricks.forEach(brick => {
        if (brick.alive) {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            ctx.strokeStyle = '#00cc6a';
            ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        }
    });

    // Paddle
    ctx.fillStyle = '#00cc6a';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.closePath();

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Space to resume', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function update() {
    if (isPaused || isGameOver) return;

    // Paddle movement
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }

    // Ball movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collisions
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }

    // Paddle collision
    if (ball.y + ball.radius > paddle.y &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        ball.dy = -Math.abs(ball.dy);
        // Add a bit of angle based on where it hits the paddle
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * 4;
    }

    // Brick collisions
    bricks.forEach(brick => {
        if (brick.alive &&
            ball.x > brick.x && ball.x < brick.x + brick.width &&
            ball.y > brick.y && ball.y < brick.y + brick.height) {
            brick.alive = false;
            ball.dy = -ball.dy;
            score += 10;
            currentScoreEl.textContent = score;
        }
    });

    // Lose condition
    if (ball.y - ball.radius > canvas.height) {
        gameOver();
    }

    // Win condition (all bricks gone)
    if (bricks.every(b => !b.alive)) {
        score += 100; // bonus
        currentScoreEl.textContent = score;
        gameOver(true);
    }
}

function gameOver(won = false) {
    isGameOver = true;
    isPaused = false;
    clearInterval(gameLoop);
    const topScores = saveScore(score);
    finalScoreEl.textContent = score;

    const rank = topScores.indexOf(score) + 1;
    if (rank <= 10 && rank > 0) {
        rankInfoEl.textContent = won ? `You cleared the board! Placed #${rank}` : `You placed #${rank} in the Top 10!`;
        rankInfoEl.style.display = 'block';
        top10ListEl.innerHTML = '<ol>' + topScores.map((s, i) => {
            const cls = i < 5 ? ' class="top5"' : '';
            return `<li${cls}><span class="rank">#${i + 1}</span><span class="score-value">${s}</span></li>`;
        }).join('') + '</ol>';
        top10ListEl.style.display = 'block';
    } else {
        rankInfoEl.textContent = won ? 'Board cleared!' : 'Not in Top 10 this time.';
        top10ListEl.style.display = 'none';
    }

    overlay.classList.add('active');
    updateTop5Display();
}

function startGame() {
    paddle.x = 150;
    ball.x = 200;
    ball.y = 300;
    ball.dx = 3;
    ball.dy = -3;
    score = 0;
    currentScoreEl.textContent = '0';
    isGameOver = false;
    isPaused = false;
    keys = {};
    initBricks();
    overlay.classList.remove('active');
    updateTop5Display();
    clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 16);
    draw();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameLoop);
    } else {
        gameLoop = setInterval(() => {
            update();
            draw();
        }, 16);
    }
    draw();
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (isGameOver) return;
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

retryBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Init
updateTop5Display();
startGame();