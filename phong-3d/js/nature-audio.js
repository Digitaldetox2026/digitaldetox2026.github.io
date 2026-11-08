// Âm thanh thiên nhiên TẠO TRONG MÁY (WebAudio, không dùng file): nước ở thác và hồ, chim ở các cây, gió nền.
// Âm có vị trí: đi gần thác thì tiếng nước to hơn. Mặc định nhỏ; nút tắt âm (audio.js) tắt hết.
// Cơ sở chọn nước + chim: Buxton 2021 (PNAS), Alvarsson 2010; nguồn ở docs/KE_HOACH_TRAI_NGHIEM_CHUA_LANH.md mục 1.
import { getAudio, noiseBuffer } from './audio.js';

export function createSoundscape({ waterAt, treeSpots }) {
  const A = getAudio(); if (!A) return null;
  const { ctx, master } = A;
  const out = ctx.createGain(); out.gain.value = 0; out.connect(master);   // âm lượng cả sảnh
  const roomOut = ctx.createGain(); roomOut.gain.value = 0; roomOut.connect(master); // âm trong phòng (cảnh)
  let lobbyOn = false, focus = 0, roomScene = 'none', alive = true;
  const buf = noiseBuffer();

  const panner = (x, y, z, ref = 8, roll = 1) => {
    const p = ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = roll; p.maxDistance = 400;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
    return p;
  };
  const noiseSrc = (rate = 1, offset = 0) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(0, offset); return s;
  };
  const lfo = (freq, depth, target) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o;
  };

  /* ---- nước: thác (xa, mạnh) + hồ giữa sảnh (nhẹ). Ba lớp lọc để nghe như nước chảy, không phải "rè". ---- */
  const waterGain = ctx.createGain(); waterGain.gain.value = 0.9; waterGain.connect(out);
  const mkWater = (x, y, z, level, ref) => {
    const g = ctx.createGain(); g.gain.value = level;
    const pn = panner(x, y, z, ref, 0.7); g.connect(pn); pn.connect(waterGain);
    for (const [type, f, q, k, rate, off] of [['bandpass', 650, 0.5, 1, 1, 0], ['bandpass', 1900, 0.7, 0.55, 0.93, 0.7], ['highpass', 3500, 0.3, 0.12, 1.07, 1.3]]) {
      const s = noiseSrc(rate, off), fl = ctx.createBiquadFilter(), kg = ctx.createGain();
      fl.type = type; fl.frequency.value = f; fl.Q.value = q; kg.gain.value = k;
      s.connect(fl); fl.connect(kg); kg.connect(g);
      lfo(0.13 + Math.random() * 0.2, k * 0.25, kg.gain); // sóng nước dập dềnh chậm
    }
  };
  mkWater(waterAt.x, 4, waterAt.z, 0.5, 14);   // thác
  mkWater(0, 0.3, 0, 0.18, 6);                  // hồ nhỏ giữa sảnh

  /* ---- gió nền, không có vị trí ---- */
  const windG = ctx.createGain(); windG.gain.value = 0.05; windG.connect(out);
  { const s = noiseSrc(0.6, 0.3), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; s.connect(f); f.connect(windG); lfo(0.07, 0.03, windG.gain); }

  /* ---- chim: một "câu hót" ngắn từ một cây ngẫu nhiên, thưa và không đều nhịp ---- */
  function chirp(dest, when) {
    const notes = 2 + Math.floor(Math.random() * 4), base = 2300 + Math.random() * 2200;
    let t = when;
    for (let i = 0; i < notes; i++) {
      const f0 = base * (0.85 + Math.random() * 0.4), f1 = f0 * (Math.random() < 0.5 ? 1.35 : 0.72), len = 0.07 + Math.random() * 0.1;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + len + 0.02);
      t += len + 0.04 + Math.random() * 0.1;
    }
  }
  const birdBus = ctx.createGain(); birdBus.gain.value = 0.16; birdBus.connect(out);
  let birdTimer = 0, roomBirds = false;
  const roomBirdBus = ctx.createGain(); roomBirdBus.gain.value = 0.1; roomBirdBus.connect(roomOut);
  function scheduleBird() {
    if (!alive) return;
    birdTimer = setTimeout(() => {
      if (lobbyOn && treeSpots.length) {
        const s = treeSpots[Math.floor(Math.random() * treeSpots.length)];
        const pn = panner(s.x, s.y, s.z, 5, 1.1); pn.connect(birdBus); chirp(pn, ctx.currentTime + 0.02);
        setTimeout(() => { try { pn.disconnect(); } catch { /* đã gỡ */ } }, 2500);
      }
      if (roomBirds) chirp(roomBirdBus, ctx.currentTime + 0.02);
      scheduleBird();
    }, 1800 + Math.random() * 4200);
  }
  scheduleBird();

  /* ---- cảnh trong phòng Chánh niệm: Biển / Rừng / Mưa (Im lặng = tắt) ---- */
  const sc = {};
  const mkScene = (id, build) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(roomOut); build(g); sc[id] = g; };
  mkScene('bien', (g) => { // sóng: tiếng ồn lọc thấp, to nhỏ theo nhịp ~9 giây
    const s = noiseSrc(0.8, 0.2), f = ctx.createBiquadFilter(), w = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 900; w.gain.value = 0.55; s.connect(f); f.connect(w); w.connect(g); lfo(0.11, 0.4, w.gain);
    const s2 = noiseSrc(1.1, 1.1), f2 = ctx.createBiquadFilter(), w2 = ctx.createGain();
    f2.type = 'bandpass'; f2.frequency.value = 2400; w2.gain.value = 0.1; s2.connect(f2); f2.connect(w2); w2.connect(g); lfo(0.11, 0.08, w2.gain);
  });
  mkScene('rung', (g) => { // gió qua lá + chim (chim phát từ roomBirdBus)
    const s = noiseSrc(0.7, 0.5), f = ctx.createBiquadFilter(), w = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.4; w.gain.value = 0.35; s.connect(f); f.connect(w); w.connect(g); lfo(0.09, 0.18, w.gain);
  });
  mkScene('mua', (g) => { // mưa đều
    const s = noiseSrc(1, 0.9), f = ctx.createBiquadFilter(), w = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.4; w.gain.value = 0.6; s.connect(f); f.connect(w); w.connect(g);
    const s2 = noiseSrc(0.9, 1.5), f2 = ctx.createBiquadFilter(), w2 = ctx.createGain();
    f2.type = 'lowpass'; f2.frequency.value = 400; w2.gain.value = 0.35; s2.connect(f2); f2.connect(w2); w2.connect(g);
  });

  const ramp = (param, v, tc = 0.6) => param.setTargetAtTime(v, ctx.currentTime, tc);
  const api = {
    /** Gọi mỗi khung hình: đặt vị trí và hướng người nghe. */
    listener(p, yaw) {
      const L = ctx.listener, fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      if (L.positionX) {
        L.positionX.value = p.x; L.positionY.value = 1.6; L.positionZ.value = p.z;
        L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
      } else { L.setPosition(p.x, 1.6, p.z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
    },
    /** Đang ở sảnh thì bật tiếng thiên nhiên sảnh (rất nhỏ), ở phòng thì tắt. */
    setLobby(on) { lobbyOn = on; ramp(out.gain, on ? 0.55 : 0, 1.2); },
    /** 0..1: đang ngồi nghỉ ở ghế đá, tiếng nước nổi lên một chút, gió nhỏ đi. */
    setFocus(k) { if (k === focus) return; focus = k; ramp(waterGain.gain, 0.9 + k * 0.9, 1.5); ramp(windG.gain, 0.05 - k * 0.03, 1.5); },
    /** 'bien' | 'rung' | 'mua' | 'none' | null (null = rời phòng, tắt hết). */
    setRoomScene(kind) {
      roomScene = kind || 'none';
      for (const id of Object.keys(sc)) ramp(sc[id].gain, id === roomScene ? 0.5 : 0, 0.9);
      roomBirds = roomScene === 'rung';
      ramp(roomOut.gain, kind ? 0.9 : 0, 0.8);
    },
    get roomScene() { return roomScene; },
    dispose() { alive = false; clearTimeout(birdTimer); },
  };
  return api;
}
