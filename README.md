# Dino World Puzzle

Native Android/Kotlin prototype files are still present under `app/`, but the published GitHub Pages game lives in `docs/`.

Live PWA:

`https://mkhaidon.github.io/Dino-World/`

## GitHub Pages PWA

The `docs/` folder contains a polished vanilla HTML/CSS/JavaScript dinosaur puzzle game:

- Cheerful prehistoric animated background.
- Home screen with logo, Play, Sound, and Reset controls.
- Eight dinosaur puzzles: T-Rex, Triceratops, Stegosaurus, Brachiosaurus, Pterodactyl, Ankylosaurus, Velociraptor, and Baby Dino.
- Vector dinosaur artwork drawn locally, with recognizable body parts.
- Drag/drop snapping, wrong-drop return, target glow, sparkle feedback, celebration scene, and final completion scene.
- PWA manifest and service worker for installability.

## Deploy

This repo is configured to publish from `main` `/docs` on GitHub Pages.

If `git` is not installed, use the included uploader:

```powershell
$env:GITHUB_TOKEN = "paste-a-fresh-token-here"
powershell -ExecutionPolicy Bypass -File .\tools\upload-to-github.ps1
```

Then trigger or wait for the GitHub Pages build.

## Test

Open:

`https://mkhaidon.github.io/Dino-World/`

Check:

- Home screen title says `Dino World Puzzle`.
- Play starts the saved dinosaur puzzle.
- Drag puzzle pieces into the silhouette.
- Complete at least two dinosaurs.
- Sound toggle persists.
- Reset clears local progress.
- Portrait shows the rotate hint.
