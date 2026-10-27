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

const SCORES_KEY = 'whackTopScores';
const LAST_NAME_KEY = 'lastPlayerName';
const HOLES = 9;
const GAME_TIME = 30;

let moles = Array(HOLES).fill(false);
let score = 0;
let timeLeft = GAME_TIME;
let gameLoop;
let moleTimer;
let isGameOver = false;
let isPaused = false;

function migrateScores(scores) {
    return scores.map(s => typeof s === 'number' ? { name: 'Bjöggi', score: s } : s);
}

function getTopScores() {
    let scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    scores = migrateScores(scores);
    return scores.sort((a, b) => b.score - a.score).slice(0, 10);
}

function getLastName() {
    return localStorage.getItem(LAST_NAME_KEY) || '';
}

function setLastName(name) {
    if (name) localStorage.setItem(LAST_NAME_KEY, name);
}

function saveScore(newScore) {
    let scores = getTopScores();
    const lastName = getLastName();
    let name = prompt('Enter your name for the high score:', lastName || 'Bjöggi');
    if (name === null) name = lastName || 'Bjöggi';
    name = (name || 'Anonymous').trim().slice(0, 20);
    setLastName(name);

    scores.push({ name, score: newScore });
    scores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    return scores;
}

function updateTop5Display() {
    const scores = getTopScores();
    top5ListEl.innerHTML = '';
    scores.slice(0, 5).forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">${s.name}: ${s.score}</span>`;
        li.classList.add('top5');
        top5ListEl.appendChild(li);
    });
    for (let i = scores.length; i < 5; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">---</span>`;
        top5ListEl.appendChild(li);
    }
}

function getHolePos(i) {
    const cols = 3;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const size = 100;
    const pad = 30;
    return { x: pad + col * (size + pad), y: pad + row * (size + pad), size };
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < HOLES; i++) {
        const { x, y, size } = getHolePos(i);
        ctx.fillStyle = '#16213e';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2 - 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.stroke();
        if (moles[i]) {
            ctx.fillStyle = '#00cc6a';
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2 - 10, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(x + size/2 - 8, y + size/2 - 15, 4, 0, Math.PI * 2);
            ctx.arc(x + size/2 + 8, y + size/2 - 15, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${timeLeft}s`, canvas.width / 2, 25);
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Tap pause button', canvas.width / 2, canvas.height / 2 + 40);
    }
}

function spawnMole() {
    if (isPaused || isGameOver) return;
    const idx = Math.floor(Math.random() * HOLES);
    moles[idx] = true;
    setTimeout(() => {
        moles[idx] = false;
        if (!isGameOver) draw();
    }, 800);
    draw();
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    clearInterval(moleTimer);
    const topScores = saveScore(score);
    finalScoreEl.textContent = score;
    const rank = topScores.findIndex(s => s.score === score) + 1;
    if (rank <= 10 && rank > 0) {
        rankInfoEl.textContent = `You placed #${rank} in the Top 10!`;
        rankInfoEl.style.display = 'block';
        top10ListEl.innerHTML = '<ol>' + topScores.map((s, i) => {
            const cls = i < 5 ? ' class="top5"' : '';
            return `<li${cls}><span class="rank">#${i + 1}</span><span class="score-value">${s.name}: ${s.score}</span></li>`;
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
    moles = Array(HOLES).fill(false);
    score = 0;
    timeLeft = GAME_TIME;
    isGameOver = false;
    isPaused = false;
    currentScoreEl.textContent = '0';
    overlay.classList.remove('active');
    updateTop5Display();
    clearInterval(gameLoop);
    clearInterval(moleTimer);
    gameLoop = setInterval(() => {
        if (!isPaused && !isGameOver) {
            timeLeft--;
            if (timeLeft <= 0) gameOver();
            else draw();
        }
    }, 1000);
    moleTimer = setInterval(spawnMole, 700);
    draw();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    draw();
}

canvas.addEventListener('click', (e) => {
    if (isGameOver || isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (let i = 0; i < HOLES; i++) {
        if (moles[i]) {
            const { x, y, size } = getHolePos(i);
            const dist = Math.hypot(mx - (x + size/2), my - (y + size/2));
            if (dist < 30) {
                score++;
                moles[i] = false;
                currentScoreEl.textContent = score;
                draw();
                break;
            }
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('click', { clientX: touch.clientX, clientY: touch.clientY }));
}, {passive: false});

document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
    }
});

if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
retryBtn.addEventListener('click', startGame);

updateTop5Display();
startGame();