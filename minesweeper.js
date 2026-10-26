const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const top5ListEl = document.getElementById('top5List');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const finalScoreEl = document.getElementById('finalScore');
const rankInfoEl = document.getElementById('rankInfo');
const top10ListEl = document.getElementById('top10List');
const retryBtn = document.getElementById('retryBtn');
const pauseBtn = document.getElementById('pauseBtn');

const SCORES_KEY = 'minesweeperTopScores';
const ROWS = 10;
const COLS = 10;
const CELL = 40;
const MINES = 15;

let grid = [];
let revealed = [];
let flagged = [];
let startTime = 0;
let timerInterval;
let isGameOver = false;
let isPaused = false;
let firstClick = true;

function getTopScores() {
    const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    return scores.sort((a, b) => a - b).slice(0, 10);
}

function saveScore(time) {
    let scores = getTopScores();
    scores.push(time);
    scores = scores.sort((a, b) => a - b).slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    return scores;
}

function updateTop5Display() {
    const scores = getTopScores();
    top5ListEl.innerHTML = '';
    scores.slice(0, 5).forEach((s, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">${s}s</span>`;
        li.classList.add('top5');
        top5ListEl.appendChild(li);
    });
    for (let i = scores.length; i < 5; i++) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="score-value">---</span>`;
        top5ListEl.appendChild(li);
    }
}

function initGrid() {
    grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    revealed = Array(ROWS).fill().map(() => Array(COLS).fill(false));
    flagged = Array(ROWS).fill().map(() => Array(COLS).fill(false));
}

function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if ((r !== safeR || c !== safeC) && grid[r][c] !== -1) {
            grid[r][c] = -1;
            placed++;
        }
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === -1) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === -1) count++;
                }
            }
            grid[r][c] = count;
        }
    }
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = c * CELL;
            const y = r * CELL;
            ctx.strokeStyle = '#00ff88';
            ctx.strokeRect(x, y, CELL, CELL);
            if (revealed[r][c]) {
                ctx.fillStyle = '#16213e';
                ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
                if (grid[r][c] === -1) {
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath();
                    ctx.arc(x + CELL/2, y + CELL/2, 10, 0, Math.PI*2);
                    ctx.fill();
                } else if (grid[r][c] > 0) {
                    ctx.fillStyle = '#00ff88';
                    ctx.font = 'bold 20px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(grid[r][c], x + CELL/2, y + CELL/2);
                }
            } else if (flagged[r][c]) {
                ctx.fillStyle = '#ffaa00';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🚩', x + CELL/2, y + CELL/2);
            }
        }
    }
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

function reveal(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (grid[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) reveal(r + dr, c + dc);
        }
    }
}

function checkWin() {
    let revealedCount = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) if (revealed[r][c]) revealedCount++;
    }
    return revealedCount === ROWS * COLS - MINES;
}

function gameOver(won = false) {
    isGameOver = true;
    clearInterval(timerInterval);
    const time = Math.floor((Date.now() - startTime) / 1000);
    finalScoreEl.textContent = time;
    overlayTitle.textContent = won ? 'You Win!' : 'Game Over';
    if (won) {
        const topScores = saveScore(time);
        const rank = topScores.indexOf(time) + 1;
        if (rank <= 10 && rank > 0) {
            rankInfoEl.textContent = `Cleared in #${rank} fastest time!`;
            rankInfoEl.style.display = 'block';
            top10ListEl.innerHTML = '<ol>' + topScores.map((s, i) => {
                const cls = i < 5 ? ' class="top5"' : '';
                return `<li${cls}><span class="rank">#${i + 1}</span><span class="score-value">${s}s</span></li>`;
            }).join('') + '</ol>';
            top10ListEl.style.display = 'block';
        } else {
            rankInfoEl.textContent = 'Not in Top 10 fastest.';
            top10ListEl.style.display = 'none';
        }
    } else {
        rankInfoEl.textContent = 'Hit a mine!';
        top10ListEl.style.display = 'none';
    }
    overlay.classList.add('active');
    updateTop5Display();
}

function startGame() {
    initGrid();
    firstClick = true;
    isGameOver = false;
    isPaused = false;
    startTime = Date.now();
    currentScoreEl.textContent = '0s';
    overlay.classList.remove('active');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isPaused && !isGameOver) {
            currentScoreEl.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
        }
    }, 1000);
    updateTop5Display();
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
    const c = Math.floor((e.clientX - rect.left) / CELL);
    const r = Math.floor((e.clientY - rect.top) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (firstClick) {
        placeMines(r, c);
        firstClick = false;
    }
    if (flagged[r][c]) return;
    if (grid[r][c] === -1) {
        revealed[r][c] = true;
        gameOver(false);
    } else {
        reveal(r, c);
        if (checkWin()) gameOver(true);
    }
    draw();
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (isGameOver || isPaused || firstClick) return;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / CELL);
    const r = Math.floor((e.clientY - rect.top) / CELL);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !revealed[r][c]) {
        flagged[r][c] = !flagged[r][c];
        draw();
    }
});

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