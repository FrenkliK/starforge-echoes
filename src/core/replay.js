export const createReplay = (seed) => ({
  seed,
  startTime: 0,
  events: [],
  duration: 0
});

export const recordEvent = (replay, time, event) => {
  replay.events.push({ time, ...event });
  replay.duration = Math.max(replay.duration, time);
};

export const serializeReplay = (replay) => JSON.stringify(replay, null, 2);

export const parseReplay = (raw) => {
  if (typeof raw !== "string" || raw.length > 1_000_000) {
    throw new Error("Replay data must be text under 1 MB");
  }
  const data = JSON.parse(raw);
  if (typeof data.seed !== "string" || !data.seed.trim() || !Array.isArray(data.events)) {
    throw new Error("Invalid replay format");
  }
  if (!Number.isFinite(data.duration) || data.duration < 0 || data.events.length > 100_000) {
    throw new Error("Replay duration or event count is invalid");
  }
  let previousTime = -1;
  for (const event of data.events) {
    if (!event || !Number.isFinite(event.time) || event.time < previousTime || event.time < 0) {
      throw new Error("Replay events must have valid, ordered timestamps");
    }
    if (event.time > data.duration) {
      throw new Error("Replay event occurs after the recorded duration");
    }
    if (event.type === "keydown" || event.type === "keyup") {
      if (typeof event.code !== "string" || !event.code || event.code.length > 40) {
        throw new Error("Replay contains an invalid key event");
      }
    } else if (event.type === "sector") {
      if (!Number.isInteger(event.sector) || event.sector < 2 || event.sector > 999_999) {
        throw new Error("Replay contains an invalid sector transition");
      }
    } else {
      throw new Error("Replay contains an unsupported event");
    }
    previousTime = event.time;
  }
  return data;
};

export const createReplayPlayer = (replay) => {
  let index = 0;
  return {
    seed: replay.seed,
    reset: () => {
      index = 0;
    },
    nextEvents: (time) => {
      const events = [];
      while (index < replay.events.length && replay.events[index].time <= time) {
        events.push(replay.events[index]);
        index += 1;
      }
      return events;
    },
    isFinished: () => index >= replay.events.length
  };
};
