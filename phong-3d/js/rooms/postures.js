// Hình minh họa tư thế thực hành (tự vẽ bằng SVG đơn giản, nhìn từ phía trước). Nhân vật chính là Reset.
const SKIN = '#ffd9c2', HAIR = '#7b4a2c', COAT = '#e9ecf3', EDGE = '#94a3b8', PANTS = '#6b2d3a', SHOE = '#c9a77b';

const head = (cx, cy) => `
  <circle cx="${cx}" cy="${cy}" r="22" fill="${SKIN}" stroke="${EDGE}" stroke-width="1.5"/>
  <path d="M${cx - 22} ${cy - 2} A22 22 0 0 1 ${cx + 22} ${cy - 2} Q${cx} ${cy - 14} ${cx - 22} ${cy - 2}Z" fill="${HAIR}"/>
  <path d="M${cx - 11} ${cy + 3} q5 4 10 0 M${cx + 3} ${cy + 3} q5 4 10 0" stroke="#2b2118" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M${cx - 6} ${cy + 12} q6 5 12 0" stroke="#b4543a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
const arm = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COAT}" stroke-width="13" stroke-linecap="round"/>
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${EDGE}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
  <circle cx="${x2}" cy="${y2 + 3}" r="6.5" fill="${SKIN}"/>`;
const torso = (x, y, h) => `<rect x="${x}" y="${y}" width="44" height="${h}" rx="18" fill="${COAT}" stroke="${EDGE}" stroke-width="1.5"/>`;
const floor = '<line x1="14" y1="146" x2="186" y2="146" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>';

const FIGURES = {
  'xep-bang': () => floor +
    `<ellipse cx="100" cy="132" rx="54" ry="14" fill="${PANTS}"/>
     <ellipse cx="82" cy="138" rx="15" ry="7" fill="${SHOE}"/><ellipse cx="118" cy="138" rx="15" ry="7" fill="${SHOE}"/>` +
    torso(78, 62, 66) + arm(80, 74, 62, 122) + arm(120, 74, 138, 122) + head(100, 40),
  ghe: () => floor +
    `<rect x="52" y="112" width="96" height="9" rx="4" fill="#94a3b8"/>
     <line x1="58" y1="121" x2="58" y2="146" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
     <line x1="142" y1="121" x2="142" y2="146" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>
     <line x1="86" y1="112" x2="86" y2="140" stroke="${PANTS}" stroke-width="15" stroke-linecap="round"/>
     <line x1="114" y1="112" x2="114" y2="140" stroke="${PANTS}" stroke-width="15" stroke-linecap="round"/>
     <ellipse cx="86" cy="143" rx="12" ry="5" fill="${SHOE}"/><ellipse cx="114" cy="143" rx="12" ry="5" fill="${SHOE}"/>` +
    torso(78, 56, 60) + arm(80, 68, 76, 108) + arm(120, 68, 124, 108) + head(100, 34),
  dung: () => floor +
    `<line x1="88" y1="104" x2="86" y2="140" stroke="${PANTS}" stroke-width="15" stroke-linecap="round"/>
     <line x1="112" y1="104" x2="114" y2="140" stroke="${PANTS}" stroke-width="15" stroke-linecap="round"/>
     <ellipse cx="84" cy="144" rx="12" ry="5" fill="${SHOE}"/><ellipse cx="116" cy="144" rx="12" ry="5" fill="${SHOE}"/>` +
    torso(78, 50, 58) + arm(78, 64, 70, 106) + arm(122, 64, 130, 106) + head(100, 28),
};

/** Trả về phần tử HTML chứa hình minh họa. */
export function postureFigure(id) {
  const wrap = document.createElement('div');
  wrap.className = 'posture-fig';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Hình minh họa Reset làm mẫu tư thế');
  wrap.innerHTML = `<svg viewBox="0 0 200 156" width="200" height="156">${FIGURES[id] ? FIGURES[id]() : ''}</svg>`;
  return wrap;
}

/** Ảnh đại diện tròn của Reset (chỉ phần đầu), dùng trong khung trò chuyện. */
export function resetAvatar() {
  const w = document.createElement('span');
  w.className = 'avatar';
  w.setAttribute('aria-hidden', 'true');
  w.innerHTML = `<svg viewBox="68 12 64 64" width="36" height="36">${head(100, 40).replace('stroke-width="1.5"', 'stroke-width="0"')}</svg>`;
  return w;
}
