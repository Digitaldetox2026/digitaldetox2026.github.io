// Bộ phận thiên nhiên dựng bằng mã (không cần tải file): bầu trời, địa hình, cây, cỏ, hoa, đá, nước.
// Vật liệu có "gió": lá và cỏ lay nhẹ, KHÔNG theo nhịp (Terrapin Bright Green 2014, mẫu "kích thích giác quan không theo nhịp").
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from '../vendor/BufferGeometryUtils.js';

/* ---------- số ngẫu nhiên cố định (cùng một thung lũng mỗi lần mở) và nhiễu giá trị ---------- */
export function rng(seed = 7) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v;
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Đồng hồ gió dùng chung cho mọi vật liệu có lay. */
export const wind = { value: 0 };

/** Thêm hiệu ứng gió vào vật liệu (đỉnh càng cao càng lay). amp theo mét. */
export function windy(material, amp = 0.08, freq = 1.2) {
  material.customProgramCacheKey = () => `windy-${amp}-${freq}`; // mỗi bộ thông số một chương trình riêng
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      #ifdef USE_INSTANCING
        vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 ip = vec2(0.0);
      #endif
      float ph = ip.x * 0.37 + ip.y * 0.29 + position.y * 0.9;
      float sw = sin(uWind * ${freq.toFixed(2)} + ph) + 0.55 * sin(uWind * ${(freq * 2.3).toFixed(2)} + ph * 1.7);
      float h = max(position.y, 0.0);
      transformed.x += sw * ${amp.toFixed(3)} * h * 0.35;
      transformed.z += cos(uWind * ${(freq * 0.8).toFixed(2)} + ph) * ${amp.toFixed(3)} * h * 0.25;`);
  };
  return material;
}

/* ---------- bầu trời: dải màu + mây trôi chậm (thay cho ảnh HDR, xem assets/manifest.json để thay bằng HDR thật) ---------- */
export function makeSky(sunDir) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec3 vD; uniform float uTime; uniform vec3 uSun;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vD);
        float t = clamp(d.y, 0.0, 1.0);
        vec3 horizon = vec3(0.86, 0.93, 0.97), zenith = vec3(0.36, 0.62, 0.90);
        vec3 col = mix(horizon, zenith, pow(t, 0.55));
        float sd = max(dot(d, normalize(uSun)), 0.0);
        col += vec3(1.0, 0.93, 0.78) * (pow(sd, 400.0) * 0.9 + pow(sd, 8.0) * 0.18);
        vec2 uv = d.xz / (d.y + 0.28) * 0.55 + vec2(uTime * 0.006, uTime * 0.002);
        float c = smoothstep(0.50, 0.82, fbm(uv));
        c *= smoothstep(0.0, 0.18, d.y);
        col = mix(col, vec3(1.0), c * 0.85);
        if (d.y < 0.0) col = horizon;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), m);
  sky.frustumCulled = false; sky.renderOrder = -10;
  return sky;
}

/* ---------- địa hình thung lũng: giữa phẳng, xung quanh đồi thoải ---------- */
export function makeTerrain() {
  const SIZE = 380, N = 76;
  const g = new THREE.PlaneGeometry(SIZE, SIZE, N, N).rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const low = new THREE.Color(0xa6d68f), high = new THREE.Color(0x5f9e63), dark = new THREE.Color(0x8fc47f);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    const t = smooth(48, 130, r);
    const y = t * (12 + 26 * noise2(x * 0.018 + 3, z * 0.018 + 9)) + smooth(40, 60, r) * 1.5 * noise2(x * 0.08, z * 0.08);
    p.setY(i, y - 0.03);
    c.copy(low).lerp(dark, noise2(x * 0.05, z * 0.05)).lerp(high, Math.min(1, y / 22));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
}

/* ---------- cây: thân + tán lá (gộp thành 2 hình, vẽ hàng trăm cây chỉ tốn 2 lượt vẽ) ---------- */
function blob(r, x, y, z, color, jitter, rand) {
  // gộp đỉnh trùng để không bị nứt, đẩy lồi lõm theo VỊ TRÍ (không ngẫu nhiên từng đỉnh), pháp tuyến mượt cho tán lá tròn mềm
  let g = new THREE.IcosahedronGeometry(r, 1); g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const pos = g.attributes.position, cols = [], c = new THREE.Color(), seed = rand() * 50;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const k = 1 + (noise2(px * 1.7 + seed, pz * 1.7 + py * 1.3) - 0.5) * jitter;
    pos.setXYZ(i, px * k + x, py * k * 0.9 + y, pz * k + z);
  }
  for (let i = 0; i < pos.count; i++) {
    const hh = (pos.getY(i) - y) / r; // đỉnh sáng, dưới tối
    c.set(color).multiplyScalar(0.74 + 0.34 * (hh * 0.5 + 0.5) + (noise2(pos.getX(i) * 3, pos.getZ(i) * 3) - 0.5) * 0.12);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  return g.toNonIndexed();
}
export function treeGeometries(kind = 'round') {
  const rand = rng(kind === 'round' ? 11 : 23);
  const greens = [0x3f9a4f, 0x4cab57, 0x2f8a4a, 0x58b45f];
  const parts = kind === 'round'
    ? [[1.6, 0, 3.4, 0], [1.25, 1.0, 2.8, 0.4], [1.2, -0.9, 2.9, -0.5], [1.2, 0.3, 4.4, 0.2], [1.0, -0.4, 3.8, 0.9], [1.0, 0.7, 3.6, -0.8]]
    : [[1.5, 0, 2.6, 0], [1.2, 0, 3.7, 0], [0.9, 0, 4.7, 0], [0.55, 0, 5.5, 0]];
  const leaf = mergeGeometries(parts.map(([r, x, y, z], i) => blob(r, x, y, z, greens[i % greens.length], 0.3, rand)));
  const trunk = new THREE.CylinderGeometry(0.14, 0.3, 3.2, 7, 3);
  trunk.translate(0, 1.6, 0);
  const tp = trunk.attributes.position, tc = [], c = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    tp.setX(i, tp.getX(i) + Math.sin(tp.getY(i) * 1.3) * 0.07);
    c.set(0x7a5233).multiplyScalar(0.75 + rand() * 0.25 + tp.getY(i) * 0.03); tc.push(c.r, c.g, c.b);
  }
  trunk.setAttribute('color', new THREE.Float32BufferAttribute(tc, 3));
  trunk.computeVertexNormals();
  return { leaf, trunk };
}

/** Cây thật (nhiều cây = 2 lượt vẽ). spots: [{x,z,s,rot,kind}] -> { group, count(n) } */
export function makeForest(spots, kind = 'round') {
  const { leaf, trunk } = treeGeometries(kind);
  const leafMat = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 0.22, 1.1);
  const trunkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const L = new THREE.InstancedMesh(leaf, leafMat, spots.length), T = new THREE.InstancedMesh(trunk, trunkMat, spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color();
  spots.forEach((s, i) => {
    e.set(0, s.rot ?? 0, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.s, s.s * (s.sy ?? 1), s.s));
    L.setMatrixAt(i, m); T.setMatrixAt(i, m);
    L.setColorAt(i, cc.setHSL(0, 0, 0.9 + Math.random() * 0.2));
  });
  const group = new THREE.Group(); group.add(T, L);
  L.frustumCulled = T.frustumCulled = false;
  return { group, meshes: [L, T], setCount(n) { L.count = T.count = Math.min(n, spots.length); } };
}

/* ---------- cỏ và hoa ---------- */
export function makeGrass(points, rand) {
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.035, 0, 0, 0.035, 0, 0, 0, 0.3, 0.02], 3));
  blade.computeVertexNormals();
  const mat = windy(new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, color: 0xffffff }), 0.5, 1.7);
  const mesh = new THREE.InstancedMesh(blade, mat, points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const cols = [0x6dbb5a, 0x7cc767, 0x58a84e, 0x8ad074];
  points.forEach((p, i) => {
    const s = 0.7 + rand() * 0.8;
    e.set(0, rand() * 6.28, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(s, s * (0.7 + rand() * 0.7), s));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.set(cols[Math.floor(rand() * cols.length)]));
  });
  mesh.frustumCulled = false;
  return mesh;
}
export function makeFlowers(points, rand) {
  const group = new THREE.Group();
  const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 4).translate(0, 0.17, 0), windy(new THREE.MeshStandardMaterial({ color: 0x4f9d4a, roughness: 1 }), 0.3, 1.5), points.length);
  const head = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0).translate(0, 0.36, 0), windy(new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0xffffff }), 0.3, 1.5), points.length);
  const m = new THREE.Matrix4(), c = new THREE.Color();
  const cols = [0xffffff, 0xffe27a, 0xff9ec4, 0xc7a6ff, 0xffb27a];
  points.forEach((p, i) => {
    const s = 0.8 + rand() * 0.7;
    m.compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    stem.setMatrixAt(i, m); head.setMatrixAt(i, m); head.setColorAt(i, c.set(cols[Math.floor(rand() * cols.length)]));
  });
  stem.frustumCulled = head.frustumCulled = false;
  group.add(stem, head);
  return group;
}

/* ---------- đá ---------- */
export function rockGeometry(rand) {
  let g = new THREE.IcosahedronGeometry(1, 1); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.78 + noise2(p.getX(i) * 2.1 + 5, p.getZ(i) * 2.1 + p.getY(i) * 1.7) * 0.5 ;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k);
  }
  const ng = g.toNonIndexed(); ng.computeVertexNormals(); return ng; // phẳng từng mặt cho đá góc cạnh
}
/** rocks: [{x,y,z,sx,sy,sz,rot}] -> InstancedMesh */
export function makeRocks(rocks, rand) {
  const mesh = new THREE.InstancedMesh(rockGeometry(rand), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: 0xffffff }), rocks.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const cols = [0x9a9a94, 0x8b8d89, 0xa8a49a, 0x7f827f];
  rocks.forEach((r, i) => {
    e.set(rand() * 0.4, r.rot ?? rand() * 6.28, rand() * 0.4); q.setFromEuler(e);
    m.compose(new THREE.Vector3(r.x, r.y ?? 0, r.z), q, new THREE.Vector3(r.sx, r.sy ?? r.sx, r.sz ?? r.sx));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.set(cols[Math.floor(rand() * cols.length)]));
  });
  mesh.frustumCulled = false;
  return mesh;
}

/* ---------- nước chảy: kết cấu vẽ bằng canvas, trượt dần ---------- */
export function waterTexture(kind) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d'), r = rng(kind === 'fall' ? 5 : 9);
  g.fillStyle = kind === 'fall' ? '#9fd8ee' : '#7cc4e0'; g.fillRect(0, 0, 128, 256);
  const n = kind === 'fall' ? 70 : 46;
  for (let i = 0; i < n; i++) {
    const x = r() * 128, w = 1 + r() * (kind === 'fall' ? 3 : 6), h = 30 + r() * 110, y = r() * 256;
    g.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.3})`;
    for (const oy of [0, -256]) g.fillRect(x, y + oy, w, h); // lặp liền mạch
  }
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(30,100,150,${0.05 + r() * 0.1})`; g.fillRect(r() * 128, r() * 256, 2 + r() * 5, 20 + r() * 60); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
export function pondTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'); g.fillStyle = '#6fc0dd'; g.fillRect(0, 0, 256, 256);
  const r = rng(3);
  for (let i = 0; i < 90; i++) {
    const x = r() * 256, y = r() * 256, rad = 6 + r() * 22;
    for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
      g.strokeStyle = `rgba(255,255,255,${0.06 + r() * 0.14})`; g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.45, 0, 0, 6.28); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
