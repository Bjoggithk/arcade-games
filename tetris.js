const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const levelDisplay = document.getElementById('levelDisplay');
const top5ListEl = document.getElementById('top5List');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('finalScore');
const rankInfoEl = document.getElementById('rankInfo');
const top10ListEl = document.getElementById('top10List');
const retryBtn = document.getElementById('retryBtn');
const backBtn = document.getElementById('backBtn');

const SCORES_KEY = 'tetrisTopScores';
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const HOLD_BLOCK = 18;

const SHAPES = {
    I: [[1,1,1,1]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1]],
    S: [[0,1,1],[1,1,0]],
    Z: [[1,1,0],[0,1,1]],
    J: [[1,0,0],[1,1,1]],
    L: [[0,0,1],[1,1,1]]
};

const COLORS = {
    I: '#00ffff',
    O: '#ffff00',
    T: '#aa00ff',
    S: '#00ff88',
    Z: '#ff4444',
    J: '#4444ff',
    L: '#ffaa00'
};

let board = [];
let current = null;
let hold = null;
let canHold = true;
let score = 0;
let level = 1;
let lines = 0;
let dropInterval = 800;
let lastDrop = 0;
let isGameOver = false;
let isPaused = false;
let animId = null;

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

function randomPiece() {
    const keys = Object.keys(SHAPES);
    const type = keys[Math.floor(Math.random() * keys.length)];
    return {
        type,
        shape: SHAPES[type].map(row => [...row]),
        x: 3,
        y: 0
    };
}

function rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = shape[r][c];
        }
    }
    return rotated;
}

function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
    if (!piece) return true;
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (!shape[r][c]) continue;
            const nx = piece.x + c + dx;
            const ny = piece.y + r + dy;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny] && board[ny][nx]) return true;
        }
    }
    return false;
}

function getGhostY() {
    if (!current) return 0;
    let ghostY = current.y;
    while (!collides({ ...current, y: ghostY }, 0, 1)) {
        ghostY++;
    }
    return ghostY;
}

function lockPiece() {
    if (!current) return;
    current.shape.forEach((row, r) => {
        row.forEach((val, c) => {
            if (val && current.y + r >= 0) {
                board[current.y + r][current.x + c] = current.type;
            }
        });
    });
    clearLines();
    spawnPiece();
}

function hardDrop() {
    if (!current || isPaused || isGameOver) return;
    while (!collides(current, 0, 1)) {
        current.y++;
        score += 2;
    }
    currentScoreEl.textContent = score;
    lockPiece();
}

function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell)) {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            cleared++;
            r++;
        }
    }
    if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * level;
        score += points;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 800 - (level - 1) * 60);
        currentScoreEl.textContent = score;
        levelDisplay.textContent = level;
    }
}

function spawnPiece() {
    current = randomPiece();
    canHold = true;
    if (collides(current)) {
        gameOver();
    }
}

function drawHold() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    holdCtx.fillStyle = '#0f0f23';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!hold) return;

    const shape = hold.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const totalW = cols * HOLD_BLOCK;
    const totalH = rows * HOLD_BLOCK;
    const offsetX = Math.floor((holdCanvas.width - totalW) / 2);
    const offsetY = Math.floor((holdCanvas.height - totalH) / 2);

    shape.forEach((row, r) => {
        row.forEach((val, c) => {
            if (val) {
                holdCtx.fillStyle = COLORS[hold.type];
                holdCtx.fillRect(offsetX + c * HOLD_BLOCK, offsetY + r * HOLD_BLOCK, HOLD_BLOCK - 1, HOLD_BLOCK - 1);
            }
        });
    });
}

function holdPiece() {
    if (!canHold || isPaused || isGameOver || !current) return;
    canHold = false;
    if (!hold) {
        hold = { type: current.type, shape: SHAPES[current.type].map(r => [...r]) };
        spawnPiece();
    } else {
        const temp = hold;
        hold = { type: current.type, shape: SHAPES[current.type].map(r => [...r]) };
        current = {
            type: temp.type,
            shape: temp.shape.map(r => [...r]),
            x: 3,
            y: 0
        };
        if (collides(current)) current.y = 0;
    }
    drawHold();
}

function draw() {
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = '#16213e';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
        }
    }

    // Locked pieces
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                ctx.fillStyle = COLORS[board[r][c]] || '#fff';
                ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
            }
        }
    }

    // Ghost piece (landing outline)
    if (current && current.shape && !isPaused) {
        const ghostY = getGhostY();
        if (ghostY !== current.y) {
            ctx.strokeStyle = COLORS[current.type];
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            current.shape.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) {
                        const x = (current.x + c) * BLOCK;
                        const y = (ghostY + r) * BLOCK;
                        ctx.strokeRect(x + 2, y + 2, BLOCK - 4, BLOCK - 4);
                    }
                });
            });
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
        }
    }

    // Current piece
    if (current && current.shape) {
        current.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) {
                    ctx.fillStyle = COLORS[current.type];
                    ctx.fillRect((current.x + c) * BLOCK + 1, (current.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
                }
            });
        });
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('Press Q to resume', canvas.width / 2, canvas.height / 2 + 35);
    }
}

function update(time = 0) {
    if (isPaused || isGameOver) return;
    if (time - lastDrop > dropInterval) {
        if (current && !collides(current, 0, 1)) {
            current.y++;
        } else if (current) {
            lockPiece();
        }
        lastDrop = time;
    }
    draw();
    if (!isGameOver) animId = requestAnimationFrame(update);
}

function gameOver() {
    isGameOver = true;
    if (animId) cancelAnimationFrame(animId);
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
    if (animId) cancelAnimationFrame(animId);
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 800;
    hold = null;
    canHold = true;
    isGameOver = false;
    isPaused = false;
    currentScoreEl.textContent = '0';
    levelDisplay.textContent = '1';
    drawHold();
    overlay.classList.remove('active');
    updateTop5Display();
    spawnPiece();
    lastDrop = performance.now();
    animId = requestAnimationFrame(update);
    draw();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (!isPaused) {
        lastDrop = performance.now();
        animId = requestAnimationFrame(update);
    } else if (animId) {
        cancelAnimationFrame(animId);
    }
    draw();
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        togglePause();
        return;
    }

    if (isPaused || !current) return;

    switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
            if (!collides(current, -1, 0)) current.x--;
            break;
        case 'arrowright':
        case 'd':
            if (!collides(current, 1, 0)) current.x++;
            break;
        case 'arrowdown':
        case 's':
            if (!collides(current, 0, 1)) current.y++;
            break;
        case 'arrowup':
        case 'w':
            const rotated = rotate(current.shape);
            if (!collides(current, 0, 0, rotated)) current.shape = rotated;
            break;
        case ' ':
        case 'space':
            e.preventDefault();
            hardDrop();
            break;
        case 'c':
        case 'h':
            holdPiece();
            break;
    }
    draw();
});

retryBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', () => window.location.href = 'index.html');

updateTop5Display();
startGame();