// Hội thoại ngay trong khung cảnh 3D: lời Reset hiện trong bong bóng NGAY CẠNH Reset (bám theo vị trí trên màn hình),
// nút trả lời nằm ở dưới màn hình. Không dùng khung trắng che cảnh.
import { $, el, setSayImpl } from './ui.js';

let active = false, onExit = null, lastAnchor = null, hasTail = true, ambientTimer = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, location.search.includes('fast') ? 0 : ms));
const show = (sel, on) => { $(sel).hidden = !on; };

function layout() {
  const box = $('#dlg'), tail = $('#dlgtail');
  if (box.hidden) return;
  const w = box.offsetWidth, h = box.offsetHeight, vw = innerWidth;
  let left, top;
  if (lastAnchor && hasTail) {
    left = Math.max(8, Math.min(vw - w - 8, lastAnchor.x - w / 2));
    top = lastAnchor.y - h - 12;
    const minTop = 60;
    if (top < minTop) { top = minTop; tail.hidden = true; } else {
      tail.hidden = false;
      tail.style.left = Math.max(22, Math.min(w - 22, lastAnchor.x - left)) + 'px';
    }
  } else { // Reset không nằm trong tầm nhìn: bong bóng ở giữa phía trên
    left = Math.max(8, (vw - w) / 2); top = 70; tail.hidden = true;
  }
  box.style.left = left + 'px'; box.style.top = top + 'px';
}

export const dialogue = {
  get active() { return active; },
  get visible() { return !$('#dlg').hidden; },

  /** Lời Reset nói thường (không hỏi đáp): hiện cạnh Reset vài giây rồi tự tắt. */
  speak(text, ms = 7000) {
    if (active) return;
    const box = $('#dlg');
    box.classList.add('ambient');
    $('#dlgbub').replaceChildren(el('p', {}, text));
    box.hidden = false; layout();
    clearTimeout(ambientTimer);
    if (ms) ambientTimer = setTimeout(() => { if (!active) { box.hidden = true; box.classList.remove('ambient'); } }, ms);
  },

  /** Bắt đầu hội thoại. exit() chạy khi hội thoại kết thúc (người chơi bấm thoát hoặc gọi end). */
  start(exit) {
    if (active) this.end(true);
    active = true; onExit = exit || null;
    clearTimeout(ambientTimer); $('#dlg').classList.remove('ambient'); $('#dlg').hidden = true;
    document.body.classList.add('dlg');
    show('#dlgclose', true);
  },

  /** Reset "đang gõ" rồi nói. content: chữ hoặc danh sách phần tử. */
  async say(content, ms = 500) {
    const box = $('#dlg'), bub = $('#dlgbub');
    box.hidden = false;
    bub.replaceChildren(el('div', { class: 'typing' }, el('i'), el('i'), el('i')));
    layout();
    await sleep(ms);
    if (!active) return false;
    bub.replaceChildren(...[].concat(content).filter((c) => c != null && c !== false).map((c) => (typeof c === 'string' ? el('p', {}, c) : c)));
    bub.scrollTop = 0; layout();
    return true;
  },

  /** Nút trả lời ở dưới màn hình. items: [{ label, onClick, cls }] */
  replies(items) {
    const r = $('#replies');
    r.replaceChildren(...items.filter(Boolean).map((b) => el('button', { type: 'button', class: 'btn ' + (b.cls || 'choice'), onClick: b.onClick }, b.label)));
    r.hidden = !items.filter(Boolean).length;
  },

  /** Danh sách thẻ (ví dụ gợi ý) hiện bên cạnh, cuộn được. */
  sheet(node) {
    const s = $('#dlgsheet');
    s.replaceChildren(...(node ? [node] : []));
    s.hidden = !node; s.scrollTop = 0;
  },

  progress(n, total) {
    const p = $('#dlgprog');
    p.hidden = total <= 0;
    p.replaceChildren(el('div', { class: 'progress-bar', style: `width:${(n / total) * 100}%` }), el('span', { class: 'progress-txt' }, `${n}/${total}`));
  },

  /** Vị trí đầu Reset trên màn hình (px) hoặc null nếu không thấy. Gọi mỗi khung hình. */
  anchor(pt) { lastAnchor = pt; layout(); },

  end(silent) {
    if (!active) return;
    active = false;
    document.body.classList.remove('dlg');
    for (const s of ['#dlg', '#replies', '#dlgsheet', '#dlgprog', '#dlgclose']) show(s, false);
    $('#replies').replaceChildren(); $('#dlgsheet').replaceChildren();
    const cb = onExit; onExit = null;
    if (cb) cb(); // luôn báo để hủy các lời thoại đang chờ
  },
};

setSayImpl((t, ms) => dialogue.speak(t, ms));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && active) dialogue.end(); });
const bindClose = () => $('#dlgclose').addEventListener('click', () => dialogue.end());
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', bindClose); else bindClose();
