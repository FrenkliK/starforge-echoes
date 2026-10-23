import { SeededRng, seedOfDay } from "./core/rng.js";
import { createGameState, stepSimulation, GAME_CONFIG, requiredPickupsForLevel } from "./core/sim.js";
import { AudioBus } from "./core/audio.js";
import { createReplay, recordEvent, serializeReplay, parseReplay, createReplayPlayer } from "./core/replay.js";
import { createInputState, updateInputState, applyInputEvent, defaultBindings } from "./ui/input.js";
import { createRenderer, renderFrame, spawnParticles } from "./ui/render.js";

const byId = (id) => document.getElementById(id);
const canvas = byId("game");
const seedLabel = byId("seed-label");
const floorLabel = byId("floor-label");
const runStatus = byId("run-status");
const statusDot = byId("status-dot");
const pauseBtn = byId("pause-btn");
const restartBtn = byId("restart-btn");
const overlay = byId("overlay");
const overlayTitle = byId("overlay-title");
const overlayBody = byId("overlay-body");
const overlayResume = byId("overlay-resume");
const overlayRestart = byId("overlay-restart");
const overlayNext = byId("overlay-next");
const controlsList = byId("controls-list");
const remapBtn = byId("remap-btn");
const seedInput = byId("seed-input");
const seedApply = byId("seed-apply");
const seedDaily = byId("seed-daily");
const replayData = byId("replay-data");
const replayRecord = byId("replay-record");
const replayStop = byId("replay-stop");
const replayPlay = byId("replay-play");
const toggleDebug = byId("toggle-debug");
const togglePerf = byId("toggle-perf");
const perfHud = byId("perf");
const debugHud = byId("debug");
const healthLabel = byId("health-label");
const healthBar = byId("health-bar");
const coreLabel = byId("core-label");
const scoreLabel = byId("score-label");
const objectiveLabel = byId("objective-label");

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
let isRemapping = false;
let remapKeyHandler = null;
let hasStartedRun = false;
let pauseLatch = false;
let perfState = { frames: 0, last: performance.now(), fps: 0 };
const debugState = { enabled: false };

const startNewRun = (seed, sector = 1, score = 0, elapsed = 0) => {
  rng = new SeededRng(`${seed}:sector:${sector}`);
  gameState = createGameState({ seed, sector });
  gameState.score = score;
  gameState.elapsed = elapsed;
  inputState = createInputState(bindings);
  pauseLatch = false;
  accumulator = 0;
  updateHud();
  updatePauseButton();
};

const requiredCores = () => requiredPickupsForLevel(gameState.level);

const updateHud = () => {
  seedLabel.textContent = `SEED ${gameState.seed}`;
  floorLabel.textContent = `SECTOR ${String(gameState.sector).padStart(2, "0")}`;
  seedInput.value = gameState.seed;
  updateRunStats();
};

const updateRunStats = () => {
  if (!gameState) return;
  const statusLabels = { playing: "RUN IN PROGRESS", paused: "RUN PAUSED", won: "SECTOR CLEARED", lost: "RUN ENDED" };
  runStatus.textContent = statusLabels[gameState.status] || "RUN IN PROGRESS";
  statusDot.classList.toggle("status-dot--paused", gameState.status === "paused");
  statusDot.classList.toggle("status-dot--ended", gameState.status === "won" || gameState.status === "lost");
  const playerId = [...gameState.world.components.player.keys()][0];
  const health = gameState.world.components.health.get(playerId);
  const ratio = Math.max(0, Math.min(1, health.hp / health.max));
  const required = requiredCores();
  healthLabel.innerHTML = `${Math.ceil(Math.max(0, health.hp))} <small>/ ${health.max}</small>`;
  healthBar.style.width = `${ratio * 100}%`;
  healthBar.classList.toggle("health-track__fill--critical", ratio <= 0.3);
  coreLabel.innerHTML = `${gameState.pickups} <small>/ ${required} required</small>`;
  scoreLabel.textContent = String(gameState.score).padStart(5, "0");
  objectiveLabel.textContent = required === 0
    ? "Find the gate and move on"
    : `${Math.min(gameState.pickups, required)} of ${required} cores · clear the gate`;
};

const updatePauseButton = () => {
  pauseBtn.textContent = gameState?.status === "paused" ? "Resume" : "Pause";
};

const showOverlay = (title, body, mode = "pause") => {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayResume.textContent = hasStartedRun ? "Resume" : "Begin run";
  overlayResume.classList.toggle("hidden", mode !== "pause");
  overlayRestart.classList.toggle("hidden", mode !== "end");
  overlayNext.classList.toggle("hidden", mode !== "win");
  overlay.classList.remove("hidden");
};

const hideOverlay = () => overlay.classList.add("hidden");

const formatKey = (code) => ({
  Space: "SPACE",
  Escape: "ESC",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→"
}[code] || code.replace(/^Key/, "").replace(/^Digit/, ""));

const updateControlsList = () => {
  controlsList.replaceChildren();
  const entries = [
    ["Move up", bindings.up],
    ["Move down", bindings.down],
    ["Move left", bindings.left],
    ["Move right", bindings.right],
    ["Strike", bindings.attack],
    ["Pause", bindings.pause]
  ];
  for (const [label, key] of entries) {
    const li = document.createElement("li");
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    const keyNode = document.createElement("kbd");
    keyNode.textContent = formatKey(key);
    li.append(labelNode, keyNode);
    controlsList.append(li);
  }
};

const handleGameEvents = (events) => {
  for (const event of events) {
    if (event.type === "attack") audio.playAttack();
    if (event.type === "pickup") {
      audio.playPickup();
      spawnParticles(renderer, event.position, "#e3b876");
    }
    if (event.type === "enemy-down") spawnParticles(renderer, event.position, "#e27f68");
    if (event.type === "win") {
      audio.playWin();
      showOverlay(`Sector ${String(gameState.sector).padStart(2, "0")} cleared`, "The gate is stable. Carry your score into the next descent.", "win");
    }
    if (event.type === "lose") {
      audio.playLose();
      showOverlay("Run ended", "Your signal faded in the forge. Restart to take another route.", "end");
    }
  }
};

const advanceSector = (record = true, targetSector = gameState.sector + 1) => {
  if (record && isRecording && replay) {
    recordEvent(replay, gameState.elapsed, { type: "sector", sector: targetSector });
  }
  const { seed, score, elapsed } = gameState;
  startNewRun(seed, targetSector, score, elapsed);
  hideOverlay();
};

const loop = (time) => {
  const delta = Math.min((time - lastTime) / 1000, 0.1);
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
    perfHud.textContent = `FPS ${perfState.fps}  ·  ENTITIES ${gameState.world.entities.size}`;
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
        if (event.type === "sector" && gameState.status === "won") {
          advanceSector(false, event.sector);
        } else {
          applyInputEvent(inputState, event);
        }
      }
      if (replayPlayer.isFinished()) isReplaying = false;
    }

    updateInputState(inputState);
    if (!isReplaying && inputState.pause && !pauseLatch) {
      if (gameState.status === "playing") {
        gameState.status = "paused";
        showOverlay("Paused", "The forge will wait. Resume when you are ready.");
      } else if (gameState.status === "paused") {
        gameState.status = "playing";
        hideOverlay();
      }
      updatePauseButton();
    }
    pauseLatch = inputState.pause;
    const result = stepSimulation(gameState, inputState, fixedDt, rng);
    handleGameEvents(result.events);
    if (isRecording && replay) replay.duration = gameState.elapsed;
    accumulator -= fixedDt;
  }

  renderFrame(renderer, gameState, debugState);
  updateRunStats();
  const playerId = [...gameState.world.components.player.keys()][0];
  const playerPos = gameState.world.components.position.get(playerId);
  const health = gameState.world.components.health.get(playerId);
  debugHud.textContent = [
    `STATUS  ${gameState.status} · SECTOR ${gameState.sector}`,
    `INTEGRITY  ${Math.max(0, health.hp).toFixed(0)} / ${health.max}`,
    `SCORE  ${gameState.score}`,
    `CORES  ${gameState.pickups}`,
    `POSITION  ${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}`
  ].join("\n");

  requestAnimationFrame(loop);
};

const handleKeyEvent = (event) => {
  if (isReplaying || isRemapping || !event.code) return;
  if (event.type === "keydown" && event.target.closest?.("input, textarea, button, select, [contenteditable='true']")) return;
  if (event.type === "keydown" && inputState.pressed.has(event.code)) return;
  applyInputEvent(inputState, event);
  if (isRecording && replay) {
    recordEvent(replay, gameState.elapsed, { type: event.type, code: event.code });
  }
};

const setupBindings = () => {
  updateControlsList();
  remapBtn.addEventListener("click", () => {
    if (isRemapping) {
      document.removeEventListener("keydown", remapKeyHandler, true);
      remapKeyHandler = null;
      isRemapping = false;
      remapBtn.textContent = "Remap keys ↗";
      return;
    }
    const keys = Object.keys(bindings);
    let index = 0;
    isRemapping = true;
    inputState.pressed.clear();
    remapBtn.textContent = `Press key for ${keys[index]}`;
    const onKey = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === "Escape" && keys[index] !== "pause") {
        document.removeEventListener("keydown", onKey, true);
        remapKeyHandler = null;
        isRemapping = false;
        remapBtn.textContent = "Remap keys ↗";
        return;
      }
      const action = keys[index];
      const conflict = keys.find((key) => key !== action && bindings[key] === event.code);
      if (conflict) {
        remapBtn.textContent = `${formatKey(event.code)} is already used · try another`;
        return;
      }
      bindings[action] = event.code;
      index += 1;
      if (index >= keys.length) {
        document.removeEventListener("keydown", onKey, true);
        remapKeyHandler = null;
        isRemapping = false;
        remapBtn.textContent = "Remap keys ↗";
        saveBindings(bindings);
        updateControlsList();
        return;
      }
      remapBtn.textContent = `Press key for ${keys[index]}`;
    };
    remapKeyHandler = onKey;
    document.addEventListener("keydown", onKey, true);
  });
};

const resetReplayState = () => {
  isRecording = false;
  isReplaying = false;
  replayPlayer = null;
  replay = null;
  replayRecord.textContent = "Record";
  replayStop.disabled = true;
};

const setupUi = () => {
  pauseBtn.addEventListener("click", () => {
    if (gameState.status === "playing") {
      gameState.status = "paused";
      showOverlay("Paused", "The forge will wait. Resume when you are ready.");
    } else if (gameState.status === "paused") {
      gameState.status = "playing";
      hideOverlay();
    }
    updatePauseButton();
  });

  overlayResume.addEventListener("click", () => {
    hasStartedRun = true;
    if (gameState.status === "paused") gameState.status = "playing";
    updatePauseButton();
    hideOverlay();
    canvas.focus();
  });
  overlayRestart.addEventListener("click", () => {
    resetReplayState();
    startNewRun(gameState.seed);
    hideOverlay();
  });
  overlayNext.addEventListener("click", () => advanceSector());

  restartBtn.addEventListener("click", () => {
    resetReplayState();
    startNewRun(gameState.seed);
    hideOverlay();
  });

  seedApply.addEventListener("click", () => {
    const seed = seedInput.value.trim() || seedOfDay();
    resetReplayState();
    startNewRun(seed);
    hideOverlay();
  });

  seedDaily.addEventListener("click", () => {
    const seed = seedOfDay();
    resetReplayState();
    startNewRun(seed);
    hideOverlay();
  });

  replayRecord.addEventListener("click", () => {
    isReplaying = false;
    replayPlayer = null;
    isRecording = true;
    replay = createReplay(gameState.seed);
    replayRecord.textContent = "● Recording";
    replayStop.disabled = false;
    startNewRun(gameState.seed);
  });

  replayStop.addEventListener("click", async () => {
    if (!replay) return;
    isRecording = false;
    replayRecord.textContent = "Record";
    replayStop.disabled = true;
    replayData.value = serializeReplay(replay);
    try {
      await navigator.clipboard.writeText(replayData.value);
    } catch {
      showOverlay("Replay ready", "Your browser blocked clipboard access. Copy the replay JSON from the text area.", "pause");
    }
  });

  replayPlay.addEventListener("click", () => {
    try {
      const data = parseReplay(replayData.value);
      replayPlayer = createReplayPlayer(data);
      isReplaying = true;
      isRecording = false;
      replayRecord.textContent = "Record";
      replayStop.disabled = true;
      startNewRun(data.seed);
      hideOverlay();
    } catch (error) {
      showOverlay("Replay error", error.message, "end");
    }
  });
};

function loadBindings() {
  try {
    const stored = localStorage.getItem("bindings");
    if (!stored) return { ...defaultBindings };
    const parsed = JSON.parse(stored);
    const result = { ...defaultBindings, ...parsed };
    const values = Object.values(result);
    if (values.some((key) => typeof key !== "string" || !key) || new Set(values).size !== values.length) {
      return { ...defaultBindings };
    }
    return result;
  } catch {
    return { ...defaultBindings };
  }
}

const saveBindings = (data) => {
  try {
    localStorage.setItem("bindings", JSON.stringify(data));
  } catch {
    showOverlay("Keys updated", "Your browser blocked local storage. These keys will work until this page is closed.", "pause");
  }
};

const init = () => {
  canvas.width = GAME_CONFIG.width * GAME_CONFIG.tileSize;
  canvas.height = GAME_CONFIG.height * GAME_CONFIG.tileSize;
  replayStop.disabled = true;
  startNewRun(seedOfDay());
  setupBindings();
  setupUi();
  gameState.status = "paused";
  updatePauseButton();
  showOverlay("Ready to descend", "Move with WASD, strike with Space, and gather enough star cores to open the exit.");
  window.addEventListener("keydown", handleKeyEvent);
  window.addEventListener("keyup", handleKeyEvent);
  requestAnimationFrame((time) => {
    lastTime = time;
    requestAnimationFrame(loop);
  });
};

init();
