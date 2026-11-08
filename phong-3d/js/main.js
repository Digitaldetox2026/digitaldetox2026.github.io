// Điểm vào. Người chơi = góc nhìn 3D (mắt nhìn). Reset = người dẫn đường: chào, đi phía trước, chỉ cửa.
import * as THREE from 'three';
import { createMascot } from './mascot.js';
import { buildLobby, LOBBY_LIMIT } from './lobby.js';
import { buildRoom, ROOM_LIMIT } from './room3d.js';
import { createControls } from './controls.js';
import { $, el, say, initPanel, closePanel, isPanelOpen } from './ui.js';
import { dialogue } from './dialogue.js';
import { openRoom } from './rooms/index.js';
import * as audio from './audio.js';
import { createPicker } from './pick.js';
import { ROOM_VARIANTS } from './rooms3d/index.js';
import { createSoundscape } from './nature-audio.js';
import { manifest, loadSkyHDR } from './assets.js';
import { load as loadPref, save as savePref } from './storage.js';

const loadJson = (n) => fetch(`data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); });
const ease = (k) => k * k * (3 - 2 * k);
const PLAYER_PAD = 0.45, GUIDE_PAD = 0.55;

async function boot() {
  const [rooms, likert, challenge, phone, mindful] = await Promise.all(['rooms', 'likert', 'challenge', 'phone-guide', 'mindful'].map(loadJson));
  const data = { rooms, likert, challenge, phone, mindful };
  const list = rooms.rooms;

  /* ---------- cảnh ---------- */
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdcebf6);
  scene.fog = new THREE.Fog(0xdcebf6, 80, 215);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
  camera.rotation.order = 'YXZ';
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbcd0ee, 1.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(10, 25, 14); scene.add(sun);
  const LOBBY_LIGHT = { hemi: 1.7, sky: 0xffffff, ground: 0xbcd0ee, sun: 1.3, sunColor: 0xffffff };
  const lightNow = { sky: new THREE.Color(0xffffff), ground: new THREE.Color(0xbcd0ee), sunC: new THREE.Color(0xffffff) };
  const tmpC = new THREE.Color();
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1 ? Math.min(95, 70 + (1 - camera.aspect) * 45) : 70; // điện thoại dọc: nhìn rộng hơn để thấy đồ trong phòng
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize); resize();

  const lobby = buildLobby(list); scene.add(lobby.group);
  const valley = lobby.valley; scene.add(valley.sky);
  // bầu trời HDR thật (CC0) nếu có khai báo và tải được; không thì giữ bầu trời tự vẽ
  manifest().then((m) => { if (m.models && m.models.boulder) valley.addHeroRocks(m.models.boulder).then(() => valley.setLite(lite)); if (m.kenney) valley.addDecor(m.kenney); return m; }).then((m) => m.sky && loadSkyHDR(m.sky, renderer)).then((r) => {
    if (!r) return;
    scene.background = r.background; scene.environment = r.env; scene.environmentIntensity = 0.35;
    scene.backgroundIntensity = 1.7; // HDR thô khá tối, nâng sáng cho hợp cảnh buổi sáng dịu valley.sky.visible = false;
  });
  const built = {};
  list.forEach((room, i) => { // các phòng đặt thật xa sảnh nên không bao giờ thấy từ sảnh
    built[room.id] = buildRoom(room, new THREE.Vector3(-180 + i * 60, 0, -300));
    scene.add(built[room.id].group);
  });
  const guide = createMascot(); guide.root.scale.setScalar(0.45); scene.add(guide.root);

  /* ---------- trạng thái ---------- */
  const controls = createControls(canvas);
  const player = new THREE.Vector3().copy(lobby.start);
  const vel = { x: 0, z: 0 };
  controls.yaw = lobby.startYaw;
  let zone = 'lobby', fading = false, lastTeleport = -10, started = false;
  let overview = false, ov = 0, introUntil = 0, lastDrag = 0, idleFor = 0, lastHint = 0;
  const visited = new Set();
  let soundscape = null, sitting = null, eyeH = 1.6, settle = 0;
  let lite = loadPref('lite', false);
  const clock = new THREE.Clock();
  let tt = 0;

  const ctx = { data, say, mascot: { play: (n) => guide.play(n) }, goto, get lite() { return lite; }, visit: (id) => visited.add(id), get soundscape() { return soundscape; }, variant: (id) => built[id] && built[id].variant,
    player, sitAt: (spot) => sitOn(spot), standUp: () => standUp(), get sitting() { return sitting; } };
  const roomById = (id) => list.find((r) => r.id === id);
  const busy = () => isPanelOpen() || dialogue.active; // đang mở khung hoặc đang hội thoại
  const obstacles = () => (zone === 'lobby' ? lobby.obstacles : built[zone].obstacles);

  /** Giữ điểm p trong khu vực hiện tại và đẩy ra khỏi vật cản (cây, bệ, đài phun). */
  function resolve(p, pad, isGuide = false) {
    if (zone === 'lobby') {
      const r = Math.hypot(p.x, p.z);
      if (r > LOBBY_LIMIT) { p.x *= LOBBY_LIMIT / r; p.z *= LOBBY_LIMIT / r; }
    } else {
      const c = built[zone].center;
      p.x = Math.max(c.x - ROOM_LIMIT, Math.min(c.x + ROOM_LIMIT, p.x));
      p.z = Math.max(c.z - ROOM_LIMIT, Math.min(c.z + ROOM_LIMIT, p.z));
    }
    for (const o of obstacles()) {
      if (isGuide && o.guideOk) continue; // chỗ Reset ngồi (ghế) thì Reset được bước vào
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + pad;
      if (d < min) {
        if (d < 0.001) { p.x = o.x + min; continue; }
        p.x = o.x + (dx / d) * min; p.z = o.z + (dz / d) * min;
      }
    }
    return p;
  }

  /* ---------- mục tiêu của người dẫn đường ---------- */
  function goalDoorIndex() {
    for (const id of ['nhan-thuc', 'thu-thach', 'chanh-niem']) {
      if (!visited.has(id)) return list.findIndex((r) => r.id === id);
    }
    return -1;
  }
  function goalPos() {
    if (zone === 'lobby') { const i = goalDoorIndex(); return i < 0 ? null : lobby.doors[i].pos; }
    const b = built[zone];
    const vg = b.variant && b.variant.goal && b.variant.goal(); // phòng có nội thất riêng chỉ mục tiêu của nó (ví dụ viên đá kế tiếp)
    if (vg) return vg;
    return visited.has(zone) ? b.exit : b.object;
  }

  /* ---------- đi tới phòng (có làm mờ) ---------- */
  function goto(id, opts = {}) {
    if (fading) return;
    fading = true; $('#fade').classList.add('on');
    setTimeout(() => {
      const from = zone;
      if (built[from] && built[from].variant) built[from].variant.leave();
      closePanel(); dialogue.end(true); standUp();
      overview = false; armed = true;
      vel.x = vel.z = 0;
      if (id === 'lobby') {
        const door = lobby.doors.find((d) => d.room.id === from);
        zone = 'lobby';
        if (door) { player.copy(door.back); controls.yaw = door.phi; } else { player.copy(lobby.start); controls.yaw = lobby.startYaw; }
        controls.pitch = 0;
        say(from === 'lobby' ? rooms.lobby.greet : rooms.lobby.back, 8000);
      } else {
        zone = id; player.copy(built[id].spawn); controls.yaw = 0; controls.pitch = 0;
        if (built[id].variant) built[id].variant.enter();
        say(roomById(id).enter, 9000);
      }
      controls.clearKeys();
      snapGuide();
      const rp0 = roomPost(); if (rp0) guide.play(rp0.pose); else guide.play('wave');
      lastTeleport = tt; idleFor = 0; lastHint = tt;
      if (soundscape) { soundscape.setLobby(zone === 'lobby'); if (zone === 'lobby') soundscape.setRoomScene(null); }
      $('#fade').classList.remove('on');
      setTimeout(() => { fading = false; }, 250);
      updateMenuHighlight();
      if (opts.open && id !== 'lobby') setTimeout(() => { visited.add(id); openRoom(ctx, roomById(id)); }, 450); // mở luôn phòng được gợi ý
    }, 260);
  }

  /* ---------- người dẫn đường ---------- */
  const gTarget = new THREE.Vector3();
  let dlgYaw = null; // hướng nhìn lúc bắt đầu hội thoại: Reset đứng trước mặt theo hướng này
  // phòng có nội thất riêng (rooms3d/) quyết định chỗ ngồi và tư thế của Reset: { x, z, pose, face }
  const roomPost = () => (zone !== 'lobby' && built[zone] && built[zone].variant && built[zone].variant.post ? built[zone].variant.post() : null);
  const guidePost = () => {
    const p = roomPost();
    return p ? gTarget.set(built[zone].center.x + p.x, 0, built[zone].center.z + p.z) : null;
  };
  function guideTarget() {
    const post = guidePost();
    if (post) return post;
    if (sitting && dlgYaw === null) { // người chơi đang ngồi nghỉ: Reset đứng bên cạnh, không che tầm nhìn ra thác
      const yy = controls.yaw;
      gTarget.set(player.x + Math.cos(yy) * 2.2 - Math.sin(yy) * 0.3, 0, player.z - Math.sin(yy) * 2.2 - Math.cos(yy) * 0.3);
      return resolve(gTarget, GUIDE_PAD, true);
    }
    if (dlgYaw !== null) { // đang hội thoại: Reset đứng ngay trước mặt, lệch sang phải
      const yy = dlgYaw;
      gTarget.set(player.x - Math.sin(yy) * 2.6 + Math.cos(yy) * 1.5, 0, player.z - Math.cos(yy) * 2.6 - Math.sin(yy) * 1.5);
      return resolve(gTarget, GUIDE_PAD, true);
    }
    const y = controls.yaw, fx = -Math.sin(y), fz = -Math.cos(y);
    let dx = fx, dz = fz;
    const g = goalPos();
    if (g) {
      const tx = g.x - player.x, tz = g.z - player.z, td = Math.hypot(tx, tz);
      if (td > 0.01) {
        // nghiêng hướng đứng về phía mục tiêu nhưng vẫn ở trong tầm nhìn
        let ang = Math.atan2(tx, tz) - Math.atan2(fx, fz);
        ang = Math.atan2(Math.sin(ang), Math.cos(ang));
        ang = Math.max(-0.55, Math.min(0.55, ang));
        const base = Math.atan2(fx, fz) + ang;
        dx = Math.sin(base); dz = Math.cos(base);
        const reach = Math.min(3.6, Math.max(1.4, td - 2.2));
        gTarget.set(player.x + dx * reach - dz * 1.7, 0, player.z + dz * reach + dx * 1.7); // lệch sang phải để không che tầm nhìn
        return resolve(gTarget, GUIDE_PAD, true);
      }
    }
    gTarget.set(player.x + dx * 3.2 + Math.cos(y) * 0.9, 0, player.z + dz * 3.2 - Math.sin(y) * 0.9);
    return resolve(gTarget, GUIDE_PAD, true);
  }
  function snapGuide() { guide.root.position.copy(guideTarget()); }
  function updateGuide(dt) {
    const t = guideTarget(), p = guide.root.position;
    const dx = t.x - p.x, dz = t.z - p.z, dist = Math.hypot(dx, dz);
    const moving = dist > 0.4;
    if (dist > 0.02) {
      const step = Math.min(dist, (2.5 + dist * 2.2) * dt);
      p.x += (dx / dist) * step; p.z += (dz / dist) * step;
    }
    resolve(p, GUIDE_PAD, true);
    const rp = roomPost();
    const face = moving ? Math.atan2(dx, dz) : (rp && rp.face !== undefined ? rp.face : Math.atan2(player.x - p.x, player.z - p.z));
    let diff = Math.atan2(Math.sin(face - guide.root.rotation.y), Math.cos(face - guide.root.rotation.y));
    guide.root.rotation.y += diff * (1 - Math.exp(-dt * 7));
    if (rp) { // tới chỗ ngồi thì ngồi/đứng đúng tư thế đã chọn; ai đó đi tiếp thì Reset đi theo
      if (moving) { if (guide.mode !== 'walk') guide.play('walk'); }
      else if (guide.mode !== rp.pose && ['idle', 'walk', 'sit', 'chair', 'stand'].includes(guide.mode)) guide.play(rp.pose);
      return;
    }
    if (['sit', 'chair', 'stand'].includes(guide.mode)) guide.play('idle');
    if (moving && guide.mode === 'idle') guide.play('walk');
    else if (!moving && guide.mode === 'walk') guide.play('idle');
  }

  /* ---------- menu, nút mở, toàn cảnh, âm thanh ---------- */
  const menuList = $('#menulist');
  const items = [{ id: 'lobby', name: rooms.lobby.name, icon: rooms.lobby.icon, demo: false }, ...list];
  items.forEach((r) => {
    menuList.append(el('button', { type: 'button', class: 'menu-item', 'data-id': r.id, onClick: () => {
      menuList.hidden = true; $('#menubtn').setAttribute('aria-expanded', 'false');
      if (zone === r.id && !busy()) { say(r.id === 'lobby' ? rooms.lobby.back : r.enter); return; }
      goto(r.id);
    } }, `${r.icon} ${r.name}`, r.demo ? el('span', { class: 'tagdemo' }, 'Bản demo') : null));
  });
  function updateMenuHighlight() {
    menuList.querySelectorAll('.menu-item').forEach((b) => b.classList.toggle('on', b.dataset.id === zone));
    $('#ovbtn').hidden = zone !== 'lobby';
  }
  $('#menubtn').addEventListener('click', () => {
    menuList.hidden = !menuList.hidden;
    $('#menubtn').setAttribute('aria-expanded', String(!menuList.hidden));
  });
  $('#ovbtn').addEventListener('click', () => { overview = !overview; introUntil = 0; });
  const soundBtn = $('#soundbtn');
  const renderSound = () => { soundBtn.textContent = audio.isMuted() ? '🔇' : '🔊'; soundBtn.setAttribute('aria-label', audio.isMuted() ? 'Bật âm thanh' : 'Tắt âm thanh'); };
  soundBtn.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); renderSound(); });
  renderSound();

  // Chạm vào vật thể (cây, quả tinh thể...) là phòng tự mở. Phải đi ra xa rồi mới mở lại được.
  const TOUCH_DIST = 1.8, REARM_DIST = 2.8;
  let nearRoom = null, armed = true;
  const openRoomNow = (room) => { audio.unlock(); visited.add(room.id); openRoom(ctx, room); };
  addEventListener('keydown', (e) => { if (['KeyE', 'Enter'].includes(e.code) && nearRoom && !busy() && !fading && started) openRoomNow(nearRoom); });

  initPanel();
  $('#help').textContent = document.body.classList.contains('touch')
    ? 'Cần trái: đi · Kéo bên phải: nhìn · Chạm vật thể để mở'
    : 'WASD: đi · Kéo chuột: nhìn · Đi tới chạm vật thể để mở';

  /* ---------- chạm vật thể (ghế đá, đồ trong phòng) ---------- */
  const picker = createPicker({
    camera, canvas, getPlayer: () => player,
    onFar: () => say('Đi lại gần hơn một chút rồi chạm nhé.', 4000),
  });
  picker.setEnabled(() => started && !busy() && !fading && !overview);
  controls.onTap = (x, y) => { if (started) audio.unlock(); picker.tap(x, y); };
  controls.onHover = (x, y) => picker.hover(x, y);
  ctx.picker = picker;
  valley.benches.forEach((b) => picker.register({
    object: b.group, reach: 9, haloAt: [0, 0.9, 0], haloSize: 1.3, haloColor: 0xd9f99d,
    enabled: () => zone === 'lobby' && sitting !== b, onTap: () => sitOn(b),
  }));
  function sitOn(b) { // b = { seat: {x, z}, yaw? } (toạ độ thế giới); không có yaw thì quay ra phía thác của sảnh
    sitting = b; settle = 1.4; idleFor = 0;
    if (soundscape && zone === 'lobby') soundscape.setFocus(1);
  }
  function standUp() {
    if (!sitting) return;
    sitting = null;
    if (soundscape) soundscape.setFocus(0);
  }

  ctx.mascot.breath = 0;
  Object.defineProperty(ctx.mascot, 'breath', { set: (v) => { guide.breath = v; }, get: () => 0 });
  for (const id of Object.keys(ROOM_VARIANTS)) if (built[id]) built[id].variant = ROOM_VARIANTS[id](built[id], ctx);

  /* ---------- chế độ nhẹ cho máy yếu ---------- */
  const liteBtn = $('#litebtn');
  const applyLite = () => {
    renderer.setPixelRatio(lite ? 1 : Math.min(devicePixelRatio, 1.75));
    valley.setLite(lite); resize();
    for (const b of Object.values(built)) if (b.variant && b.variant.screen) b.variant.screen.setLite(lite);
    for (const b of Object.values(built)) if (b.variant && b.variant.setLite) b.variant.setLite(lite);
    liteBtn.classList.toggle('on', lite); liteBtn.setAttribute('aria-pressed', String(lite));
  };
  liteBtn.addEventListener('click', () => { lite = !lite; savePref('lite', lite); applyLite(); say(lite ? 'Đã bật chế độ nhẹ: ít cây cỏ hơn, hình mịn ít hơn.' : 'Đã tắt chế độ nhẹ.', 4000); });
  applyLite();

  /* ---------- camera: mắt người chơi, hoặc toàn cảnh ---------- */
  const tmpV = new THREE.Vector3();
  const fpPos = new THREE.Vector3(), fpQ = new THREE.Quaternion(), fpE = new THREE.Euler(0, 0, 0, 'YXZ');
  const ovPos = new THREE.Vector3(0, 44, 22), ovQ = new THREE.Quaternion();
  {
    const m = new THREE.Matrix4().lookAt(ovPos, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    ovQ.setFromRotationMatrix(m);
  }

  /* ---------- vòng lặp ---------- */
  function frame(forceDt) {
    const dt = forceDt ?? Math.max(0, Math.min(clock.getDelta(), 0.05)); // không bao giờ âm hoặc quá lớn
    tt += dt; const t = tt;
    controls.enabled = started && !busy() && !fading;
    if (dialogue.active) {
      if (dlgYaw === null) dlgYaw = controls.yaw;
      // quay mặt về phía Reset, để Reset nằm lệch phải và có chỗ cho bong bóng phía trên
      const g = guide.root.position;
      const want = Math.atan2(-(g.x - player.x), -(g.z - player.z)) + 0.2;
      const df = Math.atan2(Math.sin(want - controls.yaw), Math.cos(want - controls.yaw));
      const ka = 1 - Math.exp(-dt * 4);
      controls.yaw += df * ka; controls.pitch += (0.04 - controls.pitch) * ka;
    } else dlgYaw = null;
    const { fwd, side } = controls.read(dt);
    if (sitting && (fwd || side)) standUp(); // bước đi là đứng dậy
    const y = controls.yaw;

    // người chơi bấm di chuyển hoặc kéo thì thoát toàn cảnh
    if (controls.drag !== lastDrag) { lastDrag = controls.drag; if (overview && t > introUntil) overview = false; }
    if (overview && (fwd || side)) overview = false;
    if (overview && introUntil && t > introUntil) { overview = false; introUntil = 0; }

    // di chuyển mượt: tăng/giảm tốc dần, rồi trượt dọc vật cản
    const speed = 4.6;
    const wx = (-Math.sin(y) * fwd + Math.cos(y) * side) * speed;
    const wz = (-Math.cos(y) * fwd - Math.sin(y) * side) * speed;
    const k = 1 - Math.exp(-dt * (fwd || side ? 9 : 12));
    vel.x += (wx - vel.x) * k; vel.z += (wz - vel.z) * k;
    const sp = Math.hypot(vel.x, vel.z);
    if (sitting) { // đang ngồi: trượt nhẹ tới ghế, hạ tầm mắt, quay ra phía thác
      const k2 = 1 - Math.exp(-dt * 3);
      player.x += (sitting.seat.x - player.x) * k2; player.z += (sitting.seat.z - player.z) * k2;
      if (settle > 0) { settle -= dt; { const sy = sitting.yaw ?? valley.seatYaw; controls.yaw += Math.atan2(Math.sin(sy - controls.yaw), Math.cos(sy - controls.yaw)) * k2; } }
      vel.x = vel.z = 0;
    } else if (sp > 0.02) { player.x += vel.x * dt; player.z += vel.z * dt; resolve(player, PLAYER_PAD); }
    eyeH += ((sitting ? 1.0 : 1.6) - eyeH) * (1 - Math.exp(-dt * 3));

    fpPos.set(player.x, eyeH + (sitting ? 0 : Math.sin(t * 9) * 0.03 * Math.min(1, sp / speed)), player.z);
    fpE.set(controls.pitch, y, 0); fpQ.setFromEuler(fpE);
    ov += ((overview ? 1 : 0) - ov) * (1 - Math.exp(-dt * 2.6));
    const e = ease(Math.min(1, Math.max(0, ov)));
    camera.position.lerpVectors(fpPos, ovPos, e);
    camera.quaternion.slerpQuaternions(fpQ, ovQ, e);

    // bong bóng lời thoại bám theo đầu Reset
    if (dialogue.visible) {
      camera.updateMatrixWorld();
      const g = guide.root.position;
      tmpV.set(g.x, guide.mode === 'sit' ? 1.8 : 2.15, g.z).project(camera);
      const sx = (tmpV.x * 0.5 + 0.5) * innerWidth, sy = (-tmpV.y * 0.5 + 0.5) * innerHeight;
      dialogue.anchor(tmpV.z < 1 && sx > -60 && sx < innerWidth + 60 ? { x: sx, y: sy } : null);
    }

    // lại gần cửa hoặc bệ
    nearRoom = null;
    if (started && !fading && !busy() && !overview) {
      if (zone === 'lobby') {
        if (tt - lastTeleport > 1) {
          for (const d of lobby.doors) {
            if (d.open > 0.85 && Math.hypot(d.pos.x - player.x, d.pos.z - player.z) < 2.4) { goto(d.room.id); break; }
          }
        }
      } else {
        const b = built[zone];
        const dObj = Math.hypot(b.object.x - player.x, b.object.z - player.z);
        if (dObj < 3.4 && !b.variant) nearRoom = b.room;
        if (dObj > REARM_DIST) armed = true;
        if (armed && !b.variant && dObj < TOUCH_DIST) { armed = false; openRoomNow(b.room); }
        else if (tt - lastTeleport > 1 && Math.hypot(b.exit.x - player.x, b.exit.z - player.z) < 1.5) goto('lobby');
      }
      // đứng yên lâu thì người dẫn đường nhắc
      const inSession = zone !== 'lobby' && built[zone].variant && built[zone].variant.busy && built[zone].variant.busy();
      idleFor = sp < 0.3 && !busy() && !sitting && !inSession ? idleFor + dt : 0;
      if (idleFor > 8 && t - lastHint > 20) {
        lastHint = t; idleFor = 0; guide.play('point');
        say(zone === 'lobby' ? rooms.lobby.hint : roomById(zone).hint || (roomPost() ? rooms.postHint : (visited.has(zone) ? rooms.exitHint : rooms.roomHint)), 8000);
      }
    }

    { // ánh sáng đổi mềm theo khu vực: sảnh sáng ban ngày, phòng thiền ấm và dịu
      const tl = (zone !== 'lobby' && built[zone].variant && built[zone].variant.lighting) || LOBBY_LIGHT, k3 = 1 - Math.exp(-dt * 2.5);
      hemi.intensity += (tl.hemi - hemi.intensity) * k3; sun.intensity += (tl.sun - sun.intensity) * k3;
      hemi.color.lerp(tmpC.set(tl.sky), k3); hemi.groundColor.lerp(tmpC.set(tl.ground), k3); sun.color.lerp(tmpC.set(tl.sunColor), k3);
    }
    lobby.update(t, dt, player, goalDoorIndex());
    valley.update(t, dt, camera.position);
    picker.update(t);
    if (soundscape) soundscape.listener(player, controls.yaw);
    Object.values(built).forEach((b) => { b.update(t); if (b.variant) b.variant.update(t, dt, zone === b.room.id); });
    updateGuide(dt);
    guide.update(t, dt);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(() => frame());

  /* ---------- màn chào ---------- */
  $('#splash-title').textContent = rooms.welcome.title;
  $('#splash-text').textContent = rooms.welcome.text;
  const go = $('#splash-go');
  go.textContent = rooms.welcome.button;
  go.addEventListener('click', () => {
    audio.unlock(); started = true; $('#splash').hidden = true;
    if (!soundscape) { try { soundscape = createSoundscape({ waterAt: valley.waterAt, treeSpots: valley.treeSpots }); } catch (err) { console.warn('Âm thanh thiên nhiên lỗi', err); } }
    if (soundscape) soundscape.setLobby(true);
    snapGuide(); updateMenuHighlight();
    overview = true; ov = 1; introUntil = tt + 6; // mở đầu bằng toàn cảnh rồi hạ xuống mắt nhìn
    guide.play('wave'); say(rooms.lobby.greet, 12000);
  });
  go.disabled = false;

  // dùng cho kiểm thử trong trình duyệt
  window.mascotAPI = { play: (n) => guide.play(n), say };
  window.__world = { frame, camera, ctx, renderer, sitOn, standUp, valley, picker, get soundscape() { return soundscape; }, get sitting() { return sitting; }, goto, get zone() { return zone; }, get overview() { return overview; }, player, controls, guide: guide.root, openRoom: (id) => openRoom(ctx, roomById(id)) };
}

boot().catch((err) => {
  console.error(err);
  $('#splash-text').textContent = 'Không tải được dữ liệu. Hãy mở trang qua máy chủ (node tools/serve.mjs world 5178), không mở trực tiếp bằng file.';
});
