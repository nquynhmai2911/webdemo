@echo off
chcp 65001 >nul
title Khởi động Hệ thống SuperStore (WebDemo) - Port 2911

echo ==============================================================================
echo              HỆ THỐNG WEBSITE THƯƠNG MẠI ĐIỆN TỬ SUPERSTORE
echo                    KHỞI ĐỘNG NHANH CHO GIẢNG VIÊN / NGƯỜI DÙNG
echo ==============================================================================
echo.

:: 1. Tắt tiến trình IIS Express cũ nếu đang chạy để giải phóng port 2911
echo [1/3] Đang kiểm tra và giải phóng cổng 2911...
taskkill /F /IM iisexpress.exe >nul 2>&1

:: 2. Xác định thư mục ứng dụng động (Tương thích mọi ổ đĩa C, D, E...)
set "ROOT_DIR=%~dp0"
set "APP_PATH=%ROOT_DIR%WebDemo\WebDemo"

:: Tạo Junction trong thư mục TEMP của Windows để tránh lỗi đường dẫn tiếng Việt
set "JUNCTION_PATH=%TEMP%\WebDemo_App"
if exist "%JUNCTION_PATH%" (
    rmdir "%JUNCTION_PATH%" >nul 2>&1
)
powershell -NoProfile -Command "New-Item -ItemType Junction -Path '%JUNCTION_PATH%' -Target '%APP_PATH%' -Force" >nul 2>&1

set "FINAL_PATH=%JUNCTION_PATH%"
if not exist "%JUNCTION_PATH%" (
    set "FINAL_PATH=%APP_PATH%"
)

:: 3. Tìm đường dẫn IIS Express trên máy tính của người dùng
set "IIS_BIN=C:\Program Files\IIS Express\iisexpress.exe"
if not exist "%IIS_BIN%" (
    set "IIS_BIN=C:\Program Files (x86)\IIS Express\iisexpress.exe"
)

if not exist "%IIS_BIN%" (
    echo [THÔNG BÁO] Máy tính của bạn chưa cài sẵn IIS Express độc lập.
    echo Bạn có thể mở file WebDemo.sln bằng Visual Studio và nhấn F5 để chạy website.
    echo.
    pause
    exit /b 1
)

echo [2/3] Thư mục website: %FINAL_PATH%
echo [3/3] Đang khởi động máy chủ tại: http://localhost:2911 ...
echo.
echo ==============================================================================
echo   MÁY CHỦ ĐANG CHẠY TẠI: http://localhost:2911
echo   * Trang chủ mua sắm (Khách hàng): http://localhost:2911/index.html
echo   * Trang đăng nhập:                http://localhost:2911/login.html
echo   * Trang quản trị (Admin):         http://localhost:2911/admin.html
echo   * Trang nhân viên (Staff):        http://localhost:2911/staff.html
echo.
echo   LƯU Ý:
echo   - Giữ cửa sổ này mở trong suốt quá trình chấm bài / sử dụng website.
echo   - Nhấn Ctrl + C hoặc tắt cửa sổ để dừng máy chủ.
echo ==============================================================================
echo.

:: Tự động mở trình duyệt
start http://localhost:2911/index.html

:: Chạy máy chủ IIS Express
"%IIS_BIN%" /path:"%FINAL_PATH%" /port:2911 /clr:v4.0
pause
