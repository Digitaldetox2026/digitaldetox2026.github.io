/* Thẻ tự hỏi: bộ thẻ bài (rút thẻ úp, thử một hoạt động nhỏ, lật mặt sau).
   Lớp ngoài, không sửa logic web: mã trong assets/ chỉ gọi window.DrDeck.mount(phần tử, danh sách thẻ).
   Kiểu dáng ở theme.css (class bắt đầu bằng drk-). Việc nhỏ đã chọn lưu trong máy (localStorage). */
(function () {
  'use strict';

  var KEY = 'dreset_reflection_try_v1';
  var LOOK = [
    { bg: '#b85c5c', ic: 'wave' },
    { bg: '#43694a', ic: 'hourglass' },
    { bg: '#365f60', ic: 'film' },
    { bg: '#2e2e29', ic: 'gauge' },
  ];
  var POS = [[-190, 12, -13], [-64, -2, -4.5], [64, -2, 4.5], [190, 12, 13]];
  var TRY = [
    { t: 'Cơn thèm giống một con sóng: lên, đến đỉnh, rồi hạ. Bấm bắt đầu và chỉ quan sát nó.', b: 'Quan sát cơn thèm' },
    { t: 'Đặt điện thoại xuống. Nhìn ra xa trong 10 giây, không làm gì cả.', b: 'Bắt đầu 10 giây' },
    { t: 'Nhớ lại tối qua. Chạm vào ô nào bạn nhớ được là video gì. Không nhớ thì để trống.', b: 'Xong' },
    { t: 'Xem hai nhịp chạy song song trong 8 giây: video ngắn và ngoài đời.', b: 'Xem hai nhịp' },
  ];
  var GENERIC = { t: 'Dừng lại vài giây và nghĩ về câu hỏi này, không cần trả lời to.', b: 'Mình đã nghĩ xong' };
  var P = {
    wave: '<path d="M2 12c3-8 6-8 9 0s6 8 11 0"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2 6"/><path d="M20 4v7h-7"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
  };

  var inst = new WeakMap();
  var S = { done: {}, saved: loadSaved() };

  function loadSaved() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}');
      return o && typeof o === 'object' ? o : {};
    } catch (e) {
      return {};
    }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S.saved));
    } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function ic(n, s) {
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">' + P[n] + '</svg>';
  }
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function build(cards) {
    return cards.map(function (c, i) {
      var look = LOOK[i % LOOK.length];
      var tr = i < TRY.length ? TRY[i] : GENERIC;
      return {
        id: String(c.id != null ? c.id : i),
        idx: i,
        n: pad(i + 1),
        tag: c.tag || '',
        q: c.frontQuestion || '',
        st: c.scienceTitle || '',
        sx: c.scienceExplanation || '',
        a: String(c.actionItem || '').replace(/^Hành động:\s*/i, ''),
        bg: look.bg,
        ic: look.ic,
        tryText: tr.t,
        btn: tr.b,
      };
    });
  }

  function mount(root, cards) {
    if (!root || inst.has(root) || !cards || !cards.length) return;
    inst.set(root, true);
    var K = build(cards);
    var tm = null;
    root.classList.add('drk');

    function stop() {
      if (tm) {
        clearInterval(tm);
        tm = null;
      }
    }
    function alive() {
      return root.isConnected;
    }
    function $(sel) {
      return root.querySelector(sel);
    }
    function doneCount() {
      return K.filter(function (c) {
        return S.done[c.id];
      }).length;
    }

    function corner(c, flip) {
      return '<div class="drk-corner' + (flip ? ' drk-corner-b' : '') + '" style="color:' + c.bg + '"><div class="drk-cn">' + c.n + '</div>' + ic(c.ic, 16) + '</div>';
    }

    function openJourney() {
      var els = document.querySelectorAll('button, a');
      for (var k = 0; k < els.length; k++) {
        if (els[k].tagName === 'BUTTON' && els[k].textContent.indexOf('Hành trình 14 ngày') !== -1 && !els[k].closest('.drk')) {
          els[k].click();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    function table() {
      stop();
      var d = doneCount();
      var all = d === K.length;
      var h = '<div class="drk-head"><div class="sans drk-eyebrow">THẺ TỰ HỎI · ' + d + '/' + K.length + ' THẺ ĐÃ LẬT</div><div class="drk-title">Rút một thẻ</div><div class="sans drk-sub">Không có câu trả lời đúng hay sai. Chọn thẻ nào bạn thấy muốn mở.</div></div><div class="drk-fan">';
      K.forEach(function (c, i) {
        var p = POS[i % POS.length];
        h += '<div class="drk-pc" role="button" tabindex="0" aria-label="Rút thẻ ' + c.n + '" data-i="' + i + '" style="--x:' + p[0] + 'px;--y:' + p[1] + 'px;--r:' + p[2] + 'deg">';
        if (S.done[c.id]) {
          h += '<div class="drk-cf drk-up" style="color:' + c.bg + ';border-color:' + c.bg + '"><div class="drk-up-in"></div><div class="drk-up-n">' + c.n + '</div><div class="drk-up-c">' + ic(c.ic, 34) + '<span class="sans">' + esc(c.tag).toUpperCase() + '</span>' + ic('check', 16) + '</div></div>';
        } else {
          h += '<div class="drk-cf drk-down"><div class="drk-emb">' + ic('refresh', 24) + '</div></div>';
        }
        h += '</div>';
      });
      h += '</div>';
      if (all) {
        var l = K.filter(function (c) {
          return S.saved[c.id];
        })
          .map(function (c) {
            return '<div class="drk-li">' + esc(c.a) + '</div>';
          })
          .join('');
        h += '<div class="drk-end"><div class="drk-end-t">Bạn đã lật cả ' + K.length + ' thẻ</div><div class="sans drk-sub" style="margin-bottom:12px">' + (l ? 'Những việc nhỏ bạn muốn thử, chỉ lưu trong máy của bạn:' : 'Bạn chưa chọn việc nào, không sao cả.') + '</div><div style="text-align:left;margin-bottom:16px">' + l + '</div><button type="button" class="on" id="drk-j">Sang Hành trình 14 ngày</button></div>';
      }
      root.innerHTML = h;
      root.querySelectorAll('.drk-pc').forEach(function (e) {
        var go = function () {
          show(+e.getAttribute('data-i'));
        };
        e.addEventListener('click', go);
        e.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            go();
          }
        });
      });
      var j = $('#drk-j');
      if (j) j.addEventListener('click', openJourney);
    }

    function show(i) {
      stop();
      var c = K[i];
      var isSaved = !!S.saved[c.id];
      root.innerHTML =
        '<div style="margin-bottom:10px"><button type="button" class="ghost" id="drk-bk">← Về bộ thẻ</button></div>' +
        '<div class="drk-row"><div class="drk-scene"><div class="drk-inner" id="drk-in">' +
        '<div class="drk-face" style="background:#fbf8f1;color:' + c.bg + '">' + corner(c, 0) + corner(c, 1) +
        '<div class="drk-mid"><div class="drk-ring" style="border-color:' + c.bg + '">' + ic(c.ic, 24) + '</div><div class="sans drk-tag">' + esc(c.tag).toUpperCase() + '</div><div class="drk-q">' + esc(c.q) + '</div></div></div>' +
        '<div class="drk-face drk-backface" style="background:' + c.bg + '"><div class="drk-bk-in"><div class="sans drk-tag" style="opacity:.8;margin:0">THẺ ' + c.n + ' · MẶT SAU</div><div class="drk-st">' + esc(c.st) + '</div><div class="sans drk-sx">' + esc(c.sx) + '</div><div class="drk-act">' + esc(c.a) + '</div></div></div>' +
        '</div></div>' +
        '<div class="drk-side"><div class="sans drk-eyebrow" style="margin-bottom:0">THỬ NGAY</div><div class="drk-try">' + esc(c.tryText) + '</div><div id="drk-act" style="min-height:120px"></div><div id="drk-next" style="display:none;margin-top:14px"></div>' +
        '<div id="drk-post" style="display:none;margin-top:14px"><div class="sans drk-sub" style="text-align:left;margin-bottom:10px">Đã lật sang mặt sau của thẻ.</div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" id="drk-sv" class="' + (isSaved ? 'on' : '') + '">' + (isSaved ? 'Đã thêm vào danh sách' : 'Mình sẽ thử') + '</button><button type="button" id="drk-nx">Rút thẻ khác</button></div></div></div></div>';

      $('#drk-bk').addEventListener('click', table);
      $('#drk-nx').addEventListener('click', table);
      $('#drk-sv').addEventListener('click', function () {
        if (S.saved[c.id]) delete S.saved[c.id];
        else S.saved[c.id] = 1;
        persist();
        var on = !!S.saved[c.id];
        this.className = on ? 'on' : '';
        this.textContent = on ? 'Đã thêm vào danh sách' : 'Mình sẽ thử';
      });

      var a = $('#drk-act');
      var nb = $('#drk-next');
      function flipIt() {
        $('#drk-in').classList.add('flip');
        nb.style.display = 'none';
        $('#drk-post').style.display = 'block';
      }
      function fin() {
        stop();
        S.done[c.id] = 1;
        nb.style.display = 'block';
        nb.innerHTML = '<button type="button" class="on" id="drk-fp" style="background:' + c.bg + ';border-color:' + c.bg + '">Lật thẻ xem giải thích</button>';
        $('#drk-fp').addEventListener('click', flipIt);
      }
      if (S.done[c.id]) fin();
      var sb = '<button type="button" class="on" id="drk-go" style="background:' + c.bg + ';border-color:' + c.bg + '">' + esc(c.btn) + '</button>';
      var lbl = '<div id="drk-lb" class="sans drk-lb"></div>';
      var kind = i < 4 ? i : -1;

      if (kind === 0) {
        var path = 'M10 88';
        for (var k = 1; k <= 60; k++) {
          var x = k / 60;
          path += ' L' + (10 + 280 * x).toFixed(1) + ' ' + (88 - 70 * Math.exp(-Math.pow((x - 0.5) / 0.2, 2))).toFixed(1);
        }
        a.innerHTML = '<svg viewBox="0 0 300 100" width="100%" style="display:block" aria-hidden="true"><path d="' + path + '" fill="none" stroke="#b85c5c" stroke-width="1.5" opacity=".4"/><circle id="drk-dt" cx="10" cy="88" r="6" fill="#b85c5c"/></svg>' + lbl + sb;
        $('#drk-go').addEventListener('click', function () {
          this.disabled = true;
          var t0 = Date.now();
          tm = setInterval(function () {
            var dt = $('#drk-dt');
            if (!alive() || !dt) return stop();
            var p = Math.min((Date.now() - t0) / 8000, 1);
            dt.setAttribute('cx', 10 + 280 * p);
            dt.setAttribute('cy', 88 - 70 * Math.exp(-Math.pow((p - 0.5) / 0.2, 2)));
            $('#drk-lb').textContent = p < 0.4 ? 'Cơn thèm đang lên…' : p < 0.62 ? 'Đang ở đỉnh. Chỉ cần quan sát.' : p < 1 ? 'Nó đang hạ xuống…' : 'Bạn vừa lướt qua một cơn thèm.';
            if (p >= 1) fin();
          }, 50);
        });
      } else if (kind === 1) {
        a.innerHTML = '<div style="display:flex;align-items:center;gap:16px"><svg viewBox="0 0 100 100" width="92" height="92" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#c6c0b2" stroke-width="3"/><circle id="drk-rg" cx="50" cy="50" r="44" fill="none" stroke="#43694a" stroke-width="3" stroke-dasharray="276.5" stroke-dashoffset="0" transform="rotate(-90 50 50)"/><text id="drk-nm" x="50" y="58" text-anchor="middle" font-size="26" font-family="Georgia,serif" fill="#2b4330">10</text></svg><div>' + sb + '</div></div>' + lbl;
        $('#drk-go').addEventListener('click', function () {
          this.disabled = true;
          var t0 = Date.now();
          $('#drk-lb').textContent = 'Nhìn ra xa. Thở bình thường.';
          tm = setInterval(function () {
            var r = $('#drk-rg');
            if (!alive() || !r) return stop();
            var p = Math.min((Date.now() - t0) / 10000, 1);
            r.setAttribute('stroke-dashoffset', 276.5 * p);
            $('#drk-nm').textContent = Math.max(0, Math.ceil(10 * (1 - p)));
            if (p >= 1) {
              $('#drk-lb').textContent = 'Xong. Bạn vừa ngồi yên 10 giây.';
              fin();
            }
          }, 80);
        });
      } else if (kind === 2) {
        a.innerHTML = '<div class="drk-tiles"><div class="drk-tile" role="button" tabindex="0">Video 1</div><div class="drk-tile" role="button" tabindex="0">Video 2</div><div class="drk-tile" role="button" tabindex="0">Video 3</div></div>' + lbl + sb;
        a.querySelectorAll('.drk-tile').forEach(function (t, n) {
          var tog = function () {
            t.classList.toggle('on');
            t.textContent = t.classList.contains('on') ? 'Mình nhớ' : 'Video ' + (n + 1);
          };
          t.addEventListener('click', tog);
          t.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              tog();
            }
          });
        });
        $('#drk-go').addEventListener('click', function () {
          var n = a.querySelectorAll('.drk-tile.on').length;
          $('#drk-lb').textContent = 'Bạn nhớ ' + n + '/3. Không có điểm đúng sai, chỉ để mình để ý.';
          fin();
        });
      } else if (kind === 3) {
        a.innerHTML = '<div class="sans drk-mini">VIDEO NGẮN</div><div id="drk-b1" class="drk-bar" style="background:#b85c5c"></div><div class="sans drk-mini">NGOÀI ĐỜI</div><div id="drk-b2" class="drk-bar" style="background:#9a9588"></div>' + sb;
        $('#drk-go').addEventListener('click', function () {
          this.disabled = true;
          var t0 = Date.now();
          var cs = ['#b85c5c', '#365f60', '#d27474', '#43694a', '#2e2e29', '#e49696'];
          tm = setInterval(function () {
            var b1 = $('#drk-b1');
            if (!alive() || !b1) return stop();
            var e = Date.now() - t0;
            b1.style.background = cs[Math.floor(e / 700) % cs.length];
            $('#drk-b2').style.background = ['#9a9588', '#c6c0b2'][Math.floor(e / 4000) % 2];
            if (e >= 8000) fin();
          }, 60);
        });
      } else {
        a.innerHTML = sb;
        $('#drk-go').addEventListener('click', fin);
      }
    }

    table();
  }

  window.DrDeck = { mount: mount };
})();
