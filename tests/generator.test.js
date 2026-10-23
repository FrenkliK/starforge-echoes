import { describe, it, expect } from "vitest";
import { generateLevel, TILE } from "../src/core/generator.js";
import { findPath } from "../src/core/pathfinding.js";

const options = { width: 40, height: 25, roomCount: 8 };

describe("generateLevel", () => {
  it("generates identical sectors from the same seed", () => {
    const levelA = generateLevel({ seed: "delta", ...options });
    const levelB = generateLevel({ seed: "delta", ...options });
    expect(levelA.tiles).toEqual(levelB.tiles);
    expect(levelA.spawn).toEqual(levelB.spawn);
    expect(levelA.exit).toEqual(levelB.exit);
    expect(levelA.enemySpawns).toEqual(levelB.enemySpawns);
    expect(levelA.pickupSpawns).toEqual(levelB.pickupSpawns);
    expect(levelA.enemySpawns.length).toBeLessThanOrEqual(5);
    expect(levelA.enemySpawns.every((spawn) => Math.hypot(spawn.x - levelA.spawn.x, spawn.y - levelA.spawn.y) >= 6)).toBe(true);
  });

  it("keeps the entrance and exit connected by walkable ground", () => {
    const level = generateLevel({ seed: "path-check", ...options });
    const path = findPath(level, {
      x: Math.floor(level.spawn.x),
      y: Math.floor(level.spawn.y)
    }, {
      x: Math.floor(level.exit.x),
      y: Math.floor(level.exit.y)
    });

    expect(path).not.toBeNull();
    expect(level.tiles[Math.floor(level.exit.y) * level.width + Math.floor(level.exit.x)]).toBe(TILE.EXIT);
    expect(level.spawn.x % 1).toBe(0.5);
    expect(level.exit.y % 1).toBe(0.5);
  });

  it("always provides a core objective when the level has more than one room", () => {
    const level = generateLevel({ seed: "core-check", ...options });
    expect(level.pickupSpawns.length).toBeGreaterThan(0);
  });

  it("keeps generated sectors walkable across a range of seeds", () => {
    for (let index = 0; index < 24; index += 1) {
      const level = generateLevel({ seed: `route-${index}`, ...options });
      const route = findPath(level, {
        x: Math.floor(level.spawn.x),
        y: Math.floor(level.spawn.y)
      }, {
        x: Math.floor(level.exit.x),
        y: Math.floor(level.exit.y)
      });

      expect(route, `seed route-${index}`).not.toBeNull();
      expect(level.enemySpawns.every((spawn) => Math.hypot(spawn.x - level.spawn.x, spawn.y - level.spawn.y) >= 6)).toBe(true);
      expect(level.pickupSpawns.every((spawn) => level.tiles[Math.floor(spawn.y) * level.width + Math.floor(spawn.x)] !== TILE.WALL)).toBe(true);
    }
  });
});
