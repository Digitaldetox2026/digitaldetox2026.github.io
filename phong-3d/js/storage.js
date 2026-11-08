// Lớp lưu trữ DUY NHẤT. Hiện lưu trong trình duyệt (localStorage), chỉ trên máy người dùng.
// Sau này đổi sang Firebase thì chỉ sửa file này.
const PREFIX = 'dreset.world.';

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // trình duyệt chặn lưu: ứng dụng vẫn chạy, chỉ không nhớ được
  }
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* bỏ qua */ }
}
