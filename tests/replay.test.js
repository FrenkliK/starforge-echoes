import { describe, it, expect } from "vitest";
import { createReplay, recordEvent, serializeReplay, parseReplay, createReplayPlayer } from "../src/core/replay.js";

describe("replay data", () => {
  it("round trips ordered input and sector events", () => {
    const replay = createReplay("seed-42");
    recordEvent(replay, 0.2, { type: "keydown", code: "KeyD" });
    recordEvent(replay, 0.8, { type: "keyup", code: "KeyD" });
    recordEvent(replay, 3.4, { type: "sector", sector: 2 });
    replay.duration = 4;

    const player = createReplayPlayer(parseReplay(serializeReplay(replay)));
    expect(player.nextEvents(0.5)).toHaveLength(1);
    expect(player.nextEvents(3.5).map((event) => event.type)).toEqual(["keyup", "sector"]);
    expect(player.isFinished()).toBe(true);
  });

  it("rejects malformed event order and unsupported event kinds", () => {
    const data = { seed: "s", duration: 2, events: [
      { time: 1, type: "keydown", code: "KeyW" },
      { time: 0.5, type: "keyup", code: "KeyW" }
    ] };
    expect(() => parseReplay(JSON.stringify(data))).toThrow(/ordered timestamps/);
    expect(() => parseReplay(JSON.stringify({ seed: "s", duration: 0, events: [{ time: 0, type: "exec" }] }))).toThrow(/unsupported event/);
    expect(() => parseReplay(JSON.stringify({ seed: "s", duration: 1, events: [{ time: 2, type: "keydown", code: "KeyW" }] }))).toThrow(/after the recorded duration/);
  });
});
