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

/** items: các câu thang 1-5 của bộ 17 câu (data.items). Nhóm nào không có câu trả lời thì điểm là null. cfg: { thresholds, levelMatrix } */
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
    // Nhóm D ("khi lướt nhiều và thấy mệt, tôi đổi sang hoạt động khác") chỉ có nghĩa với người có thấy mệt (C10 từ 3 trở lên)
    dRelevant: typeof answers.C10 === 'number' && answers.C10 >= 3,
    // Mức 2 do kiểm soát yếu (K cao, C thấp): kết quả nói rõ là "dùng để xả căng thẳng"
    controlNote: bandK === 'cao' && bandC === 'thap',
  };
}

/**
 * Điểm hiểu biết (data.awareness, không tính vào mức): chỉ các câu thang 1-5 (hiện là N2), cao = nhận ra rõ hơn.
 * Câu dạng chọn một (N5, mức ảnh hưởng theo suy nghĩ của bạn) KHÔNG đưa vào trung bình: dùng awarenessChoice().
 */
export function awarenessScore(answers, aw) {
  if (!aw) return null;
  return mean(aw.items.filter((it) => it.type !== 'choice').map((it) => answers[it.id]));
}

/** Câu chọn một của khối hiểu biết (N5): trả về thứ bậc 1-4 (Không ảnh hưởng ... Ảnh hưởng nhiều); "Mình không chắc" hoặc chưa trả lời = null. */
export function awarenessChoice(answers, it) {
  const v = answers[it.id];
  return typeof v === 'number' && v !== it.unsureIndex + 1 ? v : null;
}
