# Arcade Games

A simple website to play classic games, starting with Snake.

## Features
- Classic Snake game with keyboard controls (arrow keys)
- Current score display
- Top 5 scores shown during play
- Local score tracking (using browser localStorage) for top 10
- On game over: shows final score, rank if in top 10, full top 10 list (top 5 in bold), Retry and Back to Games buttons

## How to run / deploy
1. Clone the repo or download the files.
2. Open `index.html` in a browser, or serve with any static server.
3. To host publicly for free: Enable GitHub Pages
   - Go to repo Settings > Pages
   - Source: Deploy from a branch
   - Branch: main / (root)
   - Save
   - Site will be at https://bjoggithk.github.io/arcade-games/

Scores are stored per-browser via localStorage (no backend needed). Clear site data to reset scores.

## Files
- `index.html` - Games selection page
- `snake.html` - Snake game
- `snake.js` - Game logic and score handling
- `styles.css` - Styling
