import { SeededRng } from "./rng.js";

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  EXIT: 2
};

const carveRoom = (tiles, width, height, room) => {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      tiles[y * width + x] = TILE.FLOOR;
    }
  }
};

const carveLine = (tiles, width, height, x0, y0, x1, y1) => {
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    tiles[y * width + x] = TILE.FLOOR;
    if (x < x1) x += 1;
    else if (x > x1) x -= 1;
    else if (y < y1) y += 1;
    else if (y > y1) y -= 1;
  }
  tiles[y * width + x] = TILE.FLOOR;
};

export const generateLevel = ({ seed, width, height, roomCount }) => {
  const rng = new SeededRng(seed);
  const tiles = Array.from({ length: width * height }, () => TILE.WALL);
  const rooms = [];

  for (let i = 0; i < roomCount; i += 1) {
    let room = null;
    for (let attempt = 0; attempt < 48 && room === null; attempt += 1) {
      const w = rng.int(5, 10);
      const h = rng.int(5, 9);
      const x = rng.int(2, width - w - 3);
      const y = rng.int(2, height - h - 3);
      const candidate = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
      const overlaps = rooms.some((other) =>
        candidate.x < other.x + other.w + 1
        && candidate.x + candidate.w + 1 > other.x
        && candidate.y < other.y + other.h + 1
        && candidate.y + candidate.h + 1 > other.y
      );
      if (!overlaps) room = candidate;
    }
    if (room === null) continue;
    carveRoom(tiles, width, height, room);
    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      if (rng.next() > 0.5) {
        carveLine(tiles, width, height, prev.cx, prev.cy, room.cx, prev.cy);
        carveLine(tiles, width, height, room.cx, prev.cy, room.cx, room.cy);
      } else {
        carveLine(tiles, width, height, prev.cx, prev.cy, prev.cx, room.cy);
        carveLine(tiles, width, height, prev.cx, room.cy, room.cx, room.cy);
      }
    }
    rooms.push(room);
  }

  if (rooms.length === 0) throw new Error("Level dimensions are too small for room generation");
  const startRoom = rooms[0];
  const exitRoom = rooms[rooms.length - 1];
  tiles[exitRoom.cy * width + exitRoom.cx] = TILE.EXIT;

  const spawn = { x: startRoom.cx + 0.5, y: startRoom.cy + 0.5 };
  const exit = { x: exitRoom.cx + 0.5, y: exitRoom.cy + 0.5 };

  const enemySpawns = rooms.slice(1).flatMap((room) => {
    if (Math.hypot(room.cx - startRoom.cx, room.cy - startRoom.cy) < 7) return [];
    const spawn = {
      x: rng.int(room.x + 1, room.x + room.w - 2) + 0.5,
      y: rng.int(room.y + 1, room.y + room.h - 2) + 0.5
    };
    if (Math.hypot(spawn.x - startRoom.cx - 0.5, spawn.y - startRoom.cy - 0.5) < 6) {
      spawn.x = room.cx + 0.5;
      spawn.y = room.cy + 0.5;
    }
    return [spawn];
  }).slice(0, 5);
  if (enemySpawns.length === 0 && rooms.length > 1) {
    const farthestRoom = rooms.slice(1).reduce((farthest, room) =>
      Math.hypot(room.cx - startRoom.cx, room.cy - startRoom.cy) > Math.hypot(farthest.cx - startRoom.cx, farthest.cy - startRoom.cy)
        ? room
        : farthest
    );
    enemySpawns.push({ x: farthestRoom.cx + 0.5, y: farthestRoom.cy + 0.5 });
  }

  const pickupSpawns = rooms.slice(1).filter(() => rng.next() > 0.4).map((room) => ({
    x: rng.int(room.x + 1, room.x + room.w - 2) + 0.5,
    y: rng.int(room.y + 1, room.y + room.h - 2) + 0.5
  }));

  if (rooms.length > 1 && pickupSpawns.length === 0) {
    const room = rooms[1];
    pickupSpawns.push({ x: room.cx + 0.5, y: room.cy + 0.5 });
  }

  return {
    tiles,
    width,
    height,
    spawn,
    exit,
    enemySpawns,
    pickupSpawns
  };
};
