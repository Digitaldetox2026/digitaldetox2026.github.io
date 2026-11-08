// Đồ dùng chung để dựng cảnh: vật liệu, bảng chữ, cây, chậu cây. Mọi thứ low-poly, không dùng file hình.
import * as THREE from 'three';

export const mat = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r, flatShading: true });

/** Bảng chữ phẳng (Plane + canvas), đặt sát mặt tường, không dùng sprite nên không bị cắt vào tường. */
export function textPlane(lines, color, px, py, worldW) {
  const cv = document.createElement('canvas'); cv.width = px; cv.height = py;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff';
  g.beginPath(); g.roundRect(4, 4, px - 8, py - 8, 28); g.fill();
  g.lineWidth = 10; g.strokeStyle = color; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l) => {
    g.fillStyle = l.fill || '#0f172a';
    g.font = `700 ${l.size}px "Be Vietnam Pro", system-ui, sans-serif`;
    g.fillText(l.text, px / 2, l.y);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldW * py / px),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  return m;
}

/** Cây: thân cao để tán lá nằm TRÊN đầu nhân vật. Trả về { group, obstacle }. */
export function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.28 * s, 2.4 * s, 7), mat(0x92400e));
  trunk.position.y = 1.2 * s;
  const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2.6 * s, 8), mat(0x22c55e));
  c1.position.y = (2.4 + 1.3) * s;
  const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.2 * s, 2.2 * s, 8), mat(0x4ade80));
  c2.position.y = (2.4 + 2.6 + 0.7) * s;
  g.add(trunk, c1, c2); g.position.set(x, 0, z);
  return { group: g, obstacle: { x, z, r: 0.5 * s } };
}

/** Chậu cây thấp trong phòng. */
export function plant(x, z, color = 0x4ade80) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.6, 8), mat(0xc2410c));
  pot.position.y = 0.3;
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), mat(color));
  leaf.position.y = 1.25;
  g.add(pot, leaf); g.position.set(x, 0, z);
  return { group: g, obstacle: { x, z, r: 0.45 } };
}
