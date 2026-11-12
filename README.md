# 🛍️ SuperStore - Hệ Thống Website Thương Mại Điện Tử & Quản Trị Bán Hàng

Dự án Website thương mại điện tử hoàn chỉnh theo mô hình **ASP.NET MVC (.NET Framework 4.8) RESTful Web API** kết hợp **Modern Responsive Frontend (HTML5, TailwindCSS, FontAwesome, JavaScript Fetch API)** và **Microsoft SQL Server**.

---

## 📌 Tính Năng Nổi Bật

### 1. Phía Khách Hàng (Storefront)
* Xem danh mục sản phẩm, banner khuyến mãi động từ CSDL.
* **Mã giảm giá & Voucher hôm nay**: Tải động từ bảng `Coupons`, hỗ trợ sao chép mã 1-click.
* **Thẻ nhãn sản phẩm (Product Tags)**: *Flash Sale -50%*, *Bán chạy*, *Freeship Xtra*, *Hàng mới về*.
* Hiển thị giá niêm yết gạch ngang + phần trăm giảm giá.
* Số sao đánh giá ⭐ trung bình và số lượng đã bán (*Social Proof*).
* **Bộ chọn màu trực quan (Color Hex Swatches)** dựa trên mã màu HEX từ CSDL.
* Xem chi tiết sản phẩm, xuất xứ, thời hạn bảo hành.
* Bộ lọc theo khoảng giá, tìm kiếm thông minh và sắp xếp đa tiêu chí.
* Giỏ hàng, mua ngay và danh sách yêu thích (Wishlist ❤️).

### 2. Phía Quản Trị & Nhân Viên (Admin & Staff Portal)
* **Dashboard Thống kê**: Doanh thu, số lượng đơn hàng, biểu đồ tăng trưởng.
* **Quản lý Sản phẩm & Biến thể**: Thêm/sửa/xóa sản phẩm, đa biến thể màu sắc, size, giá bán, tồn kho.
* **Quản lý Đơn hàng**: Cập nhật trạng thái đơn (Chờ xử lý, Đang giao, Đã giao, Đã hủy), theo dõi mã vận đơn và đơn vị vận chuyển.
* **Quản lý Khách hàng & Thành viên VIP**: Điểm tích lũy, phân hạng thành viên.
* **Quản lý Voucher (Coupons)** và các yêu cầu đổi trả / khiếu nại.
* Phân quyền tài khoản theo vai trò (Role-based Authorization: Admin, Staff, Customer).

---

## 🗄️ Cấu Trúc Cơ Sở Dữ Liệu (21 Bảng Chuẩn Hóa 3NF)

* **Bảng Trung Gian (Many-to-Many)**:
  * `Product_Tags`: Liên kết Sản phẩm & Thẻ nhãn khuyến mãi.
  * `Order_Coupons`: Lưu lịch sử áp dụng voucher vào đơn hàng.
  * `Wishlists`: Danh sách sản phẩm yêu thích của khách hàng.
  * `Store_Inventory`: Quản lý tồn kho theo Chi nhánh & Biến thể.
  * `Order_Details`: Chi tiết biến thể sản phẩm trong đơn hàng.
* **Bảng Nghiệp Vụ**:
  * `Products`, `Product_Variants`, `Categories`, `Brands`, `Tags`, `Coupons`, `Product_Images`, `Product_Reviews`.
  * `Orders`, `Order_Returns`, `Support_Tickets`.
  * `Users`, `Roles`, `Customers`, `Customer_Addresses`, `Stores`.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt Cơ sở dữ liệu (SQL Server)
1. Mở **SQL Server Management Studio (SSMS)** và kết nối tới `.\SQLEXPRESS` (hoặc localhost).
2. Mở file `WebDemo_Full_Database.sql` và nhấn **Execute (F5)** để tạo toàn bộ 21 bảng cùng dữ liệu mẫu hoàn chỉnh.

### 2. Cấu hình Chuỗi Kết Nối (Connection String)
Kiểm tra chuỗi kết nối `WebDemoEntities2` trong file `Web.config`:
```xml
<connectionStrings>
  <add name="WebDemoEntities2" 
       connectionString="metadata=res://*/Models.Model1.csdl|res://*/Models.Model1.ssdl|res://*/Models.Model1.msl;provider=System.Data.SqlClient;provider connection string=&quot;data source=.\SQLEXPRESS;initial catalog=WebDemo;integrated security=True;trustservercertificate=True;MultipleActiveResultSets=True;App=EntityFramework&quot;" 
       providerName="System.Data.EntityClient" />
</connectionStrings>
```

### 3. Chạy Ứng Dụng
* **Cách 1 (Nhanh nhất)**: Nhấp đúp vào file `start_server_port_2911.bat` để khởi động IIS Express trên cổng 2911.
* **Cách 2 (Visual Studio)**: Mở file `WebDemo.sln` bằng Visual Studio 2022/2026, chọn project `WebDemo` và nhấn **F5** (hoặc `Ctrl + F5`).

---

## 🔑 Tài Khoản Đăng Nhập Mẫu

| Tài khoản | Mật khẩu | Vai trò | Quyền hạn |
| :--- | :---: | :---: | :--- |
| `admin` | `123` | **Admin** | Toàn quyền quản trị hệ thống, sản phẩm, doanh thu |
| `staff` | `123` | **Staff** | Quản lý bán hàng, xác nhận đơn hàng, xử lý tồn kho |
| `quanly` | `123` | **Manager** | Báo cáo, thống kê và quản lý chi nhánh |
| `Myy` | `123` | **Customer** | Khách hàng mua sắm, tích điểm, đánh giá sản phẩm |
