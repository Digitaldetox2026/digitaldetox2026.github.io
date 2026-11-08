// Nội thất chòi gỗ phòng Chánh niệm. Mỗi món đồ chạm được = một lựa chọn (không có khung chữ):
// gối/ghế/vòng tròn đứng = tư thế; 3 viên đá = số phút; vỏ ốc/lá/giọt nước/đá trơn = cảnh; quả cầu = bắt đầu thở;
// 2 khung ảnh = thiền có hướng dẫn; màn hình = tạm dừng; micro = thu giọng nhắc.
import * as THREE from 'three';
import { loadTexture } from '../assets.js';
import { mat, label, proxy, woodTex } from './parts.js';

const HALF = 8;
export const POSTS = { 'xep-bang': { x: 3.0, z: -2.3, pose: 'sit' }, ghe: { x: 4.5, z: -2.3, pose: 'chair' }, dung: { x: 6.0, z: -2.3, pose: 'stand' } };
const SCENE_LIGHT = { bien: 0xffc6a8, rung: 0xbfe8b0, mua: 0xb4c6d6, yen: 0x9fd6cc };
export const ORB_AT = { x: 0, y: 1.5, z: -3.4 };

/**
 * Dựng nội thất. sel = lựa chọn hiện tại; on = hàm xử lý khi chạm.
 * Trả về { update(t), setBreath(e), orb, group, obstacles }.
 */
export function buildMindfulProps({ built, ctx, sel, on }) {
  const group = built.group, picker = ctx.picker, obstacles = [];
  const c = built.center;
  const addObs = (x, z, r) => { const o = { x: c.x + x, z: c.z + z, r }; built.obstacles.push(o); obstacles.push(o); };

  // ẩn các món mặc định của phòng chung (bệ, quả tinh thể, thảm, bảng tên); bỏ vật cản của bệ
  for (const k of ['shape', 'pedestal', 'rug', 'sign']) built.parts[k].visible = false;
  const i = built.obstacles.indexOf(built.parts.pedObstacle); if (i >= 0) built.obstacles.splice(i, 1);

  /* sàn gỗ, xà ngang, đèn lồng */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(15.8, 15.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.75 }));
  floor.position.y = 0.012; group.add(floor);
  const beamM = mat(0x7a4a28, 0.8);
  for (let k = -3; k <= 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 16.6), beamM); b.position.set(k * 2.5, 4.35, 0); group.add(b); }
  for (const z of [-7.8, 7.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.3, 0.3), beamM); b.position.set(0, 4.3, z); group.add(b); }
  const lanternM = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  for (const [x, z] of [[-4.5, -2], [4.5, -2], [0, 3]]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), lanternM); l.position.set(x, 3.7, z); group.add(l);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6), beamM); cord.position.set(x, 4.05, z); group.add(cord);
  }
  for (const sx of [-8, 8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 16.6), beamM); b.position.set(sx, 4.35, 0); group.add(b); }
  // trần gỗ kín để trong phòng như trong chòi: ấm, tối dịu, không thấy trời sáng chói
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16.8, 16.8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5b3d26, roughness: 0.9 }));
  ceil.position.y = 4.5; group.add(ceil);
  const warm = new THREE.PointLight(0xffc98a, 2.4, 20, 1.3); warm.position.set(0, 3.5, 1); group.add(warm);       // đèn lồng ấm, hơi nhấp nhô như nến
  const screenLight = new THREE.PointLight(0xbfe3c8, 1.4, 14, 1.5); screenLight.position.set(0, 2.4, -6.2); group.add(screenLight); // ánh từ màn hình, đổi màu theo cảnh

  /* khung ảnh bìa video (chạm = xem thiền có hướng dẫn) */
  const videos = ctx.data.mindful.room.videos;
  videos.map((v, idx) => {
    const g = new THREE.Group(); g.position.set(idx ? 5.6 : -5.6, 2.4, -HALF + 0.14); group.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.12), mat(0x8a5a33, 0.8)); g.add(frame);
    const pm = new THREE.MeshBasicMaterial({ color: 0xdddddd, toneMapped: false });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 1.33), pm); pic.position.z = 0.07; g.add(pic);
    loadTexture(v.cover).then((t) => { if (t) { pm.map = t; pm.color.set(0xffffff); pm.needsUpdate = true; } });
    const cap = label('▶ ' + v.label, 2.3); cap.position.set(0, -1.05, 0.07); g.add(cap);
    picker.register({ object: g, reach: 18, haloAt: [0, 0, 0.3], haloSize: 3.2, selected: () => sel.video === idx, onTap: () => on.poster(idx) });
  });

  /* màn hình: chạm để tạm dừng/tiếp tục (khi có video) */
  const screenHit = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ visible: false }));
  screenHit.position.set(0, 2.45, -HALF + 0.2); group.add(screenHit);
  picker.register({ object: screenHit, reach: 18, halo: false, onTap: () => on.screen() });

  /* tư thế: gối / ghế / vòng tròn đứng (Reset ngồi ở đúng chỗ đã chọn) */
  const tag = (name, x, z, y = 1.15, dz = 0.9) => { const l = label(name, 1.15); l.position.set(x, y, z + dz); group.add(l); };
  const cushion = new THREE.Group(); cushion.position.set(POSTS['xep-bang'].x, 0, POSTS['xep-bang'].z);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.18, 20), mat(0xe29a7f, 0.95)); b.position.y = 0.1; const top = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 8), mat(0xf0b39a, 0.95)); top.scale.y = 0.2; top.position.y = 0.19; cushion.add(b, top, proxy(0.8, 0.2)); }
  const chair = new THREE.Group(); chair.position.set(POSTS.ghe.x, 0, POSTS.ghe.z);
  { const wd = mat(0xa4713f, 0.8); const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.85), wd); seat.position.y = 0.34; chair.add(seat);
    for (const [lx, lz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.07), wd); l.position.set(lx, 0.17, lz); chair.add(l); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.7, 0.07), wd); back.position.set(0, 0.74, 0.4); chair.add(back); chair.add(proxy(0.8, 0.5)); }
  const ring = new THREE.Group(); ring.position.set(POSTS.dung.x, 0, POSTS.dung.z);
  { const r = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 32).rotateX(Math.PI / 2), mat(0x34d399, 0.6, { emissive: 0x34d399, emissiveIntensity: 0.3 })); r.position.y = 0.04;
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.7, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbbf7d0, transparent: true, opacity: 0.55 })); d.position.y = 0.025; ring.add(r, d, proxy(0.9, 0.3)); }
  group.add(cushion, chair, ring);
  tag('Ngồi xếp bằng', POSTS['xep-bang'].x, POSTS['xep-bang'].z, 0.28, 1.4); tag('Ngồi ghế', POSTS.ghe.x, POSTS.ghe.z, 0.28, 1.4); tag('Đứng', POSTS.dung.x, POSTS.dung.z, 0.28, 1.4);
  [['xep-bang', cushion], ['ghe', chair], ['dung', ring]].forEach(([id, o]) => picker.register({
    object: o, reach: 18, haloAt: [0, 0.5, 0], haloSize: 1.7, selected: () => sel.posture === id, onTap: () => on.posture(id),
  }));

  /* 3 viên đá ghi số phút */
  const stoneRow = [1, 3, 5].map((m, k) => {
    const x = -3.0 - k * 1.5, z = -2.3, g = new THREE.Group(); g.position.set(x, 0, z);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.24, 14), mat(0x9a968c, 1)); st.position.y = 0.12;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cg = cv.getContext('2d');
    cg.fillStyle = '#b9b4a8'; cg.beginPath(); cg.arc(64, 64, 62, 0, 6.283); cg.fill();
    cg.fillStyle = '#5a564c'; cg.font = '700 64px "Be Vietnam Pro", system-ui, sans-serif'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText(String(m), 64, 58);
    cg.font = '600 22px "Be Vietnam Pro", system-ui, sans-serif'; cg.fillText('phút', 64, 98);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.44, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tx })); top.position.y = 0.245;
    g.add(st, top, proxy(0.65, 0.25)); group.add(g);
    picker.register({ object: g, reach: 18, haloAt: [0, 0.5, 0], haloSize: 1.3, selected: () => sel.min === m, onTap: () => on.minutes(m) });
    return g;
  });
  tag('Số phút', -4.5, -2.3, 0.28, 1.4); void stoneRow;

  /* bàn gỗ thấp có 4 món để chọn cảnh + micro */
  const table = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.12, 1.0), mat(0x9a6a3a, 0.8)); table.position.set(-4.0, 0.5, 1.4); group.add(table);
  for (const lx of [-2.7, 2.7]) for (const lz of [-0.4, 0.4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x7a4a28, 0.8)); l.position.set(-4.0 + lx, 0.25, 1.4 + lz); group.add(l); }
  [-2.2, -3.6, -5.0, -6.2].forEach((x) => addObs(x, 1.4, 0.55));
  const item = (id, x, build, name) => {
    const g = new THREE.Group(); g.position.set(x, 0.56, 1.4); build(g); g.add(proxy(0.42, 0.25)); group.add(g);
    const l = label(name, 0.8); l.position.set(0, 0.95, 0.05); g.add(l);
    picker.register({ object: g, reach: 18, haloAt: [0, 0.25, 0], haloSize: 1.0, selected: () => sel.scene === id, onTap: () => on.scene(id) });
  };
  item('bien', -6.3, (g) => { const s = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 10), mat(0xf1c9a5, 0.5)); s.rotation.z = 1.2; s.position.y = 0.2; const sp = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 14), mat(0xe9b48c, 0.5)); sp.position.set(0.1, 0.22, 0); g.add(s, sp); }, 'Biển');
  item('rung', -5.4, (g) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), mat(0x4ade80, 0.6)); l.scale.set(1, 0.12, 0.6); l.position.y = 0.2; l.rotation.z = 0.25; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35), mat(0x2f8f4a)); st.rotation.z = 1.2; st.position.set(-0.28, 0.14, 0); g.add(l, st); }, 'Rừng');
  item('mua', -4.5, (g) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), mat(0x60a5fa, 0.2)); d.position.y = 0.22; const t = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 14), mat(0x60a5fa, 0.2)); t.position.y = 0.5; g.add(d, t); }, 'Mưa');
  item('yen', -3.6, (g) => { const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat(0xe5e7eb, 0.3)); p.scale.set(1, 0.55, 0.8); p.position.y = 0.15; g.add(p); }, 'Im lặng');
  { // micro thu giọng nhắc (nội dung thiết lập nằm trong khung tham khảo)
    const g = new THREE.Group(); g.position.set(-2.25, 0.56, 1.4);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.3, 10), mat(0x444a55, 0.4)); st.position.y = 0.15;
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x222831, 0.4)); hd.position.y = 0.38; g.add(st, hd, proxy(0.35, 0.25)); group.add(g);
    const l = label('Giọng của bạn', 0.8); l.position.set(0, 1.2, 0.05); g.add(l);
    picker.register({ object: g, reach: 18, haloAt: [0, 0.3, 0], haloSize: 0.9, onTap: () => on.mic() });
  }
  tag('Chọn cảnh', -4.9, 1.4, 2.15);

  /* quả cầu thở: chạm để bắt đầu */
  const orbG = new THREE.Group(); orbG.position.set(ORB_AT.x, ORB_AT.y, ORB_AT.z); group.add(orbG);
  const orbMat = new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x34d399, emissiveIntensity: 0.55, roughness: 0.25, transparent: true, opacity: 0.92 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 20), orbMat); orbG.add(orb, proxy(0.9));
  const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.4 }));
  floorGlow.position.set(ORB_AT.x, 0.03, ORB_AT.z); group.add(floorGlow);
  const orbTag = label('Chạm để tự thở', 1.5); orbTag.position.set(ORB_AT.x, 2.45, ORB_AT.z + 0.1); group.add(orbTag);
  picker.register({ object: orbG, reach: 18, haloAt: [0, 0, 0], haloSize: 2.4, haloColor: 0xa7f3d0, onTap: () => on.orb() });
  addObs(ORB_AT.x, ORB_AT.z, 0.8);

  let breath = -1; // -1 = đang nghỉ (nhấp nhô nhẹ); 0..1 = đang thở theo phiên
  return {
    group, obstacles, orb, floorGlow,
    setBreath(e) { breath = e; },
    setOrbTag(t) { orbTag.visible = !!t; },
    /** Ẩn quả cầu khi chiếu video để không che màn hình. */
    setOrbShown(on) { orbG.visible = on; floorGlow.visible = on; if (on) orbTag.visible = true; },
    /** Ánh sáng ấm nhấp nhô rất nhẹ; ánh màn hình đổi màu theo cảnh/video đang chiếu. */
    updateLight(t, scene, video) {
      warm.intensity = 2.3 + Math.sin(t * 1.7) * 0.1 + Math.sin(t * 4.3) * 0.05;
      screenLight.color.lerp(new THREE.Color(video ? 0xd8e2ff : SCENE_LIGHT[scene] ?? 0xffffff), 0.04);
      screenLight.intensity = video ? 1.1 : 1.4;
    },
    update(t) {
      const e = breath < 0 ? 0.5 + 0.5 * Math.sin(t * 1.2) : breath;
      const s = breath < 0 ? 0.78 + 0.08 * e : 0.55 + 0.7 * e;
      orb.scale.setScalar(s); orbG.position.y = ORB_AT.y + (breath < 0 ? Math.sin(t * 0.9) * 0.06 : 0);
      orbMat.emissiveIntensity = 0.4 + 0.45 * e; floorGlow.scale.setScalar(0.7 + 0.8 * s); floorGlow.material.opacity = 0.2 + 0.3 * e;
    },
  };
}
