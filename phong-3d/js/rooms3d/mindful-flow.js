// Luồng phòng Chánh niệm trong không gian: chọn bằng chạm vật thể, Reset nói bằng bong bóng, thở/xem thiền ngay trong phòng.
// Nhịp thở chỉ là NHỊP GỢI Ý; không khẳng định hiệu quả y khoa (nguồn NCCIH ở data/mindful.json).
import { buildMindfulProps, POSTS } from './mindful-props.js';
import { createScreen } from './mindful-screen.js';
import { openPanel } from '../ui.js';
import { load, save } from '../storage.js';
import { chime, breathTone } from '../audio.js';
import { probeFiles, hasVoice, playClip, stopClip } from '../voice.js';
import { voiceCard } from '../rooms/voice-card.js';
import { renderAfter } from '../rooms/mindful-after.js';
import { dialogue } from '../dialogue.js';

const HALF = 8;
const PACES = [
  { id: 'nhe', name: 'Nhẹ nhàng (hít 4 giây, thở 4 giây)', in: 4, out: 4 },
  { id: 'cham', name: 'Chậm (hít 4 giây, thở 6 giây)', in: 4, out: 6 },
  { id: 'dai', name: 'Dài (hít 5 giây, thở 7 giây)', in: 5, out: 7 },
];
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const $ = (id) => document.getElementById(id);

export function createMindfulRoom(built, ctx) {
  const R = ctx.data.mindful.room;
  const sessions = () => load('mindful.count', 0);
  const sel = { posture: 'xep-bang', min: sessions() === 0 ? 1 : sessions() < 3 ? 3 : 5, scene: 'rung', pace: 'nhe', video: -1 };
  let session = null;          // { type:'breath'|'video', t, total, lastInhale, ... }
  let active = false;          // người chơi đang ở trong phòng này
  let lastShown = -1;
  probeFiles();

  const screen = createScreen({ parent: built.group, x: 0, y: 2.45, z: -HALF + 0.12, lite: ctx.lite });
  const bar = { box: $('sessionbar'), cue: $('sbcue'), time: $('sbtime'), stop: $('sbstop'), pause: $('sbpause') };
  const sound = () => ctx.soundscape;

  const syncScene = () => { const s = sound(); if (s) s.setRoomScene(sel.scene === 'yen' ? 'none' : sel.scene); };
  const say = (t, ms = 6500) => ctx.say(t, ms);

  const on = {
    posture(id) {
      if (session) { say('Đổi tư thế sau khi dừng nhé.', 3500); return; }
      sel.posture = id; ctx.visit('chanh-niem');
      const p = ctx.data.mindful.postures.find((x) => x.id === id);
      say(`${p.name}. ${p.tips[0]} ${p.tips[p.tips.length - 1]}`, 9000);
    },
    minutes(m) { if (session) return; sel.min = m; ctx.visit('chanh-niem'); say(R.minutes[m], 5000); },
    scene(id) {
      if (session && session.type === 'video') { say(R.videoBusy, 4000); return; }
      sel.scene = id; screen.setScene(id); syncScene(); ctx.visit('chanh-niem'); say(R.scenes[id], 5000);
    },
    async poster(idx) {
      if (session) { say(session.type === 'video' ? R.videoBusy : R.orbBusy, 4500); return; }
      ctx.visit('chanh-niem'); sel.video = idx;
      const v = R.videos[idx];
      say(R.videoStart, 7000); ctx.mascot.play('nod');
      const s = sound(); if (s) s.setRoomScene('none');
      const ok = await screen.playVideo(v.file, v.credit, () => finish());
      if (!ok) { sel.video = -1; syncScene(); say(R.noVideo, 9000); return; }
      beginSession({ type: 'video', total: 0 });
    },
    screen() {
      if (session && session.type === 'video') { const p = screen.pauseToggle(); bar.pause.textContent = p ? '▶ Tiếp' : '⏸ Tạm dừng'; }
      else say(R.screenIdle, 8000);
    },
    orb() {
      if (session) { say(R.orbBusy, 4500); return; }
      ctx.visit('chanh-niem'); askPace();
    },
    mic() {
      const panel = openPanel({ title: 'Giọng nhắc của bạn' });
      panel.body.append(voiceCard(() => {}));
    },
  };

  const props = buildMindfulProps({ built, ctx, sel, on });

  /* ---- hỏi nhịp thở ngay trong hội thoại ---- */
  async function askPace() {
    dialogue.start(() => {});
    if (!(await dialogue.say([`${sel.min} phút. ${R.orbAsk}`], 500))) return;
    dialogue.replies([
      ...PACES.map((p) => ({ label: p.name, onClick: () => { sel.pace = p.id; dialogue.end(); startBreath(); } })),
      { label: 'Thôi, để sau', cls: 'ghost', onClick: () => dialogue.end() },
    ]);
  }

  /* ---- phiên ---- */
  function beginSession(s) {
    session = { t: 0, lastInhale: null, ...s };
    bar.box.hidden = false; bar.pause.hidden = s.type !== 'video'; bar.pause.textContent = '⏸ Tạm dừng';
    bar.cue.textContent = s.type === 'video' ? 'Đang thiền cùng video' : 'Chuẩn bị...';
    bar.time.textContent = s.type === 'video' ? '' : fmt(s.total);
    props.setOrbTag(false); props.setOrbShown(s.type !== 'video'); props.setOrbTag(false); ctx.mascot.play('idle');
  }
  function startBreath() {
    const pace = PACES.find((p) => p.id === sel.pace);
    syncScene();
    beginSession({ type: 'breath', total: sel.min * 60, pace });
    say(R.breathStart, 6000);
  }
  function endVisuals() {
    bar.box.hidden = true; props.setBreath(-1); props.setOrbShown(true); ctx.mascot.breath = 0;
    screen.stopVideo(); stopClip(); sel.video = -1;
  }
  function stop(silent) {
    if (!session) return;
    session = null; endVisuals(); syncScene();
    if (!silent) say(R.stopped, 6000);
  }
  function finish() {
    if (!session) return;
    session = null; endVisuals(); syncScene(); chime();
    save('mindful.count', sessions() + 1);
    renderAfter(ctx, { close() {} }, { onAgain: () => { dialogue.end(); api.intro(); } });
  }
  bar.stop.addEventListener('click', () => stop());
  bar.pause.addEventListener('click', () => on.screen());

  const cueNow = (inhale, pace) => {
    if (hasVoice()) playClip(inhale ? 'in' : 'out');
    else breathTone(inhale, inhale ? pace.in : pace.out);
  };

  const api = {
    sel, screen, props, busy: () => !!session,
    // ánh sáng chung khi ở trong phòng này: ấm và dịu như hoàng hôn (xem main.js)
    lighting: { hemi: 0.55, sky: 0xffe1c2, ground: 0x6f523d, sun: 0.12, sunColor: 0xffd2a0 },
    /** Reset ngồi đúng chỗ của tư thế đã chọn, quay mặt về màn hình. */
    post() { const p = POSTS[sel.posture]; return { x: p.x, z: p.z, pose: p.pose, face: Math.PI }; },
    enter() { active = true; syncScene(); screen.setScene(sel.scene); },
    leave() {
      active = false; stop(true); const s = sound(); if (s) s.setRoomScene(null);
      dialogue.end(true);
    },
    intro() { ctx.visit('chanh-niem'); say(R.intro, 12000); ctx.mascot.play('point'); },
    update(t, dt, isActive) {
      active = isActive;
      props.update(t); screen.update(dt, isActive);
      if (isActive) props.updateLight(t, sel.scene, screen.isVideo);
      if (!isActive) return;
      if (session && session.type === 'breath') {
        session.t += dt;
        const { pace } = session, cycle = pace.in + pace.out, ph = session.t % cycle, inhale = ph < pace.in;
        const k = inhale ? ph / pace.in : 1 - (ph - pace.in) / pace.out, e = 0.5 - 0.5 * Math.cos(Math.PI * k);
        props.setBreath(e); ctx.mascot.breath = e;
        if (inhale !== session.lastInhale) { session.lastInhale = inhale; cueNow(inhale, pace); bar.cue.textContent = inhale ? 'Hít vào...' : 'Thở ra...'; }
        const left = Math.max(0, Math.ceil(session.total - session.t));
        if (left !== lastShown) { lastShown = left; bar.time.textContent = fmt(left); }
        if (session.t >= session.total) finish();
      } else if (session && session.type === 'video') {
        const v = screen.video;
        if (v && v.duration) { const left = Math.max(0, Math.ceil(v.duration - v.currentTime)); if (left !== lastShown) { lastShown = left; bar.time.textContent = fmt(left); } }
      }
    },
  };
  return api;
}
