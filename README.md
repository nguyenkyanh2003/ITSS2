# 🛒 HUST Marketplace - Nền Tảng Trao Đổi Đồ Cũ Sinh Viên

![HUST Marketplace Banner](https://via.placeholder.com/1000x300?text=HUST+Marketplace)

## 📖 1. Giới thiệu dự án

**HUST Marketplace** là một ứng dụng thương mại điện tử (E-commerce) theo mô hình C2C (Customer to Customer), được thiết kế tối ưu hóa dành riêng cho sinh viên trong môi trường đại học (đặc biệt là Đại học Bách Khoa). 

Dự án giải quyết bài toán lãng phí tài nguyên bằng cách tạo ra một môi trường an toàn, tiện lợi để sinh viên trao đổi, mua bán các vật dụng đã qua sử dụng như:
- 📚 Giáo trình, tài liệu học tập.
- 💻 Thiết bị điện tử (Laptop, PC, tai nghe, phụ kiện).
- 🛏️ Đồ dùng phòng trọ, nội thất nhỏ.
- 🚲 Phương tiện di chuyển (Xe đạp).

### Điểm nhấn của hệ thống:
- Giao dịch gắn liền với các địa điểm thực tế quen thuộc trong trường (Cổng Parabol, Nhà B1, Thư viện Tạ Quang Bửu, v.v.).
- Tích hợp tính năng Chat Real-time giúp hai bên dễ dàng thương lượng.
- Cơ chế đặt lịch hẹn (Booking) trực tiếp trên nền tảng.
- Hệ thống đánh giá (Rating & Reviews) giúp xây dựng cộng đồng mua bán uy tín.

---

## 🏛️ 2. Kiến trúc hệ thống và Cách code hoạt động

Dự án áp dụng mô hình kiến trúc **Client-Server** truyền thống, chia làm 2 phần độc lập: **Frontend (React)** và **Backend (Node.js)**.

### 2.1. Luồng dữ liệu tổng quan (Data Flow)
1. **User (Client)** tương tác với giao diện (React). Giao diện gọi các hành động (Actions) thông qua React Context.
2. **Frontend** gửi HTTP Requests (RESTful API) qua thư viện `fetch` hoặc kết nối WebSocket (Socket.io) tới Backend.
3. **Backend Middleware** kiểm tra tính hợp lệ của Request (Xác thực JWT token, xử lý upload ảnh bằng Multer).
4. **Backend Controller** tiếp nhận, xử lý logic nghiệp vụ và tương tác với **MongoDB** (qua Mongoose).
5. **Database** trả về kết quả cho Controller, Controller định dạng lại data thành JSON và phản hồi về Frontend.
6. **Frontend** nhận JSON data, cập nhật State (Context) và re-render lại UI.

### 2.2. Chi tiết hoạt động của Backend
- **Framework:** Express.js được sử dụng để khởi tạo server và định tuyến (Routing).
- **Mô hình MVC:**
  - `models/`: Định nghĩa các cấu trúc dữ liệu lưu trong MongoDB (User, Product, Order, Message, v.v.).
  - `routes/`: Nhận endpoint (ví dụ `/api/products`), map tới các hàm tương ứng trong Controller.
  - `controllers/`: Nơi chứa toàn bộ logic xử lý (Thêm/Sửa/Xóa sản phẩm, Đăng nhập, Gửi tin nhắn...).
- **Xác thực (Auth):** Sử dụng `jsonwebtoken` (JWT). Khi đăng nhập thành công, server cấp 1 token. Các API yêu cầu quyền đăng nhập sẽ đi qua `auth.middleware.js` để giải mã token và xác định User.
- **Upload File:** Middleware `upload.middleware.js` nhận file từ Frontend, sau đó đẩy trực tiếp lên **Cloudinary** để lấy URL lưu vào Database, giúp giảm tải cho server cục bộ.
- **Real-time (Socket.io):** File `utils/socket.js` duy trì kết nối hai chiều. Khi User A gửi tin nhắn, Socket lập tức "bắn" sự kiện (emit) sang User B mà không cần tải lại trang.

### 2.3. Chi tiết hoạt động của Frontend
- **Công nghệ lõi:** Khởi tạo bằng `Vite` kết hợp `React` và `TypeScript`.
- **UI Components:** Xây dựng theo phương pháp Atomic Design, tái sử dụng các component từ thư viện `shadcn/ui` (xây dựng trên nền Radix UI và Tailwind CSS).
- **Quản lý State (Store):** 
  - Thay vì dùng Redux phức tạp, dự án sử dụng **React Context API** (`src/app/store/`). 
  - Ví dụ: `ProductStore.tsx` chứa danh sách sản phẩm. Khi gọi hàm `fetchProducts()`, state `products` được cập nhật, tất cả các trang dùng dữ liệu này (HomePage, ProductDetailPage) sẽ tự động thay đổi.
- **Routing:** Sử dụng `react-router-dom` (file `routes.tsx`) để điều hướng giữa các trang (Home, Login, Profile, Chat, v.v.) mà không làm reload ứng dụng (Single Page Application).

---

## 🚀 3. Hướng dẫn cài đặt và chạy dự án (Local Setup)

Để chạy dự án trên máy tính cá nhân, hãy thực hiện lần lượt các bước sau:

### 3.1. Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/) (Khuyến nghị bản LTS 18.x hoặc mới nhất).
- [MongoDB](https://www.mongodb.com/try/download/community) (Cài đặt MongoDB Compass cục bộ hoặc dùng MongoDB Atlas online).
- [Git](https://git-scm.com/).

### 3.2. Cài đặt và Chạy Backend

1. **Di chuyển vào thư mục Backend:**
   ```bash
   cd backend
   ```

2. **Cài đặt các gói phụ thuộc (Dependencies):**
   ```bash
   npm install
   ```

3. **Thiết lập biến môi trường:**
   Tạo một file có tên `.env` ở thư mục gốc của `backend` và điền các thông tin sau:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/hust_marketplace  # Hoặc link MongoDB Atlas của bạn
   JWT_SECRET=your_super_secret_jwt_key
   
   # Thông tin Cloudinary (Nếu bạn muốn test tính năng upload ảnh)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Khởi chạy Server:**
   ```bash
   npm run dev
   ```
   *Nếu terminal hiện ra dòng `Server is running on port 5000` và `Connected to MongoDB`, bạn đã cấu hình Backend thành công.*

### 3.3. Cài đặt và Chạy Frontend

1. **Mở một cửa sổ Terminal mới** và di chuyển vào thư mục Frontend:
   ```bash
   cd frontend
   ```

2. **Cài đặt các gói phụ thuộc:**
   *(Dự án đang cấu hình dùng npm, bạn có thể dùng npm hoặc pnpm)*
   ```bash
   npm install
   ```

3. **Cấu hình môi trường (Không bắt buộc nếu Backend chạy ở cổng 5000):**
   Frontend sử dụng proxy trong `vite.config.ts` để trỏ các request `/api` về `http://localhost:5000`.

4. **Khởi chạy Web App:**
   ```bash
   npm run dev
   ```
   *Terminal sẽ cung cấp một đường link (ví dụ: `http://localhost:5173`). Hãy click vào đó để trải nghiệm ứng dụng trên trình duyệt.*

---

## 🛠️ 4. Một số lệnh hữu ích khác

**Backend - Chạy các script để Seed Database (Thêm dữ liệu mẫu):**
Nếu bạn muốn có dữ liệu để test ngay, trong thư mục `backend` hãy chạy:
```bash
node src/scripts/seedCategories.js
node src/scripts/seedProducts.js
```

---

*Cảm ơn bạn đã quan tâm đến HUST Marketplace! Nếu gặp bất kỳ vấn đề nào trong quá trình cài đặt, hãy tạo Issue hoặc liên hệ với nhóm phát triển.*