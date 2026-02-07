# Starforge Echoes

A single-player, deterministic roguelike about diving into a shattered starforge. Explore procedurally generated sectors, defeat guardians, gather star cores, and escape through the stabilizing portal. The entire experience runs offline in the browser with procedural visuals and synth audio.

## Features
- **Deterministic procedural runs** with a seeded RNG and replayable input log.
- **Satisfying loop**: explore → fight → collect cores → unlock the exit.
- **Juice**: particles, responsive controls, animated pickups, and synth audio.
- **Built-in devtools**: debug overlay, performance HUD, and replay viewer.

## Controls
- Move: `W` `A` `S` `D`
- Attack: `Space`
- Pause: `Escape`
- Remap controls in the right-hand panel.

## How to Run
```bash
npm install
npm run dev
```
Then open the local URL printed by Vite (defaults to `http://localhost:5173`).

## How to Run Tests
```bash
npm test
```

## Changing the Seed / Replaying a Run
- **Change seed:** enter a seed in the “Run Tools” panel and click **Apply Seed** (or use **Seed of the Day**).
- **Record replay:** click **Start Recording**, play, then click **Stop & Copy** to copy replay JSON.
- **Replay:** paste JSON into the replay box and click **Play Replay**.

## Devtools
- **Debug Overlay:** toggle to see grid, player stats, and live state.
- **Performance HUD:** FPS + entity count display.

## Dependencies
- **Vite** — lightweight dev server and bundler for a fast offline dev loop.
- **Vitest** — fast, Vite-compatible unit tests for deterministic logic.

## Troubleshooting
- **Blank screen or no audio:** Some browsers block audio until the first interaction. Click the canvas or press a key to unlock audio.
- **Port already in use:** Run `npm run dev -- --port 5174` to choose a different port.
- **Replay JSON error:** Ensure the JSON is complete and not truncated when copying.

## License
MIT (see LICENSE if added later).
