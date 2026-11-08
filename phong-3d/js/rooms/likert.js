// Phòng Nhận thức: Reset hỏi từng câu NGAY TRONG KHUNG CẢNH (bong bóng cạnh Reset, nút trả lời ở dưới màn hình),
// rồi nhận xét tình trạng và gợi ý cách dùng web. Chữ ở data/likert.json. Tính điểm ở likert-score.js (không đổi).
// Tùy chọn signposts ({ show(items), hide() }): gợi ý có phòng đi kèm hiện thành biển chỉ đường dựng trong không gian
// thay vì danh sách thẻ (dùng ở phòng Nhận thức, rooms3d/talk-corner.js). Không truyền thì dùng danh sách thẻ như cũ.
import { el, closePanel } from '../ui.js';
import { dialogue } from '../dialogue.js';
import { computeScores, quickItems, band } from './likert-score.js';
import { load, save } from '../storage.js';

const HISTORY_KEY = 'likert.history';

export function openLikert(ctx, { onDone, back: backTo, signposts } = {}) {
  const data = ctx.data.likert, C = data.chat;
  const items = quickItems(data.items);
  let token = 0;
  closePanel();
  if (signposts) signposts.hide();
  dialogue.start(() => { token++; });
  const answers = {}, part0 = {};
  // i = -1: chào; 0..n-1: câu hỏi; n: kết quả
  const steps = [...data.part0.map((p) => ({ t: 'p0', p })), ...items.map((it, idx) => ({ t: 'q', it, idx }))];
  let i = -1;
  ctx.mascot.play('wave');

  const questionLines = (s) => {
    if (s.t === 'p0') return s.p === data.part0[0] ? [C.p0Lead, s.p.text] : [s.p.text];
    const lines = [], first = items.findIndex((x) => x.axis === s.it.axis) === s.idx;
    if (first) lines.push(C.axisIntro[s.it.axis]);
    if (C.mid[s.idx]) lines.push(C.mid[s.idx]);
    if (s.idx === 0) lines.push(data.scaleQuestion);
    lines.push(`“${s.it.text}”`);
    return lines;
  };

  async function render() {
    const tk = ++token;
    dialogue.replies([]); dialogue.sheet(null);
    dialogue.progress(Math.max(0, Math.min(i, steps.length)), steps.length);
    if (i === -1) {
      if (!(await dialogue.say(C.greet, 500)) || tk !== token) return;
      if (!(await dialogue.say(data.intro.definition, 600)) || tk !== token) return;
      if (!(await dialogue.say(data.intro.points.join(' '), 600)) || tk !== token) return;
      dialogue.replies([{ label: C.start, cls: 'primary', onClick: () => { i = 0; render(); } }]);
      return;
    }
    if (i >= steps.length) return result(tk);
    const s = steps[i];
    if (!(await dialogue.say(questionLines(s), 450)) || tk !== token) return;
    dialogue.replies([...choicesFor(s), { label: C.back, cls: 'ghost', onClick: () => { i = Math.max(-1, i - 1); render(); } }]);
  }

  function choicesFor(s) {
    const next = () => { i++; render(); };
    if (s.t === 'p0') return s.p.options.map((o) => ({ label: o, onClick: () => { part0[s.p.id] = o; next(); } }));
    const pick = (v) => () => { answers[s.it.id] = v; next(); };
    return [...data.scale.map((x) => ({ label: `${x.v}. ${x.label}`, onClick: pick(x.v) })),
      s.it.never ? { label: data.neverLabel, cls: 'choice alt', onClick: pick('never') } : null];
  }

  /** Chờ người chơi bấm "Tiếp" rồi mới nói đoạn sau, để kịp đọc. */
  const waitNext = (tk) => new Promise((res) => dialogue.replies([{ label: 'Tiếp ▸', cls: 'primary', onClick: () => res(tk === token) }]));

  async function result(tk) {
    const r = computeScores(answers, items, data);
    if (!r.level) {
      if (!(await dialogue.say(C.notEnough, 500))) return;
      dialogue.replies([{ label: C.again, cls: 'primary', onClick: reset }]); return;
    }
    const history = load(HISTORY_KEY, []);
    const prev = history.length ? history[history.length - 1] : null;
    history.push({ at: new Date().toISOString(), level: r.level, A: r.A, B: r.B, C: r.C, D: r.D });
    save(HISTORY_KEY, history.slice(-20)); // chỉ điểm tổng hợp, không lưu từng câu trả lời
    const lv = data.levels[r.level - 1];
    ctx.mascot.play(r.level <= 2 ? 'nod' : 'wave');
    dialogue.progress(steps.length, steps.length);

    if (!(await dialogue.say(C.thanks, 500)) || tk !== token) return;
    if (!(await waitNext(tk))) return;
    if (!(await dialogue.say([C.levelLead + ':', el('p', { class: 'level' }, `Mức ${lv.level}: ${lv.name}`), lv.mascot, lv.summary], 700)) || tk !== token) return;
    if (!(await waitNext(tk))) return;

    const dBand = r.D == null ? null : r.D < data.thresholds.dLow ? 'thap' : r.D >= data.thresholds.dHigh ? 'cao' : 'vua';
    const notice = [['A', band(r.A, data.thresholds)], ['B', band(r.B, data.thresholds)], ['C', band(r.C, data.thresholds)], ['D', dBand]]
      .filter(([, b]) => b).map(([k, b]) => data.axisFeedback[k][b]);
    if (!(await dialogue.say([C.noticeLead, el('ul', { class: 'bullets' }, notice.map((t) => el('li', {}, t))), r.controlNote ? data.controlNote : null].filter(Boolean), 700)) || tk !== token) return;
    if (!(await waitNext(tk))) return;

    const solsNode = el('div', { class: 'sols' }, lv.solutions.map(solutionCard));
    const useSigns = !!signposts && lv.solutions.some((x) => x.room);
    if (useSigns) {
      signposts.show(lv.solutions.filter((x) => x.room));
      const list = el('ul', { class: 'bullets' }, lv.solutions.map((x) => el('li', {}, `${x.icon} `, el('b', {}, x.title), x.text ? `. ${x.text}` : '')));
      if (!(await dialogue.say([C.solutionsLead, list, C.signLead], 500)) || tk !== token) return;
    } else {
      dialogue.sheet(solsNode);
      if (!(await dialogue.say(C.solutionsLead + ' Bấm nút trong danh sách để đi thẳng tới đó.', 500)) || tk !== token) return;
    }
    if (!(await waitNext(tk))) return;
    dialogue.sheet(null);

    const extra = [r.dLow ? data.dLowTip : null, prev ? `Lần làm trước của bạn trên máy này: Mức ${prev.level}.` : null].filter(Boolean);
    if (!(await dialogue.say([el('p', { class: 'safe' }, data.safety), ...extra, el('p', { class: 'small' }, data.disclaimer + ' ' + data.draftNote)], 700)) || tk !== token) return;
    dialogue.replies([
      backTo ? { label: backTo.label, cls: 'primary', onClick: () => { dialogue.end(true); backTo.action(); } } : null,
      useSigns
        ? { label: C.seeSigns, onClick: () => dialogue.end(true) }
        : { label: 'Xem lại gợi ý', onClick: () => { dialogue.sheet(solsNode); dialogue.say('Gợi ý của mình đây. Bấm nút trong danh sách để đi thẳng tới đó nhé.', 300); } },
      { label: C.detail, onClick: () => showDetail(r) },
      { label: C.again, cls: 'ghost', onClick: reset },
      { label: 'Đóng', cls: 'ghost', onClick: () => dialogue.end() },
    ]);
    onDone && onDone(r);
  }

  function solutionCard(s) {
    const room = s.room ? ctx.data.rooms.rooms.find((x) => x.id === s.room) : null;
    return el('div', { class: 'sol' },
      el('div', { class: 'sol-head' }, el('span', { class: 'sol-ico' }, s.icon), el('b', {}, s.title)),
      el('p', {}, s.text),
      room ? el('button', { type: 'button', class: 'btn ghost small-btn', onClick: () => { dialogue.end(true); ctx.goto(room.id, { open: true }); } },
        `Đi tới ${room.name}${room.demo ? ' (bản demo)' : ''}`) : null);
  }

  function showDetail(r) {
    const fmt = (v) => (v == null ? '-' : v.toFixed(1).replace('.', ','));
    dialogue.sheet(el('div', {}, el('ul', { class: 'axes' }, ['A', 'B', 'C', 'D'].map((k) =>
      el('li', {}, el('span', {}, data.axes[k]), el('b', {}, fmt(r[k]) + ' / 5')))),
    el('p', { class: 'small' }, 'Điểm cao ở ba mục đầu nghĩa là việc lướt đang ảnh hưởng nhiều hơn. Điểm cao ở "Yếu tố bảo vệ" là điều tốt.')));
    dialogue.say('Đây là điểm chi tiết của bạn.', 300);
  }

  function reset() { for (const k in answers) delete answers[k]; for (const k in part0) delete part0[k]; i = -1; render(); }

  render();
}
