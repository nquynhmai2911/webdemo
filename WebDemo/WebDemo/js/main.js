// js/main.js

// --- UI Utilities ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform translate-y-10 opacity-0 transition-all duration-300`;
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="text-sm font-medium">${message}</span>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Cart State Management ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
}

function updateCartBadge() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countElement.innerText = totalItems;
        if(totalItems > 0) {
            countElement.classList.remove('hidden');
        } else {
            countElement.classList.add('hidden');
        }
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (sidebar.classList.contains('translate-x-full')) {
        // Open
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        renderCart();
    } else {
        // Close
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<div class="text-center text-gray-500 mt-10">Giỏ hàng đang trống.</div>';
        if(cartTotal) cartTotal.innerText = '0đ';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        html += `
            <div class="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-800 line-clamp-1">${item.name}</h4>
                    <div class="text-brand-orange text-sm font-bold mt-1">${formatCurrency(item.price)}</div>
                    
                    <div class="flex items-center gap-3 mt-2">
                        <button onclick="updateQuantity(${index}, -1)" class="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">-</button>
                        <span class="text-sm font-medium w-4 text-center">${item.quantity}</span>
                        <button onclick="updateQuantity(${index}, 1)" class="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 p-2">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    });

    cartContainer.innerHTML = html;
    if(cartTotal) cartTotal.innerText = formatCurrency(total);
}

function updateQuantity(index, change) {
    if (cart[index].quantity + change > 0) {
        cart[index].quantity += change;
    } else {
        cart.splice(index, 1);
    }
    saveCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
}

// =========================================================================
// CHECKOUT & ĐẶT HÀNG (ROLE KHÁCH HÀNG)
// =========================================================================

function handleCheckout() {
    if (!cart || cart.length === 0) {
        showToast('Giỏ hàng đang trống! Vui lòng chọn sản phẩm.', 'error');
        return;
    }

    // Đóng drawer giỏ hàng
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && !sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.add('translate-x-full');
        if (overlay) overlay.classList.add('opacity-0');
        setTimeout(() => { if (overlay) overlay.classList.add('hidden'); }, 300);
    }

    // 1. Render danh sách sản phẩm trong đơn
    const productsContainer = document.getElementById('checkout-products-list');
    let subtotal = 0;
    let productsHtml = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        productsHtml += `
            <div class="flex items-center gap-3 py-2.5">
                <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}" class="w-12 h-12 object-cover rounded-xl border border-gray-100 shadow-sm shrink-0">
                <div class="flex-1 min-w-0">
                    <h5 class="text-xs font-semibold text-gray-800 truncate" title="${item.name}">${item.name}</h5>
                    <div class="text-[11px] text-gray-500 mt-0.5">${formatCurrency(item.price)} &times; <strong class="text-gray-700">${item.quantity}</strong></div>
                </div>
                <div class="text-xs font-bold text-gray-800 text-right shrink-0">
                    ${formatCurrency(itemTotal)}
                </div>
            </div>
        `;
    });

    if (productsContainer) productsContainer.innerHTML = productsHtml;

    // 2. Tính toán tiền hàng & phí ship ban đầu
    currentShippingMethod = 'standard';
    recalculateCheckoutTotal();
    const elItemsCount = document.getElementById('checkout-items-count');
    if (elItemsCount) elItemsCount.innerText = `${cart.reduce((sum, i) => sum + i.quantity, 0)} sản phẩm`;

    // 3. Tự động điền thông tin tài khoản Khách hàng & Tải sổ địa chỉ đã lưu
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const userBanner = document.getElementById('checkout-user-banner');
    const fullnameInput = document.getElementById('checkout-fullname');
    const emailInput = document.getElementById('checkout-email');
    const phoneInput = document.getElementById('checkout-phone');

    if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        if (fullnameInput && !fullnameInput.value) fullnameInput.value = user.fullName || user.username || '';
        if (emailInput && !emailInput.value) emailInput.value = user.email || (user.username + '@gmail.com');
        if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;

        if (userBanner) {
            userBanner.innerHTML = `
                <div class="bg-orange-50/80 border border-orange-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-orange">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-user-circle text-base"></i>
                        <span>Tài khoản Khách hàng: <strong>${user.fullName || user.username}</strong> (@${user.username})</span>
                    </div>
                    <span class="bg-white text-brand-orange px-2.5 py-0.5 rounded-full border border-orange-200 text-[10px] font-bold shadow-sm">
                        Đang đăng nhập
                    </span>
                </div>
            `;
        }
        // Tải sổ địa chỉ để khách hàng chọn nhanh
        fetchCustomerAddresses();
    } else {
        if (userBanner) {
            userBanner.innerHTML = `
                <div class="bg-blue-50/80 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-700">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-info-circle text-base"></i>
                        <span>Bạn đang mua hàng nhanh với tư cách Khách.</span>
                    </div>
                    <a href="login.html" class="font-bold underline hover:text-blue-900 transition-colors">Đăng nhập tài khoản</a>
                </div>
            `;
        }
    }

    // 4. Mở modal xác nhận thanh toán
    const modal = document.getElementById('checkout-modal');
    const content = document.getElementById('checkout-modal-content');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    const content = document.getElementById('checkout-modal-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Quản lý Phương thức vận chuyển (Role Khách hàng: Chọn phương thức vận chuyển)
let currentShippingMethod = 'standard';

function switchShippingMethod(method) {
    currentShippingMethod = method;
    const labelStd = document.getElementById('label-ship-standard');
    const labelExp = document.getElementById('label-ship-express');

    if (method === 'standard') {
        if (labelStd) labelStd.className = 'relative flex items-center p-3 border-2 border-brand-orange bg-orange-50/50 rounded-xl cursor-pointer transition-all';
        if (labelExp) labelExp.className = 'relative flex items-center p-3 border border-gray-200 bg-white rounded-xl cursor-pointer transition-all hover:bg-gray-50';
    } else {
        if (labelExp) labelExp.className = 'relative flex items-center p-3 border-2 border-brand-orange bg-orange-50/50 rounded-xl cursor-pointer transition-all';
        if (labelStd) labelStd.className = 'relative flex items-center p-3 border border-gray-200 bg-white rounded-xl cursor-pointer transition-all hover:bg-gray-50';
    }

    recalculateCheckoutTotal();
}

function recalculateCheckoutTotal() {
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let shippingFee = 0;
    if (currentShippingMethod === 'express') {
        shippingFee = 50000;
    } else {
        shippingFee = subtotal >= 500000 ? 0 : 30000;
    }

    const discount = 0;
    const grandTotal = subtotal + shippingFee - discount;

    const elSubtotal = document.getElementById('checkout-subtotal');
    const elShipping = document.getElementById('checkout-shipping');
    const elDiscount = document.getElementById('checkout-discount');
    const elGrandtotal = document.getElementById('checkout-grandtotal');

    if (elSubtotal) elSubtotal.innerText = formatCurrency(subtotal);
    if (elShipping) elShipping.innerText = (currentShippingMethod === 'standard' && shippingFee === 0) ? 'Miễn phí (Đơn >= 500k)' : formatCurrency(shippingFee);
    if (elDiscount) elDiscount.innerText = formatCurrency(discount);
    if (elGrandtotal) elGrandtotal.innerText = formatCurrency(grandTotal);
}

function switchPaymentMethod(method) {
    const labelCod = document.getElementById('label-pay-cod');
    const labelBanking = document.getElementById('label-pay-banking');
    const bankingBox = document.getElementById('checkout-banking-box');

    if (method === 'cod') {
        if (labelCod) labelCod.className = 'relative flex items-center p-3.5 border-2 border-brand-orange bg-orange-50/50 rounded-xl cursor-pointer transition-all';
        if (labelBanking) labelBanking.className = 'relative flex items-center p-3.5 border border-gray-200 bg-white rounded-xl cursor-pointer transition-all hover:bg-gray-50';
        if (bankingBox) bankingBox.classList.add('hidden');
    } else {
        if (labelBanking) labelBanking.className = 'relative flex items-center p-3.5 border-2 border-brand-orange bg-orange-50/50 rounded-xl cursor-pointer transition-all';
        if (labelCod) labelCod.className = 'relative flex items-center p-3.5 border border-gray-200 bg-white rounded-xl cursor-pointer transition-all hover:bg-gray-50';
        if (bankingBox) bankingBox.classList.remove('hidden');
    }
}

function submitCheckoutOrder() {
    if (!cart || cart.length === 0) {
        showToast('Giỏ hàng trống!', 'error');
        return;
    }

    const fullNameInput = document.getElementById('checkout-fullname');
    const phoneInput = document.getElementById('checkout-phone');
    const emailInput = document.getElementById('checkout-email');
    const provinceInput = document.getElementById('checkout-province');
    const districtInput = document.getElementById('checkout-district');
    const wardInput = document.getElementById('checkout-ward');
    const addressInput = document.getElementById('checkout-address');
    const notesInput = document.getElementById('checkout-notes');

    const fullName = fullNameInput ? fullNameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const province = provinceInput ? provinceInput.value.trim() : 'Hà Nội';
    const district = districtInput ? districtInput.value.trim() : '';
    const ward = wardInput ? wardInput.value.trim() : '';
    const addressDetail = addressInput ? addressInput.value.trim() : '';
    const notes = notesInput ? notesInput.value.trim() : '';

    // Validate
    if (!fullName) {
        showToast('Vui lòng nhập họ và tên người nhận!', 'error');
        if (fullNameInput) fullNameInput.focus();
        return;
    }
    if (!phone) {
        showToast('Vui lòng nhập số điện thoại nhận hàng!', 'error');
        if (phoneInput) phoneInput.focus();
        return;
    }
    if (phone.length < 9 || phone.length > 12) {
        showToast('Số điện thoại không hợp lệ (9 - 12 chữ số)!', 'error');
        if (phoneInput) phoneInput.focus();
        return;
    }
    if (!addressDetail) {
        showToast('Vui lòng nhập địa chỉ nhận hàng chi tiết!', 'error');
        if (addressInput) addressInput.focus();
        return;
    }

    // Tính toán lại tổng tiền theo phương thức vận chuyển đã chọn
    let subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let shippingFee = 0;
    if (currentShippingMethod === 'express') {
        shippingFee = 50000;
    } else {
        shippingFee = subtotal >= 500000 ? 0 : 30000;
    }
    const discountAmount = 0;
    const grandTotal = subtotal + shippingFee - discountAmount;

    // Gộp địa chỉ đầy đủ
    let fullAddress = addressDetail;
    if (ward) fullAddress += ', ' + ward;
    if (district) fullAddress += ', ' + district;
    if (province) fullAddress += ', ' + province;
    if (notes) fullAddress += ` (Ghi chú: ${notes})`;

    // Phương thức thanh toán được chọn
    const payRadio = document.querySelector('input[name="checkout_pay_method"]:checked');
    const selectedPayMethod = payRadio ? payRadio.value : 'cod';
    const payMethodName = selectedPayMethod === 'cod' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR qua ngân hàng';

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

    const orderData = {
        username: currentUser ? currentUser.username : null,
        customerId: currentUser ? currentUser.id : null,
        fullName: fullName,
        phone: phone,
        email: email || (phone + '@customer.webdemo.vn'),
        address: fullAddress,
        ward: ward,
        district: district,
        province: province,
        storeId: 1,
        shippingFee: shippingFee,
        discountAmount: discountAmount,
        items: cart.map(item => ({
            variantId: item.variantId || item.id,
            quantity: item.quantity,
            price: item.price
        }))
    };

    // Bật loading trên nút
    const submitBtn = document.getElementById('btn-submit-order');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang xác nhận đặt hàng...';
    }

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');

    fetch(apiBase + '/Admin/CreateOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle text-base"></i><span>XÁC NHẬN ĐẶT HÀNG</span>';
        }

        if (data.success) {
            const finalOrderCode = data.orderCode || ('ORD-' + Date.now());

            // Lưu thông tin người nhận gần nhất vào localStorage
            try {
                localStorage.setItem('lastCustomerPhone', phone);
                localStorage.setItem('lastCustomerName', fullName);
            } catch (e) {}

            // 1. Lưu địa chỉ vào Sổ địa chỉ nếu khách hàng chọn lưu
            const saveAddrCheck = document.getElementById('checkout-save-to-addressbook');
            if (saveAddrCheck && saveAddrCheck.checked && currentUser && currentUser.username) {
                const addrFormData = new FormData();
                addrFormData.append('username', currentUser.username);
                addrFormData.append('receiverName', fullName);
                addrFormData.append('phone', phone);
                addrFormData.append('province', province);
                addrFormData.append('district', district);
                addrFormData.append('ward', ward);
                addrFormData.append('addressLine', addressDetail);
                addrFormData.append('isDefault', false);

                fetch(apiBase + '/Admin/SaveCustomerAddress', {
                    method: 'POST',
                    body: addrFormData,
                    mode: 'cors'
                }).catch(e => console.warn('Auto-save address error:', e));
            }

            // 2. Xóa giỏ hàng
            cart = [];
            saveCart();
            updateCartBadge();

            // 3. Đóng modal checkout
            closeCheckoutModal();

            // 4. Hiển thị thông báo và mở ngay "Đơn hàng của tôi" theo đúng mẫu form
            showToast('Đặt hàng thành công! Mã đơn: ' + finalOrderCode, 'success');
            setTimeout(() => {
                openMyOrdersModal();
            }, 350);
        } else {
            showToast('Lỗi đặt hàng: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle text-base"></i><span>XÁC NHẬN ĐẶT HÀNG</span>';
        }
        console.error('[Checkout] API error:', err);
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

function closeOrderSuccessModal() {
    const modal = document.getElementById('order-success-modal');
    const content = document.getElementById('order-success-modal-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// ĐƠN HÀNG CỦA TÔI (MY ORDERS)
// ==========================================
let cachedMyOrders = [];
let currentMyOrderFilter = 'all';

function getMyOrderStatusBadge(status, text) {
    status = Number(status);
    switch (status) {
        case 1:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Chờ quản lý duyệt
            </span>`;
        case 2:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                <i class="fas fa-check-circle text-blue-600"></i> Quản lý đã duyệt (Đang chuẩn bị)
            </span>`;
        case 3:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <i class="fas fa-shipping-fast text-purple-600"></i> Đang giao hàng
            </span>`;
        case 4:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <i class="fas fa-check-double text-emerald-600"></i> Giao thành công
            </span>`;
        case 5:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <i class="fas fa-times-circle text-rose-600"></i> Đã hủy
            </span>`;
        default:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                ${text || 'Không rõ'}
            </span>`;
    }
}

function formatVND(amount) {
    if (amount === undefined || amount === null) amount = 0;
    const num = Math.round(Number(amount)) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
}

function openMyOrdersModal() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    let currentUser = null;
    if (currentUserStr) {
        try {
            currentUser = JSON.parse(currentUserStr);
        } catch (e) {}
    }

    const lastPhone = localStorage.getItem('lastCustomerPhone');
    const lastName = localStorage.getItem('lastCustomerName');

    if (!currentUser && !lastPhone) {
        showToast('Vui lòng đăng nhập để xem đơn hàng của bạn!', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 800);
        return;
    }

    const modal = document.getElementById('my-orders-modal');
    const content = document.getElementById('my-orders-modal-content');
    const nameEl = document.getElementById('my-orders-customer-name');

    if (nameEl) {
        if (currentUser) {
            nameEl.innerText = `${currentUser.fullName || currentUser.username}`;
        } else if (lastName || lastPhone) {
            nameEl.innerText = `${lastName || 'Khách hàng'} (${lastPhone})`;
        }
    }

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }

    fetchMyOrders('all');
}

function closeMyOrdersModal() {
    const modal = document.getElementById('my-orders-modal');
    const content = document.getElementById('my-orders-modal-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function fetchMyOrders(filterStatus = null) {
    if (filterStatus) currentMyOrderFilter = filterStatus;

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    let username = '';
    let fullName = '';
    let phone = localStorage.getItem('lastCustomerPhone') || '';

    if (currentUserStr) {
        try {
            const currentUser = JSON.parse(currentUserStr);
            username = currentUser.username || '';
            fullName = currentUser.fullName || '';
        } catch (e) {}
    } else {
        fullName = localStorage.getItem('lastCustomerName') || '';
    }

    const container = document.getElementById('my-orders-list-container');
    if (container) {
        container.innerHTML = `
            <div class="py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-3 text-gray-800 block"></i>
                <p class="text-xs uppercase tracking-wider text-gray-500">Đang tải danh sách đơn hàng...</p>
            </div>
        `;
    }

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (fullName) params.append('fullName', fullName);
    if (phone) params.append('phone', phone);

    const url = `${apiBase}/Admin/GetCustomerOrders?${params.toString()}`;

    fetch(url, { mode: 'cors' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(res => {
            if (res.success) {
                cachedMyOrders = res.data || [];
                updateMyOrdersCountBadges();
                renderMyOrders(currentMyOrderFilter);
            } else {
                if (container) {
                    container.innerHTML = `
                        <div class="py-10 text-center text-rose-500">
                            <i class="fas fa-exclamation-triangle text-3xl mb-2 block"></i>
                            <p class="text-sm font-bold">${res.message || 'Không thể tải đơn hàng!'}</p>
                        </div>
                    `;
                }
            }
        })
        .catch(err => {
            console.error('[MyOrders] fetch error:', err);
            if (container) {
                container.innerHTML = `
                    <div class="py-10 text-center text-rose-500">
                        <i class="fas fa-exclamation-circle text-3xl mb-2 block"></i>
                        <p class="text-sm font-bold">Lỗi kết nối máy chủ: ${err.message}</p>
                    </div>
                `;
            }
        });
}

function updateMyOrdersCountBadges() {
    const cntAll = cachedMyOrders.length;
    const cnt1 = cachedMyOrders.filter(o => Number(o.orderStatus) === 1).length;
    const cnt2 = cachedMyOrders.filter(o => Number(o.orderStatus) === 2).length;
    const cnt3 = cachedMyOrders.filter(o => Number(o.orderStatus) === 3).length;
    const cnt4 = cachedMyOrders.filter(o => Number(o.orderStatus) === 4).length;
    const cnt5 = cachedMyOrders.filter(o => Number(o.orderStatus) === 5).length;

    const elBadge = document.getElementById('my-orders-count-badge');
    if (elBadge) elBadge.innerText = `${cntAll} đơn`;

    const elAll = document.getElementById('cnt-myorder-all');
    const el1 = document.getElementById('cnt-myorder-1');
    const el2 = document.getElementById('cnt-myorder-2');
    const el3 = document.getElementById('cnt-myorder-3');
    const el4 = document.getElementById('cnt-myorder-4');
    const el5 = document.getElementById('cnt-myorder-5');

    if (elAll) elAll.innerText = cntAll;
    if (el1) el1.innerText = cnt1;
    if (el2) el2.innerText = cnt2;
    if (el3) el3.innerText = cnt3;
    if (el4) el4.innerText = cnt4;
    if (el5) el5.innerText = cnt5;
}

function filterMyOrders(status) {
    currentMyOrderFilter = status;
    document.querySelectorAll('.my-order-tab-btn').forEach(btn => {
        btn.className = 'my-order-tab-btn px-4 py-1.5 text-xs font-medium rounded-full transition-all text-gray-600 hover:bg-gray-100';
    });
    const activeBtn = document.getElementById('tab-myorder-' + status);
    if (activeBtn) {
        activeBtn.className = 'my-order-tab-btn px-4 py-1.5 text-xs font-semibold rounded-full transition-all bg-black text-white';
    }
    renderMyOrders(status);
}

function renderMyOrders(status = 'all') {
    const container = document.getElementById('my-orders-list-container');
    if (!container) return;

    let orders = cachedMyOrders || [];
    if (status !== 'all') {
        const numStatus = Number(status);
        orders = orders.filter(o => Number(o.orderStatus) === numStatus);
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="py-14 text-center text-gray-400 bg-white border border-gray-200 p-8 shadow-sm">
                <div class="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                    <i class="fas fa-box-open"></i>
                </div>
                <h4 class="font-bold text-gray-800 text-base">Không có đơn hàng nào trong mục này!</h4>
                <p class="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Bạn có thể chọn xem tất cả đơn hoặc tiếp tục mua sắm các sản phẩm của SuperStore.</p>
                <div class="mt-4 flex items-center justify-center gap-3">
                    <button type="button" onclick="filterMyOrders('all')" class="px-4 py-2 border border-gray-300 hover:border-black hover:bg-black hover:text-white text-xs font-bold uppercase transition-all">
                        Xem tất cả đơn
                    </button>
                    <button type="button" onclick="closeMyOrdersModal()" class="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-all">
                        Khám phá sản phẩm
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    orders.forEach(order => {
        const formattedDate = (order.createdAt || '').replace(/-/g, '/');
        const orderStatusText = order.orderStatusText || 'Chờ xác nhận';
        const paymentStatusText = order.paymentStatusText || (order.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán');
        const formattedAmount = formatVND(order.totalAmount);

        // Status badge styling: matches the clean pill in the screenshot
        let statusBadgeClass = 'bg-[#f3f4f6] text-gray-700';
        if (Number(order.orderStatus) === 2) statusBadgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
        else if (Number(order.orderStatus) === 3) statusBadgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';
        else if (Number(order.orderStatus) === 4) statusBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
        else if (Number(order.orderStatus) === 5) statusBadgeClass = 'bg-red-50 text-red-700 border border-red-200';

        html += `
            <div class="bg-white border border-gray-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 md:p-8 mb-6 transition-all hover:border-gray-300">
                <!-- Header: Order Code & Status -->
                <div class="flex items-start justify-between">
                    <div>
                        <div class="text-base md:text-lg font-bold text-gray-900 tracking-tight">${order.orderCode}</div>
                        <div class="text-xs text-gray-500 font-sans mt-1">${formattedDate}</div>
                    </div>
                    <div>
                        <span class="inline-block px-3.5 py-1 ${statusBadgeClass} rounded-full text-xs font-normal">
                            ${orderStatusText}
                        </span>
                    </div>
                </div>

                <!-- Body: Thanh toán & Tổng tiền -->
                <div class="grid grid-cols-2 gap-8 my-6">
                    <div>
                        <div class="text-xs text-gray-400 font-normal mb-1.5">Thanh toán</div>
                        <div class="text-sm md:text-base font-bold text-gray-900">${paymentStatusText}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-400 font-normal mb-1.5">Tổng tiền</div>
                        <div class="text-sm md:text-base font-bold text-gray-900">${formattedAmount}</div>
                    </div>
                </div>

                <!-- Footer: XEM CHI TIẾT, HỦY ĐƠN & XÓA ĐƠN button -->
                <div class="pt-2 flex items-center justify-between flex-wrap gap-2">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <button type="button" onclick="openCustomerOrderDetail(${order.orderId})" class="border border-gray-400 hover:border-black hover:bg-black hover:text-white text-gray-900 text-xs font-semibold uppercase tracking-wider px-4 py-2 transition-all">
                            XEM CHI TIẾT
                        </button>
                        ${Number(order.orderStatus) === 1 ? `
                            <button type="button" onclick="cancelCustomerOrder(${order.orderId}, '${order.orderCode}')" class="border border-amber-400 bg-amber-50 hover:border-amber-600 hover:bg-amber-600 hover:text-white text-amber-700 text-xs font-semibold uppercase tracking-wider px-3.5 py-2 transition-all flex items-center gap-1.5" title="Hủy đơn hàng này khi chưa xử lý">
                                <i class="fas fa-ban text-[11px]"></i> HỦY ĐƠN
                            </button>
                        ` : ''}
                        <button type="button" onclick="deleteCustomerOrder(${order.orderId}, '${order.orderCode}')" class="border border-red-300 hover:border-red-600 hover:bg-red-600 hover:text-white text-red-600 text-xs font-semibold uppercase tracking-wider px-3.5 py-2 transition-all flex items-center gap-1.5" title="Xóa đơn hàng này">
                            <i class="far fa-trash-alt text-[11px]"></i> XÓA ĐƠN
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderDeliveryTracker(orderStatus) {
    const trackerContainer = document.getElementById('cod-tracker-steps');
    if (!trackerContainer) return;

    const statusNum = Number(orderStatus);
    if (statusNum === 5) {
        trackerContainer.innerHTML = `
            <div class="w-full py-2 bg-red-50 text-red-700 rounded-xl font-bold flex items-center justify-center gap-2 text-xs">
                <i class="fas fa-times-circle text-base"></i> Đơn hàng này đã bị hủy
            </div>
        `;
        return;
    }

    const steps = [
        { num: 1, title: 'Đã đặt hàng', icon: 'fa-file-invoice' },
        { num: 2, title: 'Đã duyệt / Chuẩn bị', icon: 'fa-box-open' },
        { num: 3, title: 'Đang giao hàng', icon: 'fa-shipping-fast' },
        { num: 4, title: 'Giao thành công', icon: 'fa-check-circle' }
    ];

    let html = '';
    steps.forEach((step, idx) => {
        const isCompleted = statusNum >= step.num;
        const isCurrent = statusNum === step.num;
        const circleClass = isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400';
        const textClass = isCurrent ? 'text-emerald-700 font-bold' : (isCompleted ? 'text-gray-800 font-medium' : 'text-gray-400');

        html += `
            <div class="flex-1 flex flex-col items-center relative z-10">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${circleClass} shadow-sm transition-all mb-1">
                    <i class="fas ${step.icon}"></i>
                </div>
                <span class="text-[10px] ${textClass} text-center leading-tight">${step.title}</span>
            </div>
        `;
    });

    trackerContainer.innerHTML = html;
}

function openCustomerOrderDetail(orderId) {
    const order = cachedMyOrders.find(o => o.orderId === orderId);
    if (!order) {
        showToast('Không tìm thấy thông tin đơn hàng!', 'error');
        return;
    }

    const modal = document.getElementById('customer-order-detail-modal');
    const content = document.getElementById('customer-order-detail-content');

    // Populate data
    const codeEl = document.getElementById('cod-order-code');
    const dateEl = document.getElementById('cod-order-date');
    const statusEl = document.getElementById('cod-order-status');
    const payEl = document.getElementById('cod-payment-status');
    const receiverEl = document.getElementById('cod-receiver-name');
    const phoneEl = document.getElementById('cod-receiver-phone');
    const addrEl = document.getElementById('cod-receiver-address');
    const storeEl = document.getElementById('cod-store-name');
    const subtotalEl = document.getElementById('cod-subtotal');
    const shippingEl = document.getElementById('cod-shipping');
    const discountEl = document.getElementById('cod-discount');
    const grandtotalEl = document.getElementById('cod-grandtotal');
    const itemsListEl = document.getElementById('cod-items-list');
    const reorderBtn = document.getElementById('cod-btn-reorder');

    if (codeEl) codeEl.innerText = '#' + order.orderCode;
    if (dateEl) dateEl.innerText = 'Ngày đặt: ' + (order.createdAt || '').replace(/-/g, '/');

    // Tiến trình giao hàng trực quan
    renderDeliveryTracker(order.orderStatus);

    if (statusEl) {
        statusEl.innerText = order.orderStatusText || 'Chờ xác nhận';
        let cls = 'bg-gray-100 text-gray-700';
        if (Number(order.orderStatus) === 2) cls = 'bg-blue-100 text-blue-800';
        else if (Number(order.orderStatus) === 3) cls = 'bg-amber-100 text-amber-800';
        else if (Number(order.orderStatus) === 4) cls = 'bg-emerald-100 text-emerald-800';
        else if (Number(order.orderStatus) === 5) cls = 'bg-red-100 text-red-800';
        statusEl.className = `inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`;
    }

    if (payEl) payEl.innerText = order.paymentStatusText || (order.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán');
    if (receiverEl) receiverEl.innerText = order.customerName || 'Khách hàng';
    if (phoneEl) phoneEl.innerText = order.customerPhone || 'Chưa cung cấp';
    if (addrEl) addrEl.innerText = order.shippingAddress || 'Nhận tại cửa hàng';
    if (storeEl) storeEl.innerText = order.storeName || 'SuperStore';

    const items = order.items || [];
    const itemsTotal = items.reduce((sum, it) => sum + (it.totalPrice || (it.quantity * it.unitPrice)), 0);
    const shippingFee = order.shippingFee || 0;
    const discount = order.discountAmount || 0;

    if (subtotalEl) subtotalEl.innerText = formatVND(itemsTotal);
    if (shippingEl) shippingEl.innerText = formatVND(shippingFee);
    if (discountEl) discountEl.innerText = discount > 0 ? ('-' + formatVND(discount)) : '0 đ';
    if (grandtotalEl) grandtotalEl.innerText = formatVND(order.totalAmount);

    if (itemsListEl) {
        if (items.length === 0) {
            itemsListEl.innerHTML = '<div class="p-4 text-center text-gray-400 text-xs">Không có thông tin chi tiết sản phẩm</div>';
        } else {
            let itemsHtml = '';
            items.forEach(it => {
                const img = it.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200';
                itemsHtml += `
                    <div class="p-3 bg-white flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <img src="${img}" alt="${it.productName}" class="w-12 h-12 object-cover rounded border border-gray-200 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200'">
                            <div class="min-w-0">
                                <h5 class="font-bold text-gray-900 text-xs truncate max-w-xs">${it.productName}</h5>
                                <div class="text-[11px] text-gray-500 mt-0.5">
                                    <span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">${it.color || 'Tiêu chuẩn'} / ${it.size || 'Freesize'}</span>
                                    ${it.sku ? `<span class="ml-1 text-gray-400 font-mono text-[10px]">(${it.sku})</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="text-right shrink-0 text-xs">
                            <div class="font-bold text-gray-900">${formatVND(it.totalPrice || (it.quantity * it.unitPrice))}</div>
                            <div class="text-[11px] text-gray-400">${formatVND(it.unitPrice)} x ${it.quantity}</div>
                        </div>
                    </div>
                `;
            });
            itemsListEl.innerHTML = itemsHtml;
        }
    }

    if (reorderBtn) {
        reorderBtn.onclick = function() {
            closeCustomerOrderDetailModal();
            reorderMyOrderItems(order.orderId);
        };
    }

    // Nút Hủy đơn (chỉ hiện khi đơn chờ xử lý)
    const cancelBtn = document.getElementById('cod-btn-cancel');
    if (cancelBtn) {
        if (Number(order.orderStatus) === 1) {
            cancelBtn.classList.remove('hidden');
            cancelBtn.onclick = function() {
                cancelCustomerOrder(order.orderId, order.orderCode);
            };
        } else {
            cancelBtn.classList.add('hidden');
        }
    }

    // Nút Yêu cầu đổi trả
    const returnBtn = document.getElementById('cod-btn-return');
    if (returnBtn) {
        returnBtn.onclick = function() {
            closeCustomerOrderDetailModal();
            openReturnOrderModal(order.orderId);
        };
    }

    const deleteBtn = document.getElementById('cod-btn-delete');
    if (deleteBtn) {
        deleteBtn.onclick = function() {
            deleteCustomerOrder(order.orderId, order.orderCode);
        };
    }

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeCustomerOrderDetailModal() {
    const modal = document.getElementById('customer-order-detail-modal');
    const content = document.getElementById('customer-order-detail-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function deleteCustomerOrder(orderId, orderCode) {
    if (!orderId) return;
    const code = orderCode || ('#' + orderId);

    if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng ${code} không?\n\nLưu ý: Đơn hàng sẽ bị xóa hoàn toàn khỏi hệ thống.`)) {
        return;
    }

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');

    fetch(`${apiBase}/Admin/DeleteOrder/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(`Đã xóa đơn hàng ${code} thành công!`, 'success');

            // Xóa khỏi cache local
            cachedMyOrders = cachedMyOrders.filter(o => o.orderId !== orderId);

            // Đóng modal chi tiết nếu đang mở
            closeCustomerOrderDetailModal();

            // Cập nhật lại số lượng và giao diện
            updateMyOrdersCountBadges();
            renderMyOrders(currentMyOrderFilter);
        } else {
            showToast('Không thể xóa đơn: ' + (data.message || 'Lỗi không xác định'), 'error');
        }
    })
    .catch(err => {
        console.error('[DeleteOrder] Error:', err);
        showToast('Lỗi kết nối khi xóa đơn hàng: ' + err.message, 'error');
    });
}

function reorderMyOrderItems(orderId) {
    const order = cachedMyOrders.find(o => o.orderId === orderId);
    if (!order || !order.items || order.items.length === 0) return;

    order.items.forEach(it => {
        cart.push({
            id: it.variantId,
            variantId: it.variantId,
            name: it.productName,
            price: it.unitPrice,
            image: it.image,
            quantity: it.quantity,
            selectedColor: it.color,
            selectedSize: it.size
        });
    });

    saveCart();
    updateCartBadge();
    closeMyOrdersModal();
    openCart();
    showToast(`Đã thêm ${order.items.length} món từ đơn #${order.orderCode} vào giỏ hàng!`, 'success');
}

function cancelCustomerOrder(orderId, orderCode) {
    if (!orderId) return;
    const code = orderCode || ('#' + orderId);
    const reason = prompt(`Vui lòng nhập lý do hủy đơn hàng ${code} (đơn đang ở trạng thái Chờ xác nhận):`, 'Tôi muốn đổi địa chỉ / Thay đổi nhu cầu mua');
    if (reason === null) return; // Khách hủy bỏ thao tác

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('reason', reason.trim() || 'Khách hàng hủy khi chưa xử lý');

    fetch(apiBase + '/Admin/CancelCustomerOrder', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(`Hủy đơn ${code} thành công! Số lượng sản phẩm đã được hoàn về tồn kho.`, 'success');
            closeCustomerOrderDetailModal();
            fetchMyOrders(currentMyOrderFilter);
        } else {
            showToast('Không thể hủy đơn: ' + data.message, 'error');
        }
    })
    .catch(err => {
        showToast('Lỗi khi hủy đơn hàng: ' + err.message, 'error');
    });
}

// =========================================================================
// 1. QUẢN LÝ DANH SÁCH YÊU THÍCH (WISHLIST)
// =========================================================================

function getWishlist() {
    try {
        return JSON.parse(localStorage.getItem('superstore_wishlist')) || [];
    } catch (e) {
        return [];
    }
}

function saveWishlist(list) {
    localStorage.setItem('superstore_wishlist', JSON.stringify(list));
    updateWishlistBadge();
    if (typeof applyProductFilters === 'function') {
        applyProductFilters();
    }
}

function isProductInWishlist(productId) {
    const list = getWishlist();
    return list.some(item => Number(item.id) === Number(productId));
}

function toggleWishlist(productId) {
    let list = getWishlist();
    const idx = list.findIndex(item => Number(item.id) === Number(productId));
    const prod = (typeof activeProducts !== 'undefined' ? activeProducts.find(p => Number(p.id) === Number(productId)) : null);

    if (idx >= 0) {
        list.splice(idx, 1);
        saveWishlist(list);
        showToast('Đã bỏ sản phẩm khỏi danh sách yêu thích', 'success');
    } else {
        if (prod) {
            list.push({
                id: prod.id,
                code: prod.code,
                name: prod.name,
                price: prod.price,
                originalPrice: prod.originalPrice,
                image: prod.image,
                categoryName: prod.categoryName
            });
        } else {
            list.push({ id: productId });
        }
        saveWishlist(list);
        showToast('Đã lưu sản phẩm vào danh sách yêu thích ❤️', 'success');
    }
    renderWishlistModal();
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlist-count');
    if (!badge) return;
    const list = getWishlist();
    badge.innerText = list.length;
    if (list.length > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
}

function openWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    const content = document.getElementById('wishlist-content');
    renderWishlistModal();
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    const content = document.getElementById('wishlist-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function renderWishlistModal() {
    const container = document.getElementById('wishlist-items-container');
    const label = document.getElementById('wishlist-total-label');
    if (!container) return;

    const list = getWishlist();
    if (label) label.innerText = `${list.length} sản phẩm yêu thích`;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-gray-400">
                <i class="far fa-heart text-4xl mb-3 text-rose-300 block"></i>
                <h4 class="font-bold text-gray-700 text-sm">Danh sách yêu thích trống</h4>
                <p class="text-xs text-gray-400 mt-1">Hãy nhấp vào biểu tượng trái tim trên các sản phẩm để lưu lại những món bạn thích!</p>
            </div>
        `;
        return;
    }

    let html = '';
    list.forEach(item => {
        html += `
            <div class="flex items-center gap-4 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 transition-all">
                <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" class="w-16 h-16 object-cover rounded-xl border border-gray-100 shrink-0">
                <div class="flex-1 min-w-0">
                    <span class="text-[10px] text-brand-orange font-bold uppercase">${item.code || ''}</span>
                    <h4 class="text-xs font-bold text-gray-900 truncate" title="${item.name}">${item.name}</h4>
                    <div class="text-sm font-bold text-red-600 mt-0.5">${formatCurrency(item.price || 0)}</div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="addToCart(event, ${item.id}); showToast('Đã chuyển vào giỏ hàng!', 'success');" class="px-3 py-1.5 bg-orange-50 text-brand-orange rounded-xl text-xs font-bold hover:bg-brand-orange hover:text-white transition-all flex items-center gap-1">
                        <i class="fas fa-cart-plus text-xs"></i> <span>Thêm giỏ</span>
                    </button>
                    <button type="button" onclick="toggleWishlist(${item.id})" class="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Bỏ yêu thích">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// =========================================================================
// 2. CẬP NHẬT HỒ SƠ TÀI KHOẢN KHÁCH HÀNG (CUSTOMER PROFILE)
// =========================================================================

function openCustomerProfileModal() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (!currentUserStr) {
        showToast('Vui lòng đăng nhập để xem thông tin hồ sơ!', 'error');
        setTimeout(() => window.location.href = 'login.html', 800);
        return;
    }
    const user = JSON.parse(currentUserStr);

    const modal = document.getElementById('customer-profile-modal');
    const content = document.getElementById('customer-profile-content');

    // Điền dữ liệu cơ bản
    if (document.getElementById('profile-username')) document.getElementById('profile-username').value = user.username || '';
    if (document.getElementById('profile-fullname')) document.getElementById('profile-fullname').value = user.fullName || '';

    // Gọi API lấy hồ sơ chi tiết từ server
    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(`${apiBase}/Admin/GetCustomerProfile?username=${encodeURIComponent(user.username)}`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data) {
            const p = data.data;
            if (p.fullName && document.getElementById('profile-fullname')) document.getElementById('profile-fullname').value = p.fullName;
            if (p.phone && document.getElementById('profile-phone')) document.getElementById('profile-phone').value = p.phone;
            if (p.email && document.getElementById('profile-email')) document.getElementById('profile-email').value = p.email;
            if (p.gender && document.getElementById('profile-gender')) document.getElementById('profile-gender').value = p.gender;
            if (p.dateOfBirth && document.getElementById('profile-dob')) document.getElementById('profile-dob').value = p.dateOfBirth;
        }
    })
    .catch(err => console.warn('GetCustomerProfile error:', err));

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeCustomerProfileModal() {
    const modal = document.getElementById('customer-profile-modal');
    const content = document.getElementById('customer-profile-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function handleSaveCustomerProfile(event) {
    event.preventDefault();
    const username = document.getElementById('profile-username').value;
    const fullName = document.getElementById('profile-fullname').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const gender = document.getElementById('profile-gender').value;
    const dob = document.getElementById('profile-dob').value;
    const password = document.getElementById('profile-password').value;

    const btn = document.getElementById('btn-save-profile');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang lưu...';
    }

    const formData = new FormData();
    formData.append('username', username);
    formData.append('fullName', fullName);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('gender', gender);
    formData.append('dateOfBirth', dob);
    if (password) formData.append('password', password);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/UpdateCustomerProfile', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Lưu thay đổi';
        }
        if (data.success) {
            showToast('Cập nhật hồ sơ tài khoản thành công!', 'success');
            const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (currentUserStr) {
                const user = JSON.parse(currentUserStr);
                user.fullName = fullName;
                user.phone = phone;
                user.email = email;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('currentUser', JSON.stringify(user));
                if (typeof updateUserInfoUI === 'function') updateUserInfoUI();
            }
            closeCustomerProfileModal();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Lưu thay đổi';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

// =========================================================================
// 3. QUẢN LÝ SỔ ĐỊA CHỈ NHẬN HÀNG (ADDRESS BOOK)
// =========================================================================

let cachedAddresses = [];

function openAddressBookModal() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (!currentUserStr) {
        showToast('Vui lòng đăng nhập để quản lý sổ địa chỉ!', 'error');
        setTimeout(() => window.location.href = 'login.html', 800);
        return;
    }
    const modal = document.getElementById('address-book-modal');
    const content = document.getElementById('address-book-content');

    toggleAddAddressForm(false);
    fetchCustomerAddresses();

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeAddressBookModal() {
    const modal = document.getElementById('address-book-modal');
    const content = document.getElementById('address-book-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function toggleAddAddressForm(show = null, editData = null) {
    const box = document.getElementById('address-form-box');
    const title = document.getElementById('address-form-title');
    if (!box) return;

    if (show === null) {
        show = box.classList.contains('hidden');
    }

    if (show) {
        box.classList.remove('hidden');
        if (editData) {
            if (title) title.innerHTML = '<i class="fas fa-edit text-emerald-600"></i> Chỉnh sửa địa chỉ';
            document.getElementById('addr-id').value = editData.addressId || '';
            document.getElementById('addr-receiver').value = editData.receiverName || '';
            document.getElementById('addr-phone').value = editData.phone || '';
            document.getElementById('addr-province').value = editData.province || 'Hà Nội';
            document.getElementById('addr-district').value = editData.district || '';
            document.getElementById('addr-ward').value = editData.ward || '';
            document.getElementById('addr-line').value = editData.addressLine || '';
            document.getElementById('addr-isdefault').checked = !!editData.isDefault;
        } else {
            if (title) title.innerHTML = '<i class="fas fa-plus-circle text-emerald-600"></i> Thêm địa chỉ mới';
            document.getElementById('addr-id').value = '';
            const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            const cur = curStr ? JSON.parse(curStr) : null;
            document.getElementById('addr-receiver').value = cur ? (cur.fullName || '') : '';
            document.getElementById('addr-phone').value = cur ? (cur.phone || '') : '';
            document.getElementById('addr-district').value = '';
            document.getElementById('addr-ward').value = '';
            document.getElementById('addr-line').value = '';
            document.getElementById('addr-isdefault').checked = false;
        }
    } else {
        box.classList.add('hidden');
    }
}

function fetchCustomerAddresses() {
    const container = document.getElementById('address-book-list');
    if (container) container.innerHTML = '<div class="py-8 text-center text-gray-400 text-xs"><i class="fas fa-spinner fa-spin mr-1"></i> Đang tải sổ địa chỉ...</div>';

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = currentUserStr ? JSON.parse(currentUserStr) : null;
    const username = cur ? cur.username : '';

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(`${apiBase}/Admin/GetCustomerAddresses?username=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            cachedAddresses = data.data || [];
            if (container) renderAddressBookList();
            loadSavedAddressesForCheckout();
        } else {
            if (container) container.innerHTML = `<div class="py-6 text-center text-rose-500 text-xs">${data.message || 'Không thể tải địa chỉ!'}</div>`;
        }
    })
    .catch(err => {
        if (container) container.innerHTML = `<div class="py-6 text-center text-rose-500 text-xs">Lỗi kết nối: ${err.message}</div>`;
    });
}

function renderAddressBookList() {
    const container = document.getElementById('address-book-list');
    if (!container) return;

    if (cachedAddresses.length === 0) {
        container.innerHTML = `
            <div class="py-10 text-center text-gray-400">
                <i class="fas fa-map-marker-alt text-3xl mb-2 text-gray-300 block"></i>
                <p class="text-xs font-semibold text-gray-600">Bạn chưa lưu địa chỉ nhận hàng nào</p>
                <p class="text-[11px] text-gray-400 mt-0.5">Nhấp nút "Thêm địa chỉ mới" ở trên để tạo địa chỉ đầu tiên.</p>
            </div>
        `;
        return;
    }

    let html = '';
    cachedAddresses.forEach(addr => {
        const fullAddr = [addr.addressLine, addr.ward, addr.district, addr.province].filter(Boolean).join(', ');
        html += `
            <div class="p-4 bg-white border ${addr.isDefault ? 'border-emerald-400 ring-1 ring-emerald-400/50 bg-emerald-50/20' : 'border-gray-200'} rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-emerald-300 transition-all">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <strong class="text-xs text-gray-900 font-bold">${addr.receiverName}</strong>
                        <span class="text-gray-300">|</span>
                        <span class="text-xs text-gray-600 font-mono">${addr.phone}</span>
                        ${addr.isDefault ? '<span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">Mặc định</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-600">${fullAddr}</p>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                    ${!addr.isDefault ? `
                        <button type="button" onclick="setDefaultCustomerAddress(${addr.addressId})" class="text-[11px] text-emerald-700 hover:underline font-semibold px-2 py-1 bg-emerald-50 rounded-lg">
                            Đặt mặc định
                        </button>
                    ` : ''}
                    <button type="button" onclick='editCustomerAddress(${JSON.stringify(addr).replace(/'/g, "&#39;")})' class="p-2 text-gray-500 hover:text-emerald-600 hover:bg-gray-100 rounded-lg text-xs" title="Sửa địa chỉ">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" onclick="deleteCustomerAddress(${addr.addressId})" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs" title="Xóa địa chỉ">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function handleSaveAddress(event) {
    event.preventDefault();
    const addrId = document.getElementById('addr-id').value;
    const receiver = document.getElementById('addr-receiver').value.trim();
    const phone = document.getElementById('addr-phone').value.trim();
    const province = document.getElementById('addr-province').value;
    const district = document.getElementById('addr-district').value.trim();
    const ward = document.getElementById('addr-ward').value.trim();
    const addressLine = document.getElementById('addr-line').value.trim();
    const isDefault = document.getElementById('addr-isdefault').checked;

    const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = curStr ? JSON.parse(curStr) : null;
    const username = cur ? cur.username : '';

    const formData = new FormData();
    if (addrId) formData.append('addressId', addrId);
    formData.append('username', username);
    formData.append('receiverName', receiver);
    formData.append('phone', phone);
    formData.append('province', province);
    formData.append('district', district);
    formData.append('ward', ward);
    formData.append('addressLine', addressLine);
    formData.append('isDefault', isDefault);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/SaveCustomerAddress', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Lưu địa chỉ thành công!', 'success');
            toggleAddAddressForm(false);
            fetchCustomerAddresses();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => showToast('Lỗi kết nối máy chủ: ' + err.message, 'error'));
}

function editCustomerAddress(addr) {
    toggleAddAddressForm(true, addr);
}

function setDefaultCustomerAddress(addressId) {
    const addr = cachedAddresses.find(a => a.addressId === addressId);
    if (!addr) return;

    const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = curStr ? JSON.parse(curStr) : null;

    const formData = new FormData();
    formData.append('addressId', addressId);
    formData.append('username', cur ? cur.username : '');
    formData.append('receiverName', addr.receiverName);
    formData.append('phone', addr.phone);
    formData.append('province', addr.province || 'Hà Nội');
    formData.append('district', addr.district || '');
    formData.append('ward', addr.ward || '');
    formData.append('addressLine', addr.addressLine);
    formData.append('isDefault', true);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/SaveCustomerAddress', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Đã đặt làm địa chỉ mặc định!', 'success');
            fetchCustomerAddresses();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    });
}

function deleteCustomerAddress(addressId) {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ không?')) return;

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(`${apiBase}/Admin/DeleteCustomerAddress/${addressId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Đã xóa địa chỉ thành công!', 'success');
            fetchCustomerAddresses();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    });
}

function loadSavedAddressesForCheckout() {
    const select = document.getElementById('checkout-saved-addresses');
    const container = document.getElementById('checkout-saved-address-container');
    if (!select || !container) return;

    if (cachedAddresses.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    let opts = '<option value="">-- Chọn địa chỉ đã lưu của bạn --</option>';
    cachedAddresses.forEach(addr => {
        const fullAddr = [addr.addressLine, addr.ward, addr.district, addr.province].filter(Boolean).join(', ');
        opts += `<option value="${addr.addressId}" ${addr.isDefault ? 'selected' : ''}>${addr.receiverName} - ${addr.phone} (${fullAddr})${addr.isDefault ? ' [Mặc định]' : ''}</option>`;
    });
    select.innerHTML = opts;

    const def = cachedAddresses.find(a => a.isDefault);
    if (def) {
        applySavedAddressToCheckout(def.addressId);
    }
}

function applySavedAddressToCheckout(addressId) {
    if (!addressId) return;
    const addr = cachedAddresses.find(a => Number(a.addressId) === Number(addressId));
    if (!addr) return;

    if (document.getElementById('checkout-fullname')) document.getElementById('checkout-fullname').value = addr.receiverName;
    if (document.getElementById('checkout-phone')) document.getElementById('checkout-phone').value = addr.phone;
    if (document.getElementById('checkout-province') && addr.province) document.getElementById('checkout-province').value = addr.province;
    if (document.getElementById('checkout-district')) document.getElementById('checkout-district').value = addr.district || '';
    if (document.getElementById('checkout-ward')) document.getElementById('checkout-ward').value = addr.ward || '';
    if (document.getElementById('checkout-address')) document.getElementById('checkout-address').value = addr.addressLine;

    showToast('Đã chọn địa chỉ: ' + addr.receiverName, 'success');
}

// =========================================================================
// 4. XEM CHI TIẾT SẢN PHẨM & ĐÁNH GIÁ (PRODUCT DETAIL & REVIEWS)
// =========================================================================

let currentDetailProduct = null;
let currentDetailColor = '';
let currentDetailSize = '';
let currentReviewRating = 5;

function openProductDetail(productId) {
    const prod = (typeof activeProducts !== 'undefined' ? activeProducts.find(p => Number(p.id) === Number(productId)) : null);
    if (!prod) {
        showToast('Không tìm thấy thông tin sản phẩm!', 'error');
        return;
    }
    currentDetailProduct = prod;

    const modal = document.getElementById('product-detail-modal');
    const content = document.getElementById('product-detail-content');

    if (document.getElementById('detail-code')) document.getElementById('detail-code').innerText = prod.code || ('SP-' + prod.id);
    if (document.getElementById('detail-category-badge')) document.getElementById('detail-category-badge').innerText = prod.categoryName || 'Sản phẩm';
    if (document.getElementById('detail-name')) document.getElementById('detail-name').innerText = prod.name;
    if (document.getElementById('detail-price')) document.getElementById('detail-price').innerText = formatCurrency(prod.price);
    if (document.getElementById('detail-orig-price')) {
        if (prod.originalPrice && prod.originalPrice > prod.price) {
            document.getElementById('detail-orig-price').style.display = 'inline-block';
            document.getElementById('detail-orig-price').innerText = formatCurrency(prod.originalPrice);
        } else {
            document.getElementById('detail-orig-price').style.display = 'none';
        }
    }
    if (document.getElementById('detail-discount-badge')) {
        if (prod.discount && prod.discount > 0) {
            document.getElementById('detail-discount-badge').style.display = 'inline-block';
            document.getElementById('detail-discount-badge').innerText = `-${prod.discount}%`;
        } else {
            document.getElementById('detail-discount-badge').style.display = 'none';
        }
    }
    if (document.getElementById('detail-image')) document.getElementById('detail-image').src = prod.image;
    if (document.getElementById('detail-stock')) document.getElementById('detail-stock').innerText = prod.totalStock !== undefined ? prod.totalStock : 50;
    if (document.getElementById('detail-qty')) document.getElementById('detail-qty').value = 1;
    if (document.getElementById('detail-description')) {
        const specs = `Xuất xứ: ${prod.origin || 'Chính hãng'} | Bảo hành: ${prod.warrantyMonths || 12} tháng${prod.brandName ? ' | Thương hiệu: ' + prod.brandName : ''}`;
        const descText = prod.shortDescription || prod.description || `Sản phẩm ${prod.name} chính hãng chất lượng cao.`;
        document.getElementById('detail-description').innerHTML = `<p class="font-medium text-brand-orange text-xs mb-1.5"><i class="fas fa-shield-alt mr-1"></i>${specs}</p><p class="text-gray-600">${descText}</p>`;
    }

    updateDetailFavoriteButton();
    renderDetailVariants(prod);
    fetchProductReviews(prod.id);

    const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = curStr ? JSON.parse(curStr) : null;
    const reviewerNameInput = document.getElementById('review-fullname');
    if (reviewerNameInput && cur) {
        reviewerNameInput.value = cur.fullName || cur.username;
    }

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    const content = document.getElementById('product-detail-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function updateDetailFavoriteButton() {
    const btn = document.getElementById('detail-btn-fav');
    if (!btn || !currentDetailProduct) return;
    const isFav = isProductInWishlist(currentDetailProduct.id);
    if (isFav) {
        btn.className = 'absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-rose-500 transition-colors text-base';
        btn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        btn.className = 'absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors text-base';
        btn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

function toggleDetailFavorite() {
    if (!currentDetailProduct) return;
    toggleWishlist(currentDetailProduct.id);
    updateDetailFavoriteButton();
}

function renderDetailVariants(prod) {
    const container = document.getElementById('detail-variants-container');
    if (!container) return;

    const variants = prod.variants || [];
    if (variants.length === 0) {
        currentDetailColor = '';
        currentDetailSize = '';
        container.innerHTML = '';
        return;
    }

    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

    currentDetailColor = colors[0] || '';
    currentDetailSize = sizes[0] || '';

    let html = '';
    if (colors.length > 0) {
        html += `
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Màu sắc: <strong id="selected-color-label" class="text-brand-orange">${currentDetailColor}</strong></label>
                <div class="flex flex-wrap gap-2">
                    ${colors.map(c => `
                        <button type="button" onclick="selectDetailColor('${c}')" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${c === currentDetailColor ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-gray-200 text-gray-700 hover:border-gray-400'}" id="var-color-${c}">
                            ${c}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (sizes.length > 0) {
        html += `
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Kích thước (Size): <strong id="selected-size-label" class="text-brand-orange">${currentDetailSize}</strong></label>
                <div class="flex flex-wrap gap-2">
                    ${sizes.map(s => `
                        <button type="button" onclick="selectDetailSize('${s}')" class="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${s === currentDetailSize ? 'border-brand-orange bg-orange-50 text-brand-orange' : 'border-gray-200 text-gray-700 hover:border-gray-400'}" id="var-size-${s}">
                            ${s}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function selectDetailColor(color) {
    currentDetailColor = color;
    const label = document.getElementById('selected-color-label');
    if (label) label.innerText = color;
    document.querySelectorAll('[id^="var-color-"]').forEach(btn => {
        btn.className = 'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all border-gray-200 text-gray-700 hover:border-gray-400';
    });
    const active = document.getElementById('var-color-' + color);
    if (active) active.className = 'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all border-brand-orange bg-orange-50 text-brand-orange';
}

function selectDetailSize(size) {
    currentDetailSize = size;
    const label = document.getElementById('selected-size-label');
    if (label) label.innerText = size;
    document.querySelectorAll('[id^="var-size-"]').forEach(btn => {
        btn.className = 'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all border-gray-200 text-gray-700 hover:border-gray-400';
    });
    const active = document.getElementById('var-size-' + size);
    if (active) active.className = 'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all border-brand-orange bg-orange-50 text-brand-orange';
}

function adjustDetailQty(delta) {
    const input = document.getElementById('detail-qty');
    if (!input) return;
    let qty = parseInt(input.value) || 1;
    qty = Math.max(1, Math.min(99, qty + delta));
    input.value = qty;
}

function submitDetailAddToCart() {
    if (!currentDetailProduct) return;
    const qty = parseInt(document.getElementById('detail-qty').value) || 1;

    const variants = currentDetailProduct.variants || [];
    const matched = variants.find(v => (!currentDetailColor || v.color === currentDetailColor) && (!currentDetailSize || v.size === currentDetailSize));
    const variantId = matched ? (matched.variantId || matched.id) : (variants[0] ? (variants[0].variantId || variants[0].id) : currentDetailProduct.id);
    const itemPrice = matched && matched.price ? matched.price : currentDetailProduct.price;

    const existing = cart.find(it => it.variantId === variantId);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: currentDetailProduct.id,
            variantId: variantId,
            name: currentDetailProduct.name,
            price: itemPrice,
            image: currentDetailProduct.image,
            quantity: qty,
            selectedColor: currentDetailColor,
            selectedSize: currentDetailSize
        });
    }

    saveCart();
    showToast(`Đã thêm ${qty} x ${currentDetailProduct.name} vào giỏ hàng!`, 'success');
}

function submitDetailBuyNow() {
    submitDetailAddToCart();
    closeProductDetailModal();
    handleCheckout();
}

function setReviewRating(stars) {
    currentReviewRating = stars;
    const labels = {
        1: '1 sao (Rất tệ)',
        2: '2 sao (Không hài lòng)',
        3: '3 sao (Bình thường)',
        4: '4 sao (Hài lòng)',
        5: '5 sao (Rất hài lòng)'
    };
    const label = document.getElementById('review-rating-label');
    if (label) label.innerText = labels[stars] || `${stars} sao`;

    const starIcons = document.querySelectorAll('#review-stars-picker i');
    starIcons.forEach((icon, idx) => {
        if (idx < stars) {
            icon.className = 'fas fa-star text-amber-400';
        } else {
            icon.className = 'far fa-star text-gray-300';
        }
    });
}

function toggleReviewForm(show = null) {
    const box = document.getElementById('product-review-form-box');
    if (!box) return;
    if (show === null) show = box.classList.contains('hidden');
    if (show) box.classList.remove('hidden');
    else box.classList.add('hidden');
}

function fetchProductReviews(productId) {
    const listEl = document.getElementById('product-reviews-list');
    const avgEl = document.getElementById('detail-avg-rating');
    const countEl = document.getElementById('detail-reviews-count');
    if (!listEl) return;

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(`${apiBase}/Admin/GetProductReviews?productId=${productId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success && data.data) {
            const reviews = data.data;
            if (countEl) countEl.innerText = `${reviews.length} đánh giá`;

            if (reviews.length === 0) {
                if (avgEl) avgEl.innerText = '5.0';
                listEl.innerHTML = '<div class="py-4 text-center text-gray-400 text-xs">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên đánh giá!</div>';
                return;
            }

            const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
            if (avgEl) avgEl.innerText = avg;

            let html = '';
            reviews.forEach(r => {
                const starsHtml = Array.from({ length: 5 }, (_, i) => 
                    `<i class="${i < r.rating ? 'fas text-amber-400' : 'far text-gray-300'} fa-star text-xs"></i>`
                ).join('');

                html += `
                    <div class="py-3 space-y-1">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <div class="w-7 h-7 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-xs">
                                    ${(r.fullName || 'K').charAt(0).toUpperCase()}
                                </div>
                                <span class="text-xs font-bold text-gray-800">${r.fullName}</span>
                                <span class="flex gap-0.5">${starsHtml}</span>
                            </div>
                            <span class="text-[10px] text-gray-400">${r.createdAt || ''}</span>
                        </div>
                        <p class="text-xs text-gray-600 pl-9">${r.comment}</p>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }
    })
    .catch(err => console.warn('GetProductReviews error:', err));
}

function submitProductReview() {
    if (!currentDetailProduct) return;
    const nameInput = document.getElementById('review-fullname');
    const commentInput = document.getElementById('review-comment');

    const fullName = nameInput ? nameInput.value.trim() : '';
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!fullName) {
        showToast('Vui lòng nhập họ tên của bạn!', 'error');
        return;
    }
    if (!comment) {
        showToast('Vui lòng nhập nhận xét/bình luận!', 'error');
        return;
    }

    const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = curStr ? JSON.parse(curStr) : null;
    const username = cur ? cur.username : 'khachhang';

    const btn = document.getElementById('btn-submit-review');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang gửi...';
    }

    const formData = new FormData();
    formData.append('productId', currentDetailProduct.id);
    formData.append('username', username);
    formData.append('fullName', fullName);
    formData.append('rating', currentReviewRating);
    formData.append('comment', comment);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/SubmitProductReview', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Gửi đánh giá';
        }
        if (data.success) {
            showToast('Cảm ơn bạn đã gửi đánh giá sản phẩm!', 'success');
            if (commentInput) commentInput.value = '';
            toggleReviewForm(false);
            fetchProductReviews(currentDetailProduct.id);
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Gửi đánh giá';
        }
        showToast('Lỗi gửi đánh giá: ' + err.message, 'error');
    });
}

// =========================================================================
// 5. YÊU CẦU ĐỔI / TRẢ / HOÀN TIỀN (RETURN ORDER)
// =========================================================================

function openReturnOrderModal(preselectedOrderId = null) {
    const modal = document.getElementById('return-order-modal');
    const content = document.getElementById('return-order-content');
    const select = document.getElementById('return-order-select');

    if (select) {
        let opts = '<option value="">-- Chọn đơn hàng cần đổi/trả --</option>';
        if (cachedMyOrders && cachedMyOrders.length > 0) {
            cachedMyOrders.forEach(o => {
                const isSelected = preselectedOrderId && Number(o.orderId) === Number(preselectedOrderId);
                opts += `<option value="${o.orderId}" ${isSelected ? 'selected' : ''}>#${o.orderCode} - ${formatVND(o.totalAmount)} (${o.orderStatusText || 'Đơn hàng'})</option>`;
            });
        }
        select.innerHTML = opts;
    }

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeReturnOrderModal() {
    const modal = document.getElementById('return-order-modal');
    const content = document.getElementById('return-order-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function handleSubmitOrderReturn(event) {
    event.preventDefault();
    const orderId = document.getElementById('return-order-select').value;
    const reason = document.getElementById('return-reason').value;
    const details = document.getElementById('return-details').value.trim();
    const bank = document.getElementById('return-bank').value.trim();
    const account = document.getElementById('return-account').value.trim();

    if (!orderId) {
        showToast('Vui lòng chọn đơn hàng cần đổi/trả!', 'error');
        return;
    }

    const btn = document.getElementById('btn-submit-return');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang gửi...';
    }

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('reason', reason);
    formData.append('details', details);
    formData.append('refundBank', bank);
    formData.append('refundAccount', account);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/SubmitOrderReturn', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi yêu cầu đổi trả';
        }
        if (data.success) {
            showToast('Yêu cầu đổi/trả đã được ghi nhận! Nhân viên CSKH sẽ liên hệ trong 24h.', 'success');
            closeReturnOrderModal();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi yêu cầu đổi trả';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

// =========================================================================
// 6. KHIẾU NẠI & HỖ TRỢ KHÁCH HÀNG 24/7 (CUSTOMER SUPPORT)
// =========================================================================

function openSupportModal() {
    const modal = document.getElementById('customer-support-modal');
    const content = document.getElementById('customer-support-content');

    const curStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const cur = curStr ? JSON.parse(curStr) : null;
    if (cur) {
        if (document.getElementById('support-fullname')) document.getElementById('support-fullname').value = cur.fullName || cur.username;
        if (document.getElementById('support-phone') && cur.phone) document.getElementById('support-phone').value = cur.phone;
        if (document.getElementById('support-email') && cur.email) document.getElementById('support-email').value = cur.email;
    }

    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
            content.classList.add('scale-100');
        }, 10);
    }
}

function closeSupportModal() {
    const modal = document.getElementById('customer-support-modal');
    const content = document.getElementById('customer-support-content');
    if (!modal) return;
    modal.classList.add('opacity-0');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function handleSubmitSupportTicket(event) {
    event.preventDefault();
    const fullName = document.getElementById('support-fullname').value.trim();
    const phone = document.getElementById('support-phone').value.trim();
    const email = document.getElementById('support-email').value.trim();
    const category = document.getElementById('support-category').value;
    const content = document.getElementById('support-content').value.trim();

    const btn = document.getElementById('btn-submit-support');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang gửi...';
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('category', category);
    formData.append('content', content);

    const apiBase = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');
    fetch(apiBase + '/Admin/SubmitSupportTicket', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi phản hồi ngay';
        }
        if (data.success) {
            showToast('Đã gửi phản hồi thành công! Chuyên viên SuperStore sẽ liên hệ hỗ trợ bạn sớm nhất.', 'success');
            document.getElementById('support-content').value = '';
            closeSupportModal();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi phản hồi ngay';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

// Export functions to window
window.formatVND = formatVND;
window.openMyOrdersModal = openMyOrdersModal;
window.closeMyOrdersModal = closeMyOrdersModal;
window.fetchMyOrders = fetchMyOrders;
window.filterMyOrders = filterMyOrders;
window.openCustomerOrderDetail = openCustomerOrderDetail;
window.closeCustomerOrderDetailModal = closeCustomerOrderDetailModal;
window.deleteCustomerOrder = deleteCustomerOrder;
window.reorderMyOrderItems = reorderMyOrderItems;
window.cancelCustomerOrder = cancelCustomerOrder;

// Wishlist exports
window.getWishlist = getWishlist;
window.saveWishlist = saveWishlist;
window.isProductInWishlist = isProductInWishlist;
window.toggleWishlist = toggleWishlist;
window.updateWishlistBadge = updateWishlistBadge;
window.openWishlistModal = openWishlistModal;
window.closeWishlistModal = closeWishlistModal;

// Profile & Address exports
window.openCustomerProfileModal = openCustomerProfileModal;
window.closeCustomerProfileModal = closeCustomerProfileModal;
window.handleSaveCustomerProfile = handleSaveCustomerProfile;
window.openAddressBookModal = openAddressBookModal;
window.closeAddressBookModal = closeAddressBookModal;
window.toggleAddAddressForm = toggleAddAddressForm;
window.fetchCustomerAddresses = fetchCustomerAddresses;
window.handleSaveAddress = handleSaveAddress;
window.editCustomerAddress = editCustomerAddress;
window.setDefaultCustomerAddress = setDefaultCustomerAddress;
window.deleteCustomerAddress = deleteCustomerAddress;
window.loadSavedAddressesForCheckout = loadSavedAddressesForCheckout;
window.applySavedAddressToCheckout = applySavedAddressToCheckout;

// Product detail & reviews exports
window.openProductDetail = openProductDetail;
window.closeProductDetailModal = closeProductDetailModal;
window.toggleDetailFavorite = toggleDetailFavorite;
window.selectDetailColor = selectDetailColor;
window.selectDetailSize = selectDetailSize;
window.adjustDetailQty = adjustDetailQty;
window.submitDetailAddToCart = submitDetailAddToCart;
window.submitDetailBuyNow = submitDetailBuyNow;
window.setReviewRating = setReviewRating;
window.toggleReviewForm = toggleReviewForm;
window.submitProductReview = submitProductReview;

// Shipping & Payment exports
window.switchShippingMethod = switchShippingMethod;
window.recalculateCheckoutTotal = recalculateCheckoutTotal;

// Return & Support exports
window.openReturnOrderModal = openReturnOrderModal;
window.closeReturnOrderModal = closeReturnOrderModal;
window.handleSubmitOrderReturn = handleSubmitOrderReturn;
window.openSupportModal = openSupportModal;
window.closeSupportModal = closeSupportModal;
window.handleSubmitSupportTicket = handleSubmitSupportTicket;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    updateWishlistBadge();
    fetchCustomerAddresses();
});
