// Hàm tính điểm Likert (thuần tính toán, không đụng giao diện). Quy tắc: docs/LIKERT_NGHIEN_CUU.md mục 5.
// answers: { A2: 4, A7: 'never', ... }  ('never' hoặc thiếu = không tính vào trung bình)

export function mean(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export function band(value, th) {
  if (value == null) return null;
  if (value < th.low) return 'thap';
  if (value < th.high) return 'vua';
  return 'cao';
}

/** items: danh sách câu ĐANG DÙNG (đã lọc bản nhanh hoặc đủ 30 câu). cfg: { thresholds, levelMatrix } */
export function computeScores(answers, items, cfg) {
  const axis = {};
  for (const a of ['A', 'B', 'C', 'D']) {
    axis[a] = mean(items.filter((i) => i.axis === a).map((i) => answers[i.id]));
  }
  const K = mean([axis.A, axis.B]); // trung bình của điểm trục A và trục B
  const bandK = band(K, cfg.thresholds);
  const bandC = band(axis.C, cfg.thresholds);
  const level = bandK && bandC ? cfg.levelMatrix[bandK][bandC] : null;
  return {
    A: axis.A, B: axis.B, C: axis.C, D: axis.D, K,
    bandK, bandC, level,
    dLow: axis.D != null && axis.D < cfg.thresholds.dLow,
    // Mức 2 do kiểm soát yếu (K cao, C thấp): kết quả nói rõ là "dùng để xả căng thẳng"
    controlNote: bandK === 'cao' && bandC === 'thap',
  };
}

export const quickItems = (items) => items.filter((i) => i.quick);
