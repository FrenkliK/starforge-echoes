import { TILE } from "../core/generator.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const createRenderer = (canvas) => ({
  canvas,
  ctx: canvas.getContext("2d"),
  particles: [],
  lastFrame: 0
});

export const spawnParticles = (renderer, pos, color, count = 12) => {
  if (!pos) return;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.7;
    renderer.particles.push({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.4,
      maxLife: 0.75,
      size: 1.5 + Math.random() * 2.5,
      color
    });
  }
};

const drawTile = (ctx, tile, x, y, size, exitIsActive) => {
  const left = x * size;
  const top = y * size;
  if (tile === TILE.WALL) {
    const variation = (x * 17 + y * 29) % 4;
    ctx.fillStyle = ["#121c2a", "#14202e", "#111a27", "#172332"][variation];
    ctx.fillRect(left, top, size, size);
    ctx.fillStyle = "rgba(166, 191, 203, 0.035)";
    ctx.fillRect(left + 2, top + 2, size - 4, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.11)";
    ctx.fillRect(left, top + size - 2, size, 2);
    return;
  }

  const variation = (x * 13 + y * 31) % 5;
  ctx.fillStyle = ["#202d3b", "#1e2b39", "#222f3d", "#1d2937", "#24313e"][variation];
  ctx.fillRect(left, top, size, size);
  ctx.fillStyle = "rgba(178, 202, 207, 0.035)";
  ctx.fillRect(left + 2, top + 2, size - 4, 1);

  if (tile === TILE.EXIT) {
    const color = exitIsActive ? "#a9e8cf" : "#758c8e";
    ctx.fillStyle = exitIsActive ? "rgba(126, 225, 184, 0.12)" : "rgba(169, 184, 180, 0.06)";
    ctx.fillRect(left + 2, top + 2, size - 4, size - 4);
    ctx.strokeStyle = color;
    ctx.globalAlpha = exitIsActive ? 0.72 : 0.35;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(left + size / 2, top + size / 2, size * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

const drawActor = (ctx, id, sprite, pos, components, size, time) => {
  const x = pos.x * size;
  const y = pos.y * size;
  const pulse = sprite.pulse ? 0.08 * Math.sin(time / 220) : 0;
  const radius = (sprite.radius + pulse) * size;
  const isPlayer = components.player.has(id);
  const isEnemy = components.ai.has(id);
  const isPickup = components.pickup.has(id);
  const isExit = components.exit.has(id);
  const health = components.health.get(id);

  ctx.save();
  ctx.translate(x, y);
  if (isPickup) {
    const spin = time / 750;
    const diamond = radius * (1 + pulse);
    ctx.shadowColor = sprite.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = sprite.color;
    ctx.rotate(Math.PI / 4 + spin * 0.15);
    ctx.fillRect(-diamond * 0.68, -diamond * 0.68, diamond * 1.36, diamond * 1.36);
    ctx.fillStyle = "#fff5d7";
    ctx.fillRect(-diamond * 0.22, -diamond * 0.22, diamond * 0.44, diamond * 0.44);
  } else if (isExit) {
    const active = components.exit.get(id)?.active;
    const ringRadius = radius * (1 + 0.12 * Math.sin(time / 300));
    ctx.strokeStyle = active ? "#a9e8cf" : "#748895";
    ctx.globalAlpha = active ? 0.85 : 0.45;
    ctx.lineWidth = 2;
    ctx.shadowColor = active ? "#6de1b2" : "transparent";
    ctx.shadowBlur = active ? 16 : 0;
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(time / 1000);
    ctx.fillStyle = active ? "#d5ffeb" : "#9aabb0";
    ctx.fillRect(-2, -ringRadius * 0.68, 4, ringRadius * 1.36);
    ctx.fillRect(-ringRadius * 0.68, -2, ringRadius * 1.36, 4);
  } else if (isPlayer) {
    ctx.shadowColor = "#91edda";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#a9e8cf";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#233c43";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
    ctx.fill();
    const facing = components.player.get(id)?.facing || { x: 1, y: 0 };
    ctx.strokeStyle = "#e2fff4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(facing.x * radius * 0.25, facing.y * radius * 0.25);
    ctx.lineTo(facing.x * radius * 1.15, facing.y * radius * 1.15);
    ctx.stroke();
  } else {
    ctx.shadowColor = isEnemy ? "#dc806d" : sprite.color;
    ctx.shadowBlur = isEnemy ? 8 : 0;
    ctx.fillStyle = sprite.color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(20, 22, 29, 0.72)";
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isEnemy && health) {
    const width = radius * 2.3;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(6, 9, 13, .8)";
    ctx.fillRect(-width / 2, -radius - 6, width, 2.5);
    ctx.fillStyle = "#e28370";
    ctx.fillRect(-width / 2, -radius - 6, width * clamp(health.hp / health.max, 0, 1), 2.5);
  }
  ctx.restore();
};

export const renderFrame = (renderer, state, debug) => {
  const { ctx, canvas } = renderer;
  const { level, world } = state;
  const tileSize = canvas.width / level.width;
  const now = performance.now();
  const delta = renderer.lastFrame ? Math.min((now - renderer.lastFrame) / 1000, 0.05) : 1 / 60;
  renderer.lastFrame = now;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const exitId = [...world.components.exit.keys()][0];
  const exitActive = world.components.exit.get(exitId)?.active || false;
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      drawTile(ctx, level.tiles[y * level.width + x], x, y, tileSize, exitActive);
    }
  }

  for (const [id, sprite] of world.components.sprite) {
    const pos = world.components.position.get(id);
    if (pos) drawActor(ctx, id, sprite, pos, world.components, tileSize, now);
  }

  renderer.particles = renderer.particles.filter((particle) => particle.life > 0);
  for (const particle of renderer.particles) {
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= Math.max(0, 1 - delta * 1.8);
    particle.vy *= Math.max(0, 1 - delta * 1.8);
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x * tileSize, particle.y * tileSize, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (debug.enabled) {
    ctx.strokeStyle = "rgba(216, 236, 241, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= level.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= level.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(canvas.width, y * tileSize);
      ctx.stroke();
    }
  }
};
