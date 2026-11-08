// Biển chỉ đường: mỗi gợi ý có phòng đi kèm hiện thành một biển gỗ nhỏ dựng lên trong phòng. Chạm biển thì đi tới phòng đó.
import * as THREE from 'three';
import { textPlane } from '../scene.js';
import { mat, proxy } from './parts.js';

const ease = (k) => { const x = Math.min(1, Math.max(0, k)); return 1 - Math.pow(1 - x, 3); };

/**
 * spots(n) -> danh sách { x, z } (toạ độ trong phòng) cho n biển. faceTo = { x, z }: các biển quay mặt về điểm này.
 * onGo(roomId) chạy khi chạm biển.
 */
export function createSignposts({ group, picker, rooms, spots, faceTo, onGo }) {
  let posts = [];

  function build(item, at, delay) {
    const room = rooms.find((r) => r.id === item.room);
    const g = new THREE.Group(); g.position.set(at.x, 0, at.z);
    g.rotation.y = Math.atan2(faceTo.x - at.x, faceTo.z - at.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.55, 8), mat(0x7a4a28, 0.85)); pole.position.y = 0.78; g.add(pole);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0x7a4a28, 0.85)); cap.position.y = 1.58; g.add(cap);
    const title = `${room.icon} ${room.name}`;
    const lines = [{ text: title, size: Math.min(68, Math.floor(470 / (title.length * 0.58))), y: room.demo ? 70 : 88 }]; // tên dài thì chữ nhỏ lại cho vừa biển
    if (room.demo) lines.push({ text: 'Bản demo', size: 40, fill: '#b45309', y: 128 });
    const board = textPlane(lines, room.color, 520, 170, 1.45);
    board.position.set(0, 1.28, 0.08); g.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 0.05), mat(0x8a5a33, 0.8)); back.position.set(0, 1.28, 0.04); g.add(back);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 4), mat(0x8a5a33, 0.8)); arrow.rotation.z = -Math.PI / 2; arrow.position.set(0.88, 1.28, 0.04); g.add(arrow);
    g.add(Object.assign(proxy(0.9, 1.2), { name: 'hit' }));
    g.scale.setScalar(0.001); group.add(g);
    const entry = picker.register({ object: g, reach: 30, haloAt: [0, 1.28, 0.2], haloSize: 2.2, haloColor: 0xfde68a, tag: 'signpost', onTap: () => onGo(item.room) });
    return { g, entry, delay, t: 0 };
  }

  return {
    /** items: [{ room }] (chỉ những gợi ý có phòng). */
    show(items) {
      this.hide();
      const where = spots(items.length);
      posts = items.map((it, i) => build(it, where[i], i * 0.35));
    },
    hide() {
      picker.clear((e) => e.tag === 'signpost');
      for (const p of posts) group.remove(p.g);
      posts = [];
    },
    get count() { return posts.length; },
    /** Biển mọc lên lần lượt, nảy nhẹ. */
    update(dt) {
      for (const p of posts) {
        p.t += dt;
        const k = ease((p.t - p.delay) / 0.7), s = k >= 1 ? 1 : 0.001 + k * 1.0;
        p.g.scale.setScalar(Math.max(0.001, s));
      }
    },
  };
}
