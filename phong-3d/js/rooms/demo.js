// Phòng "Bản demo": một câu giới thiệu + nhãn. Phòng Thói quen có thêm bảng "Điện thoại thật".
import { el, btn, openPanel } from '../ui.js';
import { phoneGuideView } from './phoneguide.js';

export function openDemo(ctx, room) {
  const panel = openPanel({ title: room.icon + ' ' + room.name, demo: true });
  const home = () => {
    panel.body.replaceChildren(
      el('p', { class: 'lead' }, room.intro),
      el('p', { class: 'small' }, 'Phòng này đang là bản demo: chức năng đầy đủ sẽ được nối vào ở bước sau.'),
      room.phoneGuide ? btn('📱 Cách dùng Giới hạn ứng dụng trên điện thoại', () => {
        panel.body.replaceChildren(phoneGuideView(ctx.data.phone, { onBack: home }));
      }, 'primary') : null,
      el('div', { class: 'row' }, btn('Về sảnh', () => { panel.close(); ctx.goto('lobby'); }, 'ghost')));
  };
  home();
  ctx.mascot.play('wave');
}
