// Đồ dùng chung cho nội thất các phòng (rooms3d/): vật liệu, nhãn chữ, ván gỗ, ghế bành, bàn tròn, cây chậu, vầng sáng.
// Chỉ dùng hình khối đơn giản (low-poly) và hình vẽ trong máy; không có file ngoài.
import * as THREE from 'three';
import { textPlane } from '../scene.js';
import { loadModel } from '../assets.js';

export const mat = (c, r = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });

/** Nhãn chữ nhỏ gắn vào vật thể (chỉ là tên ngắn, việc chọn thật làm bằng cách chạm vật). */
export function label(text, w = 1.5, color = '#8a5a33') {
  const size = Math.min(70, Math.floor(470 / (Math.max(1, text.length) * 0.56))); // chữ dài thì thu nhỏ cho vừa nhãn
  return textPlane([{ text, size, y: 70 }], color, 520, 140, w);
}

/** Vùng chạm vô hình rộng hơn vật nhỏ, để dễ chạm bằng ngón tay. */
export function proxy(r, y = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.y = y; return m;
}

/** Hướng quay (rotation.y) để vật có "mặt trước" ở -z nhìn về phía (dx, dz). Cũng là yaw của camera. */
export const faceYaw = (dx, dz) => Math.atan2(-dx, -dz);

let wood = null;
/** Ván sàn gỗ vẽ trong máy (8 tấm). */
export function woodTex(repeat = 4) {
  if (!wood) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); let s = 5; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < 8; i++) {
      const l = 190 + Math.floor(r() * 26); g.fillStyle = `rgb(${l},${l - 38},${l - 88})`; g.fillRect(0, i * 32, 256, 32);
      for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(90,55,25,${0.05 + r() * 0.09})`; g.fillRect(r() * 256, i * 32 + r() * 30, 40 + r() * 120, 1); }
      g.fillStyle = 'rgba(60,35,15,.55)'; g.fillRect(0, i * 32, 256, 2);
    }
    wood = new THREE.CanvasTexture(cv); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.colorSpace = THREE.SRGBColorSpace; wood.anisotropy = 4;
  }
  wood.repeat.set(repeat, repeat);
  return wood;
}

let haloT = null;
/** Vầng sáng mềm (dùng giả ánh đèn thay cho đèn thật, để máy yếu vẫn chạy mượt). */
export function glow(color, size, opacity = 0.7) {
  if (!haloT) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    haloT = new THREE.CanvasTexture(cv); haloT.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloT, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.setScalar(size); return s;
}

/** Vệt sáng ấm trên sàn/bàn (hình tròn mờ nằm phẳng). */
export function lightPool(color, radius, opacity = 0.35) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  return m;
}

/** Ghế bành: mặt trước ở -z, mặt ngồi cao 0,42. */
export function armchair(fabric = 0xc9805f, woodC = 0x7a4a28) {
  const g = new THREE.Group(), f = mat(fabric, 0.95), w = mat(woodC, 0.8);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.2, 0.98), w); base.position.y = 0.18; g.add(base);
  for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.09, 8), w); l.position.set(x, 0.045, z); g.add(l);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.8), f); seat.position.set(0, 0.35, -0.03); g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.82, 0.18), f); back.position.set(0, 0.68, 0.42); back.rotation.x = -0.12; g.add(back);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.92), f); a.position.set(s * 0.47, 0.43, -0.02); g.add(a); }
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.1), mat(0xf3e2c4, 0.95)); pillow.position.set(0.18, 0.62, 0.28); pillow.rotation.set(-0.2, 0.2, 0.15); g.add(pillow);
  return g;
}

/** Bàn tròn gỗ thấp (mặt bàn cao 0,56). */
export function roundTable(r = 0.78, color = 0xa56f3f) {
  const g = new THREE.Group(), w = mat(color, 0.7);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 28), w); top.position.y = 0.53; g.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 28).rotateX(Math.PI / 2), mat(0x7a4a28, 0.7)); rim.position.y = 0.56; g.add(rim);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 12), mat(0x7a4a28, 0.8)); stem.position.y = 0.25; g.add(stem);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.05, 20), mat(0x7a4a28, 0.8)); foot.position.y = 0.03; g.add(foot);
  return g;
}

/** Cây chậu: chậu đất nung + tán lá tròn; kenneyUrl (chữ hoặc lời hứa ra chữ) có thì đổi sang mô hình đẹp hơn (tải lỗi thì giữ bản dựng sẵn). */
export function pottedPlant(h = 1.3, kenneyUrl = null) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.45, 10), mat(0xc2693c, 0.85)); pot.position.y = 0.225; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 10), mat(0x4a3322, 1)); soil.position.y = 0.45; g.add(soil);
  const leaves = new THREE.Group(); g.add(leaves);
  [[0, 0.95, 0, 0.42], [-0.2, 0.75, 0.1, 0.3], [0.22, 0.8, -0.1, 0.32], [0.05, 1.2, 0.1, 0.28]].forEach(([x, y, z, r], i) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (h / 1.3), 1), mat(i % 2 ? 0x4fa764 : 0x3f9456, 0.9)); s.position.set(x, y * (h / 1.3), z); leaves.add(s);
  });
  if (kenneyUrl) {
    Promise.resolve(kenneyUrl).then((u) => (u ? loadModel(u + 'plant_bushLarge.glb') : null)).then((src) => {
      if (!src) return;
      const m = src.clone(true), box = new THREE.Box3().setFromObject(m), k = (h - 0.4) / Math.max(0.01, box.getSize(new THREE.Vector3()).y);
      m.scale.setScalar(k); m.position.y = 0.43 - box.min.y * k;
      g.remove(leaves); g.add(m);
    });
  }
  return g;
}
