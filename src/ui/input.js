export const defaultBindings = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  attack: "Space",
  pause: "Escape"
};

export const createInputState = (bindings) => ({
  bindings,
  pressed: new Set(),
  move: { x: 0, y: 0 },
  attack: false,
  pause: false
});

export const updateInputState = (state) => {
  const { pressed, bindings } = state;
  const up = pressed.has(bindings.up) ? -1 : 0;
  const down = pressed.has(bindings.down) ? 1 : 0;
  const left = pressed.has(bindings.left) ? -1 : 0;
  const right = pressed.has(bindings.right) ? 1 : 0;
  state.move.x = left + right;
  state.move.y = up + down;
  state.attack = pressed.has(bindings.attack);
  state.pause = pressed.has(bindings.pause);
};

export const applyInputEvent = (state, event) => {
  if (event.type === "keydown") {
    state.pressed.add(event.code);
  }
  if (event.type === "keyup") {
    state.pressed.delete(event.code);
  }
};
