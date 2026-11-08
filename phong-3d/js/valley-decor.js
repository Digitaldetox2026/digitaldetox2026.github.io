// Cây bụi, hoa, gốc cây, khúc gỗ, nấm và vài cây nhẹ cho sảnh, lấy từ Kenney Nature Kit (CC0, mỗi file vài KB).
// Tải khi có khai báo trong assets/manifest.json; lỗi thì bỏ qua và cảnh vẫn nguyên. Nguồn ghi ở assets/CREDITS.md.
import * as THREE from 'three';
import { loadModel } from './assets.js';
import { rng } from './nature-parts.js';

const STEP = (2 * Math.PI) / 7;
const onLane = (x, z) => {
  for (let i = 0; i < 7; i++) {
    const phi = i * STEP, dx = Math.sin(phi), dz = Math.cos(phi);
    if (x * dx + z * dz > 2.2 && Math.abs(x * dz - z * dx) < 2.4) return true;
  }
  return false;
};

/** Đặt mô hình đứng trên đất, cao đúng h mét. */
export function place(group, src, { x, z, h, ry = 0 }) {
  const m = src.clone(true);
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
  const k = h / Math.max(0.001, size.y);
  m.scale.setScalar(k); m.position.set(x, -box.min.y * k, z); m.rotation.y = ry;
  group.add(m); return m;
}

export async function addDecor({ baseUrl, group, obstacles }) {
  const names = ['plant_bushLarge', 'plant_bush', 'plant_bushDetailed', 'plant_bushLargeTriangle', 'flower_purpleA', 'flower_purpleB', 'flower_redA', 'flower_redB',
    'flower_yellowA', 'flower_yellowB', 'stump_round', 'stump_roundDetailed', 'log', 'log_large', 'mushroom_tanGroup', 'mushroom_redGroup', 'tree_oak', 'tree_default', 'tree_detailed'];
  const got = await Promise.all(names.map((n) => loadModel(`${baseUrl}${n}.glb`)));
  const M = Object.fromEntries(names.map((n, i) => [n, got[i]]));
  if (!names.every((n) => M[n])) return null;
  const rand = rng(77), deco = new THREE.Group(), flowers = new THREE.Group(); group.add(deco, flowers);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  // bụi cây dọc mép bãi cỏ giữa các lối đi (chừa hướng nam cho suối)
  for (let i = 0; i < 7; i++) {
    if (i === 3) continue;
    for (const off of [-0.2, 0.2]) {
      const a = (i + 0.5 + off) * STEP, r = 13.6 + rand() * 0.8;
      place(deco, M[pick(['plant_bushLarge', 'plant_bush', 'plant_bushDetailed', 'plant_bushLargeTriangle'])], { x: Math.sin(a) * r, z: Math.cos(a) * r, h: 0.9 + rand() * 0.6, ry: rand() * 6 });
    }
  }
  // bụi hai bên suối phía nam
  for (const [x, z] of [[-2.6, -14.4], [2.7, -14.8], [-4.6, -15.6], [4.7, -16.0]]) place(deco, M.plant_bushLarge, { x, z, h: 1.1 + rand() * 0.4, ry: rand() * 6 });

  // góc nghỉ quanh 4 ghế đá: gốc cây thấp, khúc gỗ, nấm
  for (const sx of [-1, 1]) {
    place(deco, M.stump_round, { x: sx * 2.0, z: -11.3, h: 0.45 }); obstacles.push({ x: sx * 2.0, z: -11.3, r: 0.35 });
    place(deco, M.stump_roundDetailed, { x: sx * 3.0, z: -14.4, h: 0.4, ry: rand() * 6 }); obstacles.push({ x: sx * 3.0, z: -14.4, r: 0.35 });
    place(deco, M.log_large, { x: sx * 4.9, z: -13.4, h: 0.5, ry: 1.2 * sx });
    place(deco, sx < 0 ? M.mushroom_tanGroup : M.mushroom_redGroup, { x: sx * 3.5, z: -11.2, h: 0.28 });
  }

  // cụm hoa rải trên bãi cỏ (không mọc lên lối đi, suối, hồ)
  const fl = ['flower_purpleA', 'flower_purpleB', 'flower_redA', 'flower_redB', 'flower_yellowA', 'flower_yellowB'];
  for (let n = 0, put = 0; n < 400 && put < 26; n++) {
    const r = 5.6 + rand() * 9, a = rand() * 6.283, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (onLane(x, z) || (z < 0 && Math.abs(x) < 2.6)) continue;
    for (let k = 0; k < 3; k++) place(flowers, M[pick(fl)], { x: x + (rand() - 0.5) * 0.7, z: z + (rand() - 0.5) * 0.7, h: 0.35 + rand() * 0.2, ry: rand() * 6 });
    put++;
  }

  // vài cây nhẹ làm điểm nhấn gần quảng trường (cây tự dựng vẫn là rừng nền)
  const trees = [['tree_oak', -9.6, 3.8, 4.2], ['tree_default', 9.4, -2.6, 3.8], ['tree_detailed', -8.8, -4.6, 4.4], ['tree_oak', 6.4, 12.4, 4.0]];
  for (const [n, x, z, h] of trees) {
    if (onLane(x, z)) continue;
    place(deco, M[n], { x, z, h, ry: rand() * 6 }); obstacles.push({ x, z, r: 0.45 });
  }
  return { deco, flowers };
}
