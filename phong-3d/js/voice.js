// Giọng nhắc nhịp thở bằng giọng NGƯỜI THẬT: thu ngay trong app (lưu trên máy), hoặc đặt sẵn file
// world/audio/hit-vao.mp3 và world/audio/tho-ra.mp3. Không dùng giọng đọc máy mặc định vì nghe máy móc.
import { load, save, remove } from './storage.js';
import { isMuted } from './audio.js';

export const KINDS = { in: 'Hít vào', out: 'Thở ra' };
const KEYS = { in: 'voice.in', out: 'voice.out' };
const FILES = { in: 'audio/hit-vao.mp3', out: 'audio/tho-ra.mp3' };
const fileOk = { in: false, out: false };

/** Kiểm tra có sẵn file âm thanh đặt trong world/audio/ không. */
export async function probeFiles() {
  for (const k of Object.keys(FILES)) {
    try {
      const r = { ok: false, headers: new Headers() }; // bản công khai: không có file giọng sẵn
      const type = r.headers.get('content-type') || '';
      fileOk[k] = r.ok && !type.includes('text/html');
    } catch { fileOk[k] = false; }
  }
}

export const getUrl = (kind) => load(KEYS[kind], null) || (fileOk[kind] ? FILES[kind] : null);
export const hasVoice = () => !!(getUrl('in') && getUrl('out'));
export const canRecord = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

let current = null;
export function playClip(kind) {
  const url = getUrl(kind);
  if (!url || isMuted()) return;
  try {
    if (current) current.pause();
    current = new Audio(url);
    current.volume = 0.9;
    current.play().catch(() => {});
  } catch { /* bỏ qua */ }
}
export function stopClip() { try { if (current) current.pause(); } catch { /* bỏ qua */ } }

/** Bắt đầu thu. Trả về { stop() -> Promise<boolean> }. Hỏi quyền micro lần đầu. */
export async function startRecording(kind) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const fr = new FileReader();
        fr.onload = () => resolve(save(KEYS[kind], fr.result)); // false nếu bộ nhớ trình duyệt đầy
        fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType }));
      };
      rec.stop();
    }),
  };
}

export function deleteClip(kind) { remove(KEYS[kind]); }
