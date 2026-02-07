import { describe, it, expect } from "vitest";
import { SeededRng } from "../src/core/rng.js";
import { createGameState, stepSimulation } from "../src/core/sim.js";
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
});
