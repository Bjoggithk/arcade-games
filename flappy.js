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

const SCORES_KEY = 'flappyTopScores';

let bird = { x: 80, y: 250, radius: 15, velocity: 0, gravity: 0.4, jump: -7 };
let pipes = [];
let score = 0;
let gameLoop;
let isGameOver = false;
let isPaused = false;
let frame = 0;

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

function spawnPipe() {
    const gap = 140;
    const topHeight = Math.random() * (canvas.height - gap - 100) + 50;
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: topHeight + gap,
        width: 50,
        scored: false
    });
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    pipes.forEach(pipe => {
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - pipe.bottomY);
        ctx.strokeStyle = '#00cc6a';
        ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
        ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, canvas.height - pipe.bottomY);
    });

    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
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
        ctx.fillText('Tap pause button', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function update() {
    if (isPaused || isGameOver) return;
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    if (frame % 90 === 0) spawnPipe();
    frame++;
    pipes.forEach(pipe => {
        pipe.x -= 3;
        if (!pipe.scored && pipe.x + pipe.width < bird.x) {
            score++;
            pipe.scored = true;
            currentScoreEl.textContent = score;
        }
    });
    pipes = pipes.filter(p => p.x > -60);
    if (bird.y - bird.radius < 0 || bird.y + bird.radius > canvas.height) {
        gameOver();
        return;
    }
    pipes.forEach(pipe => {
        if (bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
            if (bird.y - bird.radius < pipe.topHeight || bird.y + bird.radius > pipe.bottomY) {
                gameOver();
            }
        }
    });
}

function gameOver() {
    isGameOver = true;
    isPaused = false;
    clearInterval(gameLoop);
    const topScores = saveScore(score);
    finalScoreEl.textContent = score;
    const rank = topScores.indexOf(score) + 1;
    if (rank <= 10 && rank > 0) {
        rankInfoEl.textContent = `You placed #${rank} in the Top 10!`;
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
    bird.y = 250;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    frame = 0;
    currentScoreEl.textContent = '0';
    isGameOver = false;
    isPaused = false;
    overlay.classList.remove('active');
    updateTop5Display();
    clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 20);
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
        }, 20);
    }
    draw();
}

function flap() {
    if (!isGameOver && !isPaused) bird.velocity = bird.jump;
}

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (isGameOver) return;
        if (isPaused) togglePause();
        else flap();
    }
});

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
}, {passive: false});

if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
retryBtn.addEventListener('click', startGame);

updateTop5Display();
startGame();