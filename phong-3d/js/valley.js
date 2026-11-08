// Sảnh "Thung lũng hồi phục": thác nước + suối + hồ, cây, cỏ, hoa, đá, ghế đá nhìn ra thác, chim bay xa.
// Cấu trúc sảnh giữ nguyên (quảng trường tròn, 7 tòa nhà). Thiên nhiên: xem docs/KE_HOACH_TRAI_NGHIEM_CHUA_LANH.md mục 2.
import * as THREE from 'three';
import { mat, textPlane } from './scene.js';
import { loadModel } from './assets.js';
import { addDecor } from './valley-decor.js';
import { rng, makeSky, makeTerrain, makeForest, makeGrass, makeFlowers, makeRocks, waterTexture, pondTexture, rockGeometry, wind } from './nature-parts.js';

const STEP = (2 * Math.PI) / 7;
export const POND_R = 4.6;
export const FALL_Z = -34;                 // thác ở phía nam sảnh (đối diện chỗ bắt đầu), nhìn qua khe giữa 2 tòa nhà
const polar = (r, phi) => new THREE.Vector3(r * Math.sin(phi), 0, r * Math.cos(phi));

/** Điểm (x,z) có nằm trên lối đi màu tới một cửa không (để không mọc cỏ lên lối đi). */
function onLane(x, z) {
  for (let i = 0; i < 7; i++) {
    const phi = i * STEP, dx = Math.sin(phi), dz = Math.cos(phi);
    const along = x * dx + z * dz, side = Math.abs(x * dz - z * dx);
    if (along > 2.5 && side < 1.9) return true;
  }
  return false;
}
const onStream = (x, z) => z < 0 && Math.abs(x) < 1.9 && z > FALL_Z + 2;

export function buildValley({ group, obstacles }) {
  const rand = rng(2026);
  const sunDir = new THREE.Vector3(10, 25, 14);
  const sky = makeSky(sunDir);
  const terrain = makeTerrain(); group.add(terrain);

  /* ----- thác nước: vách đá + dòng nước trượt + sương ----- */
  const cliffParts = [];
  const rockMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: 0x8e8a80 });
  const addMass = (x, y, z, sx, sy, sz, c) => {
    const m = new THREE.Mesh(rockGeometry(rand), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: c }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = rand() * 6; group.add(m); cliffParts.push(m);
  };
  addMass(-15, 7, FALL_Z - 4, 11, 14, 7, 0x8a8478); addMass(15, 7, FALL_Z - 4, 11, 14, 7, 0x918b7f);
  addMass(0, 11, FALL_Z - 9.5, 17, 13, 5, 0x857f74); addMass(-26, 5, FALL_Z + 3, 8, 10, 7, 0x8a8478); addMass(26, 5, FALL_Z + 3, 8, 10, 7, 0x8a8478);
  addMass(0, 13, FALL_Z - 12, 22, 22, 7, 0x7f7a70);
  addMass(-3.1, 19.3, FALL_Z - 5.4, 3.2, 1.5, 2.4, 0x9a948a); addMass(3.1, 19.3, FALL_Z - 5.4, 3.2, 1.5, 2.4, 0x9a948a); // bờ miệng thác
  // cây xanh trên vách
  const fallTex = waterTexture('fall'); fallTex.repeat.set(1, 3);
  const fallMat = new THREE.MeshStandardMaterial({ map: fallTex, transparent: true, opacity: 0.93, roughness: 0.2, emissive: 0x2a6f93, emissiveIntensity: 0.25 });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 19.6), fallMat);
  fall.position.set(0, 9.9, FALL_Z - 3.1); fall.rotation.x = -0.05; group.add(fall);
  const poolTex = pondTexture(); poolTex.repeat.set(2, 2);
  const poolMat = new THREE.MeshStandardMaterial({ map: poolTex, roughness: 0.1, transparent: true, opacity: 0.92, emissive: 0x1d5878, emissiveIntensity: 0.2 });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5.2, 28).rotateX(-Math.PI / 2), poolMat);
  pool.position.set(0, 0.1, FALL_Z + 0.8); group.add(pool);

  // sương nước ở chân thác
  const mistTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const MIST = 26, mistPos = new Float32Array(MIST * 3), mistSeed = [];
  for (let i = 0; i < MIST; i++) mistSeed.push({ x: (rand() - 0.5) * 6, z: rand() * 2.6, ph: rand() * 6.28, sp: 0.18 + rand() * 0.25 });
  const mistGeo = new THREE.BufferGeometry(); mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ map: mistTex, size: 4.2, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true }));
  mist.frustumCulled = false; group.add(mist);

  /* ----- suối chảy từ thác tới hồ giữa sảnh ----- */
  const streamTex = waterTexture('stream'); streamTex.repeat.set(1, (-FALL_Z - 6) / 4);
  const streamLen = -FALL_Z - POND_R - 1;
  const streamMat = new THREE.MeshStandardMaterial({ map: streamTex, roughness: 0.15, transparent: true, opacity: 0.95, emissive: 0x1d6a8e, emissiveIntensity: 0.18 });
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(2.1, streamLen).rotateX(-Math.PI / 2), streamMat);
  stream.position.set(0, 0.08, -(POND_R + 0.5 + streamLen / 2)); group.add(stream);

  /* ----- hồ giữa sảnh thay cho đài phun ----- */
  const pondTex = pondTexture(); pondTex.repeat.set(2, 2);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(POND_R, 36).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: pondTex, roughness: 0.08, transparent: true, opacity: 0.94, emissive: 0x1d6a8e, emissiveIntensity: 0.18 }));
  pond.position.y = 0.1; group.add(pond);
  obstacles.push({ x: 0, z: 0, r: POND_R + 0.2 });

  /* ----- đá: vành hồ, hai bờ suối, chân thác, vài tảng rải rác ----- */
  const rocks = [];
  for (let i = 0; i < 20; i++) { // vành hồ (chừa khe cho suối chảy vào ở hướng nam)
    const a = (i / 20) * 6.283; if (Math.abs(Math.atan2(Math.sin(a), -Math.cos(a))) < 0.2) continue;
    const s = 0.55 + rand() * 0.5; rocks.push({ x: Math.sin(a) * (POND_R + 0.15), z: Math.cos(a) * (POND_R + 0.15), y: 0, sx: s, sy: s * 0.85, sz: s });
  }
  for (let z = -(POND_R + 1.2); z > FALL_Z + 2; z -= 1.15 + rand() * 0.6) for (const side of [-1, 1]) { // hai bờ suối
    const s = 0.28 + rand() * 0.28; rocks.push({ x: side * (1.2 + rand() * 0.35), z, y: 0, sx: s * 1.3, sy: s, sz: s });
  }
  for (let i = 0; i < 12; i++) { const a = rand() * 6.28, d = 3 + rand() * 4, s = 0.6 + rand() * 1.4; rocks.push({ x: Math.sin(a) * d, z: FALL_Z + 1 + Math.cos(a) * d, y: 0, sx: s, sy: s * 0.8, sz: s }); }
  [[9.3, 11.2], [-10.6, 8.4], [12.8, -6], [-13.4, -3.4], [5.4, 13.5]].forEach(([x, z]) => { const s = 0.5 + rand() * 0.5; rocks.push({ x, z, y: 0, sx: s, sy: s, sz: s }); obstacles.push({ x, z, r: s * 0.75 }); });
  group.add(makeRocks(rocks, rand));

  /* tấm biển D-RESET khắc trên tảng đá cạnh hồ, hướng về nơi bắt đầu */
  const bigRock = new THREE.Mesh(rockGeometry(rand), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: 0x9a968c }));
  bigRock.position.set(0, 0.55, POND_R + 1.5); bigRock.scale.set(1.5, 1.0, 0.9); group.add(bigRock);
  obstacles.push({ x: 0, z: POND_R + 1.5, r: 1.2 });
  const plate = textPlane([{ text: 'D-RESET', size: 92, y: 80 }], '#3b82f6', 400, 150, 1.5);
  plate.position.set(0, 0.95, POND_R + 2.25); plate.rotation.x = -0.12; group.add(plate);

  /* ----- cây thật: vòng gần (có bóng mát cho ghế), vòng ngoài, rừng xa ----- */
  const trees = [], treeSpots = [];
  const addTree = (x, z, s, forest = false) => {
    trees.push({ x, z, s, rot: rand() * 6.28, sy: 0.95 + rand() * 0.25, forest });
    if (!forest) obstacles.push({ x, z, r: 0.5 * s });
    if (treeSpots.length < 14) treeSpots.push({ x, y: 3.2 * s + 1, z });
  };
  for (let i = 0; i < 7; i++) {
    if (i === 3) continue; // hướng nam: để trống cho suối và ghế
    const p = polar(11.2, (i + 0.5) * STEP); addTree(p.x, p.z, 1.15);
    const q = polar(7.4, (i + 0.5) * STEP); if (i !== 2 && i !== 4) addTree(q.x, q.z, 0.8);
  }
  [[-3.9, -12.2, 1.35], [3.9, -12.2, 1.35]].forEach(([x, z, s]) => addTree(x, z, s)); // tán mát cho ghế
  for (let i = 0; i < 150; i++) { // rừng quanh thung lũng, chừa hành lang trước thác
    const a = rand() * 6.283, r = 27 + rand() * 75;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (z < -20 && Math.abs(x) < 11 && r < 60) continue;
    // không mọc xuyên tòa nhà (vòng 15 đến 24)
    if (r < 25.5) continue;
    addTree(x, z, 1.0 + rand() * 1.1, true);
  }
  const forest = makeForest(trees.map((t) => ({ ...t })), 'round');
  group.add(forest.group);
  const pineSpots = []; for (let i = 0; i < 60; i++) { const a = rand() * 6.283, r = 60 + rand() * 90; pineSpots.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, s: 1.6 + rand() * 1.8, rot: rand() * 6.28 }); }
  const pines = makeForest(pineSpots, 'pine'); group.add(pines.group);

  /* ----- cỏ + hoa trên bãi cỏ quảng trường ----- */
  const gp = [], fp = [];
  for (let n = 0; n < 9000 && gp.length < 3600; n++) {
    const r = Math.sqrt(rand()) * 15.2, a = rand() * 6.283, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (r < POND_R + 0.7 || onLane(x, z) || onStream(x, z)) continue;
    gp.push({ x, z });
    if (rand() < 0.07 && fp.length < 260) fp.push({ x: x + 0.1, z: z + 0.1 });
  }
  const grass = makeGrass(gp, rand); group.add(grass);
  group.add(makeFlowers(fp, rand));
  // bãi cỏ ngoài quảng trường
  const outer = []; for (let n = 0; n < 2400; n++) { const a = rand() * 6.283, r = 24 + rand() * 40; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (z < -22 && Math.abs(x) < 6) continue; outer.push({ x, z }); }
  const outerGrass = makeGrass(outer, rand); group.add(outerGrass);

  /* ----- ghế đá nhìn ra thác (chạm để ngồi) ----- */
  const benches = [];
  const stone = mat(0xb9b3a6, 1);
  [[-2.3, -9.6], [2.3, -9.6], [-2.5, -13.0], [2.5, -13.0]].forEach(([x, z]) => {
    const b = new THREE.Group(); b.position.set(x, 0, z);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.6), stone); seat.position.y = 0.46;
    const legM = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.5), stone);
    const l1 = legM.clone(); l1.position.set(-0.6, 0.21, 0); const l2 = legM.clone(); l2.position.set(0.6, 0.21, 0);
    b.add(seat, l1, l2); group.add(b);
    obstacles.push({ x: x - 0.55, z, r: 0.5 }, { x: x + 0.55, z, r: 0.5 });
    benches.push({ group: b, seat: new THREE.Vector3(x, 0, z + 0.1) });
  });

  /* ----- chim bay xa trên trời ----- */
  const birds = [];
  const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.4, 0, 0.3, 0.2, 0, -0.5], 3)); wingGeo.computeVertexNormals();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x33415c, side: THREE.DoubleSide, fog: false });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(), l = new THREE.Mesh(wingGeo, birdMat), r = new THREE.Mesh(wingGeo, birdMat);
    r.scale.x = -1; g.add(l, r); g.scale.setScalar(1.3); group.add(g);
    birds.push({ g, l, r, rad: 45 + rand() * 40, h: 24 + rand() * 18, sp: (0.05 + rand() * 0.06) * (rand() < 0.5 ? -1 : 1), a: rand() * 6.28, ph: rand() * 6.28 });
  }

  /* ----- tảng đá quét thật (Poly Haven boulder_01, đã giảm texture và nén); chỉ tải nếu khai báo trong manifest ----- */
  const heroRocks = new THREE.Group(); group.add(heroRocks);
  let decor = null, lite = false;
  const api = {
    /** Gắn vài tảng đá thật làm điểm nhấn hai bên suối phía trước thác. Lỗi tải thì bỏ qua, cảnh vẫn nguyên. */
    async addHeroRocks(url) {
      const src = await loadModel(url); if (!src) return false;
      [[-2.6, -16.2, 1.7, 0.4], [2.7, -17.4, 1.4, 2.2], [-5.2, -29.6, 2.4, 4.1]].forEach(([x, z, k, r]) => {
        const m = src.clone(true); m.position.set(x, 0.05, z); m.scale.setScalar(k); m.rotation.y = r; heroRocks.add(m);
      });
      return true;
    },
    /** Cây bụi, hoa, gốc cây, nấm, vài cây (Kenney, CC0). Lỗi tải thì bỏ qua. */
    async addDecor(baseUrl) {
      const r = await addDecor({ baseUrl, group, obstacles });
      if (r) { decor = r; r.deco.visible = true; r.flowers.visible = !lite; }
      return !!r;
    },
    sky, benches, treeSpots, waterAt: { x: 0, z: FALL_Z + 2 }, seatYaw: 0,
    setLite(on) {
      grass.count = on ? 900 : gp.length; outerGrass.count = on ? 300 : outer.length;
      forest.setCount(on ? 30 : trees.length); pines.setCount(on ? 10 : pineSpots.length);
      lite = on; if (decor) decor.flowers.visible = !on;
      heroRocks.visible = !on; // đá quét nặng (khoảng 54 nghìn tam giác mỗi tảng): tắt ở chế độ nhẹ
      birds.forEach((b, i) => { b.g.visible = !on || i < 2; });
    },
    update(t, dt, camPos) {
      wind.value = t;
      sky.material.uniforms.uTime.value = t; sky.position.copy(camPos);
      fallTex.offset.y -= dt * 0.9; streamTex.offset.y += dt * 0.28;
      poolTex.offset.x += dt * 0.012; pondTex.offset.set(Math.sin(t * 0.07) * 0.1, Math.cos(t * 0.05) * 0.1);
      for (let i = 0; i < MIST; i++) {
        const s = mistSeed[i], k = ((t * s.sp + s.ph) % 1);
        mistPos[i * 3] = s.x + Math.sin(t * 0.3 + s.ph) * 0.6; mistPos[i * 3 + 1] = 0.4 + k * 4.2; mistPos[i * 3 + 2] = FALL_Z - 2.6 + s.z;
      }
      mistGeo.attributes.position.needsUpdate = true;
      mist.material.opacity = 0.42 + Math.sin(t * 0.4) * 0.06;
      for (const b of birds) {
        if (!b.g.visible) continue;
        b.a += b.sp * dt;
        const x = Math.sin(b.a) * b.rad, z = Math.cos(b.a) * b.rad, y = b.h + Math.sin(t * 0.3 + b.ph) * 2;
        b.g.position.set(x, y, z); b.g.rotation.y = b.a + (b.sp > 0 ? Math.PI / 2 : -Math.PI / 2);
        const f = Math.sin(t * 6 + b.ph) * 0.6; b.l.rotation.z = f; b.r.rotation.z = -f;
      }
    },
  };
  return api;
}
