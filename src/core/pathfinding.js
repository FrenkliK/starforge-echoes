import { TILE } from "./generator.js";

export const findPath = ({ tiles, width, height }, start, goal) => {
  const queue = [start];
  const cameFrom = new Map();
  const key = (pos) => `${pos.x},${pos.y}`;
  const startKey = key(start);
  cameFrom.set(startKey, null);

  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.x === goal.x && current.y === goal.y) {
      const path = [];
      let cursor = key(current);
      while (cursor) {
        const [x, y] = cursor.split(",").map(Number);
        path.unshift({ x, y });
        cursor = cameFrom.get(cursor);
      }
      return path;
    }

    for (const dir of dirs) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      if (tiles[next.y * width + next.x] === TILE.WALL) continue;
      const nextKey = key(next);
      if (cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, key(current));
      queue.push(next);
    }
  }

  return null;
};
