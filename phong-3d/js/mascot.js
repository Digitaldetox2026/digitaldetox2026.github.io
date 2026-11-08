// Linh vật "Reset": dựng lại y như mascot/index.html (hình khối Three.js), hoạt họa tự làm.
// API giữ nguyên: play('idle'|'walk'|'wave'|'jump'|'point'|'nod'). Lời nói do ui.say() lo.
import * as THREE from 'three';

const M = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
const SKIN = 0xffd9c2, HAIR = 0x7b4a2c;
const sphere = (r, mat, sx = 1, sy = 1, sz = 1, seg = 24) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat);
  m.scale.set(sx, sy, sz); return m;
};
const put = (o, x, y, z, parent) => { o.position.set(x, y, z); parent.add(o); return o; };

const MODES = { idle: Infinity, walk: Infinity, wave: 2.6, jump: 2.4, point: 3, nod: 1.8, sit: Infinity, chair: Infinity, stand: Infinity };

export function createMascot() {
  const root = new THREE.Group();        // vị trí + hướng nhìn trong thế giới
  const mascot = new THREE.Group();      // phần được hoạt họa
  root.add(mascot);
  root.scale.setScalar(0.34);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.16 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; shadow.scale.set(1, 0.65, 1); root.add(shadow);

  /* thân */
  const coat = M(0xe9ecf3, 0.7);
  const profile = [[0.001, 1.0], [0.6, 1.02], [0.67, 1.25], [0.62, 1.7], [0.52, 2.05], [0.38, 2.22], [0.001, 2.27]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), coat);
  torso.scale.set(1.08, 1, 0.8); mascot.add(torso);
  put(sphere(0.3, M(0x9cc4ec), 0.62, 0.95, 0.2), 0, 1.98, 0.45, mascot);
  for (const s of [-1, 1]) {
    const l = put(sphere(0.2, M(0xf6f7fb), 0.45, 1.1, 0.22), s * 0.24, 1.85, 0.46, mascot);
    l.rotation.z = -s * 0.35;
    put(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.05), M(0xd4d9e4)), s * 0.32, 1.22, 0.54, mascot);
  }
  put(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), M(0xcdd3df)), 0, 1.4, 0.53, mascot);
  const belt = put(new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 10, 32), M(0x5b3a29)), 0, 0.95, 0, mascot);
  belt.rotation.x = Math.PI / 2; belt.scale.set(0.95, 0.8, 1);
  put(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), M(0xf2b705, 0.3)), 0, 0.95, 0.42, mascot);
  const steth = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 10, 36, Math.PI), M(0x4b5563, 0.4));
  steth.rotation.z = Math.PI; steth.position.set(0, 2.2, 0.38); steth.rotation.x = -0.25; mascot.add(steth);
  put(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), M(0xb8c0cc, 0.25)), 0, 1.74, 0.5, mascot).rotation.x = Math.PI / 2;

  /* chân (có đầu gối để ngồi ghế được) */
  const legs = {}, knees = {};
  for (const sd of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sd * 0.28, 1.05, 0); g.rotation.order = 'YXZ'; mascot.add(g);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.22, 0.52, 16), M(0x6b2d3a)), 0, -0.25, 0, g);
    const k = new THREE.Group(); k.position.y = -0.5; g.add(k);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.52, 16), M(0x6b2d3a)), 0, -0.25, 0, k);
    put(sphere(0.3, M(0xc9a77b), 1, 0.55, 1.45), 0, -0.38, 0.14, k);
    put(sphere(0.16, M(0x6fa8dc), 1, 0.6, 0.9), 0, -0.25, 0.3, k);
    legs[sd] = g; knees[sd] = k;
  }

  /* tay */
  const makeArm = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.74, 1.95, 0);
    put(new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.45, 8, 12), coat), 0, -0.32, 0, g);
    put(sphere(0.2, M(SKIN)), 0, -0.82, 0, g);
    mascot.add(g); return g;
  };
  const armL = makeArm(-1), armR = makeArm(1);
  armL.rotation.z = -0.14; armR.rotation.z = 0.14;

  /* đầu */
  const head = new THREE.Group(); head.position.y = 3.3; mascot.add(head);
  head.add(sphere(1.15, M(SKIN, 0.6), 1.06, 1, 1, 40));
  for (const s of [-1, 1]) put(sphere(0.2, M(0xffcdb3), 0.5, 1, 0.8), s * 1.2, -0.1, 0, head);

  const hairMat = M(HAIR, 0.75); hairMat.side = THREE.DoubleSide;
  const hg = new THREE.SphereGeometry(1.22, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.65);
  {
    const p = hg.attributes.position, TH = Math.PI * 0.65;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, y, z);
      const th = Math.acos(y / r), ph = Math.atan2(z, -x), nz = Math.sin(ph);
      const edge = Math.PI * (nz >= 0 ? 0.48 - 0.12 * nz : 0.48 - 0.14 * nz);
      const t2 = th * edge / TH;
      p.setXYZ(i, -r * Math.cos(ph) * Math.sin(t2), r * Math.cos(t2), r * Math.sin(ph) * Math.sin(t2));
    }
    hg.computeVertexNormals();
  }
  const hair = new THREE.Mesh(hg, hairMat); hair.scale.set(1.07, 1, 1.03); head.add(hair);
  put(sphere(1, M(HAIR, 0.75), 0.92, 0.26, 0.42), 0.12, 0.76, 0.86, head).rotation.z = -0.16;
  put(sphere(1, M(HAIR, 0.75), 0.7, 0.13, 0.55), 0.12, 1.2, 0.3, head).rotation.z = -0.12;

  const eyes = [];
  const makeEye = (side) => {
    const g = new THREE.Group(); g.position.set(side * 0.46, -0.04, 1.03); g.rotation.y = side * 0.4;
    g.add(sphere(1, M(0xffffff, 0.3), 0.3, 0.37, 0.12));
    put(sphere(1, M(0x2f6fd6, 0.25), 0.23, 0.29, 0.1), 0, -0.01, 0.07, g);
    put(sphere(1, M(0x7fb2ff, 0.25), 0.15, 0.17, 0.08), 0, -0.1, 0.1, g);
    put(sphere(1, M(0x0f172a, 0.3), 0.115, 0.15, 0.08), 0, 0.0, 0.12, g);
    put(sphere(1, M(0xffffff, 0.1), 0.055, 0.065, 0.05), 0.07, 0.1, 0.17, g);
    put(sphere(1, M(0xffffff, 0.1), 0.03, 0.035, 0.03), -0.08, -0.12, 0.16, g);
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.028, 8, 24, Math.PI), M(0x2b2118));
    lid.scale.set(1, 1.15, 1); lid.position.set(0, 0.05, 0.1); g.add(lid);
    head.add(g); eyes.push(g);
  };
  makeEye(-1); makeEye(1);
  for (const s of [-1, 1]) {
    const b = put(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 6, 10), M(HAIR)), s * 0.52, 0.43, 1.0, head);
    b.rotation.z = Math.PI / 2 + s * 0.14; b.rotation.y = s * 0.45;
  }
  put(sphere(0.05, M(0xf0b79c), 1, 0.8, 0.8), 0, -0.3, 1.11, head);
  const mouth = put(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 20, Math.PI), M(0xb4543a)), 0, -0.46, 1.03, head);
  mouth.rotation.z = Math.PI;
  for (const s of [-1, 1]) {
    const c = put(sphere(0.14, new THREE.MeshStandardMaterial({ color: 0xff9aa2, transparent: true, opacity: 0.55, roughness: 1 }), 1, 0.8, 0.3), s * 0.74, -0.3, 0.84, head);
    c.rotation.y = s * 0.85;
  }

  /* hoạt họa */
  let breathK = 0, mode = 'idle', modeT0 = 0, pointSide = -1, nextBlink = 2, blinkT = -1, now = 0;
  const cur = { aLz: -0.14, aLx: 0, aRz: 0.14, aRx: 0, lL: 0, lR: 0, lLy: 0, lRy: 0, kL: 0, kR: 0, hx: 0, hy: 0, hz: 0, y: 0, ry: 0, lean: 0, eye: 1 };

  function play(name, keepSide) {
    if (!(name in MODES)) return;
    if (name === 'point' && !keepSide) pointSide = -pointSide;
    mode = name; modeT0 = now;
  }

  function update(t, dt) {
    now = t;
    const mt = t - modeT0;
    if (mt > MODES[mode]) play('idle', true);
    const T = { aLz: -0.14, aLx: 0, aRz: 0.14, aRx: 0, lL: 0, lR: 0, lLy: 0, lRy: 0, kL: 0, kR: 0, eye: 1, hx: 0, hy: Math.sin(t * 0.8) * 0.16,
      hz: Math.sin(t * 0.6) * 0.03, y: Math.sin(t * 2) * 0.04, ry: 0, lean: 0 };
    if (mode === 'walk') {
      const w = Math.sin(t * 7);
      T.lL = w * 0.7; T.lR = -w * 0.7; T.aLx = -w * 0.6; T.aRx = w * 0.6;
      T.y = Math.abs(Math.cos(t * 7)) * 0.1; T.lean = 0.06; T.hy = Math.sin(t * 3.5) * 0.1;
    } else if (mode === 'wave') {
      T.aRz = 2.5 + Math.sin(t * 12) * 0.28; T.hy = 0.12; T.hz = 0.05;
    } else if (mode === 'jump') {
      const j = Math.abs(Math.sin(mt * 4.2));
      T.y = j * 0.95; T.aLz = -2.5; T.aRz = 2.5; T.lL = T.lR = -0.35 * j; T.hy = 0;
    } else if (mode === 'point') {
      const bob = Math.sin(t * 6) * 0.05;
      if (pointSide > 0) T.aRz = 1.55 + bob; else T.aLz = -1.55 - bob;
      T.hy = 0.5 * pointSide; T.ry = 0.35 * pointSide;
    } else if (mode === 'sit') {
      // ngồi xếp bằng, tay đặt lên đầu gối, lưng thẳng, mắt nhắm nhẹ, thở chậm
      const br = Math.sin(t * 1.3);
      T.y = -0.8 + br * 0.025; T.lL = T.lR = -1.5; T.lLy = 0.55; T.lRy = -0.55;
      T.aLx = T.aRx = -0.85; T.aLz = -0.3; T.aRz = 0.3; T.hx = 0.08 + br * 0.02; T.hy = 0; T.hz = 0; T.eye = 0.12;
    } else if (mode === 'chair') {
      // ngồi ghế: đùi nằm ngang, cẳng chân thẳng xuống, tay đặt lên đùi, mắt nhắm nhẹ
      const br = Math.sin(t * 1.3);
      T.y = -0.05 + br * 0.02; T.lL = T.lR = -1.5; T.kL = T.kR = 1.5; T.lLy = 0.08; T.lRy = -0.08;
      T.aLx = T.aRx = -0.8; T.aLz = -0.22; T.aRz = 0.22; T.hx = 0.06 + br * 0.015; T.hy = 0; T.hz = 0; T.eye = 0.12;
    } else if (mode === 'stand') {
      // đứng thở: hai tay buông tự nhiên, mắt nhắm nhẹ, đầu gối hơi thả lỏng
      const br = Math.sin(t * 1.3);
      T.y = br * 0.02; T.aLz = -0.2; T.aRz = 0.2; T.hx = 0.05; T.hy = 0; T.hz = 0; T.eye = 0.12; T.lL = T.lR = -0.05; T.kL = T.kR = 0.1;
    } else if (mode === 'nod') {
      const env = Math.min(1, mt * 4) * Math.min(1, (1.8 - mt) * 4);
      T.hx = Math.sin(mt * 9) * 0.2 * env; T.hy = 0;
    }
    const k = 1 - Math.exp(-dt * 14);
    for (const key in cur) cur[key] += (T[key] - cur[key]) * k;
    mascot.position.y = cur.y; mascot.rotation.set(cur.lean, cur.ry, 0);
    armL.rotation.set(cur.aLx, 0, cur.aLz); armR.rotation.set(cur.aRx, 0, cur.aRz);
    legs[-1].rotation.set(cur.lL, cur.lLy, 0); legs[1].rotation.set(cur.lR, cur.lRy, 0);
    knees[-1].rotation.x = cur.kL; knees[1].rotation.x = cur.kR;
    head.rotation.set(cur.hx, cur.hy, cur.hz);
    torso.scale.y = 1 + Math.sin(t * 2) * 0.012 + breathK * 0.035; torso.scale.x = 1.08 + breathK * 0.05; torso.scale.z = 0.8 + breathK * 0.05;
    const sh = 1 - cur.y * 0.12; shadow.scale.set(sh, 0.65 * sh, 1);
    if (cur.eye < 0.95) { eyes.forEach((e) => { e.scale.y = Math.max(0.1, cur.eye); }); blinkT = -1; nextBlink = t + 1; }
    else if (t > nextBlink && blinkT < 0) blinkT = t;
    if (blinkT >= 0) {
      const kb = (t - blinkT) / 0.16;
      const sy = kb < 1 ? 1 - Math.sin(kb * Math.PI) * 0.92 : 1;
      eyes.forEach((e) => { e.scale.y = sy; });
      if (kb >= 1) { blinkT = -1; nextBlink = t + 2.5 + Math.random() * 2.5; }
    }
  }

  return { root, play, update, get mode() { return mode; }, set breath(v) { breathK = v; } };
}
