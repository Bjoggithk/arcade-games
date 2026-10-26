const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const top5ListEl = document.getElementById('top5List');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('finalScore');
const rankInfoEl = document.getElementById('rankInfo');
const top10ListEl = document.getElementById('top10List');
const retryBtn = document.getElementById('retryBtn');
const pauseBtn = document.getElementById('pauseBtn');

const SCORES_KEY = 'breakoutTopScores';

let paddle = { x: 150, y: 460, width: 100, height: 12, speed: 6 };
let ball = { x: 200, y: 300, radius: 8, dx: 3, dy: -3 };
let bricks = [];
let score = 0;
let level = 0;
let baseSpeed = 3;
let gameLoop;
let isGameOver = false;
let isPaused = false;
let keys = {};
let touchMove = 0; // -1 left, 1 right, 0 none

const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 45;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 40;
const BRICK_OFFSET_LEFT = 15;

const formations = [
    Array(BRICK_ROWS).fill().map(() => Array(BRICK_COLS).fill(true)),
    Array(BRICK_ROWS).fill().map((_, r) => Array(BRICK_COLS).fill().map((_, c) => (r + c) % 2 === 0)),
    Array(BRICK_ROWS).fill().map((_, r) => Array(BRICK_COLS).fill().map((_, c) => Math.abs(c - 3.5) <= (4 - r))),
    Array(BRICK_ROWS).fill().map((_, r) => Array(BRICK_COLS).fill().map((_, c) => r % 2 === 0 || c % 3 !== 1)),
    Array(BRICK_ROWS).fill().map((_, r) => Array(BRICK_COLS).fill().map((_, c) => Math.abs(c - 3.5) < 2.5 || r < 2))
];

function initBricks(formationIndex) {
    bricks = [];
    const pattern = formations[formationIndex % formations.length];
    for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            if (pattern[r][c]) {
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

    bricks.forEach(brick => {
        if (brick.alive) {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            ctx.strokeStyle = '#00cc6a';
            ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
        }
    });

    ctx.fillStyle = '#00cc6a';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = '#00ff88';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${level + 1}`, 10, 20);

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Tap pause button', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function nextLevel() {
    level++;
    baseSpeed = 3 + level * 0.4;
    initBricks(level);
    ball.x = 200;
    ball.y = 300;
    ball.dx = baseSpeed * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -baseSpeed;
    score += 50;
    currentScoreEl.textContent = score;
}

function update() {
    if (isPaused || isGameOver) return;

    if (keys['ArrowLeft'] || keys['a'] || keys['A'] || touchMove < 0) {
        paddle.x = Math.max(0, paddle.x - paddle.speed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D'] || touchMove > 0) {
        paddle.x = Math.min(canvas.width - paddle.width, paddle.x + paddle.speed);
    }

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.dx = Math.abs(ball.dx);
    }
    if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.dx = -Math.abs(ball.dx);
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.dy = Math.abs(ball.dy);
    }

    if (ball.y + ball.radius > paddle.y &&
        ball.y + ball.radius < paddle.y + paddle.height + 10 &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width) {
        ball.y = paddle.y - ball.radius;
        ball.dy = -Math.abs(ball.dy);
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * baseSpeed * 1.3;
    }

    bricks.forEach(brick => {
        if (brick.alive &&
            ball.x > brick.x && ball.x < brick.x + brick.width &&
            ball.y > brick.y && ball.y < brick.y + brick.height) {
            brick.alive = false;
            const overlapLeft = (ball.x + ball.radius) - brick.x;
            const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
            const overlapTop = (ball.y + ball.radius) - brick.y;
            const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                ball.dx = -ball.dx;
            } else {
                ball.dy = -ball.dy;
            }
            score += 10;
            currentScoreEl.textContent = score;
        }
    });

    if (ball.y - ball.radius > canvas.height) {
        gameOver();
        return;
    }

    if (bricks.length > 0 && bricks.every(b => !b.alive)) {
        nextLevel();
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
        rankInfoEl.textContent = `You placed #${rank} in the Top 10! (Level ${level + 1})`;
        rankInfoEl.style.display = 'block';
        top10ListEl.innerHTML = '<ol>' + topScores.map((s, i) => {
            const cls = i < 5 ? ' class="top5"' : '';
            return `<li${cls}><span class="rank">#${i + 1}</span><span class="score-value">${s}</span></li>`;
        }).join('') + '</ol>';
        top10ListEl.style.display = 'block';
    } else {
        rankInfoEl.textContent = 'Not in Top 10 this time.';
        top10ListEl.style.display = 'none';
    }
    overlay.classList.add('active');
    updateTop5Display();
}

function startGame() {
    paddle.x = 150;
    ball.x = 200;
    ball.y = 300;
    level = 0;
    baseSpeed = 3;
    ball.dx = baseSpeed;
    ball.dy = -baseSpeed;
    score = 0;
    currentScoreEl.textContent = '0';
    isGameOver = false;
    isPaused = false;
    keys = {};
    touchMove = 0;
    initBricks(0);
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

// Touch controls: hold left/right half of canvas
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isGameOver || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    touchMove = x < canvas.width / 2 ? -1 : 1;
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isGameOver || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    touchMove = x < canvas.width / 2 ? -1 : 1;
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchMove = 0;
}, {passive: false});

if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
retryBtn.addEventListener('click', startGame);

updateTop5Display();
startGame();