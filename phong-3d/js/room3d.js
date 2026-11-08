// Phòng bên trong: nền + 4 tường + lối ra phía trước, một bệ giữa phòng có vật thể để bước tới.
import * as THREE from 'three';
import { mat, textPlane, plant } from './scene.js';

export const ROOM_LIMIT = 7.2;   // nhân vật đi được trong ±7.2
export const HALF = 8;
const OBJ_Z = -3.6;

function makeShape(kind, color) {
  const m = mat(color, 0.4);
  m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.25;
  switch (kind) {
    case 'octa': return new THREE.Mesh(new THREE.OctahedronGeometry(0.8), m);
    case 'dice': return new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), m);
    case 'ico': return new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), m);
    case 'orb': return new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), m);
    case 'stack': {
      const g = new THREE.Group();
      [0.8, 0.6, 0.4].forEach((r, i) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 14), m);
        c.position.y = (i - 1) * 0.32; g.add(c);
      });
      return g;
    }
    case 'flag': {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), mat(0x94a3b8));
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.05), m);
      flag.position.set(0.5, 0.55, 0); g.add(pole, flag);
      return g;
    }
    default: { // cây nhỏ
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), mat(0x92400e));
      trunk.position.y = -0.4;
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.2, 8), m);
      top.position.y = 0.5; g.add(trunk, top);
      return g;
    }
  }
}

export function buildRoom(room, center) {
  const group = new THREE.Group();
  group.position.copy(center);
  const color = new THREE.Color(room.color);
  const white = new THREE.Color(0xffffff);
  const floorCol = color.clone().lerp(white, 0.82), wallCol = color.clone().lerp(white, 0.62);
  const obstacles = [];

  const floor = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 0.8, 0.3, 2 * HALF + 0.8), mat(floorCol));
  floor.position.y = -0.15; group.add(floor);

  const wm = mat(wallCol);
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); m.position.set(x, y, z); group.add(m); };
  const T = 0.3, W = 2 * HALF + T;
  wall(W, 4.2, T, 0, 2.1, -HALF - T / 2);        // sau
  wall(T, 4.2, W, -HALF - T / 2, 2.1, 0);        // trái
  wall(T, 4.2, W, HALF + T / 2, 2.1, 0);         // phải
  const seg = (W - 3.2) / 2;                      // trước: chừa lối ra rộng 3,2
  wall(seg, 4.2, T, -(1.6 + seg / 2), 2.1, HALF + T / 2);
  wall(seg, 4.2, T, 1.6 + seg / 2, 2.1, HALF + T / 2);
  wall(3.2, 1.2, T, 0, 3.6, HALF + T / 2);

  // lối ra: khung + bảng "Về sảnh" trên mặt tường trong
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ex = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat); m.position.set(x, y, HALF - 0.06); group.add(m); };
  ex(0.2, 3.0, -1.7, 1.5); ex(0.2, 3.0, 1.7, 1.5); ex(3.6, 0.2, 0, 3.0);
  const exitSign = textPlane([{ text: '← Về sảnh', size: 84, y: 88 }], room.color, 520, 160, 2.6);
  exitSign.rotation.y = Math.PI; exitSign.position.set(0, 3.65, HALF - 0.01); group.add(exitSign);

  const sign = textPlane([
    { text: room.icon + ' ' + room.name, size: Math.min(96, Math.floor(690 / ((room.name.length + 2) * 0.58))), y: room.demo ? 92 : 120 }, // tên dài thì chữ nhỏ lại cho vừa bảng
    ...(room.demo ? [{ text: 'Bản demo', size: 60, fill: '#b45309', y: 186 }] : []),
  ], room.color, 760, 250, 5.8);
  sign.position.set(0, 3.0, -HALF + 0.02); group.add(sign);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.8, 28).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: color.clone().lerp(white, 0.5), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  rug.position.set(0, 0.02, OBJ_Z); group.add(rug);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.9, 12), mat(0xffffff));
  pedestal.position.set(0, 0.45, OBJ_Z); group.add(pedestal);
  const pedObstacle = { x: center.x, z: center.z + OBJ_Z, r: 0.95 };
  obstacles.push(pedObstacle);

  const shape = makeShape(room.shape, room.color);
  shape.position.set(0, 2.1, OBJ_Z); group.add(shape);

  const plants = []; // chậu cây mặc định: phòng có nội thất riêng có thể ẩn đi và đặt cây khác đúng chỗ
  for (const [x, z, c] of [[-6.6, -6.6], [6.6, -6.6], [-6.6, 4.8, 0x86efac], [6.6, 4.8, 0x86efac]]) {
    const p = plant(x, z, c); group.add(p.group); plants.push({ x, z, group: p.group });
    obstacles.push({ x: center.x + x, z: center.z + z, r: p.obstacle.r });
  }

  return {
    room, group, center: center.clone(), obstacles,
    parts: { shape, pedestal, rug, sign, floor, pedObstacle, plants }, // phòng có nội thất riêng (rooms3d/) được ẩn/thay các phần này
    object: new THREE.Vector3(center.x, 0, center.z + OBJ_Z),
    exit: new THREE.Vector3(center.x, 0, center.z + HALF - 0.4),
    spawn: new THREE.Vector3(center.x, 0, center.z + 4.6),
    update(t) { shape.rotation.y = t * 0.8; shape.position.y = 2.1 + Math.sin(t * 1.6) * 0.1; },
  };
}
