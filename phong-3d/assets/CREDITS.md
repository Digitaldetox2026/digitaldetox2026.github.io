# Nguồn và giấy phép của file trong `world/assets/`

Mỗi file dùng trong không gian 3D phải có một dòng ở đây. Không dùng file chưa rõ nguồn hoặc giấy phép.

## Video thiền (`meditation/`)
Dùng trong dự án thử nghiệm ở trường, KHÔNG kinh doanh, có ghi nguồn (quyết định của người dùng ngày 2026-11-08). Ghi nguồn không thay cho xin phép. **Trước khi đưa lên GitHub công khai hoặc AI Studio: dừng lại hỏi, nên xin phép tác giả.**

| File | Video gốc | Kênh / tác giả | Link | Đã chỉnh |
|---|---|---|---|---|
| `meditation/thien-1-nhan-thuc-ngoi-nghi.mp4` (9 phút 57 giây, 20 MB) | "10 phút Thiền Định : Cách đạt được tiềm năng vô hạn" | Andy journal (https://www.youtube.com/@Andy_Journal). Hình flycam có chữ "RELAXATION FILM" ở góc trái | https://youtu.be/8RftmMysLYk | Giữ đoạn gốc 00:13,0 đến 10:10 (bỏ lời chào đầu và phần cuối không lời), làm mờ đầu/cuối, nén 854x480 |
| `meditation/thien-2-chanh-niem.mp4` (9 phút 27 giây, 26,5 MB) | "Thiền chánh niệm #1: giảm lo âu, bớt suy nghĩ (10 phút)" | Cosmic Writer (https://www.youtube.com/@CosmicWriter), người dẫn tự giới thiệu là "Hà Minh" (tên do máy nghe). Logo kênh còn ở góc trên trái | https://youtu.be/wJOAC8EXWcE | Giữ đoạn gốc 00:24,3 đến 10:06 (bỏ giới thiệu kênh và lời chào kết); theo yêu cầu người dùng bỏ thêm 2 câu: 01:47,6-01:54,4 ("thở sâu vào bụng như em bé... cách thở đúng nhất") và 09:19,4-09:27,2 ("Khi bạn làm chủ được tâm trí... nếu như bạn không cho phép"); làm mờ đầu/cuối, nén 854x480 |

Lời thoại gốc (máy nghe, có thể sai chính tả) để kiểm nội dung: `docs/thien/loi-video-1-goc.txt`, `docs/thien/loi-video-2-goc.txt`.
Dòng ghi nguồn hiện dưới màn hình trong phòng: "Video: 10 phút Thiền Định : Cách đạt được tiềm năng vô hạn — Andy journal (YouTube). Đã cắt ngắn. Dùng thử nghiệm phi thương mại tại trường." và "Video: Thiền chánh niệm #1: giảm lo âu, bớt suy nghĩ — Cosmic Writer (YouTube). Đã cắt ngắn. Dùng thử nghiệm phi thương mại tại trường."

## Mô hình 3D, âm thanh, bầu trời
### Bầu trời (`sky/`)
| File | Tên gốc | Tác giả | Link | Giấy phép |
|---|---|---|---|---|
| `sky/kloofendal_48d_partly_cloudy_puresky_1k.hdr` (1,4 MB, bản 1k) | Kloofendal 48d Partly Cloudy (Pure Sky) | Greg Zaal (gốc), Jarod Guest (chỉnh bầu trời) | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 (miễn phí, dùng mọi mục đích, không cần ghi công; vẫn ghi để rõ nguồn). Tải ngày 2026-11-08 theo sự đồng ý của người dùng. |

### Mô hình 3D (`models/`)
| File | Tên gốc | Tác giả | Link | Giấy phép | Đã chỉnh |
|---|---|---|---|---|---|
| `models/boulder_01.glb` (0,8 MB) | Boulder 01 | Rico Cilliers | https://polyhaven.com/a/boulder_01 | CC0 (miễn phí) | Tải bản 1k (5,8 MB) ngày 2026-11-08 theo sự đồng ý của người dùng; nén meshopt, texture đổi sang webp 512 bằng gltf-transform. Số tam giác vẫn khoảng 54 nghìn (công cụ không giảm thêm được vì mô hình quét có nhiều đường cắt UV); vì nặng nên chỉ 3 tảng và tắt ở "Chế độ nhẹ". |

| `models/kenney/*.glb` (19 file, tổng 0,2 MB, kèm `License.txt`) | Nature Kit 2.1: plant_bush*, flower_*, stump_round*, log, log_large, mushroom_*Group, tree_oak, tree_default, tree_detailed | Kenney (www.kenney.nl) | https://kenney.nl/assets/nature-kit | CC0 (ghi công không bắt buộc, vẫn ghi) | Người dùng tải gói zip (10,5 MB) từ trang chính thức ngày 2026-11-08; chỉ chép 19 file cần dùng. Chưa chỉnh. |

(Ngoài bầu trời, tảng đá và bộ Kenney: chưa tải mô hình nào từ mạng. Hiện tại cây, cỏ, đá, nước, bầu trời, nội thất, âm thanh thiên nhiên đều do mã tự dựng/tạo trong máy nên không có giấy phép bên thứ ba. Ảnh bìa `meditation/cover-1.jpg` và `cover-2.jpg` là 1 khung hình cắt từ 2 video ở trên (cùng nguồn, cùng điều kiện). Thêm khi tải: tên file, tác giả, trang, link, giấy phép CC0/CC-BY, ghi công nếu cần.)
