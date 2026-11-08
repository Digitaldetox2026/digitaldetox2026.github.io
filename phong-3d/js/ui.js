// Công cụ giao diện dùng chung: tạo phần tử, khung nổi (panel), bong bóng lời linh vật.
export const $ = (sel, root = document) => root.querySelector(sel);

/** Tạo phần tử: el('div', {class:'x', onClick: fn}, 'chữ', con...) */
export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

export const btn = (text, onClick, cls = '') => el('button', { class: 'btn ' + cls, type: 'button', onClick }, text);

/* ---------- khung nổi ---------- */
let current = null;

export function isPanelOpen() { return current !== null; }

export function closePanel() {
  if (!current) return;
  const c = current; current = null;
  $('#panel').hidden = true;
  $('#pbody').replaceChildren();
  c.onClose && c.onClose();
}

/** Mở khung. Trả về { body, setTitle, close }. onClose chạy khi khung đóng (dọn đồng hồ, âm thanh). */
export function openPanel({ title, demo = false, onClose } = {}) {
  closePanel();
  current = { onClose };
  $('#ptitle').textContent = title || '';
  $('#pbadge').hidden = !demo;
  const body = $('#pbody');
  body.replaceChildren();
  $('#panel').hidden = false;
  body.scrollTop = 0;
  return {
    body,
    setTitle: (t) => { $('#ptitle').textContent = t; },
    close: closePanel,
  };
}

export function initPanel() {
  $('#pclose').addEventListener('click', closePanel);
  $('#panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') closePanel(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });
}

/* ---------- lời linh vật: bong bóng nằm cạnh Reset (do dialogue.js đăng ký) ---------- */
let sayImpl = null;
export function setSayImpl(fn) { sayImpl = fn; }
export function say(text, ms = 7000) { if (sayImpl) sayImpl(text, ms); }
