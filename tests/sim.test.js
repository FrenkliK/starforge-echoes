import { describe, it, expect } from "vitest";
import { SeededRng } from "../src/core/rng.js";
import { createGameState, stepSimulation, requiredPickupsForLevel } from "../src/core/sim.js";
import { createInputState, defaultBindings, updateInputState } from "../src/ui/input.js";

describe("simulation determinism", () => {
  it("keeps same player position for same inputs", () => {
    const seed = "omega";
    const stateA = createGameState({ seed });
    const stateB = createGameState({ seed });
    const rngA = new SeededRng(seed);
    const rngB = new SeededRng(seed);
    const inputA = createInputState(defaultBindings);
    const inputB = createInputState(defaultBindings);

    inputA.pressed.add(defaultBindings.right);
    inputB.pressed.add(defaultBindings.right);
    updateInputState(inputA);
    updateInputState(inputB);

    for (let i = 0; i < 60; i += 1) {
      stepSimulation(stateA, inputA, 1 / 60, rngA);
      stepSimulation(stateB, inputB, 1 / 60, rngB);
    }

    const playerA = [...stateA.world.components.player.keys()][0];
    const playerB = [...stateB.world.components.player.keys()][0];
    const posA = stateA.world.components.position.get(playerA);
    const posB = stateB.world.components.position.get(playerB);
    expect(posA).toEqual(posB);
  });

  it("starts later sectors with the same run seed and carries the sector index", () => {
    const first = createGameState({ seed: "delta" });
    const next = createGameState({ seed: "delta", sector: 2 });
    expect(first.sector).toBe(1);
    expect(next.sector).toBe(2);
    expect(first.level.tiles).not.toEqual(next.level.tiles);
  });

  it("opens the exit after the required cores are gathered", () => {
    const state = createGameState({ seed: "gate-check" });
    const exitId = [...state.world.components.exit.keys()][0];
    const exitData = state.world.components.exit.get(exitId);
    const exitPos = state.world.components.position.get(exitId);
    const playerId = [...state.world.components.player.keys()][0];
    const playerPos = state.world.components.position.get(playerId);
    const required = requiredPickupsForLevel(state.level);
    state.pickups = required;
    playerPos.x = exitPos.x;
    playerPos.y = exitPos.y;

    const result = stepSimulation(state, { move: { x: 0, y: 0 }, attack: false }, 1 / 60, new SeededRng("gate-check"));

    expect(exitData.active).toBe(true);
    expect(state.status).toBe("won");
    expect(result.events.some((event) => event.type === "win")).toBe(true);
  });
});
