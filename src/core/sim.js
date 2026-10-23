import { createWorld, createEntity, removeEntity } from "./world.js";
import { generateLevel, TILE } from "./generator.js";
import { findPath } from "./pathfinding.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const GAME_CONFIG = {
  width: 40,
  height: 25,
  roomCount: 8,
  tileSize: 24,
  player: {
    speed: 4.2,
    maxHealth: 100,
    attackCooldown: 0.5,
    attackRange: 1.2,
    damage: 25
  },
  enemy: {
    speed: 2.6,
    maxHealth: 40,
    damage: 6,
    contactCooldown: 1.0
  }
};

export const requiredPickupsForLevel = (level) => level.pickupSpawns.length === 0
  ? 0
  : Math.max(1, Math.ceil(level.pickupSpawns.length * 0.6));

export const createGameState = ({ seed, sector = 1 }) => {
  const sectorSeed = `${seed}:sector:${sector}`;
  const level = generateLevel({
    seed: sectorSeed,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    roomCount: GAME_CONFIG.roomCount
  });
  const world = createWorld();

  const player = createEntity(world);
  world.components.position.set(player, { ...level.spawn });
  world.components.velocity.set(player, { x: 0, y: 0 });
  world.components.sprite.set(player, { color: "#7df9ff", radius: 0.45 });
  world.components.health.set(player, { hp: GAME_CONFIG.player.maxHealth, max: GAME_CONFIG.player.maxHealth });
  world.components.player.set(player, {
    attackCooldown: 0,
    damageCooldown: 2.5,
    facing: { x: 1, y: 0 }
  });
  world.components.collider.set(player, { radius: 0.45 });

  for (const spawn of level.enemySpawns) {
    const enemy = createEntity(world);
    world.components.position.set(enemy, { ...spawn });
    world.components.velocity.set(enemy, { x: 0, y: 0 });
    world.components.sprite.set(enemy, { color: "#ff6b6b", radius: 0.4 });
    world.components.health.set(enemy, { hp: GAME_CONFIG.enemy.maxHealth, max: GAME_CONFIG.enemy.maxHealth });
    world.components.ai.set(enemy, { path: [], repathTimer: 0 });
    world.components.collider.set(enemy, { radius: 0.4 });
  }

  for (const spawn of level.pickupSpawns) {
    const pickup = createEntity(world);
    world.components.position.set(pickup, { ...spawn });
    world.components.sprite.set(pickup, { color: "#ffd166", radius: 0.25, pulse: true });
    world.components.pickup.set(pickup, { type: "core" });
  }

  const exit = createEntity(world);
  world.components.position.set(exit, { ...level.exit });
  world.components.exit.set(exit, { active: false });
  world.components.sprite.set(exit, { color: "#7cff90", radius: 0.35, pulse: true });

  return {
    seed,
    sector,
    world,
    level,
    tick: 0,
    elapsed: 0,
    status: "playing",
    score: 0,
    pickups: 0
  };
};

const tileIsWall = (level, x, y) => {
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return true;
  return level.tiles[y * level.width + x] === TILE.WALL;
};

const resolveCollisions = (level, entityPos) => {
  const half = 0.45;
  const minX = clamp(entityPos.x, 0.5, level.width - 0.5);
  const minY = clamp(entityPos.y, 0.5, level.height - 0.5);
  entityPos.x = minX;
  entityPos.y = minY;
  const checkOffsets = [
    { x: -half, y: 0 },
    { x: half, y: 0 },
    { x: 0, y: -half },
    { x: 0, y: half }
  ];
  for (const offset of checkOffsets) {
    const testX = Math.floor(entityPos.x + offset.x);
    const testY = Math.floor(entityPos.y + offset.y);
    if (tileIsWall(level, testX, testY)) {
      if (offset.x !== 0) entityPos.x = Math.round(entityPos.x) + (offset.x < 0 ? 0.5 : -0.5);
      if (offset.y !== 0) entityPos.y = Math.round(entityPos.y) + (offset.y < 0 ? 0.5 : -0.5);
    }
  }
};

export const stepSimulation = (state, input, dt, rng) => {
  if (state.status !== "playing") return { events: [] };
  const { world, level } = state;
  const events = [];
  state.tick += 1;
  state.elapsed += dt;

  const playerId = [...world.components.player.keys()][0];
  const playerPos = world.components.position.get(playerId);
  const playerVel = world.components.velocity.get(playerId);
  const playerStats = world.components.player.get(playerId);

  const moveX = input.move.x;
  const moveY = input.move.y;
  const len = Math.hypot(moveX, moveY) || 1;
  playerVel.x = (moveX / len) * GAME_CONFIG.player.speed;
  playerVel.y = (moveY / len) * GAME_CONFIG.player.speed;
  if (moveX !== 0 || moveY !== 0) {
    playerStats.facing = { x: moveX / len, y: moveY / len };
  }

  if (playerStats.attackCooldown > 0) {
    playerStats.attackCooldown -= dt;
  }
  if (playerStats.damageCooldown > 0) {
    playerStats.damageCooldown -= dt;
  }

  if (input.attack && playerStats.attackCooldown <= 0) {
    playerStats.attackCooldown = GAME_CONFIG.player.attackCooldown;
    events.push({ type: "attack", source: playerId });
    const attackX = playerPos.x + playerStats.facing.x * GAME_CONFIG.player.attackRange;
    const attackY = playerPos.y + playerStats.facing.y * GAME_CONFIG.player.attackRange;
    for (const [id, health] of world.components.health) {
      if (world.components.player.has(id)) continue;
      const pos = world.components.position.get(id);
      if (!pos) continue;
      const dist = Math.hypot(pos.x - attackX, pos.y - attackY);
      if (dist < 0.9) {
        health.hp -= GAME_CONFIG.player.damage;
        events.push({ type: "hit", target: id });
      }
    }
  }

  for (const [id, ai] of world.components.ai) {
    ai.repathTimer -= dt;
    if (ai.repathTimer <= 0) {
      ai.repathTimer = 0.6 + rng.next() * 0.4;
      const path = findPath(level, {
        x: Math.floor(world.components.position.get(id).x),
        y: Math.floor(world.components.position.get(id).y)
      }, {
        x: Math.floor(playerPos.x),
        y: Math.floor(playerPos.y)
      });
      ai.path = path ? path.slice(1, 4) : [];
    }
    const vel = world.components.velocity.get(id);
    if (ai.path.length > 0) {
      const next = ai.path[0];
      const pos = world.components.position.get(id);
      const dx = next.x + 0.5 - pos.x;
      const dy = next.y + 0.5 - pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      vel.x = (dx / dist) * GAME_CONFIG.enemy.speed;
      vel.y = (dy / dist) * GAME_CONFIG.enemy.speed;
      if (dist < 0.2) ai.path.shift();
    } else {
      vel.x = 0;
      vel.y = 0;
    }
  }

  for (const [id, vel] of world.components.velocity) {
    const pos = world.components.position.get(id);
    if (!pos) continue;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    resolveCollisions(level, pos);
  }

  const playerHealth = world.components.health.get(playerId);
  for (const [id, ai] of world.components.ai) {
    const pos = world.components.position.get(id);
    const dist = Math.hypot(pos.x - playerPos.x, pos.y - playerPos.y);
    if (dist < 0.8 && playerHealth.hp > 0 && playerStats.damageCooldown <= 0) {
      playerHealth.hp -= GAME_CONFIG.enemy.damage;
      playerStats.damageCooldown = GAME_CONFIG.enemy.contactCooldown;
      events.push({ type: "damage", target: playerId });
    }
    const health = world.components.health.get(id);
    if (health && health.hp <= 0) {
      removeEntity(world, id);
      state.score += 20;
      events.push({ type: "enemy-down", target: id, position: { ...pos } });
    }
  }

  for (const [id] of world.components.pickup) {
    const pos = world.components.position.get(id);
    const dist = Math.hypot(pos.x - playerPos.x, pos.y - playerPos.y);
    if (dist < 0.6) {
      removeEntity(world, id);
      state.pickups += 1;
      state.score += 50;
      events.push({ type: "pickup", target: id, position: { ...pos } });
    }
  }

  const exitEntry = [...world.components.exit.entries()][0];
  if (exitEntry) {
    const [exitId, exitData] = exitEntry;
    if (state.pickups >= requiredPickupsForLevel(level)) {
      exitData.active = true;
    }
    const exitPos = world.components.position.get(exitId);
    if (exitData.active && Math.hypot(exitPos.x - playerPos.x, exitPos.y - playerPos.y) < 0.8) {
      state.status = "won";
      events.push({ type: "win" });
    }
  }

  if (playerHealth.hp <= 0) {
    state.status = "lost";
    events.push({ type: "lose" });
  }

  return { events };
};
