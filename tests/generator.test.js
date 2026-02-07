import { describe, it, expect } from "vitest";
import { generateLevel } from "../src/core/generator.js";

describe("generateLevel", () => {
  it("generates identical maps for same seed", () => {
    const levelA = generateLevel({ seed: "delta", width: 20, height: 15, roomCount: 5 });
    const levelB = generateLevel({ seed: "delta", width: 20, height: 15, roomCount: 5 });
    expect(levelA.tiles).toEqual(levelB.tiles);
    expect(levelA.spawn).toEqual(levelB.spawn);
    expect(levelA.exit).toEqual(levelB.exit);
  });
});
