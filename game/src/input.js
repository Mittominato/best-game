// Aurora Salvage — keyboard and mouse input.
//
// One object owns every key and the pointer. The simulation asks it what
// the player wants right now; it never touches the DOM itself. Keys are
// tracked by their physical code so WASD and arrows both work, and the
// pointer is kept in canvas coordinates for aiming.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    // The reticle starts over the skiff, not in the corner: before the
    // first mouse move the pilot is already aiming at something sane.
    mouseX: 640,
    mouseY: 360,
    mouseDown: false,
    // Edge-triggered actions, consumed once per frame by the game loop.
    pressed: new Set(),

    isDown(code) {
      return keys.has(code);
    },
    // Fire works from the mouse or from the F key, so a keyboard-only
    // pilot can still shoot toward the pointer.
    firing() {
      return input.mouseDown || keys.has('KeyF');
    },
    wasPressed(code) {
      return input.pressed.has(code);
    },
    moveX() {
      let x = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      return x;
    },
    moveY() {
      let y = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return y;
    },
    endFrame() {
      input.pressed.clear();
    },
  };

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = toCanvas(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
    if (event.button === 0) input.pressed.add('MouseClick');
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return input;
}
