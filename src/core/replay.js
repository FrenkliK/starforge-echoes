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
  const data = JSON.parse(raw);
  if (!data.seed || !Array.isArray(data.events)) {
    throw new Error("Invalid replay format");
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
    }
  };
};
