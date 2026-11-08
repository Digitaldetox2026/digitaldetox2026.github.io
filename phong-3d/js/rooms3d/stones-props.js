// Khu vườn của phòng Thử thách: lối 14 viên đá uốn lượn chia 3 chặng (màu đá khác nhau), cổng chặng, bụi cây, hoa.
// Mỗi ngày xong thì viên đá sáng lên và một cây nhỏ mọc cạnh đó (thấy tiến độ, không có điểm số).
import * as THREE from 'three';
import { textPlane } from '../scene.js';
import { manifest, loadModel } from '../assets.js';
import { place } from '../valley-decor.js';
import { rng } from '../nature-parts.js';
import { mat, proxy, glow } from './parts.js';
import { buildHourglass, buildCharger, buildDinner, buildIfThenBoard } from './stones-things.js';

export const N = 14;
const STAGE_OF = (n) => (n <= 4 ? 0 : n <= 9 ? 1 : 2);
const STAGE_STONE = [0xcdb893, 0x9db3c2, 0xbba3cc];     // cát, xanh xám, tím nhạt
const STAGE_TREE = [0x66bb6a, 0x43a047, 0x7cb342];
const easeBack = (k) => { const c = 1.7, x = Math.min(1, k) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

/** Đường uốn chữ S từ gần cửa tới tường sau; đặt 14 điểm cách đều theo độ dài đường. Trả về [{x, z, tx, tz}]. */
function pathPoints() {
  const f = (t) => ({ x: 3.2 * Math.sin(t * Math.PI * 2), z: 3.4 - t * 9.6 });
  const pts = []; let acc = 0, prev = f(0); const cum = [0]; const raw = [prev];
  for (let i = 1; i <= 400; i++) { const p = f(i / 400); acc += Math.hypot(p.x - prev.x, p.z - prev.z); cum.push(acc); raw.push(p); prev = p; }
  for (let k = 0; k < N; k++) {
    const target = (acc * k) / (N - 1); let i = cum.findIndex((c) => c >= target); if (i < 0) i = 400; i = Math.max(1, Math.min(400, i));
    const a = raw[i - 1], b = raw[i], l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    pts.push({ x: raw[i].x, z: raw[i].z, tx: (b.x - a.x) / l, tz: (b.z - a.z) / l });
  }
  return pts;
}

function stoneTex(n, hex, done) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const base = new THREE.Color(hex); if (done) base.lerp(new THREE.Color(0xffe08a), 0.7);
  g.fillStyle = `#${base.getHexString()}`; g.beginPath(); g.arc(64, 64, 63, 0, 6.3); g.fill();
  g.strokeStyle = done ? '#f59e0b' : 'rgba(0,0,0,.15)'; g.lineWidth = done ? 7 : 4; g.beginPath(); g.arc(64, 64, 56, 0, 6.3); g.stroke();
  g.fillStyle = done ? '#92400e' : '#5a564c'; g.font = '700 58px "Be Vietnam Pro", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 56); g.font = '600 18px "Be Vietnam Pro", system-ui, sans-serif'; g.fillText('ngày', 64, 100);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/**
 * Dựng khu vườn. api: { isDone(n), nextDay() }; on: { stone(n), prop(id) }. T = chữ bảng "Nếu... thì...".
 */
export function buildStonesProps({ built, ctx, api, on, T, stageNames }) {
  const group = built.group, picker = ctx.picker, c = built.center, rand = rng(31);
  const addObs = (x, z, r) => { const o = { x: c.x + x, z: c.z + z, r }; built.obstacles.push(o); return o; };
  for (const k of ['shape', 'pedestal', 'rug']) built.parts[k].visible = false;
  const pi = built.obstacles.indexOf(built.parts.pedObstacle); if (pi >= 0) built.obstacles.splice(pi, 1);
  for (const p of built.parts.plants) p.group.visible = false;

  /* cỏ */
  const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d');
  gg.fillStyle = '#8bc77c'; gg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { gg.fillStyle = `rgba(${60 + rand() * 40},${130 + rand() * 60},${60 + rand() * 40},.35)`; gg.fillRect(rand() * 128, rand() * 128, 2, 5); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(6, 6); gt.colorSpace = THREE.SRGBColorSpace;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(15.8, 15.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  grass.position.y = 0.012; group.add(grass);

  /* lối đá */
  const pts = pathPoints(), stones = [], trees = [], flash = [];
  const normalOf = (p) => ({ x: -p.tz, z: p.tx });
  pts.forEach((p, i) => {
    const n = i + 1, st = STAGE_OF(n), g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = rand() * 6;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.16, 9), mat(STAGE_STONE[st], 0.95, { flatShading: true })); body.position.y = 0.07; g.add(body);
    const topM = new THREE.MeshStandardMaterial({ map: stoneTex(n, STAGE_STONE[st], false), roughness: 0.9 });
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), topM); top.position.y = 0.153; top.rotation.y = -g.rotation.y; g.add(top);
    const gl = glow(0xffd36b, 2.2, 0); gl.position.y = 0.3; g.add(gl);
    g.add(proxy(0.7, 0.15)); group.add(g);
    picker.register({ object: g, reach: 3.6, halo: false, onTap: () => on.stone(n) });
    stones.push({ g, topM, gl, st, n });
    // cây nhỏ cạnh đá, luân phiên hai bên lối
    const nm = normalOf(p), side = i % 2 ? 1 : -1, tx = p.x + nm.x * 1.05 * side, tz = p.z + nm.z * 1.05 * side;
    const tg = new THREE.Group(); tg.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 7), mat(0x7a4a28, 0.9)); trunk.position.y = 0.25; tg.add(trunk);
    const can = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), mat(STAGE_TREE[st], 0.9)); can.position.y = 0.78; can.scale.y = 1.15; tg.add(can);
    const can2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), mat(STAGE_TREE[st], 0.9)); can2.position.set(0.15, 1.1, 0.05); tg.add(can2);
    tg.scale.setScalar(0.001); tg.visible = false; group.add(tg);
    trees.push({ g: tg, t: 0, grown: false, x: tx, z: tz, obs: null, side });
  });

  /* cổng chặng: hai cột + xà + bảng tên chặng, đặt trước viên đá đầu mỗi chặng */
  [[0, 0], [4, 1], [9, 2]].forEach(([idx, st]) => {
    const p = pts[idx], nm = normalOf(p), gx = p.x - p.tx * (idx ? 0.85 : 0.9), gz = p.z - p.tz * (idx ? 0.85 : 0.9), g = new THREE.Group(); g.position.set(gx, 0, gz);
    g.rotation.y = Math.atan2(-p.tx, -p.tz);
    const wd = mat(0x8a5a33, 0.85);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 8), wd); post.position.set(s * 1.25, 1.15, 0); g.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 0.16), wd); beam.position.y = 2.3; g.add(beam);
    const nameTxt = stageNames[st];
    const sign = textPlane([{ text: nameTxt, size: Math.min(58, Math.floor(540 / (nameTxt.length * 0.56))), y: 70 }], `#${new THREE.Color(STAGE_STONE[st]).getHexString()}`, 600, 140, 2.1);
    sign.position.set(0, 2.0, 0.02); g.add(sign);
    const vine = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 6, 20, Math.PI), mat(0x4aa65f, 0.9)); vine.position.y = 2.22; vine.scale.y = 0.18; g.add(vine);
    group.add(g);
    for (const s of [-1, 1]) addObs(gx + nm.x * s * 1.25, gz + nm.z * s * 1.25, 0.18);
  });

  /* đồ vật gợi nhớ: đặt cạnh viên đá của ngày, phía đối diện cây */
  const near = (idx, dist) => { const p = pts[idx], nm = normalOf(p), s = (idx % 2 ? 1 : -1) * -1; return { x: p.x + nm.x * dist * s, z: p.z + nm.z * dist * s, p }; };
  const putThing = (obj, at, id, r) => { obj.position.set(at.x, 0, at.z); obj.rotation.y = Math.atan2(at.p.x - at.x, at.p.z - at.z); group.add(obj); addObs(at.x, at.z, r);
    picker.register({ object: obj, reach: 5, haloAt: [0, 0.7, 0], haloSize: 1.5, haloColor: 0xfde68a, onTap: () => on.prop(id) }); return obj; };
  putThing(buildCharger(), near(2, 2.4), 'charger', 0.7);
  putThing(buildDinner(), near(3, 2.7), 'table', 0.95);
  const board = putThing(buildIfThenBoard(T), near(12, 2.5), 'board', 0.8);

  /* đồng hồ cát: hiện cạnh viên đá của ngày đang làm */
  const hg = buildHourglass(); hg.group.visible = false; group.add(hg.group);

  /* mũi tên vàng chỉ viên đá tiếp theo */
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), new THREE.MeshBasicMaterial({ color: 0xfbbf24, toneMapped: false })); arrow.rotation.x = Math.PI; group.add(arrow);
  const arrowGlow = glow(0xfde68a, 1.3, 0.45); group.add(arrowGlow);

  /* bụi cây và hoa (mô hình Kenney, CC0) dọc tường; tải lỗi thì bỏ qua */
  manifest().then(async (m) => {
    if (!m.kenney) return;
    const names = ['plant_bushLarge', 'plant_bush', 'plant_bushDetailed', 'flower_purpleA', 'flower_redA', 'flower_yellowA', 'flower_yellowB', 'flower_redB'];
    const got = await Promise.all(names.map((n) => loadModel(`${m.kenney}${n}.glb`)));
    if (!got.every(Boolean)) return;
    const M = Object.fromEntries(names.map((n, i) => [n, got[i]])), deco = new THREE.Group(); group.add(deco);
    const bushes = ['plant_bushLarge', 'plant_bush', 'plant_bushDetailed'];
    for (let k = -6.6; k <= 6.7; k += 1.3) {
      place(deco, M[bushes[Math.floor(rand() * 3)]], { x: k + rand() * 0.4, z: -7.3, h: 1.0 + rand() * 0.5, ry: rand() * 6 });
      if (k > -6 && k < 6) { place(deco, M[bushes[Math.floor(rand() * 3)]], { x: -7.35, z: k, h: 0.9 + rand() * 0.4, ry: rand() * 6 }); place(deco, M[bushes[Math.floor(rand() * 3)]], { x: 7.35, z: k, h: 0.9 + rand() * 0.4, ry: rand() * 6 }); }
    }
    const fl = names.slice(3);
    for (let n = 0, put = 0; n < 300 && put < 22; n++) {
      const x = (rand() - 0.5) * 13.4, z = -6.4 + rand() * 11;
      if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < 1.5) || built.obstacles.some((o) => Math.hypot(o.x - c.x - x, o.z - c.z - z) < 1.2)) continue;
      for (let k = 0; k < 3; k++) place(deco, M[fl[Math.floor(rand() * fl.length)]], { x: x + (rand() - 0.5) * 0.6, z: z + (rand() - 0.5) * 0.6, h: 0.32 + rand() * 0.18, ry: rand() * 6 });
      put++;
    }
    deco.visible = !ctx.lite; props.deco = deco;
  });

  const worldPos = new THREE.Vector3();
  const props = {
    group, stones: pts,
    /** Vị trí thế giới của viên đá ngày n (để người dẫn đường đi tới). */
    stoneWorld(n) { const p = pts[n - 1]; return worldPos.set(c.x + p.x, 0, c.z + p.z); },
    stoneLocal: (n) => pts[n - 1],
    /** Cập nhật hình theo trạng thái đã lưu. animate=true thì cây mọc từ từ. */
    sync(animate = false, only = 0) {
      stones.forEach((s) => {
        const done = api.isDone(s.n), tr = trees[s.n - 1];
        if (only && s.n !== only) return;
        s.topM.map = stoneTex(s.n, STAGE_STONE[s.st], done); s.topM.needsUpdate = true;
        s.gl.material.opacity = done ? 0.4 : 0;
        if (done && !tr.grown) {
          tr.grown = true; tr.g.visible = true; tr.t = animate ? 0 : 1; if (!animate) tr.g.scale.setScalar(1);
          tr.obs = addObs(tr.x, tr.z, 0.32); if (animate) flash.push({ s, t: 0 });
        }
        if (!done && tr.grown) { tr.grown = false; tr.g.visible = false; const i = built.obstacles.indexOf(tr.obs); if (i >= 0) built.obstacles.splice(i, 1); }
      });
    },
    setPlan(text) { board.userData.setPlan(text || ''); },
    showHourglass(n) {
      const p = pts[n - 1], nm = normalOf(p), s = ((n - 1) % 2 ? 1 : -1) * -1;   // phía đối diện cây của viên đá
      hg.group.position.set(p.x + nm.x * 1.6 * s, 0, p.z + nm.z * 1.6 * s); hg.group.visible = true; hg.setProgress(0);
    },
    setHourglass(f) { hg.setProgress(f); },
    hideHourglass() { hg.group.visible = false; },
    setLite(on) { if (props.deco) props.deco.visible = !on; },
    update(t, dt) {
      const nd = api.nextDay();
      arrow.visible = arrowGlow.visible = !!nd;
      if (nd) { const p = pts[nd - 1]; arrow.position.set(p.x, 0.75 + Math.sin(t * 2.4) * 0.07, p.z); arrow.rotation.y = t * 1.2; arrowGlow.position.set(p.x, 0.5, p.z); }
      for (const tr of trees) if (tr.grown && tr.t < 1) { tr.t = Math.min(1, tr.t + dt / 1.8); tr.g.scale.setScalar(Math.max(0.001, easeBack(tr.t))); }
      for (let i = flash.length - 1; i >= 0; i--) { const f = flash[i]; f.t += dt; f.s.gl.material.opacity = 0.4 + 0.6 * Math.max(0, 1 - f.t / 1.6); if (f.t > 1.6) flash.splice(i, 1); }
    },
  };
  props.sync(false);
  return props;
}
