// Bảng "Điện thoại thật": hướng dẫn từng bước cho iPhone và Android. Nội dung ở data/phone-guide.json.
import { el, btn } from '../ui.js';

const ICONS = {
  hourglass: '<path d="M8 6h24M8 34h24M10 6c0 8 8 8 8 14s-8 6-8 14M30 6c0 8-8 8-8 14s8 6 8 14" />',
  bell: '<path d="M20 6a9 9 0 0 0-9 9v8l-3 5h24l-3-5v-8a9 9 0 0 0-9-9zM16 32a4 4 0 0 0 8 0M6 6l28 28" />',
  gray: '<rect x="8" y="6" width="24" height="28" rx="4" /><path d="M8 6h12v28H8z" fill="currentColor" opacity=".35" />',
  plug: '<path d="M14 6v8M26 6v8M10 14h20v6a10 10 0 0 1-20 0zM20 30v6" />',
};

function icon(name) {
  const w = el('span', { class: 'pg-icon', 'aria-hidden': 'true' });
  w.innerHTML = `<svg viewBox="0 0 40 40" width="44" height="44" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return w;
}

/** Trả về phần tử hướng dẫn. topics: danh sách id chủ đề cần hiện (không truyền = tất cả). */
export function phoneGuideView(guide, { topics, onBack } = {}) {
  let platform = 'iphone';
  const list = guide.topics.filter((t) => !topics || topics.includes(t.id));
  const box = el('div', { class: 'pg' });

  function render() {
    box.replaceChildren(
      onBack ? btn('← Quay lại', onBack, 'ghost') : null,
      el('h3', {}, guide.title),
      el('div', { class: 'tabs', role: 'tablist' }, guide.platforms.map((p) =>
        el('button', { class: 'tab' + (p.id === platform ? ' on' : ''), type: 'button', role: 'tab',
          onClick: () => { platform = p.id; render(); } }, p.name))),
      el('p', { class: 'small' }, guide.note),
      ...list.map((t) => el('section', { class: 'card2' },
        el('div', { class: 'pg-head' }, icon(t.icon), el('div', {}, el('b', {}, t.name), el('p', { class: 'small' }, t.intro))),
        el('ol', { class: 'steps' }, t[platform].map((s) => el('li', {}, s))),
        t[platform + 'Note'] ? el('p', { class: 'small' }, t[platform + 'Note']) : null,
        t.sources.some((s) => s.p === platform)
          ? el('p', { class: 'small' }, 'Nguồn chính thức: ', t.sources.filter((s) => s.p === platform).map((s, i) => [i ? ' · ' : '',
            el('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label)]))
          : null)));
  }
  render();
  return box;
}
