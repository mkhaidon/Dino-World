# Dino World Puzzle

Playable GitHub Pages PWA:

`https://mkhaidon.github.io/Dino-World/`

This folder is a vanilla HTML/CSS/JavaScript game. No backend, no CDN, no external assets.

## What Is Included

- `index.html` hosts the game canvas and UI.
- `styles.css` contains mobile-first landscape UI styling.
- `app.js` contains the game loop, vector dinosaur sprites, drag/drop logic, audio, storage, and scene management.
- `manifest.webmanifest` makes the game installable as a PWA.
- `sw.js` caches the local files for offline-friendly loading.
- `assets/` contains original SVG icon/logo art.

## Testing

Open `index.html` locally or visit the GitHub Pages URL. Test:

- Play button and level select.
- Drag pieces with mouse or touch.
- Complete at least two dinosaur puzzles.
- Celebration star/balloon taps.
- Sound On/Off persistence.
- Reset Progress.
- Resize and portrait rotate hint.

After deploying, hard refresh once or clear site data if an older service worker is cached.
