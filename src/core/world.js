export const createWorld = () => ({
  nextId: 1,
  entities: new Set(),
  components: {
    position: new Map(),
    velocity: new Map(),
    sprite: new Map(),
    health: new Map(),
    ai: new Map(),
    collider: new Map(),
    player: new Map(),
    pickup: new Map(),
    exit: new Map(),
    projectile: new Map()
  }
});

export const createEntity = (world) => {
  const id = world.nextId++;
  world.entities.add(id);
  return id;
};

export const removeEntity = (world, id) => {
  world.entities.delete(id);
  Object.values(world.components).forEach((bucket) => bucket.delete(id));
};
