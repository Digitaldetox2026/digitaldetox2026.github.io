// Điều khiển: máy tính WASD + kéo chuột để nhìn; điện thoại cần điều khiển ảo + kéo bên phải để nhìn.
export function createControls(canvas) {
  const st = { yaw: 0, pitch: 0, enabled: true, drag: 0, joy: { x: 0, y: 0 } };
  const keys = new Set();

  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') { if (st.enabled) e.preventDefault(); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // nhìn bằng cách kéo trên khung cảnh
  const look = new Map();
  canvas.addEventListener('pointerdown', (e) => { look.set(e.pointerId, [e.clientX, e.clientY, e.clientX, e.clientY, performance.now()]); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const p = look.get(e.pointerId);
    if (!p || !st.enabled) return;
    st.yaw -= (e.clientX - p[0]) * 0.006;
    st.pitch = Math.max(-0.7, Math.min(0.7, st.pitch - (e.clientY - p[1]) * 0.005));
    st.drag++;
    p[0] = e.clientX; p[1] = e.clientY;
  });
  const end = (e) => look.delete(e.pointerId);
  // chạm nhanh, gần như không kéo = "bấm" vào vật thể trong cảnh
  canvas.addEventListener('pointerup', (e) => {
    const p = look.get(e.pointerId);
    if (p && st.onTap && Math.hypot(e.clientX - p[2], e.clientY - p[3]) < 8 && performance.now() - p[4] < 500) st.onTap(e.clientX, e.clientY);
    end(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (!look.size && st.onHover) st.onHover(e.clientX, e.clientY); });
  canvas.addEventListener('pointercancel', end);

  // cần điều khiển ảo
  const joy = document.getElementById('joy'), knob = document.getElementById('knob');
  const touchy = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || location.search.includes('joy');
  if (touchy) document.body.classList.add('touch');
  let joyId = null;
  const setJoy = (e) => {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const d = Math.hypot(dx, dy), m = Math.min(1, d / R);
    if (d > 0) { dx = (dx / d) * m; dy = (dy / d) * m; }
    knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    st.joy.x = Math.abs(dx) < 0.15 ? 0 : dx;
    st.joy.y = Math.abs(dy) < 0.15 ? 0 : dy;
  };
  const resetJoy = () => { joyId = null; st.joy.x = st.joy.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); setJoy(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) setJoy(e); });
  joy.addEventListener('pointerup', resetJoy);
  joy.addEventListener('pointercancel', resetJoy);

  /** Trả về vector di chuyển { fwd, side } trong khoảng -1..1, và xoay bằng phím mũi tên. */
  st.read = (dt) => {
    if (!st.enabled) return { fwd: 0, side: 0 };
    if (keys.has('ArrowLeft')) st.yaw += 1.8 * dt;
    if (keys.has('ArrowRight')) st.yaw -= 1.8 * dt;
    let fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let side = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    fwd += -st.joy.y; side += st.joy.x;
    const len = Math.hypot(fwd, side);
    if (len > 1) { fwd /= len; side /= len; }
    return { fwd, side };
  };
  st.wasPressed = (code) => keys.has(code);
  st.clearKeys = () => keys.clear();
  return st;
}
