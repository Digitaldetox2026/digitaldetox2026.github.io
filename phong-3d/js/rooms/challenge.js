// Phòng Thử thách: hành trình khởi động 14 ngày. Một nhiệm vụ chạy liền trong MỘT khung:
// [Bắt đầu] -> [Đang làm, có đồng hồ] -> [Cảm nhận] -> [Hoàn tất].
import { el, btn, openPanel } from '../ui.js';
import { load, save } from '../storage.js';
import { chime } from '../audio.js';
import { phoneGuideView } from './phoneguide.js';
import { openLikert } from './likert.js';

const KEY = 'challenge';
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function openChallenge(ctx, opts = {}) {
  const d = ctx.data.challenge;
  const state = load(KEY, { days: {}, plans: {} });
  let timer = 0;
  const panel = openPanel({ title: d.title, onClose: () => clearInterval(timer) });
  const persist = () => save(KEY, state);
  const put = (...nodes) => panel.body.append(...nodes.filter((x) => x != null && x !== false)); // append gốc in chữ "null" khi gặp phần tử rỗng
  const doneCount = () => Object.values(state.days).filter((x) => x.done).length;
  const clear = () => { clearInterval(timer); panel.body.replaceChildren(); panel.body.scrollTop = 0; };

  /* ---------- danh sách 14 ngày ---------- */
  function renderList() {
    clear(); panel.setTitle(d.title);
    const nextDay = (d.days.find((x) => !(state.days[x.day] && state.days[x.day].done)) || {}).day;
    put(
      el('p', { class: 'lead' }, d.intro),
      el('p', { class: 'small tag' }, `Đã xong ${doneCount()}/14 ngày`),
      ...d.stages.map((st) => el('section', { class: 'card2' },
        el('b', {}, st.name), el('p', { class: 'small' }, st.summary),
        el('div', { class: 'days' }, d.days.filter((x) => x.stage === st.id).map((x) => {
          const done = state.days[x.day] && state.days[x.day].done;
          return el('button', { type: 'button', class: 'day' + (done ? ' done' : '') + (x.day === nextDay ? ' next' : ''),
            'aria-label': `Ngày ${x.day}${done ? ', đã xong' : ''}`, onClick: () => renderTask(x.day) },
            el('span', { class: 'dn' }, String(x.day)), done ? el('span', { class: 'ck' }, '✓') : null);
        })))),
      el('p', { class: 'safe' }, d.safety));
    if (nextDay) { ctx.say(`Gợi ý: hôm nay làm Ngày ${nextDay} nhé. Mỗi ngày chỉ một việc nhỏ thôi.`); }
  }

  /* ---------- một nhiệm vụ ---------- */
  function renderTask(n, phase = 'start', draft = {}) {
    const day = d.days[n - 1];
    const sess = { minutes: draft.minutes || day.minutes, pick: draft.pick || null, mood: draft.mood || null, note: draft.note || '' };
    const title = el('h3', {}, `Ngày ${day.day}: ${day.title}`);
    const top = btn('← Danh sách', renderList, 'ghost');
    clear(); panel.setTitle(`Ngày ${day.day}`);
    if (phase === 'start') return start();
    if (phase === 'doing') return doing();
    if (phase === 'feel') return feel();
    return finish();

    function stageNav() {
      return day.stage === 1 && day.day > 1
        ? el('div', { class: 'chips' }, el('span', { class: 'small' }, d.carryHeader + ': '),
          day.carry.map((c) => el('span', { class: 'chip' }, `Ngày ${c}`)))
        : null;
    }

    function start() {
      const mins = [...new Set([1, 5, day.minutes, 20])].sort((a, b) => a - b);
      put(top, title, stageNav(),
        el('p', { class: 'lead' }, day.why),
        el('ol', { class: 'steps' }, day.steps.map((s) => el('li', {}, s))),
        day.pick ? el('div', {}, el('b', {}, day.options ? 'Chọn cách hợp với lịch của bạn (gợi ý):' : 'Chọn một hoạt động (gợi ý):'),
          el('div', { class: 'choices wrap' }, (day.options || d.activities).map((a) => btn(`${a.icon} ${a.name}`, () => { sess.pick = a.name; renderTask(n, 'start', sess); },
            'choice' + (sess.pick === a.name ? ' on' : '')))),
          (() => { const o = (day.options || []).find((x) => x.name === sess.pick); return o && o.hint ? el('p', { class: 'small' }, o.hint) : null; })()) : null,
        day.phone ? btn('📱 Hướng dẫn trên điện thoại thật', () => {
          clear();
          put(phoneGuideView(ctx.data.phone, { topics: day.phone, onBack: () => renderTask(n, 'start', sess) }));
        }, 'ghost') : null,
        el('div', { class: 'small' }, 'Đồng hồ (số phút):'),
        el('div', { class: 'choices wrap' }, mins.map((m) => btn(`${m} phút`, () => { sess.minutes = m; renderTask(n, 'start', sess); }, 'choice' + (sess.minutes === m ? ' on' : '')))),
        el('div', { class: 'row' },
          btn('Bắt đầu', () => { ctx.mascot.play('nod'); renderTask(n, 'doing', sess); }, 'primary'),
          btn('Bỏ qua đồng hồ', () => renderTask(n, 'feel', sess), 'ghost')));
    }

    function doing() {
      const total = sess.minutes * 60, t0 = Date.now();
      const clock = el('div', { class: 'clock', 'aria-live': 'off' }, fmtTime(total));
      const extra = day.extra || {};
      put(title, el('p', { class: 'small tag' }, sess.pick ? `Đang làm: ${sess.pick}` : 'Đang làm'), clock,
        el('ol', { class: 'steps' }, (extra.type === 'urge' ? d.urgeSteps : day.steps).map((s) => el('li', {}, s))),
        extra.type === 'plans' ? plansView(extra.plans) : null,
        extra.type === 'likert' ? btn('Làm lại bộ câu hỏi nhanh', () => openLikert(ctx, {
          back: { label: 'Quay lại hành trình', action: () => openChallenge(ctx, { day: n, phase: 'feel', fromLikert: true, draft: sess }) },
        }), 'primary') : null,
        el('div', { class: 'row' },
          btn('Xong rồi', () => renderTask(n, 'feel', sess), 'primary'),
          btn('Dừng lại', () => renderTask(n, 'start', sess), 'ghost')));
      ctx.say('Mình ở đây. Cứ làm chậm rãi thôi.', 4000);
      timer = setInterval(() => {
        const left = total - Math.round((Date.now() - t0) / 1000);
        clock.textContent = fmtTime(Math.max(0, left));
        if (left <= 0) { clearInterval(timer); chime(); renderTask(n, 'feel', sess); }
      }, 250);
    }

    function plansView(plans) {
      return el('div', {}, plans.map((p) => el('label', { class: 'field' }, el('span', {}, p.label),
        el('textarea', { rows: 3, placeholder: p.placeholder, onInput: (e) => { state.plans[p.key] = e.target.value; persist(); } }, state.plans[p.key] || ''))));
    }

    function feel() {
      const hist = load('likert.history', []);
      const cmp = day.extra && day.extra.type === 'likert' && hist.length >= 2
        ? el('p', { class: 'card2' }, `So sánh: lần đầu Mức ${hist[0].level}, lần mới nhất Mức ${hist[hist.length - 1].level}. Đây chỉ là mô tả thói quen của bạn, không phải chẩn đoán.`) : null;
      ctx.say('Bạn thấy thế nào sau khi làm? Chọn một mặt cười nhé.', 6000);
      put(title, cmp, el('h4', {}, 'Cảm nhận của bạn'),
        el('div', { class: 'moods' }, d.moods.map((m) => el('button', { type: 'button', class: 'mood' + (sess.mood === m.v ? ' on' : ''),
          'aria-label': m.label, onClick: () => { sess.mood = m.v; renderTask(n, 'feel', sess); } }, el('span', {}, m.emoji), el('small', {}, m.label)))),
        el('label', { class: 'field' }, el('span', { class: 'small' }, 'Ghi chú (không bắt buộc)'),
          el('textarea', { rows: 2, onInput: (e) => { sess.note = e.target.value; } }, sess.note)),
        el('div', { class: 'row' }, btn('Hoàn tất', () => {
          state.days[n] = { done: true, mood: sess.mood, note: sess.note.slice(0, 500), pick: sess.pick, at: new Date().toISOString() };
          persist(); renderTask(n, 'finish', sess);
        }, 'primary')));
    }

    function finish() {
      chime(); ctx.mascot.play('jump'); ctx.say(d.afterMsg, 7000);
      put(title, el('div', { class: 'celebrate' }, '🎉'),
        el('p', { class: 'lead' }, d.afterMsg + ` Đã xong ${doneCount()}/14 ngày.`),
        el('div', { class: 'row' },
          day.day < 14 ? btn(`Sang Ngày ${day.day + 1}`, () => renderTask(day.day + 1), 'primary') : null,
          btn('Về danh sách', renderList, 'ghost')),
        el('p', { class: 'safe' }, d.safety));
    }
  }

  if (opts.day) renderTask(opts.day, opts.phase || 'start', opts.draft || {});
  else renderList();
}
