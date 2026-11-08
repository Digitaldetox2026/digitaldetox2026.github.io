// Phòng Thử thách trong không gian: bước lên viên đá của ngày -> Reset giao việc bằng bong bóng, bạn chọn bằng nút trả lời;
// đồng hồ cát 3D chạy trong phòng; cảm nhận chọn mặt cười; xong thì đá sáng và cây mọc. Chữ ở data/challenge.json (mục "room").
// Tiến độ lưu qua storage.js với khoá "challenge" (cùng định dạng cũ). Không đếm chuỗi ngày, không điểm số.
import { buildStonesProps, N } from './stones-props.js';
import { dialogue } from '../dialogue.js';
import { el, openPanel, closePanel } from '../ui.js';
import { load, save } from '../storage.js';
import { chime } from '../audio.js';
import { phoneGuideView } from '../rooms/phoneguide.js';
import { openLikert } from '../rooms/likert.js';

const KEY = 'challenge';
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);
const SPEED = location.search.includes('fast') ? 60 : 1;   // ?fast: đồng hồ chạy nhanh để kiểm thử

export function createStonesRoom(built, ctx) {
  const d = ctx.data.challenge, R = d.room, c = built.center;
  const state = load(KEY, { days: {}, plans: {} });
  const isDone = (n) => !!(state.days[n] && state.days[n].done);
  const nextDay = () => (d.days.find((x) => !isDone(x.day)) || {}).day || null;
  const bar = { box: $('sessionbar'), cue: $('sbcue'), time: $('sbtime'), stop: $('sbstop'), pause: $('sbpause') };
  let session = null;   // { n, sess, total, t0 } khi đồng hồ cát đang chạy
  let dwell = 0, armed = true, lastLeft = -1, token = 0;
  const prev = { x: 0, z: 0 };

  const props = buildStonesProps({ built, ctx, api: { isDone, nextDay }, on: { stone: (n) => beginDay(n), prop: (id) => (id === 'board' ? boardTalk() : ctx.say(R.props[id], 10000)) }, T: R.ifThen, stageNames: d.stages.map((s) => s.name) });
  props.setPlan(state.plans.lapse || '');
  const persist = () => save(KEY, state);

  /* ---- một ngày: giao việc -> (chọn) -> đồng hồ cát -> cảm nhận -> cây mọc ---- */
  async function beginDay(n) {
    if (session) { ctx.say(R.busy, 4000); return; }
    if (dialogue.active) return;
    ctx.visit('thu-thach');
    const day = d.days[n - 1], sess = { minutes: day.minutes, pick: null, mood: null };
    dialogue.start(() => { token++; });
    const tk = ++token, alive = () => tk === token;
    ctx.mascot.play('wave');
    const wait = (extra = []) => new Promise((res) => dialogue.replies([{ label: R.next, cls: 'primary', onClick: () => res(alive()) }, ...extra]));
    const say = async (content) => (await dialogue.say(content, 450)) && alive();

    const carry = day.stage === 1 && day.carry ? `${d.carryHeader}: ${day.carry.map((x) => `Ngày ${x}`).join(', ')}.` : null;
    if (!(await say([el('b', {}, `Ngày ${n}: ${day.title}`), day.why, carry && el('p', { class: 'small' }, carry)])) || !(await wait())) return;

    const phone = day.phone ? { label: R.phoneBtn, cls: 'ghost', onClick: () => { const p = openPanel({ title: ctx.data.phone.title }); p.body.append(phoneGuideView(ctx.data.phone, { topics: day.phone, onBack: closePanel })); } } : null;
    if (!(await say([el('ol', { class: 'steps' }, day.steps.map((s) => el('li', {}, s))), R.dayNotes[n] && el('p', { class: 'small' }, R.dayNotes[n])])) || !(await wait(phone ? [phone] : []))) return;

    const type = day.extra && day.extra.type;
    if (day.pick) {
      if (!(await say(R.askPick))) return;
      const opts = day.options || d.activities;
      const a = await new Promise((res) => dialogue.replies([...opts.map((o) => ({ label: `${o.icon} ${o.name}`, onClick: () => res(o) })), { label: R.later, cls: 'ghost', onClick: () => { dialogue.end(); res(null); } }]));
      if (!alive() || !a) return;
      sess.pick = a.name;
      if (a.hint && (!(await say(a.hint)) || !(await wait()))) return;
    }

    if (type === 'plans') { if (!(await planTalk(alive))) return; return askFeel(n, sess); }
    if (type === 'likert') {
      if (!(await say(R.askLikert))) return;
      const go = await new Promise((res) => dialogue.replies([{ label: R.likertBtn, cls: 'primary', onClick: () => res(true) }, { label: R.later, cls: 'ghost', onClick: () => { dialogue.end(); res(false); } }]));
      if (!go || !alive()) return;
      dialogue.end(true);
      return openLikert(ctx, { back: { label: R.backToStone, action: () => askFeel(n, sess) } });
    }

    if (!(await say(R.askMinutes))) return;
    const mins = [...new Set([1, 5, day.minutes, 20])].sort((a, b) => a - b);
    const m = await new Promise((res) => dialogue.replies([...mins.map((x) => ({ label: R.minutes.replace('{m}', x), cls: x === day.minutes ? 'primary' : 'choice', onClick: () => res(x) })),
      { label: R.skipClock, cls: 'ghost', onClick: () => res(0) }, { label: R.later, cls: 'ghost', onClick: () => { dialogue.end(); res(-1); } }]));
    if (!alive() || m < 0) return;
    if (m === 0) return askFeel(n, sess);
    sess.minutes = m; startTimer(n, sess, type === 'urge');
  }

  /* ---- ngày 13: kế hoạch "Nếu... thì..." (ô viết là tùy chọn) ---- */
  async function planTalk(alive) {
    const plans = d.days[12].extra.plans, T = R.ifThen;
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i], chips = i === 0 ? T.lapseChips : T.keepChips;
      if (!(await dialogue.say(i === 0 ? [T.intro, p.label] : [p.label], 500)) || !alive()) return false;
      const choice = await new Promise((res) => dialogue.replies([...chips.map((t) => ({ label: t, onClick: () => res(t) })), { label: T.writeOwn, onClick: () => res('__own') }, { label: T.skip, cls: 'ghost', onClick: () => res(null) }]));
      if (!alive()) return false;
      const text = choice === '__own' ? await askText(T) : choice;
      if (!alive()) return false;
      if (text) { state.plans[p.key] = text.slice(0, 160); persist(); if (p.key === 'lapse') props.setPlan(text); }
    }
    return true;
  }
  /** Chạm tấm bảng: viết hoặc sửa kế hoạch bất cứ lúc nào (không tính là đã xong Ngày 13). */
  async function boardTalk() {
    if (session) { ctx.say(R.busy, 4000); return; }
    if (dialogue.active) return;
    ctx.visit('thu-thach'); armed = false;   // đang đứng gần viên đá thì không tự giao việc ngay sau khi viết xong
    dialogue.start(() => { token++; });
    const tk = ++token, alive = () => tk === token;
    if (!(await planTalk(alive))) return;
    if (!(await dialogue.say(R.ifThen.done, 400)) || !alive()) return;
    dialogue.replies([{ label: R.stay, cls: 'primary', onClick: () => dialogue.end() }]);
  }
  function askText(T) {
    return new Promise((res) => {
      const ta = el('textarea', { rows: 3, maxlength: 160, placeholder: T.placeholder });
      dialogue.sheet(el('label', { class: 'field' }, ta));
      const done = (v) => { dialogue.sheet(null); res(v); };
      dialogue.replies([{ label: T.save, cls: 'primary', onClick: () => done(ta.value.trim()) }, { label: T.skip, cls: 'ghost', onClick: () => done(null) }]);
      setTimeout(() => ta.focus(), 60);
    });
  }

  /* ---- đồng hồ cát ---- */
  function startTimer(n, sess, urge) {
    dialogue.end(true);
    session = { n, sess, total: sess.minutes * 60, t0: Date.now() }; lastLeft = -1;
    bar.box.hidden = false; bar.pause.hidden = true; bar.cue.textContent = sess.pick ? `Đang làm: ${sess.pick}` : 'Đang làm'; bar.time.textContent = fmt(session.total);
    props.showHourglass(n); ctx.mascot.play('nod');
    ctx.say(urge ? d.urgeSteps.join(' ') : R.timerStart, urge ? 16000 : 7000);
  }
  function endTimer() { session = null; bar.box.hidden = true; props.hideHourglass(); }
  function stopSession(silent) { if (!session) return; endTimer(); if (!silent) ctx.say(R.stopped, 5000); }
  bar.stop.addEventListener('click', () => stopSession());

  /* ---- cảm nhận bằng mặt cười, rồi viên đá sáng và cây mọc ---- */
  async function askFeel(n, sess) {
    dialogue.start(() => { token++; });
    const tk = ++token, alive = () => tk === token, day = d.days[n - 1];
    const hist = load('likert.history', []);
    const cmp = day.extra && day.extra.type === 'likert' && hist.length >= 2 ? R.compare.replace('{a}', hist[0].level).replace('{b}', hist[hist.length - 1].level) : null;
    if (!(await dialogue.say([cmp && el('p', { class: 'small' }, cmp), R.feelAsk].filter(Boolean), 500)) || !alive()) return;
    const v = await new Promise((res) => dialogue.replies([...d.moods.map((m) => ({ label: `${m.emoji} ${m.label}`, onClick: () => res(m.v) })), { label: R.skip, cls: 'ghost', onClick: () => res(0) }]));
    if (!alive()) return;
    sess.mood = v || null;
    state.days[n] = { done: true, mood: sess.mood, note: '', pick: sess.pick, at: new Date().toISOString() }; persist();   // chỉ lưu mức cảm nhận, trên máy
    props.sync(true, n); chime(); ctx.mascot.play('jump');
    const all = !nextDay();
    if (!(await dialogue.say([d.afterMsg, R.grown, all && R.allDone].filter(Boolean), 700)) || !alive()) return;
    dialogue.replies(all || n >= N
      ? [{ label: R.stay, cls: 'primary', onClick: () => dialogue.end() }]
      : [{ label: R.nextBtn, cls: 'primary', onClick: () => { dialogue.end(true); ctx.mascot.play('point'); ctx.say(R.nextHint, 7000); } }, { label: R.stay, cls: 'ghost', onClick: () => dialogue.end() }]);
  }

  return {
    props, busy: () => !!session,
    goal: () => { const n = nextDay(); return n ? props.stoneWorld(n) : null; },   // Reset đi trước về phía viên đá tiếp theo
    enter() { props.sync(false); armed = true; dwell = 0; },
    leave() { stopSession(true); },
    intro() { ctx.say(R.intro, 14000); ctx.mascot.play('point'); },
    setLite: (on) => props.setLite(on),
    update(t, dt, isActive) {
      props.update(t, dt);
      if (!isActive) return;
      const P = ctx.player, lx = P.x - c.x, lz = P.z - c.z;
      if (session) {
        const el2 = ((Date.now() - session.t0) / 1000) * SPEED, left = Math.max(0, Math.ceil(session.total - el2));
        props.setHourglass(el2 / session.total);
        if (left !== lastLeft) { lastLeft = left; bar.time.textContent = fmt(left); }
        if (el2 >= session.total) { const s = session; endTimer(); chime(); askFeel(s.n, s.sess); }
      }
      // đứng yên trên một viên đá khoảng một giây thì Reset giao việc (đi ngang qua thì không)
      const still = dt > 0 && Math.hypot(P.x - prev.x, P.z - prev.z) / dt < 0.4; prev.x = P.x; prev.z = P.z;
      let best = -1, bd = 1e9;
      props.stones.forEach((p, i) => { const dd = Math.hypot(p.x - lx, p.z - lz); if (dd < bd) { bd = dd; best = i; } });
      if (bd > 1.5) armed = true;
      if (bd < 0.55 && still && armed && !session && !dialogue.active) { dwell += dt; if (dwell > 0.9) { dwell = 0; armed = false; beginDay(best + 1); } } else if (!(bd < 0.55)) dwell = 0;
    },
  };
}
