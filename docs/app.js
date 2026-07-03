(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const ui = document.getElementById("ui");
  const storageKey = "animalPuzzlePoppersSave";

  const puzzles = [
    ["Cat", "#f49db6", 4], ["Dog", "#d59a5b", 4], ["Cow", "#f4f0e8", 5],
    ["Horse", "#b5794b", 5], ["Sheep", "#f7f4dc", 4], ["Pig", "#f7a0bf", 4],
    ["Duck", "#f5d94e", 3], ["Chicken", "#fff0b8", 4], ["Rabbit", "#e9e2f6", 5],
    ["Elephant", "#9ab7d4", 5], ["Lion", "#e6a13f", 5], ["Monkey", "#b97951", 5],
    ["Giraffe", "#f1c75b", 6], ["Zebra", "#eef3f5", 6], ["Bear", "#a87955", 5],
    ["Frog", "#65bf68", 4], ["Turtle", "#6fbf87", 5], ["Fish", "#61c2df", 3],
    ["Butterfly", "#ca8af2", 4], ["Penguin", "#5d7187", 4]
  ].map((item, index) => ({
    id: index + 1,
    name: item[0],
    color: item[1],
    pieces: item[2],
    message: `${item[0]}!`
  }));

  const shapes = ["body", "head", "ear", "leg", "tail", "wing"];
  const state = {
    screen: "menu",
    puzzleIndex: 0,
    completed: [],
    muted: false,
    pieces: [],
    balloons: [],
    activePiece: null,
    dragOffset: { x: 0, y: 0 },
    pulse: 0,
    messageUntil: 0
  };

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      state.puzzleIndex = clamp(saved.puzzleIndex || 0, 0, puzzles.length - 1);
      state.completed = Array.isArray(saved.completed) ? saved.completed : [];
      state.muted = Boolean(saved.muted);
    } catch {
      save();
    }
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify({
      puzzleIndex: state.puzzleIndex,
      completed: state.completed,
      muted: state.muted
    }));
  }

  function resize() {
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (state.screen === "puzzle") buildPieces();
    if (state.screen === "balloons") buildBalloons();
  }

  function setUi(html) {
    ui.innerHTML = html;
    ui.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => handleAction(button.dataset.action));
    });
  }

  function handleAction(action) {
    softClick();
    if (action === "play") showPuzzle();
    if (action === "home") showMenu();
    if (action === "mute") {
      state.muted = !state.muted;
      save();
      refreshOverlay();
    }
    if (action === "again") {
      state.puzzleIndex = 0;
      state.completed = [];
      save();
      showPuzzle();
    }
    if (action === "next") nextPuzzle();
  }

  function showMenu() {
    state.screen = "menu";
    setUi(`
      <section class="center">
        <h1 class="title">Animal Puzzle<br>Poppers</h1>
        <button class="big-button" data-action="play">Play</button>
        <button class="small-button" data-action="mute">${state.muted ? "Muted" : "Sound"}</button>
      </section>
    `);
  }

  function showPuzzle() {
    state.screen = "puzzle";
    buildPieces();
    refreshOverlay();
  }

  function showBalloons() {
    state.screen = "balloons";
    buildBalloons();
    refreshOverlay(false);
  }

  function showComplete() {
    state.screen = "complete";
    setUi(`
      <section class="center">
        <h1 class="title">Great Job!</h1>
        <button class="big-button" data-action="again">Play Again</button>
        <button class="small-button" data-action="home">Home</button>
      </section>
    `);
  }

  function refreshOverlay(showMute = true) {
    setUi(`
      <div class="top-left"><button class="small-button" data-action="home">Home</button></div>
      ${showMute ? `<div class="top-right"><button class="small-button" data-action="mute">${state.muted ? "Muted" : "Sound"}</button></div>` : ""}
    `);
  }

  function buildPieces() {
    const puzzle = puzzles[state.puzzleIndex];
    const radius = pieceRadius();
    const centerY = innerHeight * 0.55;
    const spacing = Math.min(radius * 1.75, innerHeight * 0.14);
    state.pieces = Array.from({ length: puzzle.pieces }, (_, index) => {
      const y = centerY + (index - (puzzle.pieces - 1) / 2) * spacing;
      const start = { x: innerWidth * 0.18 + (index % 2 ? radius * 1.05 : 0), y };
      const target = { x: innerWidth * 0.58 + (index % 3) * radius * 1.85, y };
      return {
        id: index,
        animal: puzzle.name,
        color: puzzle.color,
        shape: shapes[index % shapes.length],
        start,
        target,
        x: start.x,
        y: start.y,
        placed: false,
        returning: null
      };
    });
  }

  function buildBalloons() {
    const colors = ["#ff8fa3", "#ffd166", "#7bdff2", "#98f5a4", "#cdb4db", "#ffb86b"];
    const count = 8 + Math.floor(Math.random() * 5);
    const radius = Math.min(innerWidth, innerHeight) * 0.07;
    state.balloons = Array.from({ length: count }, (_, index) => ({
      x: innerWidth * (0.12 + 0.76 * ((index % 6) / 5)) + random(-radius / 2, radius / 2),
      y: innerHeight * (0.38 + 0.42 * Math.floor(index / 6)) + random(0, innerHeight * 0.08),
      r: radius,
      color: colors[index % colors.length],
      speed: random(0.35, 0.9),
      popped: false,
      alpha: 1,
      scale: 1
    }));
  }

  function draw() {
    state.pulse += 0.045;
    if (state.screen === "menu") drawMenuBackground();
    if (state.screen === "puzzle") drawPuzzle();
    if (state.screen === "balloons") drawBalloons();
    if (state.screen === "complete") drawCompletionBackground();
    requestAnimationFrame(draw);
  }

  function drawMenuBackground() {
    fill("#a7e4ff");
    ["#ffcf70", "#ff9fb5", "#8ee6a1", "#d3b3ff"].forEach((color, index) => {
      ctx.fillStyle = color;
      circle(90 + index * innerWidth * 0.22, innerHeight * 0.82 + Math.sin(index) * 20, 34);
    });
  }

  function drawCompletionBackground() {
    fill("#d7f9d2");
  }

  function drawPuzzle() {
    const puzzle = puzzles[state.puzzleIndex];
    fill("#dff7ff");
    roundRect(innerWidth * 0.34, innerHeight * 0.18, innerWidth * 0.61, innerHeight * 0.7, 36, "#fff5d7");
    roundRect(innerWidth * 0.36, innerHeight * 0.21, innerWidth * 0.57, innerHeight * 0.64, 30, lighten(puzzle.color, 0.32));
    ctx.fillStyle = hexAlpha(puzzle.color, 0.17);
    circle(innerWidth * 0.78, innerHeight * 0.52, Math.min(innerWidth, innerHeight) * 0.18);
    text(`${puzzle.name} Puzzle`, innerWidth * 0.5, innerHeight * 0.12, Math.min(innerWidth, innerHeight) * 0.07);

    const r = pieceRadius();
    state.pieces.forEach(piece => {
      ctx.strokeStyle = darken(puzzle.color, 0.22);
      ctx.lineWidth = r * 0.08;
      ctx.fillStyle = hexAlpha(puzzle.color, 0.22 + Math.abs(Math.sin(state.pulse)) * 0.08);
      circle(piece.target.x, piece.target.y, r * 1.18);
      ctx.beginPath();
      ctx.arc(piece.target.x, piece.target.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    state.pieces
      .slice()
      .sort(piece => piece === state.activePiece ? 1 : 0)
      .forEach(piece => {
        updateReturn(piece);
        drawPiece(piece, r * (piece === state.activePiece ? 1.08 : 1));
      });

    if (Date.now() < state.messageUntil) {
      text(puzzle.message, innerWidth * 0.5, innerHeight * 0.94, Math.min(innerWidth, innerHeight) * 0.1);
    }
  }

  function drawBalloons() {
    fill("#ccefff");
    text("Pop!", innerWidth * 0.5, innerHeight * 0.14, Math.min(innerWidth, innerHeight) * 0.11);
    state.balloons.forEach(balloon => {
      if (!balloon.popped) {
        balloon.y -= balloon.speed;
        if (balloon.y < -balloon.r) balloon.y = innerHeight + balloon.r;
      } else {
        balloon.alpha -= 0.06;
        balloon.scale += 0.06;
      }
      drawBalloon(balloon);
    });
    state.balloons = state.balloons.filter(balloon => balloon.alpha > 0);
  }

  function drawPiece(piece, r) {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.fillStyle = darken(piece.color, 0.22);
    plasticShape(piece.shape, r);
    ctx.fillStyle = piece.color;
    plasticShape(piece.shape, r * 0.86);
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    circle(-r * 0.32, -r * 0.34, r * 0.14);
    animalMarks(piece, r);
    ctx.restore();
  }

  function plasticShape(shape, r) {
    if (shape === "head") circle(0, 0, r);
    else if (shape === "ear") {
      circle(-r * 0.38, -r * 0.12, r * 0.6);
      circle(r * 0.38, -r * 0.12, r * 0.6);
    } else if (shape === "tail") {
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.58);
      ctx.lineTo(r, 0);
      ctx.lineTo(-r, r * 0.58);
      ctx.closePath();
      ctx.fill();
    } else if (shape === "leg") roundRect(-r * 0.65, -r, r * 1.3, r * 2, r * 0.42, ctx.fillStyle);
    else if (shape === "wing") {
      circle(-r * 0.28, 0, r * 0.78);
      circle(r * 0.28, 0, r * 0.78);
    } else roundRect(-r * 1.15, -r * 0.82, r * 2.3, r * 1.64, r * 0.48, ctx.fillStyle);
  }

  function animalMarks(piece, r) {
    ctx.fillStyle = darken(piece.color, 0.38);
    if (piece.animal === "Cow" || piece.animal === "Zebra") {
      circle(r * 0.35, r * 0.24, r * 0.16);
      circle(-r * 0.46, r * 0.1, r * 0.12);
    }
    if (["Giraffe", "Dog", "Horse"].includes(piece.animal)) circle(r * 0.35, -r * 0.05, r * 0.14);
    if (piece.animal === "Penguin") {
      ctx.fillStyle = "#f7f4e8";
      ellipse(0, r * 0.25, r * 0.38, r * 0.54);
    }
    if (piece.shape === "head") {
      ctx.fillStyle = "#2b2b2b";
      circle(-r * 0.3, -r * 0.14, r * 0.08);
      circle(r * 0.3, -r * 0.14, r * 0.08);
      ctx.lineWidth = r * 0.06;
      ctx.strokeStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(0, r * 0.04, r * 0.3, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  function drawBalloon(balloon) {
    ctx.globalAlpha = Math.max(0, balloon.alpha);
    ctx.fillStyle = balloon.color;
    circle(balloon.x, balloon.y, balloon.r * balloon.scale);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    circle(balloon.x - balloon.r * 0.3, balloon.y - balloon.r * 0.36, balloon.r * 0.18 * balloon.scale);
    ctx.fillStyle = "rgba(80,80,80,0.55)";
    ctx.beginPath();
    ctx.moveTo(balloon.x - balloon.r * 0.16, balloon.y + balloon.r * 0.82);
    ctx.lineTo(balloon.x + balloon.r * 0.16, balloon.y + balloon.r * 0.82);
    ctx.lineTo(balloon.x, balloon.y + balloon.r * 1.08);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches && event.touches[0] ? event.touches[0] : event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : event;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  function pointerDown(event) {
    event.preventDefault();
    const pos = pointer(event);
    if (state.screen === "puzzle") {
      const r = pieceRadius();
      state.activePiece = state.pieces.slice().reverse().find(piece => !piece.placed && distance(pos, piece) <= r * 1.25) || null;
      if (state.activePiece) {
        state.dragOffset.x = state.activePiece.x - pos.x;
        state.dragOffset.y = state.activePiece.y - pos.y;
        softClick();
      }
    } else if (state.screen === "balloons") {
      const balloon = state.balloons.find(item => !item.popped && distance(pos, item) <= item.r * 1.25);
      if (balloon) {
        balloon.popped = true;
        softClick();
        if (state.balloons.every(item => item.popped)) setTimeout(nextPuzzle, 1200);
      }
    }
  }

  function pointerMove(event) {
    if (!state.activePiece) return;
    event.preventDefault();
    const pos = pointer(event);
    state.activePiece.x = pos.x + state.dragOffset.x;
    state.activePiece.y = pos.y + state.dragOffset.y;
  }

  function pointerUp(event) {
    if (!state.activePiece) return;
    event.preventDefault();
    const piece = state.activePiece;
    state.activePiece = null;
    if (distance(piece, piece.target) <= pieceRadius() * 1.25) {
      piece.x = piece.target.x;
      piece.y = piece.target.y;
      piece.placed = true;
      softClick();
      if (state.pieces.every(item => item.placed)) {
        const puzzle = puzzles[state.puzzleIndex];
        state.completed = Array.from(new Set([...state.completed, puzzle.id]));
        save();
        state.messageUntil = Date.now() + 1300;
        setTimeout(showBalloons, 1350);
      }
    } else {
      piece.returning = { fromX: piece.x, fromY: piece.y, start: performance.now() };
    }
  }

  function updateReturn(piece) {
    if (!piece.returning) return;
    const elapsed = performance.now() - piece.returning.start;
    const t = Math.min(1, elapsed / 260);
    const eased = 1 - Math.pow(1 - t, 3);
    piece.x = lerp(piece.returning.fromX, piece.start.x, eased);
    piece.y = lerp(piece.returning.fromY, piece.start.y, eased);
    if (t >= 1) piece.returning = null;
  }

  function nextPuzzle() {
    state.puzzleIndex += 1;
    if (state.puzzleIndex >= puzzles.length) {
      state.puzzleIndex = 0;
      save();
      showComplete();
    } else {
      save();
      showPuzzle();
    }
  }

  function softClick() {
    if (state.muted || !window.AudioContext) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    const audio = softClick.audio || (softClick.audio = new Audio());
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 420;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.055);
  }

  function fill(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }

  function text(value, x, y, size) {
    ctx.fillStyle = "#315163";
    ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function pieceRadius() {
    return Math.min(innerWidth, innerHeight) * 0.075;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function hexAlpha(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }

  function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.round(lerp(rgb.r, 255, amount))},${Math.round(lerp(rgb.g, 255, amount))},${Math.round(lerp(rgb.b, 255, amount))})`;
  }

  function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.round(rgb.r * (1 - amount))},${Math.round(rgb.g * (1 - amount))},${Math.round(rgb.b * (1 - amount))})`;
  }

  canvas.addEventListener("mousedown", pointerDown);
  canvas.addEventListener("mousemove", pointerMove);
  window.addEventListener("mouseup", pointerUp);
  canvas.addEventListener("touchstart", pointerDown, { passive: false });
  canvas.addEventListener("touchmove", pointerMove, { passive: false });
  window.addEventListener("touchend", pointerUp, { passive: false });
  window.addEventListener("resize", resize);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
  }

  loadSave();
  resize();
  showMenu();
  draw();
})();
