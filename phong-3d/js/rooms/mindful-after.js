// Sau khi thở xong: Reset (đang ngồi trong khung cảnh) hỏi "bạn cảm thấy thế nào?", đáp lại, rồi giải thích chánh niệm
// có tác dụng gì (đúng mức bằng chứng, có nguồn). Hiện bằng bong bóng cạnh Reset. Chữ ở data/mindful.json mục "after".
import { el } from '../ui.js';
import { dialogue } from '../dialogue.js';
import { load, save } from '../storage.js';

export async function renderAfter(ctx, panel, { onAgain }) {
  const a = ctx.data.mindful.after;
  const key = (v) => (v <= 2 ? 'low' : v === 3 ? 'mid' : 'high');
  let token = 0;
  panel.close();                       // đóng khung thở, quay về khung cảnh có Reset
  dialogue.start(() => { token++; });
  const tk = ++token;
  const next = () => new Promise((res) => dialogue.replies([{ label: 'Tiếp ▸', cls: 'primary', onClick: () => res(tk === token) }]));
  ctx.mascot.play('nod');

  if (!(await dialogue.say(['Hết giờ rồi. Cảm ơn bạn đã dành thời gian cho mình.', a.ask], 600)) || tk !== token) return;
  const v = await new Promise((res) => dialogue.replies([
    ...a.moods.map((m) => ({ label: `${m.emoji} ${m.label}`, onClick: () => res(m.v) })),
    { label: 'Bỏ qua', cls: 'ghost', onClick: () => res(0) }]));
  if (tk !== token) return;

  if (v) {
    const log = load('mindful.log', []);
    log.push({ at: new Date().toISOString(), mood: v }); // chỉ ghi mức cảm nhận, lưu trên máy
    save('mindful.log', log.slice(-30));
    const k = key(v);
    if (!(await dialogue.say(el('p', { class: k === 'low' ? 'safe' : '' }, a.replies[k]), 700)) || tk !== token) return;
    if (!(await next())) return;
  }

  const half = Math.ceil(a.what.length / 2);
  if (!(await dialogue.say([el('b', {}, a.whatTitle), el('ul', { class: 'bullets' }, a.what.slice(0, half).map((t) => el('li', {}, t)))], 700)) || tk !== token) return;
  if (!(await next())) return;
  if (!(await dialogue.say([el('ul', { class: 'bullets' }, a.what.slice(half).map((t) => el('li', {}, t))),
    el('p', { class: 'small' }, 'Nguồn: ', el('a', { href: a.source.url, target: '_blank', rel: 'noopener' }, a.source.label))], 700)) || tk !== token) return;
  dialogue.replies([
    { label: 'Thực hành lại', cls: 'primary', onClick: onAgain },
    { label: 'Đóng', cls: 'ghost', onClick: () => dialogue.end() }]);
}
