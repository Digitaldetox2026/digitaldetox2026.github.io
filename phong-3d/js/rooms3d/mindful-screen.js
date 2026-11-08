// Màn hình lớn (khung gỗ) trên tường phòng Chánh niệm. Ba chế độ: cảnh động vẽ bằng mã (Biển/Rừng/Mưa/Im lặng),
// video thiền (VideoTexture), và dòng ghi nguồn video ngay dưới màn hình.
import * as THREE from 'three';
import { getAudio } from '../audio.js';

const W = 640, H = 360;
const grad = (g, y0, y1, a, b) => { const r = g.createLinearGradient(0, y0, 0, y1); r.addColorStop(0, a); r.addColorStop(1, b); g.fillStyle = r; g.fillRect(0, y0, W, y1 - y0); };
const rnd = (() => { let s = 99; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
const rain = Array.from({ length: 150 }, () => ({ x: rnd() * W, y: rnd() * H, v: 260 + rnd() * 200 }));
const dust = Array.from({ length: 36 }, () => ({ x: rnd() * W, y: rnd() * H, v: 6 + rnd() * 10, ph: rnd() * 6 }));

const SCENES = {
  bien(g, t) {
    grad(g, 0, 210, '#f4b8a6', '#fde7cc');
    const sun = g.createRadialGradient(470, 175, 4, 470, 175, 110); sun.addColorStop(0, 'rgba(255,244,210,.95)'); sun.addColorStop(1, 'rgba(255,244,210,0)');
    g.fillStyle = sun; g.fillRect(0, 60, W, 200);
    grad(g, 205, H, '#9cc9da', '#2f6f94');
    for (let k = 0; k < 16; k++) {
      const y = 210 + k * k * 0.62, amp = 1 + k * 0.35;
      g.strokeStyle = `rgba(255,255,255,${0.1 + k * 0.012})`; g.lineWidth = 1 + k * 0.12; g.beginPath();
      for (let x = 0; x <= W; x += 16) { const yy = y + Math.sin(x * 0.02 * (1 + 0.05 * k) + t * (0.6 + k * 0.04) + k) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke();
    }
    g.fillStyle = `rgba(255,255,255,${0.12 + 0.1 * Math.sin(t * 0.5)})`; g.fillRect(0, H - 20, W, 20);
    g.strokeStyle = 'rgba(60,70,90,.7)'; g.lineWidth = 2;
    for (const [bx, by, ph] of [[120, 90, 0], [175, 70, 1.3]]) { const f = Math.sin(t * 2.2 + ph) * 5; g.beginPath(); g.moveTo(bx - 12, by + f); g.quadraticCurveTo(bx - 5, by - 6, bx, by); g.quadraticCurveTo(bx + 5, by - 6, bx + 12, by + f); g.stroke(); }
  },
  rung(g, t) {
    grad(g, 0, H, '#d8efc6', '#7fb878');
    for (const [layer, col, n, top] of [[0, '#a6d49b', 11, 120], [1, '#74b472', 9, 90], [2, '#3f8a50', 7, 60]]) {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x = ((i * 97 + layer * 41) % (W + 60)) - 20, sway = Math.sin(t * 0.4 + i + layer) * (3 + layer * 2);
        g.fillRect(x - 4 - layer * 2, top + 80, 8 + layer * 4, H);
        g.beginPath(); g.ellipse(x + sway, top + 60 - layer * 8, 46 + layer * 14, 70 + layer * 10, 0, 0, 6.283); g.fill();
      }
    }
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(255,250,200,${0.07 + 0.05 * Math.sin(t * 0.3 + i)})`;
      const x0 = 60 + i * 130; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 50, 0); g.lineTo(x0 - 110, H); g.lineTo(x0 - 190, H); g.fill();
    }
    g.fillStyle = 'rgba(255,255,230,.6)';
    for (const d of dust) { const y = (d.y - t * d.v) % H; g.fillRect((d.x + Math.sin(t * 0.5 + d.ph) * 12 + W) % W, y < 0 ? y + H : y, 2, 2); }
  },
  mua(g, t, dt) {
    grad(g, 0, H, '#8e9ca9', '#c4ccd4');
    g.fillStyle = '#7b8d93'; g.beginPath(); g.moveTo(0, 230); for (let x = 0; x <= W; x += 20) g.lineTo(x, 200 + Math.sin(x * 0.01 + 1) * 40); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#62777f'; g.beginPath(); g.moveTo(0, 280); for (let x = 0; x <= W; x += 20) g.lineTo(x, 255 + Math.sin(x * 0.014 + 4) * 30); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; g.beginPath();
    for (const p of rain) { p.y += p.v * dt; if (p.y > H) { p.y = -16; p.x = rnd() * W; } g.moveTo(p.x, p.y); g.lineTo(p.x - 2, p.y + 14); }
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.28)';
    for (let i = 0; i < 9; i++) { const k = (t * 0.7 + i / 9) % 1; g.beginPath(); g.ellipse(40 + i * 70, 320 + (i % 3) * 12, 4 + k * 22, 1.5 + k * 7, 0, 0, 6.283); g.globalAlpha = 1 - k; g.stroke(); g.globalAlpha = 1; }
  },
  yen(g, t) {
    grad(g, 0, H, '#1d3944', '#2a5058');
    const r = 60 + 10 * Math.sin(t * 0.4), c = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, r * 2.4);
    c.addColorStop(0, 'rgba(190,240,230,.30)'); c.addColorStop(1, 'rgba(190,240,230,0)'); g.fillStyle = c; g.fillRect(0, 0, W, H);
  },
};

function creditTexture() {
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 96;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  return {
    tex,
    draw(text) {
      g.clearRect(0, 0, 1280, 96);
      if (!text) { tex.needsUpdate = true; return; }
      g.fillStyle = 'rgba(40,28,18,.78)'; g.beginPath(); g.roundRect(4, 6, 1272, 84, 16); g.fill();
      g.fillStyle = '#f6ead8'; g.font = '600 25px "Be Vietnam Pro", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = text.split(' '), lines = ['']; // ngắt dòng tay
      for (const w of words) { const cur = lines[lines.length - 1]; if (g.measureText(cur + ' ' + w).width > 1200) lines.push(w); else lines[lines.length - 1] = (cur + ' ' + w).trim(); }
      lines.slice(0, 2).forEach((l, i, a) => g.fillText(l, 640, a.length === 1 ? 48 : 34 + i * 32));
      tex.needsUpdate = true;
    },
  };
}

/** Màn hình đặt trong group cha tại (x,y,z). lite = vẽ cảnh thưa hơn. */
export function createScreen({ parent, x, y, z, lite = false }) {
  const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group);
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.8 });
  const bar = (w, h, px, py) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.22), wood); m.position.set(px, py, -0.02); group.add(m); };
  bar(6.8, 0.2, 0, 1.9); bar(6.8, 0.2, 0, -1.9); bar(0.2, 4.0, -3.4, 0); bar(0.2, 4.0, 3.4, 0);

  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), sceneTex = new THREE.CanvasTexture(cv); sceneTex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: sceneTex, toneMapped: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), mat); plane.position.z = 0.05; group.add(plane);

  const cr = creditTexture();
  const credit = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.48), new THREE.MeshBasicMaterial({ map: cr.tex, transparent: true, toneMapped: false }));
  credit.position.set(0, -2.35, 0.06); group.add(credit);

  let scene = 'rung', acc = 99, video = null, vtex = null, vsrc = null, t = 0;
  const api = {
    group, plane, get video() { return video; }, get isVideo() { return !!vtex; },
    setScene(id) { scene = id; acc = 99; },
    get scene() { return scene; },
    /** Gọi mỗi khung hình khi đang ở trong phòng. */
    update(dt, active) {
      t += dt;
      if (!active || vtex) return;
      acc += dt;
      if (acc < (lite ? 1 / 8 : 1 / 18)) return;
      (SCENES[scene] || SCENES.yen)(g, t, acc); acc = 0; sceneTex.needsUpdate = true;
    },
    setLite(on) { lite = on; },
    /** Phát video. Trả về true nếu bắt đầu được. onEnd chạy khi hết video. */
    async playVideo(src, creditText, onEnd) {
      if (!video) {
        video = document.createElement('video');
        video.preload = 'none'; video.playsInline = true; video.setAttribute('playsinline', '');
      }
      video.onended = () => onEnd && onEnd();
      if (vsrc !== src) { vsrc = src; video.src = src; }
      if (!vtex) { vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; }
      mat.map = vtex; mat.needsUpdate = true;
      cr.draw(creditText);
      try { routeVideoAudio(video); await video.play(); return true; } catch (e) { console.warn('Video lỗi', e); api.stopVideo(); return false; }
    },
    pauseToggle() { if (!video) return null; if (video.paused) { video.play().catch(() => {}); return false; } video.pause(); return true; },
    stopVideo() {
      if (video) { video.onended = null; try { video.pause(); } catch { /* bỏ qua */ } }
      if (vtex) { vtex.dispose(); vtex = null; }
      mat.map = sceneTex; mat.needsUpdate = true; cr.draw(''); acc = 99;
    },
  };
  cr.draw('');
  return api;
}

/* ---- âm thanh video đi qua WebAudio + tiếng vang tạo trong máy (không cần file) để vang khắp phòng ---- */
let routed = null;
function routeVideoAudio(video) {
  if (routed === video) return;
  const A = getAudio(); if (!A || routed) return;
  try {
    const { ctx, master } = A;
    const src = ctx.createMediaElementSource(video);
    const dry = ctx.createGain(); dry.gain.value = 0.85;
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate), pre = Math.floor(ctx.sampleRate * 0.025);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = pre; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - pre) / (len - pre), 2.8); }
    conv.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    src.connect(dry); dry.connect(master); src.connect(conv); conv.connect(wet); wet.connect(master);
    routed = video;
  } catch (e) { console.warn('Không nối được tiếng vang cho video', e); }
}
