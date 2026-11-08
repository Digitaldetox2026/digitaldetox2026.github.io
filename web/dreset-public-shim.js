// Bản trải nghiệm công khai: trang chạy trên GitHub Pages (chỉ có file tĩnh), nên bọc fetch làm "API giả".
// Giống tools/serve.mjs: /api/books đọc api/books.json; ghi sách giả lập thành công; /api/chat, /api/transcribe tắt.
(function () {
  var base = new URL('.', document.currentScript.src).href;
  var realFetch = window.fetch.bind(window);
  var json = function (code, obj) {
    return Promise.resolve(new Response(JSON.stringify(obj), { status: code, headers: { 'Content-Type': 'application/json; charset=utf-8' } }));
  };
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : (input && input.url) || '';
    var m = /^\/api\/([a-z]+)/.exec(u);
    if (!m) return realFetch(input, init);
    if (m[1] === 'books') {
      var method = ((init && init.method) || 'GET').toUpperCase();
      if (method === 'GET') return realFetch(base + 'api/books.json', { cache: 'no-store' });
      return json(200, { success: true }); // ghi sách: giả lập thành công, không lưu
    }
    return json(503, { success: false, error: 'API tắt trong bản demo' });
  };
  // Bản công khai không có khu quản trị: ẩn nút Admin và mục Dashboard (mật khẩu đã bị gỡ khỏi mã, nên không vào được).
  function hide() {
    var nodes = document.querySelectorAll('button');
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i];
      var t = (b.textContent || '').trim();
      if (b.getAttribute('title') === 'Dành Cho Quản Trị Viên (Admin)' || t === 'Admin' || t === 'Dashboard Nghiên Cứu' || t === 'Dashboard NCKH') b.style.display = 'none';
    }
  }
  new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
  // Lối quay về trang chính và phòng 3D (nút nhỏ nổi góc trái dưới)
  document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:40;display:flex;gap:6px;font:600 12px system-ui,sans-serif';
    [['🏠 Trang chính', '../'], ['🧘 Phòng 3D', '../phong-3d/']].forEach(function (x) {
      var a = document.createElement('a'); a.href = x[1]; a.textContent = x[0];
      a.style.cssText = 'background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:999px;padding:6px 10px;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.15)';
      d.appendChild(a);
    });
    document.body.appendChild(d);
  });
})();
