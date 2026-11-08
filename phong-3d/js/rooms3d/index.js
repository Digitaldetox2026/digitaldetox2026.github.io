// Phòng nào có nội thất riêng (chạm vật thể thay vì khung chữ) thì khai báo ở đây. Thêm phòng = thêm một dòng.
import { createMindfulRoom } from './mindful-flow.js';
import { createTalkRoom } from './talk-corner.js';
import { createStonesRoom } from './stones-flow.js';

export const ROOM_VARIANTS = {
  'chanh-niem': createMindfulRoom,
  'nhan-thuc': createTalkRoom,
  'thu-thach': createStonesRoom,
};
