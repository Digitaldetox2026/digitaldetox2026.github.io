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
})();
