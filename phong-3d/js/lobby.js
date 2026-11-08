// Sảnh: quảng trường mở, 7 tòa nhà (mỗi phòng một tòa) xếp vòng tròn, cửa tự mở khi nhân vật lại gần.
import * as THREE from 'three';
import { mat, textPlane } from './scene.js';
import { buildValley } from './valley.js';

export const LOBBY_LIMIT = 14.4;   // nhân vật không đi xa hơn vòng này
const PLAZA_R = 15.6, FACADE = 15.8, DEPTH = 7, DOOR_OPEN_DIST = 6.5;
const STEP = (2 * Math.PI) / 7;
const polar = (r, phi) => new THREE.Vector3(r * Math.sin(phi), 0, r * Math.cos(phi));
const pale = (hex, k = 0.75) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k);

export function buildLobby(rooms) {
  const group = new THREE.Group();
  const obstacles = [];

  const valley = buildValley({ group, obstacles }); // địa hình, thác, hồ, cây, cỏ, ghế đá
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA_R, PLAZA_R, 0.3, 56), mat(0x93cf80, 1));
  plaza.position.y = -0.15; group.add(plaza); // bãi cỏ quảng trường (cỏ thật mọc trên đó)

  /* lối đi màu từ đài phun tới từng cửa */
  rooms.forEach((room, i) => {
    const phi = i * STEP;
    const g = new THREE.Group(); g.position.copy(polar(9.2, phi)); g.rotation.y = phi;
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3, 12.4).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: pale(room.color, 0.7), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    path.position.y = 0.02; g.add(path); group.add(g);
  });

  /* bờ cây thấp chạy giữa các cửa (chừa lối ở mỗi cửa) */
  const hedgeMat = mat(0x3f9f5a);
  for (let i = 0; i < 7; i++) {
    if (i === 3) continue; // hướng nam để mở cho suối và ghế đá nhìn ra thác
    const a0 = i * STEP + 0.2, a1 = (i + 1) * STEP - 0.2;
    const t0 = Math.PI / 2 - a1, arc = a1 - a0;
    const h = new THREE.Mesh(new THREE.TorusGeometry(15.2, 0.5, 6, 20, arc), hedgeMat);
    h.rotation.x = Math.PI / 2;
    const hg = new THREE.Group(); hg.rotation.y = -t0; hg.position.y = 0.45; hg.add(h); group.add(hg);
  }

  /* 7 tòa nhà */
  const doors = [];
  rooms.forEach((room, i) => {
    const phi = i * STEP;
    const col = new THREE.Color(room.color);
    const b = new THREE.Group();
    b.position.copy(polar(FACADE + DEPTH / 2, phi)); b.rotation.y = phi + Math.PI; // mặt trước quay vào giữa
    const Z = DEPTH / 2; // mặt tiền ở z = +Z (hệ tọa độ tòa nhà)

    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 6.6, DEPTH), mat(pale(room.color, 0.78)));
    body.position.y = 3.3;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, DEPTH + 1), mat(col.clone().multiplyScalar(0.85)));
    roof.position.y = 6.85;
    b.add(body, roof);

    // ô cửa (màu sáng phía sau cánh cửa) + khung
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.4),
      new THREE.MeshBasicMaterial({ color: pale(room.color, 0.4), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    bg.position.set(0, 1.7, Z + 0.02);
    const trim = mat(0xffffff);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.7, 0.2), trim); postL.position.set(-1.55, 1.85, Z + 0.1);
    const postR = postL.clone(); postR.position.x = 1.55;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 0.2), trim); lintel.position.set(0, 3.55, Z + 0.1);
    b.add(bg, postL, postR, lintel);

    // hai cánh cửa quay quanh bản lề, mở ra phía quảng trường
    const leafMat = mat(col, 0.6);
    const mk = (side) => {
      const pivot = new THREE.Group(); pivot.position.set(side * 1.4, 0, Z + 0.1);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.3, 0.12), leafMat);
      leaf.position.set(-side * 0.7, 1.65, 0); pivot.add(leaf); b.add(pivot); return pivot;
    };
    const left = mk(-1), right = mk(1);

    const label = textPlane([
      { text: room.icon + ' ' + room.name, size: room.name.length > 12 ? 72 : 88, y: room.demo ? 86 : 112 },
      ...(room.demo ? [{ text: 'Bản demo', size: 56, fill: '#b45309', y: 172 }] : []),
    ], room.color, 640, 230, 6.4);
    label.position.set(0, 4.95, Z + 0.03); b.add(label);

    const mapMat = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: pale(room.color, 0.5), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    mapMat.position.set(0, 0.03, Z + 1.6); b.add(mapMat);

    group.add(b);
    doors.push({ room, phi, pos: polar(FACADE, phi), back: polar(12.4, phi), left, right, open: 0 });
  });

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4), new THREE.MeshBasicMaterial({ color: 0xfbbf24 }));
  arrow.rotation.x = Math.PI; group.add(arrow);

  const start = new THREE.Vector3(-4, 0, 7.5);
  const dx = doors[0].pos.x - start.x, dz = doors[0].pos.z - start.z;

  return {
    group, doors, obstacles, start, valley,
    startHeading: Math.atan2(dx, dz),        // hướng mặt nhân vật
    startYaw: Math.atan2(-dx, -dz),          // góc camera (đứng sau lưng)
    update(t, dt, player, goalIdx = 0) {
      for (const d of doors) {
        const near = Math.hypot(d.pos.x - player.x, d.pos.z - player.z) < DOOR_OPEN_DIST;
        d.open += ((near ? 1 : 0) - d.open) * (1 - Math.exp(-dt * 4));
        d.left.rotation.y = -d.open * 1.75;
        d.right.rotation.y = d.open * 1.75;
      }
      const p = doors[goalIdx >= 0 ? goalIdx : 0].pos;
      arrow.visible = goalIdx >= 0;
      arrow.position.set(p.x * 1.25, 11.4 + Math.sin(t * 3) * 0.3, p.z * 1.25);
    },
  };
}
