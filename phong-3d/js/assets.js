// Tải tài nguyên (hình, mô hình 3D, bầu trời HDR) có bộ nhớ đệm + thanh "đang tải" nhỏ.
// Quy tắc: tải lỗi thì trả về null để nơi gọi dùng hình khối dựng sẵn; KHÔNG BAO GIỜ làm hỏng cảnh.
// Tài nguyên tùy chọn khai báo trong assets/manifest.json (xem world/assets/CREDITS.md). Không khai báo thì không tải.
import * as THREE from 'three';

const cache = new Map();
let pending = 0, total = 0, done = 0;
let bar = null;

function ensureBar() {
  if (bar) return bar;
  bar = document.getElementById('loadbar');
  return bar;
}
function refresh() {
  const b = ensureBar(); if (!b) return;
  b.hidden = pending === 0;
  if (pending === 0) { total = 0; done = 0; return; }
  b.firstElementChild.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`;
}
/** Bọc một lời hứa: đếm vào thanh tải, lỗi thì trả null. */
function track(key, make) {
  if (cache.has(key)) return cache.get(key);
  total++; pending++; refresh();
  const p = make().then((v) => v, (err) => { console.warn('Không tải được', key, err); return null; })
    .finally(() => { pending--; done++; refresh(); });
  cache.set(key, p);
  return p;
}

let manifestP = null;
/** Danh sách tài nguyên tùy chọn đã có sẵn (thiếu file thì coi như rỗng). */
export function manifest() {
  if (!manifestP) {
    manifestP = fetch('assets/manifest.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  }
  return manifestP;
}

export function loadTexture(url, { srgb = true, repeat = false } = {}) {
  return track('tex:' + url, () => new Promise((res, rej) => {
    new THREE.TextureLoader().load(url, (t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4; res(t);
    }, undefined, rej);
  }));
}

/** Mô hình .glb (có nén meshopt). Trả về bản gốc, nơi gọi tự .clone(). */
export function loadModel(url) {
  return track('glb:' + url, async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import('../vendor/GLTFLoader.js'), import('../vendor/meshopt_decoder.module.js')]);
    const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const g = await loader.loadAsync(url);
    return g.scene;
  });
}

/** Bầu trời HDR (.hdr) thành môi trường phản chiếu + nền. */
export function loadSkyHDR(url, renderer) {
  return track('hdr:' + url, async () => {
    const { RGBELoader } = await import('../vendor/RGBELoader.js');
    const tex = await new RGBELoader().loadAsync(url);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture; pm.dispose();
    return { background: tex, env };
  });
}

/** File âm thanh đã giải mã (AudioBuffer) cho WebAudio. */
export function loadAudioBuffer(url, audioCtx) {
  return track('aud:' + url, async () => {
    const r = await fetch(url); if (!r.ok) throw new Error(r.status);
    return audioCtx.decodeAudioData(await r.arrayBuffer());
  });
}
