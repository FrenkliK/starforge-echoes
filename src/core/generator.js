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
    const w = rng.int(5, 10);
    const h = rng.int(5, 9);
    const x = rng.int(2, width - w - 3);
    const y = rng.int(2, height - h - 3);
    const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
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

  const startRoom = rooms[0];
  const exitRoom = rooms[rooms.length - 1];
  tiles[exitRoom.cy * width + exitRoom.cx] = TILE.EXIT;

  const spawn = { x: startRoom.cx, y: startRoom.cy };
  const exit = { x: exitRoom.cx, y: exitRoom.cy };

  const enemySpawns = rooms.slice(1).map((room) => ({
    x: rng.int(room.x + 1, room.x + room.w - 2),
    y: rng.int(room.y + 1, room.y + room.h - 2)
  }));

  const pickupSpawns = rooms.slice(1).filter(() => rng.next() > 0.4).map((room) => ({
    x: rng.int(room.x + 1, room.x + room.w - 2),
    y: rng.int(room.y + 1, room.y + room.h - 2)
  }));

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
