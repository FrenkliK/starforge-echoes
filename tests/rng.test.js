import { describe, it, expect } from "vitest";
import { SeededRng } from "../src/core/rng.js";

describe("SeededRng", () => {
  it("produces deterministic sequences", () => {
    const rngA = new SeededRng("alpha");
    const rngB = new SeededRng("alpha");
    const seqA = Array.from({ length: 5 }, () => rngA.next());
    const seqB = Array.from({ length: 5 }, () => rngB.next());
    expect(seqA).toEqual(seqB);
  });
});
