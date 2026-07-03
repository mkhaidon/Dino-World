(() => {
  "use strict";

  // Dino World Puzzle is intentionally dependency-free so it runs from GitHub Pages.
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const ui = document.getElementById("ui");
  const rotateHint = document.getElementById("rotateHint");
  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveKey = "dinoWorldPuzzleSaveV1";

  const dinos = [
    {
      id: "trex",
      name: "T-Rex",
      color: "#6fd17f",
      belly: "#ffe49a",
      accent: "#3c9b63",
      phrase: "Great job! You built a T-Rex!",
      parts: ["tail", "body", "legBack", "legFront", "arm", "head"]
    },
    {
      id: "triceratops",
      name: "Triceratops",
      color: "#f2a05d",
      belly: "#ffe0a8",
      accent: "#d67047",
      phrase: "Great job! You built a Triceratops!",
      parts: ["tail", "body", "legBack", "legFront", "frill", "head"]
    },
    {
      id: "stegosaurus",
      name: "Stegosaurus",
      color: "#78c7d9",
      belly: "#d8f4ff",
      accent: "#e87993",
      phrase: "Great job! You built a Stegosaurus!",
      parts: ["tail", "body", "legBack", "legFront", "plates", "head"]
    },
    {
      id: "brachiosaurus",
      name: "Brachiosaurus",
      color: "#9dd36f",
      belly: "#fff0a8",
      accent: "#6fae54",
      phrase: "Great job! You built a Brachiosaurus!",
      parts: ["tail", "body", "legBack", "legFront", "neck", "head"]
    },
    {
      id: "pterodactyl",
      name: "Pterodactyl",
      color: "#c69df2",
      belly: "#f1ddff",
      accent: "#8c66ca",
      phrase: "Great job! You built a Pterodactyl!",
      parts: ["wingLeft", "body", "wingRight", "legFront", "crest", "head"]
    },
    {
      id: "ankylosaurus",
      name: "Ankylosaurus",
      color: "#a8c46b",
      belly: "#f2e7a1",
      accent: "#7a9a4d",
      phrase: "Great job! You built an Ankylosaurus!",
      parts: ["clubTail", "body", "legBack", "legFront", "armor", "head"]
    },
    {
      id: "velociraptor",
      name: "Velociraptor",
      color: "#f4c95d",
      belly: "#fff2b2",
      accent: "#e49342",
      phrase: "Great job! You built a Velociraptor!",
      parts: ["tail", "body", "legBack", "legFront", "arm", "head"]
    },
    {
      id: "baby",
      name: "Baby Dino",
      color: "#ff96bd",
      belly: "#ffe1ee",
      accent: "#f0609a",
      phrase: "Great job! You built a Baby Dino!",
      parts: ["egg", "tail", "body", "legBack", "legFront", "head"]
    }
  ];

  const state = {
    scene: "home",
    level: 0,
    completed: [],
    sound: true,
    pieces: [],
    active: null,
    pointerOffset: { x: 0, y: 0 },
    stars: [],
    confetti: [],
    poppers: [],
    time: 0,
    completedBounce: 0
  };

  const audio = {
    ctx: null,
    ensure() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    tone(freq, duration, type = "sine", gainValue = 0.04) {
      if (!state.sound) return;
      this.ensure();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    },
    click() { this.tone(360, 0.06, "triangle", 0.025); },
    pickup() { this.tone(260, 0.08, "sine", 0.03); },
    snap() { this.tone(520, 0.09, "triangle", 0.04); setTimeout(() => this.tone(700, 0.08, "triangle", 0.03), 55); },
    wrong() { this.tone(180, 0.08, "sine", 0.025); },
    celebrate() { [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, "triangle", 0.035), i * 75)); },
    pop() { this.tone(740, 0.05, "square", 0.025); }
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");
      state.level = clamp(saved.level || 0, 0, dinos.length - 1);
      state.completed = Array.isArray(saved.completed) ? saved.completed : [];
      state.sound = saved.sound !== false;
    } catch {
      save();
    }
  }

  function save() {
    localStorage.setItem(saveKey, JSON.stringify({
      level: state.level,
      completed: state.completed,
      sound: state.sound
    }));
  }

  function resize() {
    const ratio = Math.max(1, Math.min(2, devicePixelRatio || 1));
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (state.scene === "puzzle") buildPuzzle();
    if (state.scene === "celebrate") buildPoppers();
  }

  function uiHtml(html) {
    ui.innerHTML = html;
    ui.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        audio.click();
        handle(button.dataset.action);
      });
    });
  }

  function handle(action) {
    if (action === "play") showPuzzle(state.level);
    if (action === "home") showHome();
    if (action === "sound") {
      state.sound = !state.sound;
      save();
      if (state.scene === "home") showHome();
      else refreshOverlay();
    }
    if (action === "reset") {
      state.level = 0;
      state.completed = [];
      save();
      showHome();
    }
    if (action === "next") nextLevel();
    if (action === "again") {
      state.level = 0;
      state.completed = [];
      save();
      showPuzzle(0);
    }
  }

  function showHome() {
    state.scene = "home";
    uiHtml(`
      <section class="center-panel home-panel">
        <div class="logo-wrap">
          <img src="./assets/dino-logo.svg" alt="Dino World Puzzle" class="logo-dino">
        </div>
        <h1>Dino World Puzzle</h1>
        <div class="button-row">
          <button class="big-button" data-action="play">Play</button>
        </div>
        <p class="progress-note">Next dino: ${dinos[state.level].name} · ${state.completed.length}/${dinos.length} built</p>
        <div class="button-row">
          <button class="small-button" data-action="sound">${state.sound ? "Sound On" : "Sound Off"}</button>
          <button class="small-button" data-action="reset">Reset</button>
        </div>
      </section>
    `);
  }

  function refreshOverlay() {
    uiHtml(`
      <div class="top-left"><button class="icon-button" data-action="home">⌂</button></div>
      <div class="top-right"><button class="small-button" data-action="sound">${state.sound ? "Sound On" : "Sound Off"}</button></div>
    `);
  }

  function showPuzzle(index = state.level) {
    state.level = clamp(index, 0, dinos.length - 1);
    state.scene = "puzzle";
    state.stars = [];
    state.completedBounce = 0;
    buildPuzzle();
    refreshOverlay();
    save();
  }

  function showCelebrate() {
    state.scene = "celebrate";
    state.confetti = makeConfetti();
    buildPoppers();
    uiHtml(`
      <div class="top-left"><button class="icon-button" data-action="home">⌂</button></div>
      <section class="bottom-center">
        <button class="big-button" data-action="next">Next</button>
      </section>
    `);
  }

  function showFinal() {
    state.scene = "final";
    uiHtml(`
      <section class="center-panel">
        <h1>You finished<br>Dino World!</h1>
        <div class="button-row">
          <button class="big-button" data-action="again">Play Again</button>
          <button class="big-button" data-action="home">Home</button>
        </div>
      </section>
    `);
  }

  function buildPuzzle() {
    const dino = dinos[state.level];
    const board = boardRect();
    const scale = Math.min(board.w / 560, board.h / 360);
    const origin = { x: board.x + board.w * 0.5, y: board.y + board.h * 0.56 };
    const targets = partTargets(dino, origin, scale);
    const trayX = innerWidth * 0.1;
    const trayTop = innerHeight * 0.25;
    const trayXGap = Math.min(150, innerWidth * 0.12);
    const trayGap = Math.min(132, innerHeight * 0.19);
    state.pieces = dino.parts.map((part, i) => {
      const target = targets[part];
      const start = {
        x: trayX + (i % 2) * trayXGap,
        y: trayTop + Math.floor(i / 2) * trayGap
      };
      return {
        part,
        x: start.x,
        y: start.y,
        start,
        target,
        placed: false,
        returning: null,
        shake: 0,
        snap: 0
      };
    });
  }

  function buildPoppers() {
    const count = 9;
    state.poppers = Array.from({ length: count }, (_, i) => ({
      x: innerWidth * (0.18 + 0.64 * ((i % 5) / 4)),
      y: innerHeight * (0.38 + 0.34 * Math.floor(i / 5)) + random(-15, 15),
      r: Math.min(innerWidth, innerHeight) * 0.045,
      color: ["#ff8fa3", "#ffd166", "#7bdff2", "#98f5a4", "#cdb4db"][i % 5],
      popped: false,
      alpha: 1,
      scale: 1
    }));
  }

  function draw(now) {
    state.time = now / 1000;
    rotateHint.hidden = innerWidth >= innerHeight || innerWidth > 760;
    drawPrehistoric();
    if (state.scene === "home") drawHomeDinos();
    if (state.scene === "puzzle") drawPuzzleScene();
    if (state.scene === "celebrate") drawCelebrateScene();
    if (state.scene === "final") drawFinalScene();
    requestAnimationFrame(draw);
  }

  function drawPrehistoric() {
    const sky = ctx.createLinearGradient(0, 0, 0, innerHeight);
    sky.addColorStop(0, "#91dcff");
    sky.addColorStop(0.68, "#c8f5ff");
    sky.addColorStop(0.681, "#8fe08b");
    sky.addColorStop(1, "#4fbd69");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.fillStyle = "#fff5b3";
    circle(innerWidth * 0.86, innerHeight * 0.16, Math.min(innerWidth, innerHeight) * 0.07);
    drawCloud((innerWidth * 0.12 + cloudShift(0)) % (innerWidth + 260) - 130, innerHeight * 0.14, 1);
    drawCloud((innerWidth * 0.62 + cloudShift(1)) % (innerWidth + 280) - 140, innerHeight * 0.22, 0.8);
    drawVolcano(innerWidth * 0.73, innerHeight * 0.68, Math.min(innerWidth, innerHeight) * 0.55);
    drawPalm(innerWidth * 0.08, innerHeight * 0.78, 1.1);
    drawPalm(innerWidth * 0.92, innerHeight * 0.8, 0.9);
    drawRocks();
  }

  function drawPuzzleScene() {
    const dino = dinos[state.level];
    const board = boardRect();
    roundRect(board.x, board.y, board.w, board.h, 36, "#fff6dc");
    roundRect(board.x + 18, board.y + 18, board.w - 36, board.h - 36, 28, "#e8f8e5");
    ctx.globalAlpha = 0.22 + Math.sin(state.time * 2.5) * 0.03;
    drawFullDino(dino, board.x + board.w * 0.5, board.y + board.h * 0.56, Math.min(board.w / 560, board.h / 360), true);
    ctx.globalAlpha = 1;
    text(`${dino.name} Puzzle`, board.x + board.w * 0.5, board.y - 26, Math.min(innerWidth, innerHeight) * 0.055, "#24566a");

    state.pieces.forEach(piece => {
      const near = state.active === piece && distance(piece, piece.target) < pieceRadius() * 1.7;
      if (!piece.placed) drawTargetGlow(piece.target, near, dino.color);
    });
    state.pieces.forEach(updatePieceMotion);
    state.pieces.slice().sort(piece => piece === state.active ? 1 : 0).forEach(piece => drawDinoPart(dino, piece.part, piece.x + shakeOffset(piece), piece.y, Math.min(board.w / 560, board.h / 360), false, piece === state.active ? 1.08 : 1));
    drawStars();
  }

  function drawCelebrateScene() {
    const dino = dinos[state.level];
    text(dino.phrase, innerWidth * 0.5, innerHeight * 0.16, Math.min(innerWidth, innerHeight) * 0.055, "#24566a");
    const bounce = prefersReducedMotion ? 0 : Math.sin(state.time * 7) * 0.025;
    drawFullDino(dino, innerWidth * 0.5, innerHeight * 0.48, Math.min(innerWidth, innerHeight) / 430 * (1 + bounce), false);
    drawConfetti();
    drawPoppers();
  }

  function drawFinalScene() {
    text("You finished Dino World!", innerWidth * 0.5, innerHeight * 0.16, Math.min(innerWidth, innerHeight) * 0.065, "#24566a");
    dinos.forEach((dino, i) => {
      const x = innerWidth * (0.16 + (i % 4) * 0.23);
      const y = innerHeight * (0.38 + Math.floor(i / 4) * 0.2);
      drawFullDino(dino, x, y, Math.min(innerWidth, innerHeight) / 850, false);
    });
  }

  function drawHomeDinos() {
    drawFullDino(dinos[0], innerWidth * 0.16, innerHeight * 0.68, Math.min(innerWidth, innerHeight) / 700, false);
    drawFullDino(dinos[2], innerWidth * 0.84, innerHeight * 0.68, Math.min(innerWidth, innerHeight) / 760, false);
  }

  function drawFullDino(dino, x, y, scale, ghost) {
    const oldAlpha = ctx.globalAlpha;
    if (ghost) ctx.globalAlpha *= 0.65;
    const targets = partTargets(dino, { x, y }, scale);
    dino.parts.forEach(part => drawDinoPart(dino, part, targets[part].x, targets[part].y, scale, ghost, 1));
    ctx.globalAlpha = oldAlpha;
  }

  function drawDinoPart(dino, part, x, y, scale, ghost, popScale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * popScale, scale * popScale);
    const color = ghost ? "rgba(70,100,95,0.35)" : dino.color;
    const accent = ghost ? "rgba(70,100,95,0.28)" : dino.accent;
    const belly = ghost ? "rgba(255,255,255,0.35)" : dino.belly;
    ctx.lineWidth = 8;
    ctx.strokeStyle = ghost ? "rgba(45,85,112,0.18)" : darken(color, 0.2);
    ctx.fillStyle = color;

    if (part === "body") {
      blob([[-145, 20], [-105, -70], [40, -85], [155, -38], [160, 48], [60, 88], [-75, 78]]);
      ctx.fillStyle = belly;
      ellipse(20, 28, 88, 42);
    }
    if (part === "tail") {
      ctx.fillStyle = color;
      path([[-145, 20], [-270, -22], [-215, 36], [-140, 52]]);
    }
    if (part === "clubTail") {
      path([[-145, 20], [-245, -18], [-205, 46], [-140, 52]]);
      ctx.fillStyle = accent;
      ellipse(-255, 10, 38, 30);
    }
    if (part === "head") {
      blob([[-18, -54], [55, -70], [112, -28], [96, 42], [28, 70], [-38, 32]]);
      eye(34, -18);
      smile(42, 18);
      if (dino.id === "trex" || dino.id === "velociraptor") teeth();
      if (dino.id === "brachiosaurus") {
        ctx.fillStyle = accent;
        circle(82, -40, 12);
      }
    }
    if (part === "frill") {
      ctx.fillStyle = accent;
      blob([[-70, -70], [12, -120], [86, -80], [72, 30], [-52, 42]]);
      ctx.fillStyle = "#fff4d2";
      horn(-10, -72, -34, -122);
      horn(52, -70, 76, -118);
    }
    if (part === "plates") {
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        const px = -100 + i * 52;
        path([[px, -70], [px + 24, -122 - Math.abs(2 - i) * 10], [px + 48, -70]]);
      }
    }
    if (part === "armor") {
      ctx.fillStyle = accent;
      for (let i = 0; i < 6; i++) circle(-105 + i * 42, -62 - (i % 2) * 10, 17);
    }
    if (part === "spikes") {
      ctx.fillStyle = accent;
      for (let i = 0; i < 4; i++) path([[-90 + i * 48, -65], [-68 + i * 48, -104], [-45 + i * 48, -65]]);
    }
    if (part === "egg") {
      ctx.fillStyle = "#fff6d7";
      blob([[-72, 64], [-88, -8], [-48, -82], [18, -96], [74, -48], [88, 28], [42, 88], [-24, 94]]);
      ctx.fillStyle = "#ffd6e7";
      circle(-28, -34, 12);
      circle(34, -10, 10);
      ctx.strokeStyle = "#e7b87b";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-58, 8);
      ctx.lineTo(-30, -8);
      ctx.lineTo(-2, 12);
      ctx.lineTo(26, -6);
      ctx.lineTo(58, 14);
      ctx.stroke();
    }
    if (part === "neck") {
      ctx.fillStyle = color;
      roundRect(-28, -142, 72, 190, 36, color);
    }
    if (part === "crest") {
      ctx.fillStyle = accent;
      path([[8, -72], [82, -110], [62, -34]]);
    }
    if (part === "wingLeft" || part === "wingRight") {
      ctx.fillStyle = color;
      const side = part === "wingLeft" ? -1 : 1;
      path([[0, -10], [side * 160, -92], [side * 126, 44], [side * 30, 28]]);
      ctx.strokeStyle = darken(color, 0.16);
      line(0, -10, side * 126, 44);
    }
    if (part === "arm") {
      ctx.fillStyle = color;
      roundRect(-12, -14, 72, 28, 14, color);
      ctx.fillStyle = "#fff4d2";
      circle(58, -1, 7);
    }
    if (part === "legBack" || part === "legFront") {
      ctx.fillStyle = color;
      const offset = part === "legBack" ? -55 : 45;
      roundRect(offset - 24, -12, 52, 104, 24, color);
      ctx.fillStyle = darken(color, 0.08);
      ellipse(offset + 14, 88, 42, 18);
    }
    ctx.restore();
  }

  function partTargets(dino, origin, scale) {
    const generic = {
      body: [0, 0], tail: [-170, 26], clubTail: [-170, 26], head: [168, -55],
      legBack: [-56, 78], legFront: [48, 78], arm: [88, 8],
      frill: [123, -72], plates: [0, -16], armor: [0, -8], spikes: [0, -18], egg: [-18, 18],
      neck: [126, -82], crest: [168, -88], wingLeft: [-78, -20], wingRight: [78, -20]
    };
    if (dino.id === "pterodactyl") {
      generic.body = [0, 10]; generic.head = [92, -38]; generic.legFront = [18, 62]; generic.crest = [98, -56];
    }
    if (dino.id === "baby") {
      generic.egg = [-42, 42]; generic.body = [12, 0]; generic.head = [136, -52]; generic.tail = [-128, 24];
      generic.legBack = [-38, 74]; generic.legFront = [52, 74];
    }
    const result = {};
    Object.entries(generic).forEach(([key, value]) => {
      result[key] = { x: origin.x + value[0] * scale, y: origin.y + value[1] * scale };
    });
    return result;
  }

  function boardRect() {
    const landscape = innerWidth >= innerHeight;
    return landscape
      ? { x: innerWidth * 0.32, y: innerHeight * 0.18, w: innerWidth * 0.62, h: innerHeight * 0.68 }
      : { x: innerWidth * 0.05, y: innerHeight * 0.26, w: innerWidth * 0.9, h: innerHeight * 0.46 };
  }

  function pointerDown(event) {
    const pos = getPointer(event);
    if (state.scene === "puzzle") {
      const hit = state.pieces.slice().reverse().find(piece => !piece.placed && distance(pos, piece) < pieceRadius() * 1.25);
      if (hit) {
        event.preventDefault();
        state.active = hit;
        state.pointerOffset = { x: hit.x - pos.x, y: hit.y - pos.y };
        audio.pickup();
      }
    }
    if (state.scene === "celebrate") {
      const hit = state.poppers.find(pop => !pop.popped && distance(pos, pop) < pop.r * 1.35);
      if (hit) {
        hit.popped = true;
        audio.pop();
      }
    }
  }

  function pointerMove(event) {
    if (!state.active) return;
    event.preventDefault();
    const pos = getPointer(event);
    state.active.x = pos.x + state.pointerOffset.x;
    state.active.y = pos.y + state.pointerOffset.y;
  }

  function pointerUp(event) {
    if (!state.active) return;
    event.preventDefault();
    const piece = state.active;
    state.active = null;
    if (distance(piece, piece.target) < pieceRadius() * 1.25) {
      piece.x = piece.target.x;
      piece.y = piece.target.y;
      piece.placed = true;
      piece.snap = 1;
      state.stars.push(...makeStars(piece.x, piece.y));
      audio.snap();
      if (state.pieces.every(item => item.placed)) completePuzzle();
    } else {
      piece.shake = 1;
      piece.returning = { x: piece.x, y: piece.y, start: performance.now() };
      audio.wrong();
    }
  }

  function completePuzzle() {
    const dino = dinos[state.level];
    state.completed = Array.from(new Set([...state.completed, dino.id]));
    state.completedBounce = 1;
    save();
    audio.celebrate();
    setTimeout(showCelebrate, 900);
  }

  function nextLevel() {
    state.level += 1;
    if (state.level >= dinos.length) {
      state.level = 0;
      save();
      showFinal();
    } else {
      save();
      showPuzzle(state.level);
    }
  }

  function updatePieceMotion(piece) {
    if (piece.returning) {
      const t = clamp((performance.now() - piece.returning.start) / 360, 0, 1);
      const eased = easeOutBack(Math.min(t, 1));
      piece.x = lerp(piece.returning.x, piece.start.x, eased);
      piece.y = lerp(piece.returning.y, piece.start.y, eased);
      if (t >= 1) piece.returning = null;
    }
    piece.shake *= 0.86;
    piece.snap *= 0.86;
  }

  function drawTargetGlow(target, near, color) {
    ctx.fillStyle = near ? hexAlpha(color, 0.45) : hexAlpha(color, 0.18 + Math.sin(state.time * 3) * 0.05);
    circle(target.x, target.y, pieceRadius() * (near ? 0.72 : 0.55));
  }

  function drawStars() {
    state.stars.forEach(star => {
      star.life += 0.04;
      star.x += star.vx;
      star.y += star.vy;
      ctx.globalAlpha = Math.max(0, 1 - star.life);
      ctx.fillStyle = "#fff17a";
      starShape(star.x, star.y, 9 + star.life * 10);
      ctx.globalAlpha = 1;
    });
    state.stars = state.stars.filter(star => star.life < 1);
  }

  function drawConfetti() {
    if (prefersReducedMotion) return;
    state.confetti.forEach(piece => {
      piece.y += piece.speed;
      piece.spin += 0.08;
      if (piece.y > innerHeight + 20) piece.y = -20;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.spin);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    });
  }

  function drawPoppers() {
    state.poppers.forEach(pop => {
      if (pop.popped) {
        pop.alpha -= 0.055;
        pop.scale += 0.08;
      } else if (!prefersReducedMotion) {
        pop.y -= Math.sin(state.time * 1.8 + pop.x) * 0.08;
      }
      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.fillStyle = pop.color;
      circle(pop.x, pop.y, pop.r * pop.scale);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      circle(pop.x - pop.r * 0.3, pop.y - pop.r * 0.32, pop.r * 0.18);
      ctx.globalAlpha = 1;
    });
  }

  function makeStars(x, y) {
    return Array.from({ length: prefersReducedMotion ? 3 : 8 }, (_, i) => {
      const angle = i / 8 * Math.PI * 2;
      return { x, y, vx: Math.cos(angle) * random(1, 3), vy: Math.sin(angle) * random(1, 3), life: 0 };
    });
  }

  function makeConfetti() {
    return Array.from({ length: prefersReducedMotion ? 0 : 70 }, () => ({
      x: random(0, innerWidth),
      y: random(-innerHeight, innerHeight * 0.7),
      speed: random(1.2, 3.4),
      spin: random(0, 6),
      color: ["#ff8fa3", "#ffd166", "#7bdff2", "#98f5a4", "#cdb4db"][Math.floor(random(0, 5))]
    }));
  }

  function getPointer(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pieceRadius() {
    return Math.min(innerWidth, innerHeight) * 0.115;
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,.86)";
    circle(x, y, 34 * s); circle(x + 38 * s, y - 15 * s, 42 * s); circle(x + 82 * s, y, 34 * s);
    roundRect(x - 12 * s, y, 112 * s, 30 * s, 15 * s, "rgba(255,255,255,.86)");
  }

  function drawVolcano(x, y, s) {
    ctx.fillStyle = "#8a7862";
    pathAbs([[x - s * 0.32, y], [x, y - s * 0.55], [x + s * 0.34, y]]);
    ctx.fillStyle = "#ff745b";
    pathAbs([[x - s * 0.08, y - s * 0.43], [x, y - s * 0.55], [x + s * 0.08, y - s * 0.43]]);
  }

  function drawPalm(x, y, s) {
    roundRect(x - 10 * s, y - 118 * s, 20 * s, 118 * s, 10 * s, "#9b6b3d");
    ctx.fillStyle = "#2fae5a";
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ellipse(x + Math.cos(a) * 35 * s, y - 125 * s + Math.sin(a) * 22 * s, 52 * s, 15 * s);
    }
  }

  function drawRocks() {
    ctx.fillStyle = "#7d8f75";
    ellipse(innerWidth * 0.18, innerHeight * 0.9, 48, 20);
    ellipse(innerWidth * 0.78, innerHeight * 0.91, 62, 24);
  }

  function cloudShift(seed) {
    return prefersReducedMotion ? 0 : state.time * (8 + seed * 4);
  }

  function blob(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function path(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function pathAbs(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
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

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function eye(x, y) {
    ctx.fillStyle = "#24343b";
    circle(x, y, 8);
    ctx.fillStyle = "#ffffff";
    circle(x + 3, y - 3, 2.5);
  }

  function smile(x, y) {
    ctx.strokeStyle = "#24343b";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0.25, Math.PI - 0.1);
    ctx.stroke();
  }

  function teeth() {
    ctx.fillStyle = "#ffffff";
    path([[62, 30], [72, 48], [80, 30]]);
    path([[86, 24], [96, 42], [104, 22]]);
  }

  function horn(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1 - 9, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1 + 9, y1);
    ctx.closePath();
    ctx.fill();
  }

  function starShape(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(a) * radius;
      const py = y + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function text(value, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }

  function shakeOffset(piece) {
    return piece.shake > 0.04 ? Math.sin(state.time * 55) * 9 * piece.shake : 0;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
  }

  function hexAlpha(hex, alpha) {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${alpha})`;
  }

  function darken(hex, amount) {
    const c = hexToRgb(hex);
    return `rgb(${Math.round(c.r * (1 - amount))},${Math.round(c.g * (1 - amount))},${Math.round(c.b * (1 - amount))})`;
  }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", pointerUp);
  window.addEventListener("resize", resize);

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("./sw.js", { scope: "./" }));
  }

  load();
  resize();
  showHome();
  requestAnimationFrame(draw);
})();
