// Phòng Nhận thức trong không gian: chạm ghế bành -> camera hạ thấp, Reset ngồi ghế đối diện và hỏi chuyện
// (bộ câu hỏi hội thoại ở rooms/likert.js, cách tính điểm không đổi). Kết quả: gợi ý hiện thành biển chỉ đường trong phòng.
import { buildTalkProps, SEAT_P, SEAT_R, signSpots } from './talk-props.js';
import { createSignposts } from './signposts.js';
import { openLikert } from '../rooms/likert.js';

export function createTalkRoom(built, ctx) {
  const c = built.center;
  const room = ctx.data.rooms.rooms.find((r) => r.id === 'nhan-thuc');
  let startIn = -1;   // đếm ngược (giây) cho tới khi Reset ngồi xong và bắt đầu hỏi

  const props = buildTalkProps({ built, ctx, on: { sit } });
  const seat = { seat: { x: c.x + SEAT_P.x, z: c.z + SEAT_P.z }, yaw: props.seatYaw };
  const signs = createSignposts({
    group: built.group, picker: ctx.picker, rooms: ctx.data.rooms.rooms, spots: signSpots, faceTo: SEAT_P,
    onGo: (id) => ctx.goto(id, { open: true }),
  });
  const seated = () => ctx.sitting === seat;

  function sit() {
    ctx.visit('nhan-thuc');
    const wasSeated = seated();
    if (!wasSeated) ctx.sitAt(seat);
    ctx.mascot.play('nod');
    startIn = wasSeated ? 0.5 : 1.8;  // chờ Reset đi tới ghế và ngồi rồi mới hỏi
  }

  function talk() {
    openLikert(ctx, { signposts: signs });
  }

  return {
    busy: () => false,
    // ánh sáng ấm, dịu như phòng khách buổi chiều
    lighting: { hemi: 0.85, sky: 0xfff1de, ground: 0x9a7552, sun: 0.3, sunColor: 0xffe2b8 },
    /** Reset chờ cạnh ghế của mình; khi người chơi ngồi thì Reset ngồi ghế đối diện, quay mặt về phía họ. */
    post() {
      if (seated()) return { x: SEAT_R.x, z: SEAT_R.z, pose: 'chair', face: Math.atan2(SEAT_P.x - SEAT_R.x, SEAT_P.z - SEAT_R.z) };
      const x = SEAT_R.x + 1.4, z = SEAT_R.z + 1.0;
      return { x, z, pose: 'idle', face: Math.atan2(-x, 3 - z) };
    },
    enter() { signs.hide(); startIn = -1; },
    leave() { signs.hide(); startIn = -1; },
    intro() { ctx.say(room.enter, 9000); ctx.mascot.play('point'); },
    update(t, dt, isActive) {
      props.update(t); signs.update(dt);
      if (!isActive) return;
      props.setChairTag(!seated());
      if (startIn > 0) { startIn -= dt; if (startIn <= 0) { startIn = -1; if (seated()) talk(); } }
    },
  };
}
