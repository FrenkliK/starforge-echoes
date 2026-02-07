import { TILE } from "../core/generator.js";

export const createRenderer = (canvas) => {
  const ctx = canvas.getContext("2d");
  return {
    canvas,
    ctx,
    particles: []
  };
};

export const spawnParticles = (renderer, pos, color) => {
  for (let i = 0; i < 8; i += 1) {
    renderer.particles.push({
      x: pos.x + (Math.random() - 0.5) * 0.3,
      y: pos.y + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      life: 0.6 + Math.random() * 0.4,
      color
    });
  }
};

export const renderFrame = (renderer, state, debug) => {
  const { ctx, canvas } = renderer;
  const { level, world } = state;
  const tileSize = canvas.width / level.width;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const tile = level.tiles[y * level.width + x];
      if (tile === TILE.WALL) {
        ctx.fillStyle = "#111827";
      } else {
        ctx.fillStyle = "#1f2a44";
      }
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      if (tile === TILE.EXIT) {
        ctx.fillStyle = "rgba(124, 255, 144, 0.2)";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  for (const [id, sprite] of world.components.sprite) {
    const pos = world.components.position.get(id);
    if (!pos) continue;
    ctx.beginPath();
    const pulse = sprite.pulse ? 0.05 * Math.sin(Date.now() / 200) : 0;
    ctx.fillStyle = sprite.color;
    ctx.arc(
      pos.x * tileSize,
      pos.y * tileSize,
      (sprite.radius + pulse) * tileSize,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  renderer.particles = renderer.particles.filter((p) => p.life > 0);
  for (const particle of renderer.particles) {
    particle.life -= 1 / 60;
    particle.x += particle.vx / 60;
    particle.y += particle.vy / 60;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillRect(particle.x * tileSize, particle.y * tileSize, 3, 3);
    ctx.globalAlpha = 1;
  }

  if (debug.enabled) {
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
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
