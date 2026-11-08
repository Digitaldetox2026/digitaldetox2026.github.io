// Đồ vật trong khu vườn 14 viên đá (phòng Thử thách): đồng hồ cát, trạm sạc (ngày 3), bàn ăn không điện thoại (ngày 4),
// bảng "Nếu... thì..." (ngày 13). Hình khối đơn giản dựng trong máy; không có file ngoài.
import * as THREE from 'three';
import { mat, label, proxy, glow } from './parts.js';

const wood = 0x9a6a3a, darkWood = 0x6b4426;
const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };

/** Đồng hồ cát 3D: cát trên vơi dần, cát dưới đầy dần. setProgress(0..1). Cao khoảng 1 mét. */
export function buildHourglass() {
  const g = new THREE.Group(), s = new THREE.Group(); s.scale.setScalar(1.4); s.position.y = 0.62; g.add(s);
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.62, 12), mat(0x8a5a33, 0.9)); stump.position.y = 0.31; g.add(stump);   // đặt trên gốc cây cho ngang tầm mắt
  const wd = mat(darkWood, 0.8);
  for (const y of [0.02, 0.64]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 20), wd); d.position.y = y; s.add(d); }
  for (let i = 0; i < 3; i++) { const a = i * 2.094, p = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 6), wd); p.position.set(Math.cos(a) * 0.22, 0.33, Math.sin(a) * 0.22); s.add(p); }
  const prof = [[0.2, 0.05], [0.185, 0.12], [0.13, 0.2], [0.055, 0.28], [0.022, 0.325], [0.055, 0.37], [0.13, 0.45], [0.185, 0.53], [0.2, 0.6]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), new THREE.MeshStandardMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.28, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  glass.renderOrder = 2; s.add(glass);
  const sandM = new THREE.MeshStandardMaterial({ color: 0xe8c36a, roughness: 0.95 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.03, 0.22, 16), sandM); s.add(top);
  const pile = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 16), sandM); s.add(pile);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 6), sandM); s.add(stream);
  g.add(proxy(0.7, 1.1));
  const api = {
    group: g,
    /** f = 0 mới bắt đầu, 1 hết giờ. */
    setProgress(f) {
      const k = Math.min(1, Math.max(0, f)), up = 1 - k;
      top.visible = up > 0.01; top.scale.set(0.35 + 0.65 * up, Math.max(0.01, up), 0.35 + 0.65 * up); top.position.y = 0.335 + 0.11 * up;
      pile.visible = k > 0.01; pile.scale.set(0.35 + 0.65 * k, Math.max(0.01, k), 0.35 + 0.65 * k); pile.position.y = 0.065 + 0.1 * k;
      const bottom = 0.065 + 0.2 * k, topY = 0.33; stream.visible = k > 0.005 && k < 0.995;
      stream.scale.y = Math.max(0.01, topY - bottom); stream.position.y = bottom + (topY - bottom) / 2;
    },
  };
  api.setProgress(0);
  return api;
}

/** Trạm sạc: bàn gỗ thấp có ổ điện và điện thoại đang sạc, cạnh một chiếc đèn ngủ. */
export function buildCharger() {
  const g = new THREE.Group(), wd = mat(wood, 0.8), dk = mat(darkWood, 0.8);
  box(1.1, 0.07, 0.6, wd, 0, 0.55, 0, g);
  for (const [x, z] of [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]]) box(0.07, 0.52, 0.07, dk, x, 0.26, z, g);
  box(0.4, 0.04, 0.1, mat(0xe5e7eb, 0.5), -0.25, 0.61, -0.12, g);                       // ổ cắm
  const phone = box(0.14, 0.015, 0.26, mat(0x1f2937, 0.3), 0.15, 0.59, 0.03, g); phone.rotation.y = 0.3;
  const cable = box(0.012, 0.012, 0.3, mat(0xf8fafc, 0.5), -0.05, 0.6, -0.04, g); cable.rotation.y = 0.9;
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4ade80, toneMapped: false })); led.position.set(0.15, 0.605, 0.12); g.add(led);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false })); lamp.position.set(0.42, 0.7, 0.05); g.add(lamp);
  const gl = glow(0xffc27a, 0.8, 0.55); gl.position.set(0.42, 0.7, 0.05); g.add(gl);
  const tag = label('🔌 Trạm sạc', 1.1, '#b45309'); tag.position.set(0, 1.15, 0); g.add(tag);
  g.add(proxy(0.75, 0.55));
  return g;
}

/** Bàn ăn không điện thoại: bàn gỗ, hai đĩa + bát, hai ghế đẩu và một hộp gỗ để cất điện thoại. */
export function buildDinner() {
  const g = new THREE.Group(), wd = mat(wood, 0.8), dk = mat(darkWood, 0.8), white = mat(0xf8fafc, 0.4);
  box(1.5, 0.07, 0.9, wd, 0, 0.74, 0, g);
  for (const [x, z] of [[-0.68, -0.38], [0.68, -0.38], [-0.68, 0.38], [0.68, 0.38]]) box(0.08, 0.72, 0.08, dk, x, 0.36, z, g);
  for (const x of [-0.4, 0.4]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.03, 16), white); plate.position.set(x, 0.795, 0.15); g.add(plate);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xfde68a, 0.5)); bowl.rotation.x = Math.PI; bowl.position.set(x, 0.86, -0.12); g.add(bowl);
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.5, 12), dk); stool.position.set(x, 0.25, 0.85); g.add(stool);
  }
  const bx = new THREE.Group(); bx.position.set(0, 0.78, -0.25); g.add(bx);
  box(0.34, 0.14, 0.2, mat(0x7a4a28, 0.8), 0, 0.07, 0, bx);
  box(0.26, 0.01, 0.015, mat(0x1f2937, 0.5), 0, 0.145, 0, bx);                          // khe bỏ điện thoại
  const tag = label('🍚 Bàn ăn không điện thoại', 1.8, '#b45309'); tag.position.set(0, 1.5, 0); g.add(tag);
  g.add(proxy(1.0, 0.7));
  return g;
}

/** Bảng "Nếu... thì...": hai cột gỗ + tấm bảng vẽ chữ trong máy. setPlan(text) viết kế hoạch lên bảng. */
export function buildIfThenBoard(T) {
  const g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = 640; cv.height = 440;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = (plan) => {
    const c = cv.getContext('2d'); c.fillStyle = '#2f4a3a'; c.fillRect(0, 0, 640, 440);
    c.strokeStyle = '#e8d9b5'; c.lineWidth = 10; c.strokeRect(8, 8, 624, 424);
    c.textAlign = 'center'; c.fillStyle = '#fde68a'; c.font = '700 54px "Be Vietnam Pro", system-ui, sans-serif'; c.fillText(T.boardTitle, 320, 72);
    c.fillStyle = '#f1f5f9'; c.font = '600 32px "Be Vietnam Pro", system-ui, sans-serif'; c.fillText(T.boardIf, 320, 140); c.fillText(T.boardThen, 320, 186);
    const text = plan || T.boardEmpty; c.fillStyle = plan ? '#ffffff' : '#9fb3a5'; c.font = `${plan ? 600 : 400} 30px "Be Vietnam Pro", system-ui, sans-serif`;
    const words = text.split(/\s+/); let line = '', y = 250; const lines = [];
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > 540 && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    lines.slice(0, 4).forEach((l, i) => c.fillText(i === 3 && lines.length > 4 ? l + '…' : l, 320, y + i * 44));
    tex.needsUpdate = true;
  };
  draw('');
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); board.position.set(0, 1.45, 0.06); g.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.22, 0.08), mat(darkWood, 0.8)); frame.position.set(0, 1.45, 0.0); g.add(frame);
  for (const x of [-0.7, 0.7]) box(0.09, 1.0, 0.09, mat(darkWood, 0.8), x, 0.5, -0.02, g);
  g.add(proxy(0.95, 1.4));
  g.userData.setPlan = draw;
  return g;
}
