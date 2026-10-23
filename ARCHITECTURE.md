# Starforge Echoes architecture

Starforge Echoes is a single-player, offline-first browser game. Its simulation uses seeded randomness and fixed time steps so a recorded sequence of inputs can be replayed from the same seed.

## Runtime flow

`src/main.js` owns the browser loop, HUD, run tools, and input/replay orchestration. It advances simulation at 60 ticks per second and renders the latest state into a canvas.

The game is separated into three layers:

- **Core (`src/core/`)** — seeded random generation, map connectivity, entity state, combat, movement, objectives, sector transitions, pathfinding, replay validation, and synthesized audio.
- **UI (`src/ui/`)** — keyboard state and canvas rendering. The renderer reads the ECS component maps and does not decide game rules.
- **Tests (`tests/`)** — deterministic checks of generation, routes, progression, simulation, and replay data.

## Determinism

- A sector map is generated from the run seed and sector number.
- The simulation uses a fixed `1/60` second step.
- Gameplay randomness comes from `SeededRng`; presentation particles are cosmetic and use independent randomness.
- Replay input events are timestamped on the run clock. Sector transitions are recorded as explicit events.

## Entity model

`src/core/world.js` stores entity IDs and component maps. Systems read and update only the components they need. The renderer maps components to presentation, while the simulation owns collision, combat, pickups, and gate state.

## Development tools

The browser console provides a path grid and state overlay, a frame/entity readout, seed selection, key remapping, and replay recording/playback. Vite serves and bundles the static app; Vitest runs the core test suite.
