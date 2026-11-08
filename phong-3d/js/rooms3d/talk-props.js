// Nội thất "góc trò chuyện" của phòng Nhận thức: 2 ghế bành đặt chéo, bàn tròn gỗ thấp, đèn bàn ánh ấm, chậu cây, cửa sổ nhìn ra vườn.
// Chạm ghế bên trái để ngồi (camera hạ thấp), Reset ngồi ghế đối diện. Gợi ý theo mức hiện thành biển chỉ đường (signposts.js).
import * as THREE from 'three';
import { manifest } from '../assets.js';
import { mat, label, proxy, woodTex, armchair, roundTable, pottedPlant, glow, lightPool, faceYaw } from './parts.js';

const HALF = 8;
export const SEAT_P = { x: -1.3, z: -2.0 };   // ghế của người chơi
export const SEAT_R = { x: 1.3, z: -4.4 };    // ghế của Reset (đối diện, đặt chéo)
const TABLE = { x: 0, z: -3.2 };

/** Vị trí các biển chỉ đường: một cung phía sau-bên cạnh ghế Reset, chừa đúng hướng nhìn thẳng vào Reset. */
export function signSpots(n) {
  const dx = SEAT_R.x - SEAT_P.x, dz = SEAT_R.z - SEAT_P.z, l = Math.hypot(dx, dz), a = [dx / l, dz / l], b = [-a[1], a[0]]; // b = bên phải khi nhìn về Reset
  const lat = { 1: [1.8], 2: [-1.9, 1.9], 3: [-2.5, 1.8, 3.3], 4: [-3.0, -1.5, 1.7, 3.2] }[Math.min(4, Math.max(1, n))];
  const s = 4.7, lim = 6.9;
  return lat.slice(0, n).map((u) => ({
    x: Math.max(-lim, Math.min(lim, SEAT_P.x + a[0] * s + b[0] * u)),
    z: Math.max(-lim, Math.min(lim, SEAT_P.z + a[1] * s + b[1] * u)),
  }));
}

/** Ảnh vườn vẽ trong máy cho cửa sổ (trời, đồi, cây, hoa). */
function gardenTexture(seed) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 360;
  const g = cv.getContext('2d'); let s = seed; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const sky = g.createLinearGradient(0, 0, 0, 220); sky.addColorStop(0, '#9fd0f5'); sky.addColorStop(1, '#e8f6ff');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 360);
  const sun = g.createRadialGradient(380, 70, 4, 380, 70, 90); sun.addColorStop(0, 'rgba(255,248,210,.95)'); sun.addColorStop(1, 'rgba(255,248,210,0)');
  g.fillStyle = sun; g.fillRect(0, 0, 512, 360);
  g.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, w] of [[90, 60, 70], [200, 95, 54], [330, 40, 60]]) { for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * w * 0.3, y + (k % 2) * 5, w * 0.34, w * 0.17, 0, 0, 6.3); g.fill(); } }
  g.fillStyle = '#8fc08a'; g.beginPath(); g.moveTo(0, 230); for (let x = 0; x <= 512; x += 32) g.lineTo(x, 200 + Math.sin(x * 0.02 + seed) * 22); g.lineTo(512, 360); g.lineTo(0, 360); g.fill();
  g.fillStyle = '#6fae6b'; g.beginPath(); g.moveTo(0, 270); for (let x = 0; x <= 512; x += 32) g.lineTo(x, 250 + Math.sin(x * 0.03 + seed * 2) * 14); g.lineTo(512, 360); g.lineTo(0, 360); g.fill();
  for (let i = 0; i < 6; i++) { const x = 30 + i * 85 + r() * 30, y = 255 + r() * 40, h = 40 + r() * 36; g.fillStyle = '#7a5538'; g.fillRect(x - 3, y - h * 0.3, 6, h * 0.5); g.fillStyle = i % 2 ? '#3f9456' : '#4fa764'; g.beginPath(); g.arc(x, y - h * 0.5, h * 0.42, 0, 6.3); g.fill(); }
  g.fillStyle = '#58a35c'; g.fillRect(0, 300, 512, 60);
  for (let i = 0; i < 40; i++) { g.fillStyle = ['#f9a8d4', '#fde68a', '#fff', '#c4b5fd'][i % 4]; g.beginPath(); g.arc(r() * 512, 305 + r() * 50, 2 + r() * 2, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildTalkProps({ built, ctx, on }) {
  const group = built.group, picker = ctx.picker, c = built.center;
  const addObs = (x, z, r, extra = {}) => { const o = { x: c.x + x, z: c.z + z, r, ...extra }; built.obstacles.push(o); return o; };
  const kenney = manifest().then((m) => m.kenney || null);

  for (const k of ['shape', 'pedestal', 'rug']) built.parts[k].visible = false;
  const pi = built.obstacles.indexOf(built.parts.pedObstacle); if (pi >= 0) built.obstacles.splice(pi, 1);
  for (const p of built.parts.plants) p.group.visible = false;

  /* sàn gỗ, thảm tròn, trần kem có xà gỗ */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(15.8, 15.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.8, color: 0xf2dcc0 }));
  floor.position.y = 0.012; group.add(floor);
  const rugTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = '#f1e3c8'; g.beginPath(); g.arc(128, 128, 126, 0, 6.3); g.fill();
    g.strokeStyle = '#c9805f'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, 6.3); g.stroke();
    g.strokeStyle = '#8fb59a'; g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 94, 0, 6.3); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  rug.position.set(TABLE.x, 0.02, TABLE.z); group.add(rug);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16.6, 16.6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf6ead8, roughness: 1 }));
  ceil.position.y = 4.19; group.add(ceil);
  const beamM = mat(0x8a5a33, 0.85);
  for (const x of [-4.8, 0, 4.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 16.4), beamM); b.position.set(x, 4.04, 0); group.add(b); }

  /* hai cửa sổ trên tường sau nhìn ra vườn (ảnh vẽ), khung gỗ, thanh chia */
  [[-5.0, 11], [5.0, 23]].forEach(([x, seed]) => {
    const g = new THREE.Group(); g.position.set(x, 2.1, -HALF + 0.03); group.add(g);
    const view = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), new THREE.MeshBasicMaterial({ map: gardenTexture(seed), toneMapped: false })); g.add(view);
    const fr = (w, h, px, py, d = 0.12) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), beamM); m.position.set(px, py, 0.05); g.add(m); };
    fr(3.7, 0.15, 0, 1.12); fr(3.7, 0.15, 0, -1.12); fr(0.15, 2.4, -1.78, 0); fr(0.15, 2.4, 1.78, 0); fr(0.07, 2.1, 0, 0, 0.08); fr(3.4, 0.07, 0, 0, 0.08);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.08, 0.34), beamM); sill.position.set(0, -1.2, 0.15); g.add(sill);
    const beam = glow(0xfff1c8, 4.4, 0.16); beam.position.set(0, 0, 0.4); g.add(beam);
  });

  /* kệ sách sát tường trái */
  { const sh = new THREE.Group(); sh.position.set(-HALF + 0.22, 0, -3.6); group.add(sh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 4.0), mat(0x8a5a33, 0.85)); frame.position.y = 1.25; sh.add(frame);
    let s = 9; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const cols = [0xc9805f, 0x6f9fb5, 0xe3c46b, 0x8fb59a, 0xb58fb5, 0xd9d2c3];
    for (let row = 0; row < 4; row++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 3.8), mat(0x5b3d26, 0.9)); shelf.position.set(0.02, 0.32 + row * 0.6, 0); sh.add(shelf);
      let z = -1.8;
      while (z < 1.7) { const w = 0.1 + r() * 0.1, h = 0.34 + r() * 0.14; const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, h, w), mat(cols[Math.floor(r() * cols.length)], 0.9)); b.position.set(0.1, 0.35 + row * 0.6 + h / 2, z + w / 2); sh.add(b); z += w + 0.01; }
    }
  }

  /* bàn tròn gỗ thấp + cốc trà + sách */
  const table = roundTable(0.78); table.position.set(TABLE.x, 0, TABLE.z); group.add(table);
  addObs(TABLE.x, TABLE.z, 0.95);
  { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 12), mat(0xf3e2c4, 0.5)); cup.position.set(0.28, 0.61, 0.1); table.add(cup);
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.25), mat(0x6f9fb5, 0.9)); book.position.set(-0.28, 0.6, -0.05); book.rotation.y = 0.5; table.add(book); }

  /* hai ghế bành đặt chéo, mặt hướng vào nhau */
  const mkChair = (pos, other, fabric) => {
    const ch = armchair(fabric); ch.position.set(pos.x, 0, pos.z); ch.rotation.y = faceYaw(other.x - pos.x, other.z - pos.z); group.add(ch); return ch;
  };
  const chairP = mkChair(SEAT_P, SEAT_R, 0xc9805f);
  const chairR = mkChair(SEAT_R, SEAT_P, 0x7aa58a);
  chairP.add(proxy(0.85, 0.5));
  addObs(SEAT_P.x, SEAT_P.z, 0.62, { guideOk: true });
  addObs(SEAT_R.x, SEAT_R.z, 0.62, { guideOk: true });
  const seatYaw = faceYaw(SEAT_R.x - SEAT_P.x, SEAT_R.z - SEAT_P.z);
  const chairTag = label('Chạm ghế để ngồi', 1.5, '#8a5a33'); chairTag.position.set(SEAT_P.x, 1.75, SEAT_P.z); group.add(chairTag);
  const sitEntry = picker.register({ object: chairP, reach: 30, haloAt: [0, 0.6, 0], haloSize: 2.0, haloColor: 0xfde68a, onTap: () => on.sit() });

  /* bàn phụ + đèn bàn ánh ấm (vầng sáng giả, không dùng đèn thật cho nhẹ máy) */
  { const sx = SEAT_P.x - 1.15, sz = SEAT_P.z - 1.0, st = new THREE.Group(); st.position.set(sx, 0, sz); group.add(st);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 20), mat(0xa56f3f, 0.7)); top.position.y = 0.62; st.add(top);
    for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.6, 6), beamM); l.position.set(lx, 0.3, lz); st.add(l); }
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 12), mat(0x5b3d26, 0.7)); lb.position.y = 0.68; st.add(lb);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 6), mat(0x5b3d26, 0.7)); post.position.y = 0.88; st.add(post);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.19, 0.24, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide, toneMapped: false })); shade.position.y = 1.08; st.add(shade);
    const gl = glow(0xffc27a, 1.7, 0.75); gl.position.y = 1.05; st.add(gl);
    const pool = lightPool(0xffb870, 1.5, 0.28); pool.position.set(0, 0.03, 0); st.add(pool);
    const poolT = lightPool(0xffd9a0, 0.5, 0.25); poolT.position.set(0, 0.64, 0); st.add(poolT);
    addObs(sx, sz, 0.45, { guideOk: true });
    st.userData.glow = gl;
  }

  /* chậu cây ở 4 góc (thay cây mặc định) */
  for (const p of built.parts.plants) { const pl = pottedPlant(1.5, kenney); pl.position.set(p.x, 0, p.z); group.add(pl); }
  { const pl = pottedPlant(1.1, kenney); pl.position.set(SEAT_R.x + 2.4, 0, SEAT_R.z + 2.2); group.add(pl); addObs(SEAT_R.x + 2.4, SEAT_R.z + 2.2, 0.4); }

  /* đèn thả trên bàn */
  { const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4), beamM); cord.position.set(TABLE.x, 3.4, TABLE.z); group.add(cord);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2b0, side: THREE.DoubleSide, toneMapped: false })); sh.position.set(TABLE.x, 2.62, TABLE.z); group.add(sh);
    const gl = glow(0xffcf92, 2.4, 0.5); gl.position.set(TABLE.x, 2.5, TABLE.z); group.add(gl);
    const pool = lightPool(0xffcf92, 2.0, 0.2); pool.position.set(TABLE.x, 0.03, TABLE.z); group.add(pool); }

  /* biển tên phòng nhỏ giữa tường sau (giữ bảng mặc định, nằm giữa 2 cửa sổ) */
  built.parts.sign.visible = true;
  built.parts.sign.scale.setScalar(0.36); built.parts.sign.position.y = 3.7;

  return {
    group, chairP, chairR, seatYaw, sitEntry,
    setChairTag(on) { chairTag.visible = on; },
    update(t) {
      chairTag.position.y = 1.75 + Math.sin(t * 1.6) * 0.04;
    },
  };
}
