# Starforge Echoes

**A deterministic, offline-first browser roguelike.** Descend into a shifting starforge, outmaneuver its guardians, recover enough star cores to open the gate, and carry your score into the next sector.

> This is a playable prototype. Its combat, procedural sectors, run controls, seeded generation, and replay tools are implemented. Persistent saves, inventory, and additional enemy types are future work.

## Play locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite and choose **Begin run**. To build and preview a production bundle:

```bash
npm run build
npm run preview
```

The game runs locally in the browser. It has no runtime server or account requirement. Audio is synthesized by the browser and starts after your first interaction.

## Play online

The game is live on [GitHub Pages](https://frenklik.github.io/starforge-echoes/). Each push to `main` runs the tests, builds the site, and deploys the `dist` folder.

## Controls

| Action | Default key |
| --- | --- |
| Move | W / A / S / D |
| Strike | Space |
| Pause or resume | Escape |

Use **Remap keys** in the run console to change the bindings. Run tools and developer settings are in the side panel.

## Run tools

- Enter any seed to replay the same procedural first sector.
- Load the daily seed for a shared starting map.
- Record a run, copy its replay JSON, and paste it into **Replay data** to play it back. Sector changes are included in the replay.
- Toggle the path grid and live state, or show the performance readout.

The exit activates after you collect the required share of cores in a sector. Reach it to continue with your score and the next deterministic sector.

## Tests

```bash
npm test
```

The Vitest suite covers deterministic generation and simulation, walkable routes, sector objectives, and replay validation.

## Structure

```text
src/core/   Seeded generation, simulation, pathfinding, replay, and audio
src/ui/     Canvas renderer and keyboard input
tests/      Core system tests
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for system boundaries and determinism details. The project uses Vite for local development and bundling, and Vitest for tests; neither is required to play a built static bundle.

## License

MIT. See [`LICENSE`](LICENSE).
