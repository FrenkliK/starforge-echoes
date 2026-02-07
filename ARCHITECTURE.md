# Starforge Echoes Architecture

## Overview
Starforge Echoes is a deterministic, offline-first browser game. The codebase separates core simulation (pure logic + deterministic RNG) from rendering and UI. This makes the game testable, replayable, and stable across runs.

## Core Systems
- **Seeded RNG (`src/core/rng.js`)**: deterministic RNG used for generation and AI variance. Supports daily seed generation.
- **Procedural Generation (`src/core/generator.js`)**: room-and-corridor dungeon layout, spawn points, pickups, and exit placement.
- **ECS World (`src/core/world.js`)**: entities are IDs; components are Maps for fast iteration and clean system boundaries.
- **Simulation (`src/core/sim.js`)**:
  - Fixed timestep updates.
  - Player movement/attacks.
  - Enemy AI with lightweight pathfinding.
  - Pickup/exit logic and win/lose states.
- **Pathfinding (`src/core/pathfinding.js`)**: BFS-based grid path to chase the player.
- **Replay (`src/core/replay.js`)**: input events are recorded and can be replayed deterministically.

## UI + Presentation
- **Renderer (`src/ui/render.js`)**: canvas drawing for tiles, entities, particles, and debug grid.
- **Input (`src/ui/input.js`)**: binding-aware input state, remappable controls, and replay injection.
- **Audio (`src/core/audio.js`)**: synth-based WebAudio tones for combat/pickups.

## Determinism Strategy
- All randomness in generation and AI uses `SeededRng` seeded at the start of a run.
- The game uses a fixed timestep (`1/60s`) for simulation updates.
- Replays log input events with timestamps; replays feed inputs back at the same timestamps.

## Devtools
- **Debug Overlay**: live state + optional grid.
- **Performance HUD**: FPS and entity count.
- **Replay Viewer**: record, export, and load replays from JSON.
