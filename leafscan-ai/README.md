# 🌿 LeafScan AI

LeafScan AI là ứng dụng di động nhận diện bệnh cây và chăm sóc cây trồng.

---

## ✨ Chức năng chính

*   **🌱 Quản lý cây (My Garden):** Thêm, sửa, xóa, theo dõi tình trạng sinh trưởng của cây.
*   **📷 Quét bệnh (Scan):** Dùng camera chụp lá cây để chẩn đoán bệnh.
*   **📋 Chi tiết bệnh (Disease Detail):** Xem nguyên nhân bệnh và cách chữa trị.
*   **📊 Lịch sử (History):** Lưu lại các lần quét bệnh và báo cáo sức khỏe cây.
*   **🔐 Tài khoản:** Đăng nhập, đăng ký, đổi mật khẩu, quản lý hồ sơ.
*   **🔍 Tìm kiếm (Search):** Tra cứu thông tin cây trồng và bệnh lý.

---

## 🛠 Framework & Công nghệ

*   **⚛️ Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
*   **📘 Ngôn ngữ:** TypeScript
*   **🧭 Điều hướng:** React Navigation
*   **📦 Quản lý State:** Zustand
*   **🎨 Giao diện & Animation:** Reanimated, Gesture Handler, Linear Gradient, Lucide Icons

---

## 🚀 Cài đặt & Khởi chạy

```bash
# 1. Cài đặt thư viện
npm install

# 2. Cấu hình API backend
cp .env.example .env
# sửa EXPO_PUBLIC_API_BASE_URL theo máy chạy backend

# 3. Chạy ứng dụng
npx expo start

# 4. Build
npm run build            # export đa nền tảng (static bundle)
npm run build:web        # export web
npm run build:android    # EAS Android build
npm run build:ios        # EAS iOS build
```
