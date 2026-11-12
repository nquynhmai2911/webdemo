// js/auth.js
// API base URL - Backend ASP.NET MVC chạy trên port 2911
window.API_BASE = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');

function setLoginLoading(isLoading) {
    const btn = document.querySelector('#login-form-container button[type="submit"]');
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xác thực...';
    } else {
        btn.disabled = false;
        btn.innerHTML = 'Đăng nhập';
    }
}

function showLoginError(message) {
    const errorMsg = document.getElementById('login-error');
    if (!errorMsg) return;
    errorMsg.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorMsg.classList.remove('hidden');
}

function handleLogin(event) {
    event.preventDefault();
    const userInputs = document.getElementById('username').value.trim();
    const passInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    // Ẩn lỗi cũ, bật loading
    if (errorMsg) errorMsg.classList.add('hidden');
    setLoginLoading(true);

    console.log('[Auth] Đang gọi API:', window.API_BASE + '/Admin/GetUsers');

    // Timeout 15 giây cho ASP.NET MVC / Entity Framework cold-start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(window.API_BASE + '/Admin/GetUsers', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        signal: controller.signal
    })
        .then(res => {
            clearTimeout(timeoutId);
            console.log('[Auth] Response status:', res.status, res.statusText);
            if (!res.ok) throw new Error('HTTP ' + res.status + ' - ' + res.statusText);
            return res.json();
        })
        .then(data => {
            console.log('[Auth] Data từ server:', data);
            setLoginLoading(false);

            if (data.success) {
                const users = data.data;
                const user = users.find(u => u.username === userInputs && u.password === passInput);

                if (user) {
                    const userData = JSON.stringify({
                        username: user.username,
                        role: user.role,
                        fullName: user.fullName
                    });
                    sessionStorage.setItem('currentUser', userData);
                    localStorage.setItem('currentUser', userData);
                    console.log('[Auth] Đăng nhập thành công:', user.role);
                    if (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Quản lý') {
                        window.location.href = 'admin.html';
                    } else if (user.role === 'Staff' || user.role === 'Nhân viên') {
                        window.location.href = 'staff.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    showLoginError('Sai tên đăng nhập hoặc mật khẩu!');
                }
            } else {
                console.error('[Auth] Server trả lỗi:', data.message);
                showLoginError('Lỗi kết nối CSDL: ' + (data.message || 'Không xác định'));
            }
        })
        .catch(err => {
            clearTimeout(timeoutId);
            setLoginLoading(false);
            console.error('[Auth] Fetch lỗi:', err.message);

            // Timeout (AbortError)
            if (err.name === 'AbortError') {
                console.warn('[Auth] Request timeout do cold-start. Thử kiểm tra tài khoản offline dự phòng...');
            }

            // Network error (server chưa chạy)
            const isNetworkError = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
            if (isNetworkError) {
                console.warn('[Auth] Không kết nối được cổng 2911. Thử kiểm tra tài khoản offline dự phòng...');
            }

            // Fallback khi DB offline nhưng server vẫn lỗi khác
            const fallbackUsers = [
                { username: 'admin', password: '123', role: 'Admin', fullName: 'Quản trị viên' },
                { username: 'quanly', password: '123', role: 'Manager', fullName: 'Quản lý cửa hàng' },
                { username: 'staff', password: '123', role: 'Staff', fullName: 'Nhân viên bán hàng' },
                { username: 'nhanvien', password: '123', role: 'Staff', fullName: 'Nhân viên bán hàng' },
                { username: 'khachhang', password: '123', role: 'Customer', fullName: 'Khách hàng VIP' }
            ];
            const user = fallbackUsers.find(u => u.username === userInputs && u.password === passInput);
            if (user) {
                sessionStorage.setItem('currentUser', JSON.stringify({
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName
                }));
                if (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Quản lý') {
                    window.location.href = 'admin.html';
                } else if (user.role === 'Staff' || user.role === 'Nhân viên') {
                    window.location.href = 'staff.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                showLoginError('Sai tên đăng nhập hoặc mật khẩu!');
            }
        });
}

function handleRegister(event) {
    event.preventDefault();
    const fullName = document.getElementById('reg-fullname').value;
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value; // 'Customer' or 'Staff'

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    formData.append('password', pass);
    formData.append('roleName', role);

    fetch(window.API_BASE + '/Admin/SaveUser', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(data => {
        if (data.success) {
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            toggleAuthMode();
        } else {
            alert('Lỗi: ' + data.message);
        }
    })
    .catch(err => alert('Lỗi gọi API (' + err.message + '). Backend đang chạy trên http://localhost:2911?'));
}

function toggleAuthMode() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const title = document.getElementById('auth-title');
    
    if (forgotForm) forgotForm.classList.add('hidden');

    if (loginForm.classList.contains('hidden')) {
        // Show Login
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        if (title) title.innerText = "Đăng nhập hệ thống";
    } else {
        // Show Register
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        if (title) title.innerText = "Tạo tài khoản mới";
    }
}

function toggleForgotMode() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const title = document.getElementById('auth-title');

    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.remove('hidden');
    if (title) title.innerText = "Khôi phục mật khẩu";
}

function showLoginForm() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const forgotForm = document.getElementById('forgot-form-container');
    const title = document.getElementById('auth-title');

    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (forgotForm) forgotForm.classList.add('hidden');
    if (title) title.innerText = "Đăng nhập hệ thống";
}

function handleForgotPassword(event) {
    event.preventDefault();
    const identifier = document.getElementById('forgot-identifier').value.trim();
    const newPass = document.getElementById('forgot-newpassword').value;
    const confirmPass = document.getElementById('forgot-confirmpassword').value;

    if (!identifier) {
        alert('Vui lòng nhập tên đăng nhập, email hoặc số điện thoại!');
        return;
    }
    if (newPass.length < 3) {
        alert('Mật khẩu mới phải có ít nhất 3 ký tự!');
        return;
    }
    if (newPass !== confirmPass) {
        alert('Mật khẩu xác nhận không khớp! Vui lòng nhập lại.');
        return;
    }

    const formData = new FormData();
    formData.append('username', identifier);
    formData.append('newPassword', newPass);

    fetch(window.API_BASE + '/Admin/ForgotPassword', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('🎉 ' + data.message + '\nVui lòng đăng nhập với mật khẩu mới vừa tạo.');
            showLoginForm();
            const usernameInput = document.getElementById('username');
            if (usernameInput) usernameInput.value = identifier;
            const passwordInput = document.getElementById('password');
            if (passwordInput) passwordInput.value = newPass;
        } else {
            alert('❌ ' + data.message);
        }
    })
    .catch(err => {
        alert('Lỗi kết nối máy chủ: ' + err.message);
    });
}

// Handle Logout
function logout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Check Role Access (for protected pages)
function checkAccess(allowedRoles) {
    let currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (!currentUserStr) {
        // Mặc định tự động thiết lập quyền Admin trong môi trường phát triển
        const defaultUser = { username: 'admin', role: 'Admin', fullName: 'Quản trị viên' };
        currentUserStr = JSON.stringify(defaultUser);
        sessionStorage.setItem('currentUser', currentUserStr);
        localStorage.setItem('currentUser', currentUserStr);
    }

    const currentUser = JSON.parse(currentUserStr);
    
    // Kiểm tra quyền
    let hasAccess = false;
    if (!allowedRoles || allowedRoles.length === 0) {
        hasAccess = true;
    } else {
        if (allowedRoles.includes(currentUser.role)) {
            hasAccess = true;
        }
        // Manager và Admin đều có quyền quản trị nếu yêu cầu Admin hoặc Manager
        if ((currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Quản lý') &&
            (allowedRoles.includes('Admin') || allowedRoles.includes('Manager') || allowedRoles.includes('Quản lý'))) {
            hasAccess = true;
        }
    }

    if (!hasAccess) {
        alert('Bạn không có quyền truy cập trang này!');
        if (currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Quản lý') {
            window.location.href = 'admin.html';
        } else if (currentUser.role === 'Staff' || currentUser.role === 'Nhân viên') {
            window.location.href = 'staff.html';
        } else {
            window.location.href = 'index.html';
        }
        return null;
    }

    return currentUser;
}

// Toggle User Dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('opacity-0');
        dropdown.classList.toggle('invisible');
        dropdown.classList.toggle('scale-95');
    }
}

// Update UI with User Info (for all pages)
function updateUserInfoUI() {
    const currentUserStr = sessionStorage.getItem('currentUser');
    const userActionContainer = document.getElementById('user-action-container');
    const adminProfileName = document.getElementById('admin-profile-name');
    const adminProfileRole = document.getElementById('admin-profile-role');

    if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        
        if (userActionContainer) {
            const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Quản lý';
            const isStaff = currentUser.role === 'Staff' || currentUser.role === 'Nhân viên';

            userActionContainer.innerHTML = `
                <div class="relative cursor-pointer" onclick="toggleUserDropdown()">
                    <div class="flex items-center gap-2 text-gray-700">
                        <i class="far fa-user-circle text-xl text-brand-orange"></i>
                        <span class="text-sm font-semibold hidden sm:block">${currentUser.fullName}</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400"></i>
                    </div>
                    <div id="user-dropdown-menu" class="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl py-2 opacity-0 invisible transition-all duration-200 border border-gray-100 z-[9999] origin-top-right transform scale-95" onclick="event.stopPropagation()">
                        <div class="px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                            <p class="text-xs text-gray-500">Đăng nhập với tư cách</p>
                            <p class="text-sm font-bold text-gray-800 truncate">${currentUser.fullName}</p>
                            <span class="inline-block mt-0.5 text-[10px] bg-orange-100 text-brand-orange px-2 py-0.5 rounded-full font-semibold">${currentUser.role || 'Customer'}</span>
                        </div>
                        ${isManagerOrAdmin ? `<a href="admin.html" class="block px-4 py-2.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange font-medium"><i class="fas fa-shield-alt w-5 text-purple-600"></i> Trang Quản trị (Admin)</a>` : ''}
                        ${isStaff ? `<a href="staff.html" class="block px-4 py-2.5 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange font-medium"><i class="fas fa-user-tie w-5 text-blue-600"></i> Trang Nhân viên (Staff)</a>` : ''}
                        <a href="javascript:void(0)" onclick="openCustomerProfileModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-user-edit w-5 text-brand-orange"></i> Cập nhật hồ sơ</a>
                        <a href="javascript:void(0)" onclick="openAddressBookModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-map-marked-alt w-5 text-emerald-600"></i> Sổ địa chỉ nhận hàng</a>
                        <a href="javascript:void(0)" onclick="openWishlistModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-heart w-5 text-rose-500"></i> Danh sách yêu thích</a>
                        <a href="javascript:void(0)" onclick="openMyOrdersModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-box w-5 text-amber-500"></i> Đơn hàng của tôi</a>
                        <a href="javascript:void(0)" onclick="openReturnOrderModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-undo-alt w-5 text-indigo-500"></i> Yêu cầu Đổi / Trả / Hoàn tiền</a>
                        <a href="javascript:void(0)" onclick="openSupportModal(); toggleUserDropdown()" class="block px-4 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-brand-orange transition-colors"><i class="fas fa-headset w-5 text-teal-600"></i> Khiếu nại / Hỗ trợ 24/7</a>
                        <hr class="my-1 border-gray-100">
                        <button onclick="logout()" class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"><i class="fas fa-sign-out-alt w-5"></i> Đăng xuất</button>
                    </div>
                </div>`;
        }
        
        if (adminProfileName) adminProfileName.innerText = currentUser.fullName;
        if (adminProfileRole) {
            let roleLabel = currentUser.role;
            if (roleLabel === 'Manager') roleLabel = 'Quản lý (Manager)';
            else if (roleLabel === 'Staff') roleLabel = 'Nhân viên (Staff)';
            else if (roleLabel === 'Customer') roleLabel = 'Khách hàng (Customer)';
            adminProfileRole.innerText = roleLabel;
        }
    }
}
