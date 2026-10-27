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

const SCORES_KEY = 'game2048TopScores';
const LAST_NAME_KEY = 'lastPlayerName';
const GRID_SIZE = 4;
const TILE_SIZE = 90;
const TILE_PADDING = 10;

let grid = [];
let score = 0;
let isGameOver = false;
let isPaused = false;
let touchStartX = 0;
let touchStartY = 0;

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

function initGrid() {
    grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    addRandomTile();
    addRandomTile();
}

function addRandomTile() {
    const empty = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) empty.push({r, c});
        }
    }
    if (empty.length === 0) return;
    const {r, c} = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function getTileColor(value) {
    const colors = {
        0: '#16213e', 2: '#00ff88', 4: '#00cc6a', 8: '#00aa55',
        16: '#008844', 32: '#ffaa00', 64: '#ff8800', 128: '#ff6600',
        256: '#ff4400', 512: '#ff2200', 1024: '#ff0000', 2048: '#cc00cc'
    };
    return colors[value] || '#aa00aa';
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const value = grid[r][c];
            const x = c * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
            const y = r * (TILE_SIZE + TILE_PADDING) + TILE_PADDING;
            ctx.fillStyle = getTileColor(value);
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            if (value !== 0) {
                ctx.fillStyle = '#1a1a2e';
                ctx.font = value >= 1000 ? 'bold 28px sans-serif' : 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
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

function slide(row) {
    let arr = row.filter(val => val !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            score += arr[i];
            arr[i + 1] = 0;
        }
    }
    arr = arr.filter(val => val !== 0);
    while (arr.length < GRID_SIZE) arr.push(0);
    return arr;
}

function move(direction) {
    if (isGameOver || isPaused) return false;
    let moved = false;
    const oldGrid = grid.map(row => [...row]);

    if (direction === 'left') {
        for (let r = 0; r < GRID_SIZE; r++) grid[r] = slide(grid[r]);
    } else if (direction === 'right') {
        for (let r = 0; r < GRID_SIZE; r++) grid[r] = slide(grid[r].reverse()).reverse();
    } else if (direction === 'up') {
        for (let c = 0; c < GRID_SIZE; c++) {
            let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
            col = slide(col);
            for (let r = 0; r < GRID_SIZE; r++) grid[r][c] = col[r];
        }
    } else if (direction === 'down') {
        for (let c = 0; c < GRID_SIZE; c++) {
            let col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
            col = slide(col);
            for (let r = 0; r < GRID_SIZE; r++) grid[3 - r][c] = col[r];
        }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] !== oldGrid[r][c]) moved = true;
        }
    }

    if (moved) {
        addRandomTile();
        currentScoreEl.textContent = score;
        if (checkGameOver()) gameOver();
    }
    return moved;
}

function checkGameOver() {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return false;
            if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
            if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
        }
    }
    return true;
}

function gameOver() {
    isGameOver = true;
    isPaused = false;
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
    score = 0;
    currentScoreEl.textContent = '0';
    isGameOver = false;
    isPaused = false;
    initGrid();
    overlay.classList.remove('active');
    updateTop5Display();
    draw();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    draw();
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
        return;
    }
    if (isPaused) return;
    let moved = false;
    switch (e.key.toLowerCase()) {
        case 'arrowleft': case 'a': moved = move('left'); break;
        case 'arrowright': case 'd': moved = move('right'); break;
        case 'arrowup': case 'w': moved = move('up'); break;
        case 'arrowdown': case 's': moved = move('down'); break;
    }
    if (moved) draw();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isPaused || isGameOver) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    let moved = false;
    if (Math.abs(dx) > Math.abs(dy)) {
        moved = move(dx > 0 ? 'right' : 'left');
    } else {
        moved = move(dy > 0 ? 'down' : 'up');
    }
    if (moved) draw();
}, {passive: false});

if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
retryBtn.addEventListener('click', startGame);

updateTop5Display();
startGame();