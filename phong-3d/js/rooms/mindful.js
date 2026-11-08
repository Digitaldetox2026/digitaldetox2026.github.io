// Phòng Chánh niệm (bản gọn): quả cầu thở, hẹn giờ, chuông báo hết giờ, âm nền (WebAudio).
// Nhịp thở chỉ là NHỊP GỢI Ý, bạn chỉnh theo cảm giác thoải mái. Không khẳng định hiệu quả y khoa.
import { el, btn, openPanel } from '../ui.js';
import { load, save } from '../storage.js';
import { chime, setAmbient, breathTone, speak, stopSpeech, hasViVoice } from '../audio.js';
import { postureFigure } from './postures.js';
import { voiceCard } from './voice-card.js';
import { probeFiles, hasVoice, playClip, stopClip } from '../voice.js';
import { renderAfter } from './mindful-after.js';
import { dialogue } from '../dialogue.js';

const DURATIONS = [1, 3, 5];
const PACES = [
  { id: 'nhe', name: 'Nhẹ nhàng (hít 4 giây, thở 4 giây)', in: 4, out: 4 },
  { id: 'cham', name: 'Chậm (hít 4 giây, thở 6 giây)', in: 4, out: 6 },
  { id: 'dai', name: 'Dài (hít 5 giây, thở 7 giây)', in: 5, out: 7 },
];
const cueOptions = () => [
  { id: 'tone', name: 'Âm báo lên/xuống' },
  hasVoice() ? { id: 'clip', name: 'Giọng thu sẵn' } : null,
  hasViVoice() ? { id: 'tts', name: 'Giọng đọc máy (hơi máy móc)' } : null,
  { id: 'off', name: 'Tắt' },
].filter(Boolean);
const SOUNDS = [{ id: 'none', name: 'Im lặng' }, { id: 'rain', name: 'Mưa' }, { id: 'waves', name: 'Sóng' }];
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function openMindful(ctx) {
  const sessions = load('mindful.count', 0);
  // gợi ý tăng dần: lần đầu 1 phút, rồi 3, rồi 5
  const sel = { min: sessions === 0 ? 1 : sessions < 3 ? 3 : 5, pace: 'nhe', sound: 'none', posture: 'ghe', cue: hasVoice() ? 'clip' : 'tone' };
  let inSetup = true;
  probeFiles().then(() => { if (inSetup && hasVoice()) { sel.cue = 'clip'; setup(); } });
  const mdata = ctx.data.mindful;
  let raf = 0, timer = 0;
  const stop = () => { cancelAnimationFrame(raf); clearInterval(timer); setAmbient('none'); stopSpeech(); stopClip(); };
  const panel = openPanel({ title: 'Chánh niệm', onClose: stop });

  function setup() {
    stop(); inSetup = true;
    panel.body.replaceChildren();
    const group = (label, opts, key, fmt) => el('div', {}, el('b', {}, label),
      el('div', { class: 'choices wrap' }, opts.map((o) => {
        const v = o.id ?? o;
        return btn(fmt ? fmt(o) : o.name, () => { sel[key] = v; setup(); }, 'choice' + (sel[key] === v ? ' on' : ''));
      })));
    panel.body.append(
      el('p', { class: 'lead' }, 'Ngồi thoải mái, thở tự nhiên và nhìn quả cầu. Bạn không cần cố gắng gì cả.'),
      el('div', { class: 'card2' }, `Gợi ý cho người mới: 1 phút, rồi 3 phút, rồi 5 phút. Bạn có thể đổi.${sessions ? ` Bạn đã thực hành ${sessions} lần trên máy này.` : ''}`),
      el('div', {}, el('b', {}, 'Reset làm mẫu tư thế'), el('p', { class: 'small' }, mdata.intro),
        el('div', { class: 'choices wrap' }, mdata.postures.map((p) =>
          btn(p.name, () => { sel.posture = p.id; setup(); }, 'choice' + (sel.posture === p.id ? ' on' : '')))),
        (() => {
          const p = mdata.postures.find((x) => x.id === sel.posture);
          return el('div', { class: 'card2 posture' }, postureFigure(p.id),
            el('div', { class: 'posture-tips' }, el('ul', { class: 'bullets' }, [...p.tips, ...mdata.common].map((t) => el('li', {}, t)))));
        })()),
      group('Thời lượng', DURATIONS, 'min', (m) => `${m} phút`),
      group('Nhịp thở (nhịp gợi ý)', PACES, 'pace'),
      group('Nhắc nhịp thở khi nhắm mắt', cueOptions(), 'cue'),
      el('p', { class: 'small' }, 'Bạn có thể nhắm mắt. Âm báo: âm đi lên là hít vào, âm đi xuống là thở ra. Muốn có giọng nói, hãy thu giọng bên dưới.'),
      voiceCard(setup),
      group('Âm nền', SOUNDS, 'sound'),
      el('p', { class: 'small' }, 'Nếu thấy chóng mặt hoặc khó chịu, hãy thở tự nhiên và dừng lại. Bài này không thay thế sự hỗ trợ của thầy cô hoặc người lớn bạn tin.'),
      el('div', { class: 'row' }, btn('Bắt đầu', run, 'primary')));
  }

  function run() {
    inSetup = false;
    panel.body.replaceChildren();
    const pace = PACES.find((p) => p.id === sel.pace), cycle = pace.in + pace.out;
    const total = sel.min * 60, t0 = performance.now();
    const orb = el('div', { class: 'orb' });
    const cue = el('div', { class: 'cue' }, 'Hít vào...');
    const clock = el('div', { class: 'clock' }, fmtTime(total));
    const fig = postureFigure(sel.posture);
    fig.style.transformOrigin = '50% 100%';
    panel.body.append(el('div', { class: 'run-row' },
      el('div', { class: 'orb-wrap' }, orb),
      el('div', { class: 'reset-sit' }, fig, el('small', {}, 'Reset ngồi cùng bạn'))), cue, clock,
      el('div', { class: 'row' }, btn('Dừng', setup, 'ghost')));
    setAmbient(sel.sound);
    ctx.mascot.play('idle'); ctx.say('Hít vào chậm... rồi thở ra chậm. Mình ở đây.', 5000);

    let lastInhale = null;
    const cueNow = (inhale) => {
      if (sel.cue === 'off') return;
      if (sel.cue === 'clip' && hasVoice()) playClip(inhale ? 'in' : 'out');
      else if (sel.cue === 'tts' && hasViVoice()) speak(inhale ? 'Hít vào' : 'Thở ra');
      else breathTone(inhale, inhale ? pace.in : pace.out);
    };
    const frame = (now) => {
      const t = (now - t0) / 1000, ph = t % cycle;
      const inhale = ph < pace.in;
      const k = inhale ? ph / pace.in : 1 - (ph - pace.in) / pace.out;
      const e = 0.5 - 0.5 * Math.cos(Math.PI * k); // mượt đầu/cuối
      orb.style.transform = `scale(${0.55 + 0.45 * e})`;
      fig.style.transform = `scaleY(${1 + 0.03 * e})`; // Reset thở cùng nhịp
      cue.textContent = inhale ? 'Hít vào...' : 'Thở ra...';
      if (inhale !== lastInhale) { lastInhale = inhale; cueNow(inhale); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    timer = setInterval(() => {
      const left = total - Math.round((performance.now() - t0) / 1000);
      clock.textContent = fmtTime(Math.max(0, left));
      if (left <= 0) end();
    }, 250);
  }

  function end() {
    stop(); chime();
    save('mindful.count', sessions + 1);
    renderAfter(ctx, panel, { onAgain: () => { dialogue.end(); openMindful(ctx); } });
  }

  setup();
}
