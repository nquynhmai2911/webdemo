@echo off
chcp 65001 >nul
title Khởi động WebDemo Backend Port 2911

echo ========================================================
echo   KHỞI ĐỘNG HỆ THỐNG WEBDEMO - PORT 2911
echo ========================================================
echo.

:: 1. Tắt tiến trình iisexpress cũ nếu đang chạy
echo [1/3] Đóng các tiến trình IIS Express cũ...
taskkill /F /IM iisexpress.exe >nul 2>&1

:: 2. Đảm bảo junction ASCII tồn tại
if not exist "D:\WebDemo_App" (
    echo [2/3] Khởi tạo đường dẫn ASCII D:\WebDemo_App...
    powershell -Command "New-Item -ItemType Junction -Path 'D:\WebDemo_App' -Target 'D:\Lập trình web\WebDemo'" >nul 2>&1
) else (
    echo [2/3] Đường dẫn ASCII D:\WebDemo_App đã sẵn sàng.
)

:: 3. Khởi động IIS Express trên port 2911
echo [3/3] Đang khởi động IIS Express trên http://localhost:2911 ...
echo.
echo ========================================================
echo   SERVER ĐANG CHẠY TẠI: http://localhost:2911
echo   - Trang đăng nhập:  http://localhost:2911/login.html
echo   - Trang quản trị:   http://localhost:2911/admin.html
echo   - Trang nhân viên:  http://localhost:2911/staff.html
echo.
echo   * Giữ cửa sổ này mở trong khi sử dụng ứng dụng.
echo   * Nhấn Ctrl + C để dừng server.
echo ========================================================
echo.

:: Mở trang đăng nhập trên trình duyệt mặc định
start http://localhost:2911/login.html

:: Chạy IIS Express
"C:\Program Files\IIS Express\iisexpress.exe" /path:"D:\WebDemo_App\WebDemo\WebDemo" /port:2911 /clr:v4.0
pause
