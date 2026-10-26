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

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [{x: 10, y: 10}];
let direction = {x: 0, y: 0};
let food = {x: 15, y: 15};
let score = 0;
let gameLoop;
let isGameOver = false;
let isPaused = false;

const SCORES_KEY = 'snakeTopScores';

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
        li.textContent = `${i + 1}. ${s}`;
        li.classList.add('top5');
        top5ListEl.appendChild(li);
    });
    // Fill empty if less than 5
    for (let i = scores.length; i < 5; i++) {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ---`;
        top5ListEl.appendChild(li);
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw food
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

    // Draw snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#00cc6a' : '#00ff88';
        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    // Draw pause indicator
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
    if (isPaused || (direction.x === 0 && direction.y === 0)) return;

    const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === food.x && head.y === food.y) {
        score++;
        currentScoreEl.textContent = score;
        placeFood();
    } else {
        snake.pop();
    }
}

function placeFood() {
    do {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
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
        // Show top 10
        top10ListEl.innerHTML = '<ol>' + topScores.map((s, i) => {
            const cls = i < 5 ? ' class="top5"' : '';
            return `<li${cls}>${i + 1}. ${s}</li>`;
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
    snake = [{x: 10, y: 10}];
    direction = {x: 0, y: 0};
    score = 0;
    currentScoreEl.textContent = '0';
    isGameOver = false;
    isPaused = false;
    placeFood();
    overlay.classList.remove('active');
    updateTop5Display();
    clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        update();
        draw();
    }, 120);
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
        }, 120);
    }
    draw();
}

// Controls
document.addEventListener('keydown', (e) => {
    if (isGameOver) return;

    // Pause with space
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
        return;
    }

    if (isPaused) return;

    switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (direction.y === 0) direction = {x: 0, y: -1};
            break;
        case 'arrowdown':
        case 's':
            if (direction.y === 0) direction = {x: 0, y: 1};
            break;
        case 'arrowleft':
        case 'a':
            if (direction.x === 0) direction = {x: -1, y: 0};
            break;
        case 'arrowright':
        case 'd':
            if (direction.x === 0) direction = {x: 1, y: 0};
            break;
    }
});

retryBtn.addEventListener('click', startGame);
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Init
updateTop5Display();
startGame();