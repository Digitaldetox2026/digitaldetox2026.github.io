// Bảng: phòng nào mở bằng chức năng nào. Thêm phòng = thêm một dòng ở đây và trong data/rooms.json.
import { openDemo } from './demo.js';

const OPENERS = {
  'nhan-thuc': (ctx) => ctx.variant('nhan-thuc')?.intro(), // phòng Nhận thức: góc trò chuyện trong không gian (rooms3d/talk-corner.js)
  'thu-thach': (ctx) => ctx.variant('thu-thach')?.intro(), // khu vườn 14 viên đá trong không gian (rooms3d/stones-flow.js)
  'chanh-niem': (ctx) => ctx.variant('chanh-niem')?.intro(), // phòng Chánh niệm chạy ngay trong không gian (rooms3d/)
};

export function openRoom(ctx, room) {
  const fn = OPENERS[room.id];
  if (fn) return fn(ctx, room);
  return openDemo(ctx, room);
}
