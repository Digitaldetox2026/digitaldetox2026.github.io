// Khung "Giọng nhắc của bạn": thu, nghe thử, xóa hai câu "Hít vào" và "Thở ra". Chỉ lưu trên máy này.
import { el, btn } from '../ui.js';
import { KINDS, getUrl, canRecord, playClip, startRecording, deleteClip } from '../voice.js';

export function voiceCard(onChange) {
  const card = el('div', { class: 'card2' });
  let rec = null, recKind = null, msg = '';

  function render() {
    const rows = Object.keys(KINDS).map((k) => {
      const has = !!getUrl(k), isRec = recKind === k;
      return el('div', { class: 'voice-row' },
        el('span', {}, `${KINDS[k]}: ${isRec ? 'đang thu...' : has ? 'đã có' : 'chưa có'}`),
        canRecord() ? btn(isRec ? '■ Dừng' : '● Thu', () => (isRec ? stopRec() : startRec(k)), isRec ? 'primary' : 'ghost') : null,
        has ? btn('▶ Nghe', () => playClip(k), 'ghost') : null,
        has && !isRec ? btn('Xóa', () => { deleteClip(k); onChange(); }, 'ghost') : null);
    });
    card.replaceChildren(el('b', {}, 'Giọng nhắc của bạn (tùy chọn)'),
      el('p', { class: 'small' }, 'Muốn nghe giọng người thật? Thu giọng của bạn, bạn bè hoặc thầy cô, nói nhẹ và chậm, ví dụ "Hít... vào" và "Thở... ra". Bản thu chỉ lưu trên máy này.'),
      ...rows,
      canRecord() ? null : el('p', { class: 'small' }, 'Trình duyệt này không hỗ trợ thu âm. Bạn có thể đặt file hit-vao.mp3 và tho-ra.mp3 vào thư mục world/audio/.'),
      msg ? el('p', { class: 'small' }, msg) : null);
  }

  async function startRec(k) {
    msg = '';
    try { rec = await startRecording(k); recKind = k; } catch { msg = 'Không mở được micro. Hãy cho phép micro cho trang này rồi thử lại.'; }
    render();
  }
  async function stopRec() {
    const ok = await rec.stop();
    rec = null; recKind = null;
    msg = ok ? '' : 'Bộ nhớ trình duyệt đầy, chưa lưu được bản thu.';
    onChange();
  }

  render();
  return card;
}
