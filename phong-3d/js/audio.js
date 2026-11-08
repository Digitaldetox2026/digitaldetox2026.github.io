// Âm thanh tạo bằng WebAudio, không dùng file. Bật sau cú chạm đầu tiên của người dùng.
let ctx = null, master = null, ambient = null, noiseBuf = null;
let muted = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  return ctx;
}

function noise() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function isMuted() { return muted; }

/** Cho các mô-đun khác (âm thanh thiên nhiên, video) nối vào cùng bộ phát và cùng nút tắt âm. */
export function getAudio() { const c = ensure(); return c ? { ctx: c, master } : null; }
/** Tiếng ồn trắng 2 giây, lặp được (dùng chung). */
export function noiseBuffer() { return ensure() ? noise() : null; }

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}

/** Chuông nhẹ (báo hết giờ, hoàn tất). */
export function chime() {
  if (!ensure()) return;
  const t = ctx.currentTime;
  [[660, 0], [990, 0.18]].forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 2.4);
    o.connect(g); g.connect(master); o.start(t + d); o.stop(t + d + 2.5);
  });
}

/** Âm nền: 'none' | 'rain' | 'waves' */
export function setAmbient(kind) {
  if (ambient) {
    const old = ambient;
    old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => { try { old.src.stop(); old.lfo && old.lfo.stop(); } catch { /* đã dừng */ } }, 1500);
    ambient = null;
  }
  if (kind === 'none' || !ensure()) return;
  const src = ctx.createBufferSource();
  src.buffer = noise(); src.loop = true;
  const filt = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  let lfo = null;
  if (kind === 'rain') {
    filt.type = 'bandpass'; filt.frequency.value = 2200; filt.Q.value = 0.4;
    gain.gain.value = 0.0001; gain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.5);
  } else {
    filt.type = 'lowpass'; filt.frequency.value = 600;
    gain.gain.value = 0.0001; gain.gain.setTargetAtTime(0.18, ctx.currentTime, 0.5);
    lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const depth = ctx.createGain(); depth.gain.value = 0.12;
    lfo.connect(depth); depth.connect(gain.gain); lfo.start();
  }
  src.connect(filt); filt.connect(gain); gain.connect(master); src.start();
  ambient = { src, gain, lfo };
}

/* ---------- nhắc nhịp thở khi nhắm mắt ---------- */
const viVoice = () => {
  try { return speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang)) || null; } catch { return null; }
};
export function hasViVoice() { return !!viVoice(); }

/** Đọc một câu ngắn bằng giọng tiếng Việt của máy (nếu có). Tôn trọng nút tắt âm. */
export function speak(text) {
  const v = viVoice();
  if (muted || !v) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = v; u.lang = v.lang; u.rate = 0.85; u.volume = 0.9;
    speechSynthesis.speak(u);
  } catch { /* bỏ qua */ }
}
export function stopSpeech() { try { speechSynthesis.cancel(); } catch { /* bỏ qua */ } }

/** Âm báo nhịp thở: hít vào = âm đi lên, thở ra = âm đi xuống, kéo dài đúng số giây của pha. */
export function breathTone(inhale, secs) {
  if (!ensure()) return;
  const t = ctx.currentTime, lo = 330, hi = 495;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(inhale ? lo : hi, t);
  o.frequency.linearRampToValueAtTime(inhale ? hi : lo, t + secs);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.25);
  g.gain.setValueAtTime(0.12, t + Math.max(0.3, secs - 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + secs + 0.05);
}
