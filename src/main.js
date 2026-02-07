import { SeededRng, seedOfDay } from "./core/rng.js";
import { createGameState, stepSimulation, GAME_CONFIG } from "./core/sim.js";
import { AudioBus } from "./core/audio.js";
import { createReplay, recordEvent, serializeReplay, parseReplay, createReplayPlayer } from "./core/replay.js";
import { createInputState, updateInputState, applyInputEvent, defaultBindings } from "./ui/input.js";
import { createRenderer, renderFrame, spawnParticles } from "./ui/render.js";

const canvas = document.getElementById("game");
const seedLabel = document.getElementById("seed-label");
const floorLabel = document.getElementById("floor-label");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const overlayResume = document.getElementById("overlay-resume");
const controlsList = document.getElementById("controls-list");
const remapBtn = document.getElementById("remap-btn");
const seedInput = document.getElementById("seed-input");
const seedApply = document.getElementById("seed-apply");
const seedDaily = document.getElementById("seed-daily");
const replayData = document.getElementById("replay-data");
const replayRecord = document.getElementById("replay-record");
const replayStop = document.getElementById("replay-stop");
const replayPlay = document.getElementById("replay-play");
const toggleDebug = document.getElementById("toggle-debug");
const togglePerf = document.getElementById("toggle-perf");
const perfHud = document.getElementById("perf");
const debugHud = document.getElementById("debug");

const renderer = createRenderer(canvas);
const audio = new AudioBus();
let bindings = loadBindings();
let inputState = createInputState(bindings);
let gameState = null;
let rng = null;
let lastTime = 0;
let accumulator = 0;
let replay = null;
let replayPlayer = null;
let isRecording = false;
let isReplaying = false;
let pauseLatch = false;
let perfState = { frames: 0, last: performance.now(), fps: 0 };

const debugState = { enabled: false };

const startNewRun = (seed) => {
  rng = new SeededRng(seed);
  gameState = createGameState({ seed });
  updateHud();
  if (isRecording) {
    replay = createReplay(seed);
  }
  if (isReplaying && replayPlayer) {
    inputState = createInputState(bindings);
    replayPlayer.reset();
  }
};

const updateHud = () => {
  seedLabel.textContent = `Seed: ${gameState.seed}`;
  floorLabel.textContent = `Sector: 1`;
};

const showOverlay = (title, body) => {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlay.classList.remove("hidden");
};

const hideOverlay = () => {
  overlay.classList.add("hidden");
};

const updateControlsList = () => {
  controlsList.innerHTML = "";
  const entries = [
    ["Move Up", bindings.up],
    ["Move Down", bindings.down],
    ["Move Left", bindings.left],
    ["Move Right", bindings.right],
    ["Attack", bindings.attack],
    ["Pause", bindings.pause]
  ];
  for (const [label, key] of entries) {
    const li = document.createElement("li");
    li.textContent = `${label}: ${key}`;
    controlsList.appendChild(li);
  }
};

const handleGameEvents = (events) => {
  for (const event of events) {
    if (event.type === "attack") audio.playAttack();
    if (event.type === "pickup") {
      audio.playPickup();
      const pos = gameState.world.components.position.get(event.target);
      spawnParticles(renderer, pos, "#ffd166");
    }
    if (event.type === "enemy-down") {
      const pos = gameState.world.components.position.get(event.target);
      if (pos) spawnParticles(renderer, pos, "#ff6b6b");
    }
    if (event.type === "win") {
      audio.playWin();
      showOverlay("Sector Cleared", "Replay or restart to dive deeper into the starforge.");
    }
    if (event.type === "lose") {
      audio.playLose();
      showOverlay("Systems Failure", "Try a new seed and refine your tactics.");
    }
  }
};

const loop = (time) => {
  const delta = (time - lastTime) / 1000;
  lastTime = time;
  accumulator += delta;
  const fixedDt = 1 / 60;

  if (togglePerf.checked) {
    perfState.frames += 1;
    if (time - perfState.last > 1000) {
      perfState.fps = perfState.frames;
      perfState.frames = 0;
      perfState.last = time;
    }
    perfHud.textContent = `FPS: ${perfState.fps} | Entities: ${gameState.world.entities.size}`;
    perfHud.classList.remove("hidden");
  } else {
    perfHud.classList.add("hidden");
  }

  debugState.enabled = toggleDebug.checked;
  debugHud.classList.toggle("hidden", !debugState.enabled);

  while (accumulator >= fixedDt) {
    const stepTime = gameState.elapsed;
    if (isReplaying && replayPlayer) {
      const events = replayPlayer.nextEvents(stepTime);
      for (const event of events) {
        applyInputEvent(inputState, event);
      }
    }
    updateInputState(inputState);
    if (inputState.pause && !pauseLatch) {
      if (gameState.status === "playing") {
        gameState.status = "paused";
        showOverlay("Paused", "Take a breath. Resume when ready.");
      } else if (gameState.status === "paused") {
        gameState.status = "playing";
        hideOverlay();
      }
    }
    pauseLatch = inputState.pause;
    const result = stepSimulation(gameState, inputState, fixedDt, rng);
    handleGameEvents(result.events);
    if (isRecording && replay) {
      replay.duration = gameState.elapsed;
    }
    accumulator -= fixedDt;
  }

  renderFrame(renderer, gameState, debugState);
  const playerId = [...gameState.world.components.player.keys()][0];
  const playerPos = gameState.world.components.position.get(playerId);
  const health = gameState.world.components.health.get(playerId);
  debugHud.textContent = [
    `Status: ${gameState.status}`,
    `HP: ${Math.max(0, health.hp).toFixed(0)} / ${health.max}`,
    `Score: ${gameState.score}`,
    `Pickups: ${gameState.pickups}`,
    `Pos: ${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}`
  ].join("\n");

  requestAnimationFrame(loop);
};

const handleKeyEvent = (event) => {
  if (isReplaying) return;
  applyInputEvent(inputState, event);
  if (isRecording && replay) {
    recordEvent(replay, gameState.elapsed, { type: event.type, code: event.code });
  }
};

const setupBindings = () => {
  updateControlsList();
  remapBtn.addEventListener("click", () => {
    const keys = Object.keys(bindings);
    let index = 0;
    remapBtn.textContent = "Press key for Move Up";
    const onKey = (event) => {
      const action = keys[index];
      bindings[action] = event.code;
      index += 1;
      if (index >= keys.length) {
        document.removeEventListener("keydown", onKey);
        remapBtn.textContent = "Remap Controls";
        saveBindings(bindings);
        updateControlsList();
        return;
      }
      remapBtn.textContent = `Press key for ${keys[index]}`;
    };
    document.addEventListener("keydown", onKey, { once: false });
  });
};

const setupUi = () => {
  pauseBtn.addEventListener("click", () => {
    if (gameState.status === "playing") {
      gameState.status = "paused";
      showOverlay("Paused", "Take a breath. Resume when ready.");
    } else if (gameState.status === "paused") {
      gameState.status = "playing";
      hideOverlay();
    }
  });

  overlayResume.addEventListener("click", () => {
    if (gameState.status === "paused") gameState.status = "playing";
    hideOverlay();
  });

  restartBtn.addEventListener("click", () => {
    startNewRun(gameState.seed);
    hideOverlay();
  });

  seedApply.addEventListener("click", () => {
    const seed = seedInput.value.trim() || seedOfDay();
    startNewRun(seed);
    hideOverlay();
  });

  seedDaily.addEventListener("click", () => {
    const seed = seedOfDay();
    seedInput.value = seed;
    startNewRun(seed);
    hideOverlay();
  });

  replayRecord.addEventListener("click", () => {
    isRecording = true;
    replay = createReplay(gameState.seed);
  });

  replayStop.addEventListener("click", async () => {
    if (!replay) return;
    isRecording = false;
    replayData.value = serializeReplay(replay);
    try {
      await navigator.clipboard.writeText(replayData.value);
    } catch (error) {
      showOverlay("Clipboard", "Copy the replay JSON manually from the text area.");
    }
  });

  replayPlay.addEventListener("click", () => {
    try {
      const data = parseReplay(replayData.value);
      replayPlayer = createReplayPlayer(data);
      isReplaying = true;
      isRecording = false;
      startNewRun(data.seed);
    } catch (error) {
      showOverlay("Replay Error", error.message);
    }
  });
};

const loadBindings = () => {
  const stored = localStorage.getItem("bindings");
  if (!stored) return { ...defaultBindings };
  try {
    const parsed = JSON.parse(stored);
    return { ...defaultBindings, ...parsed };
  } catch (error) {
    return { ...defaultBindings };
  }
};

const saveBindings = (data) => {
  localStorage.setItem("bindings", JSON.stringify(data));
};

const init = () => {
  canvas.width = GAME_CONFIG.width * GAME_CONFIG.tileSize;
  canvas.height = GAME_CONFIG.height * GAME_CONFIG.tileSize;
  startNewRun(seedOfDay());
  setupBindings();
  setupUi();
  window.addEventListener("keydown", handleKeyEvent);
  window.addEventListener("keyup", handleKeyEvent);
  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(loop);
  });
};

init();
