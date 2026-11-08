// "Chạm vật thể": đăng ký vật thể 3D có thể bấm, bấm bằng chuột/chạm tay (tia từ camera), vòng sáng nhắc nhẹ.
// Chữ chỉ là nhãn ngắn gắn vào vật thể; việc chọn thật làm bằng cách chạm vật.
import * as THREE from 'three';

let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  r.addColorStop(0, 'rgba(255,255,255,0.9)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(cv); haloTex.colorSpace = THREE.SRGBColorSpace;
  return haloTex;
}

/** getPlayer() -> Vector3 vị trí người chơi; onFar(entry) khi bấm vật ở quá xa. */
export function createPicker({ camera, canvas, getPlayer, onFar }) {
  const entries = [];
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let enabled = () => true;

  /** register({ object, onTap, reach, enabled(), selected(), haloAt:[x,y,z], haloSize, haloColor }) -> entry */
  function register(e) {
    const entry = { reach: 10, haloSize: 1.1, haloColor: 0xffffff, haloAt: null, ...e };
    if (entry.halo !== false) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo(), color: entry.haloColor, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
      sp.scale.setScalar(entry.haloSize); sp.renderOrder = 5;
      if (entry.haloAt) sp.position.set(...entry.haloAt); else { sp.position.set(0, 0, 0); }
      entry.object.add(sp); entry.sprite = sp;
    }
    entries.push(entry); return entry;
  }

  function hit(clientX, clientY) {
    ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let best = null, bestD = Infinity;
    for (const e of entries) {
      if (e.enabled && !e.enabled()) continue;
      if (!e.object.visible) continue;
      const hits = ray.intersectObject(e.object, true).filter((h) => !h.object.isSprite);
      if (hits.length && hits[0].distance < bestD) { bestD = hits[0].distance; best = { e, point: hits[0].point }; }
    }
    return best;
  }

  const api = {
    register, entries,
    setEnabled(fn) { enabled = fn; },
    tap(x, y) {
      if (!enabled()) return false;
      const h = hit(x, y); if (!h) return false;
      const p = getPlayer();
      if (Math.hypot(h.point.x - p.x, h.point.z - p.z) > h.e.reach && !h.e.far) { onFar && onFar(h.e); return true; }
      h.e.onTap(h.e); return true;
    },
    hover(x, y) {
      if (!enabled()) { canvas.style.cursor = ''; return; }
      canvas.style.cursor = hit(x, y) ? 'pointer' : '';
    },
    /** Vòng sáng thở nhẹ; đã chọn thì sáng hơn. */
    update(t) {
      for (const e of entries) {
        if (!e.sprite) continue;
        const on = (!e.enabled || e.enabled()) && e.object.visible;
        e.sprite.visible = on;
        if (!on) continue;
        const sel = e.selected && e.selected();
        e.sprite.material.opacity = (sel ? 0.8 : 0.38) + Math.sin(t * 2.2 + (e.haloSize * 7)) * 0.12;
        e.sprite.material.color.setHex(sel ? (e.selColor ?? 0xfde68a) : e.haloColor);
      }
    },
    /** Tắt/bật tất cả vòng sáng của một nhóm (khi rời phòng). */
    clear(filter) { for (let i = entries.length - 1; i >= 0; i--) if (filter(entries[i])) { entries[i].sprite && entries[i].object.remove(entries[i].sprite); entries.splice(i, 1); } },
  };
  return api;
}
