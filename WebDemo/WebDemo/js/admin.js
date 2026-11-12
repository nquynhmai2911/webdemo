// js/admin.js
// API base URL - Backend ASP.NET MVC trên port 2911
window.API_BASE = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');

// Global Data Caches
let cachedProducts = [];
let cachedCategories = [];
let cachedStores = [];
let cachedInventory = [];
let cachedUsers = [];

// Format tiền tệ VNĐ
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

// Toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `px-5 py-3 rounded-xl shadow-xl text-white font-medium transform transition-all duration-300 translate-x-full opacity-0 flex items-center gap-3 text-sm z-[9999]`;
    
    let icon = '';
    if (type === 'success') {
        toast.classList.add('bg-emerald-600');
        icon = '<i class="fas fa-check-circle text-lg"></i>';
    } else if (type === 'error') {
        toast.classList.add('bg-rose-600');
        icon = '<i class="fas fa-exclamation-circle text-lg"></i>';
    } else {
        toast.classList.add('bg-blue-600');
        icon = '<i class="fas fa-info-circle text-lg"></i>';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Switch Sidebar Tab
function switchTab(tabId, element = null) {
    const cleanId = tabId.startsWith('tab-') ? tabId : 'tab-' + tabId;
    console.log('[Nav] Đang chuyển sang tab:', cleanId);
    
    // BẢO VỆ NGHIÊM NGẶT: CHỈ ADMIN MỚI ĐƯỢC VÀO TAB QUẢN LÝ MENU
    if (cleanId === 'tab-menu-management') {
        const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        const user = currentUserStr ? JSON.parse(currentUserStr) : { role: 'Customer' };
        if (user.role !== 'Admin') {
            showToast('Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu!', 'error');
            switchTab('tab-dashboard');
            return;
        }
    }

    // 1. Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('block');
        tab.style.display = 'none';
    });

    // 2. Show target tab
    const target = document.getElementById(cleanId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
        target.style.display = 'block';
    } else {
        console.warn('[Nav] Không tìm thấy tab:', cleanId);
    }

    // 3. Reset menu styles
    document.querySelectorAll('#sidebar-nav a').forEach(a => {
        a.className = 'flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors cursor-pointer';
    });

    // 4. Set active menu style
    const menuId = 'menu-' + cleanId.replace('tab-', '');
    const activeMenu = element || document.getElementById(menuId);
    if (activeMenu) {
        activeMenu.className = 'flex items-center gap-3 px-4 py-3 bg-brand-orange/20 text-brand-orange rounded-xl font-medium transition-colors relative after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:h-8 after:w-1 after:bg-brand-orange after:rounded-l-full cursor-pointer';
    }

    // 5. Update Heading
    const heading = document.getElementById('page-heading');
    if (heading) {
        const titles = {
            'tab-dashboard': 'Tổng quan hệ thống',
            'tab-orders': 'Quản lý Đơn hàng',
            'tab-revenue': 'Báo cáo & Thống kê Doanh thu (Quản lý & Admin)',
            'tab-products': 'Quản lý Sản phẩm & Danh mục (Module 1)',
            'tab-inventory': 'Tra cứu & Quản lý Tồn kho (Module 1)',
            'tab-categories': 'Quản lý Menu chính & Danh mục',
            'tab-users': 'Quản lý Tài khoản & Phân quyền',
            'tab-menu-management': 'Quản lý Phân quyền Menu theo Vai trò (Chỉ Admin)',
            'tab-banner': 'Quản lý Banner Khuyến mãi Trang chủ'
        };
        heading.innerText = titles[cleanId] || 'Quản trị hệ thống';
    }

    // 6. Tab-specific data loading
    if (cleanId === 'tab-orders') {
        fetchOrders();
    } else if (cleanId === 'tab-revenue') {
        fetchRevenueReport();
    } else if (cleanId === 'tab-products') {
        fetchProducts();
    } else if (cleanId === 'tab-inventory') {
        fetchInventory();
    } else if (cleanId === 'tab-categories') {
        fetchCategoriesAdmin();
    } else if (cleanId === 'tab-users') {
        fetchUsers();
    } else if (cleanId === 'tab-menu-management') {
        fetchRoleMenuTable();
    } else if (cleanId === 'tab-banner') {
        fetchBannerConfigAdmin();
    }
}

// Tự động gắn event listeners cho các nút menu sidebar
document.addEventListener('DOMContentLoaded', () => {
    const navItems = [
        { id: 'menu-dashboard', tab: 'tab-dashboard' },
        { id: 'menu-orders', tab: 'tab-orders' },
        { id: 'menu-revenue', tab: 'tab-revenue' },
        { id: 'menu-products', tab: 'tab-products' },
        { id: 'menu-inventory', tab: 'tab-inventory' },
        { id: 'menu-categories', tab: 'tab-categories' },
        { id: 'menu-users', tab: 'tab-users' },
        { id: 'menu-management', tab: 'tab-menu-management' }
    ];

    navItems.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(item.tab, el);
            });
        }
    });

    // Khởi chạy phân quyền Menu cho giao diện người dùng
    applyRoleMenuPermissions();

    // Tự động sinh Slug khi nhập Tên Danh mục
    const catNameInput = document.getElementById('category-modal-name');
    const catSlugInput = document.getElementById('category-modal-slug');
    if (catNameInput && catSlugInput) {
        catNameInput.addEventListener('input', function() {
            const idVal = document.getElementById('category-modal-id').value;
            if (!idVal && !catSlugInput.dataset.manual) {
                catSlugInput.value = generateVietnameseSlug(this.value);
            }
        });
        catSlugInput.addEventListener('input', function() {
            this.dataset.manual = 'true';
        });
    }
});

// =========================================================================
// MODULE 1 & MODULE 2 INITIALIZATION
// =========================================================================

// Khởi tạo Module 1 & Module 2 khi tải trang
function initModule1() {
    fetchCategories();
    fetchCategoriesAdmin();
    fetchStores();
    fetchProducts();
    fetchInventory();
    fetchOrders();
}

// 1. Fetch Categories từ DB
function fetchCategories() {
    fetch(window.API_BASE + '/Admin/GetCategories', { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedCategories = res.data;
                populateCategoryDropdowns();
                updateDashboardStats();
            }
        })
        .catch(err => console.error('[Module 1] Lỗi tải Categories:', err));
}

function populateCategoryDropdowns() {
    const filterSelect = document.getElementById('product-category-filter');
    const modalSelect = document.getElementById('prod-category');

    let filterHtml = '<option value="">Tất cả danh mục</option>';
    let modalHtml = '<option value="" disabled selected>-- Chọn danh mục sản phẩm --</option>';

    cachedCategories.forEach(c => {
        filterHtml += `<option value="${c.id}">${c.name} (${c.productCount} SP)</option>`;
        modalHtml += `<option value="${c.id}">${c.name}</option>`;
    });

    if (filterSelect) filterSelect.innerHTML = filterHtml;
    if (modalSelect) modalSelect.innerHTML = modalHtml;
}

// 2. Fetch Stores từ DB
function fetchStores() {
    fetch(window.API_BASE + '/Admin/GetStores', { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedStores = res.data;
                const filter = document.getElementById('inventory-store-filter');
                if (filter) {
                    let html = '<option value="">Tất cả chi nhánh</option>';
                    cachedStores.forEach(s => {
                        html += `<option value="${s.id}">${s.name}</option>`;
                    });
                    filter.innerHTML = html;
                }
                const revFilter = document.getElementById('revenue-store-select');
                if (revFilter) {
                    let rHtml = '<option value="">🏢 Tất cả chi nhánh</option>';
                    cachedStores.forEach(s => {
                        rHtml += `<option value="${s.id}">${s.name}</option>`;
                    });
                    revFilter.innerHTML = rHtml;
                }
                const ordFilter = document.getElementById('order-store-filter');
                if (ordFilter) {
                    let oHtml = '<option value="">Tất cả chi nhánh</option>';
                    cachedStores.forEach(s => {
                        oHtml += `<option value="${s.id}">${s.name}</option>`;
                    });
                    ordFilter.innerHTML = oHtml;
                }
                const elStores = document.getElementById('stat-total-stores');
                if (elStores) {
                    elStores.innerText = `${cachedStores.length} Chi nhánh`;
                }
            }
        })
        .catch(err => console.error('[Module 1] Lỗi tải Stores:', err));
}

// 3. Fetch Products từ DB
let searchDebounceTimer = null;
function debounceProductSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        fetchProducts();
    }, 300);
}

function filterProductsByCategory() {
    fetchProducts();
}

function fetchProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-2xl text-brand-orange mb-2"></i><p class="text-xs">Đang nạp danh sách sản phẩm từ SQL Server...</p></td></tr>`;

    const searchInput = document.getElementById('product-search');
    const categorySelect = document.getElementById('product-category-filter');

    const search = searchInput ? searchInput.value.trim() : '';
    const categoryId = categorySelect ? categorySelect.value : '';

    let url = window.API_BASE + '/Admin/GetProducts?';
    if (search) url += 'search=' + encodeURIComponent(search) + '&';
    if (categoryId) url += 'categoryId=' + encodeURIComponent(categoryId);

    fetch(url, { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedProducts = res.data;
                renderProductsTable(cachedProducts);
                updateDashboardStats();
            } else {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-red-500 font-medium">Lỗi nạp sản phẩm: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-red-500">Không thể kết nối đến máy chủ backend (Port 2911)</td></tr>`;
            console.error('[Module 1] Fetch Products error:', err);
        });
}

// Render Products Table
function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    const countBadge = document.getElementById('product-count-badge');
    if (!tbody) return;

    if (countBadge) countBadge.innerText = `Đang hiển thị: ${products.length} sản phẩm`;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400"><i class="fas fa-box-open text-3xl mb-2"></i><p>Không tìm thấy sản phẩm nào phù hợp</p></td></tr>`;
        return;
    }

    let html = '';
    products.forEach(p => {
        // Stock status badge
        let stockBadge = '';
        if (p.totalStock > 30) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="fas fa-check-circle"></i> ${p.totalStock} cái</span>`;
        } else if (p.totalStock > 0) {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><i class="fas fa-exclamation-circle"></i> ${p.totalStock} cái (Sắp hết)</span>`;
        } else {
            stockBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><i class="fas fa-times-circle"></i> Hết hàng</span>`;
        }

        // Variants tags
        let variantsHtml = '';
        if (p.variants && p.variants.length > 0) {
            variantsHtml = p.variants.map(v => 
                `<span class="inline-block bg-gray-100 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded mr-1 mb-1" title="SKU: ${v.sku} | Giá: ${formatVND(v.price)} | Tồn: ${v.totalQuantity}">
                    ${v.color ? v.color : ''} ${v.size ? `(${v.size})` : ''} - <b>${v.totalQuantity}</b>
                </span>`
            ).join('');
        } else {
            variantsHtml = '<span class="text-xs text-gray-400 italic">Mặc định</span>';
        }

        const defaultImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=200';
        let displayImg = defaultImg;
        if (p.imageUrl && p.imageUrl.trim() !== '') {
            displayImg = p.imageUrl.startsWith('http') ? p.imageUrl : (window.API_BASE + p.imageUrl);
        }

        html += `
            <tr class="hover:bg-orange-50/30 transition-colors">
                <td class="p-4">
                    <img src="${displayImg}" alt="${p.name}" onerror="this.src='${defaultImg}'" class="w-12 h-12 object-cover rounded-xl border border-gray-200 shadow-sm">
                </td>
                <td class="p-4 font-mono font-bold text-xs text-brand-orange bg-orange-50/50 rounded-lg">${p.code}</td>
                <td class="p-4">
                    <p class="font-bold text-gray-800">${p.name}</p>
                    <p class="text-xs text-gray-500 truncate max-w-xs mt-0.5">${p.description || 'Chưa có mô tả'}</p>
                </td>
                <td class="p-4">
                    <span class="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        ${p.categoryName || 'Không có'}
                    </span>
                </td>
                <td class="p-4 font-bold text-gray-900">${formatVND(p.basePrice)}</td>
                <td class="p-4 max-w-xs">${variantsHtml}</td>
                <td class="p-4">${stockBadge}</td>
                <td class="p-4">
                    ${p.isActive 
                        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700"><span class="w-1.5 h-1.5 rounded-full bg-green-500"></span> Đang bán</span>'
                        : '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Tạm dừng</span>'
                    }
                </td>
                <td class="p-4 text-right rounded-r-lg">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="openProductModal(${p.id})" title="Chỉnh sửa sản phẩm" 
                                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Xóa sản phẩm" 
                                class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// 4. Modal Thêm / Sửa Sản phẩm
function openProductModal(id = 0) {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');
    const container = document.getElementById('variants-container');

    form.reset();
    container.innerHTML = '';

    if (id > 0) {
        // Edit mode
        title.innerText = 'Chỉnh sửa sản phẩm #' + id;
        const p = cachedProducts.find(item => item.id === id);
        if (p) {
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-code').value = p.code;
            document.getElementById('prod-code').readOnly = true; // Không cho đổi mã tránh trùng
            document.getElementById('prod-category').value = p.categoryId;
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-price').value = p.basePrice;
            document.getElementById('prod-active').value = p.isActive ? 'true' : 'false';
            document.getElementById('prod-description').value = p.description || '';
            document.getElementById('prod-image-url').value = p.imageUrl || '';
            previewProductImage(p.imageUrl || '');

            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => {
                    addVariantRow(v.sku, v.variantName, v.color, v.size, v.price, v.totalQuantity, v.variantId);
                });
            } else {
                addVariantRow(p.code + '-01', p.name, 'Mặc định', 'Tiêu chuẩn', p.basePrice, 50, 0);
            }
        }
    } else {
        // Create mode
        title.innerText = 'Thêm sản phẩm mới vào CSDL';
        document.getElementById('prod-id').value = '0';
        document.getElementById('prod-code').readOnly = false;
        document.getElementById('prod-image-url').value = '';
        previewProductImage('');
        // Random mã gợi ý
        const randNum = Math.floor(100 + Math.random() * 900);
        document.getElementById('prod-code').value = 'SP-' + randNum;
        
        // Thêm 2 hàng biến thể mẫu
        addVariantRow('SP-' + randNum + '-WHT-L', 'Trắng Size L', 'Trắng', 'L', 150000, 50, 0);
        addVariantRow('SP-' + randNum + '-BLK-XL', 'Đen Size XL', 'Đen', 'XL', 150000, 30, 0);
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
}

// Thêm hàng biến thể trong modal
let variantIndexCounter = 0;
function addVariantRow(sku = '', name = '', color = '', size = '', price = '', stock = 50, variantId = 0) {
    const container = document.getElementById('variants-container');
    if (!container) return;

    variantIndexCounter++;
    const rowId = 'variant-row-' + variantIndexCounter;

    const div = document.createElement('div');
    div.id = rowId;
    div.className = 'grid grid-cols-6 gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs';
    div.innerHTML = `
        <input type="hidden" class="var-id" value="${variantId}">
        <div>
            <label class="block text-[10px] text-gray-500 font-semibold mb-0.5">Mã SKU</label>
            <input type="text" class="var-sku w-full border border-gray-200 rounded-lg p-1.5 font-mono text-xs font-bold" required value="${sku}" placeholder="SKU-01">
        </div>
        <div>
            <label class="block text-[10px] text-gray-500 font-semibold mb-0.5">Màu sắc</label>
            <input type="text" class="var-color w-full border border-gray-200 rounded-lg p-1.5 text-xs" value="${color}" placeholder="Trắng / Đen">
        </div>
        <div>
            <label class="block text-[10px] text-gray-500 font-semibold mb-0.5">Size / Kích thước</label>
            <input type="text" class="var-size w-full border border-gray-200 rounded-lg p-1.5 text-xs" value="${size}" placeholder="S, M, L, XL...">
        </div>
        <div>
            <label class="block text-[10px] text-gray-500 font-semibold mb-0.5">Giá bán (VNĐ)</label>
            <input type="number" class="var-price w-full border border-gray-200 rounded-lg p-1.5 text-xs font-bold text-brand-orange" required value="${price}" placeholder="150000">
        </div>
        <div>
            <label class="block text-[10px] text-gray-500 font-semibold mb-0.5">Kho ban đầu</label>
            <input type="number" class="var-stock w-full border border-gray-200 rounded-lg p-1.5 text-xs font-bold text-emerald-600" required value="${stock}" min="0">
        </div>
        <div class="flex items-end justify-center pt-3">
            <button type="button" onclick="document.getElementById('${rowId}').remove()" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa biến thể">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    container.appendChild(div);
}

// 5. Lưu sản phẩm xuống Backend CSDL
function handleSaveProduct(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-save-product');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu vào SQL Server...';
    }

    const prodId = parseInt(document.getElementById('prod-id').value) || 0;
    const code = document.getElementById('prod-code').value.trim();
    const categoryId = parseInt(document.getElementById('prod-category').value);
    const name = document.getElementById('prod-name').value.trim();
    const basePrice = parseFloat(document.getElementById('prod-price').value) || 0;
    const isActive = document.getElementById('prod-active').value === 'true';
    const description = document.getElementById('prod-description').value.trim();

    // Thu thập các biến thể
    const variants = [];
    const rows = document.querySelectorAll('#variants-container > div');
    rows.forEach(r => {
        const vId = parseInt(r.querySelector('.var-id').value) || 0;
        const vSku = r.querySelector('.var-sku').value.trim();
        const vColor = r.querySelector('.var-color').value.trim();
        const vSize = r.querySelector('.var-size').value.trim();
        const vPrice = parseFloat(r.querySelector('.var-price').value) || basePrice;
        const vStock = parseInt(r.querySelector('.var-stock').value) || 0;

        variants.push({
            variantId: vId > 0 ? vId : null,
            sku: vSku,
            variantName: name + ' ' + (vColor ? vColor : '') + ' ' + (vSize ? vSize : ''),
            color: vColor,
            size: vSize,
            price: vPrice,
            initialStock: vStock
        });
    });

    const imageUrl = document.getElementById('prod-image-url').value.trim();

    const payload = {
        id: prodId > 0 ? prodId : null,
        categoryId: categoryId,
        code: code,
        name: name,
        description: description,
        imageUrl: imageUrl,
        basePrice: basePrice,
        isActive: isActive,
        variants: variants
    };

    fetch(window.API_BASE + '/Admin/SaveProduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-2"></i>Lưu sản phẩm';
        }

        if (data.success) {
            closeProductModal();
            showToast(prodId > 0 ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm mới vào CSDL thành công!', 'success');
            fetchProducts();
            fetchInventory();
            fetchCategories(); // Cập nhật số lượng SP trong danh mục
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-2"></i>Lưu sản phẩm';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

// 6. Xóa Sản phẩm
function deleteProduct(id, name) {
    if (confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" khỏi hệ thống?\n(Các biến thể và tồn kho của sản phẩm này cũng sẽ được xóa).`)) {
        fetch(window.API_BASE + '/Admin/DeleteProduct/' + id, {
            method: 'POST',
            mode: 'cors'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(data.message || `Đã xóa sản phẩm "${name}" thành công!`, 'success');
                fetchProducts();
                fetchInventory();
                fetchCategories();
            } else {
                showToast('Lỗi: ' + data.message, 'error');
            }
        })
        .catch(err => {
            showToast('Không thể kết nối đến máy chủ: ' + err.message, 'error');
        });
    }
}

// =========================================================================
// INVENTORY LOGIC (MODULE 1)
// =========================================================================

function fetchInventory() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-2xl text-amber-500 mb-2"></i><p class="text-xs">Đang tải dữ liệu tồn kho từ SQL Server...</p></td></tr>`;

    const filterSelect = document.getElementById('inventory-store-filter');
    const storeId = filterSelect ? filterSelect.value : '';

    let url = window.API_BASE + '/Admin/GetInventory';
    if (storeId) url += '?storeId=' + encodeURIComponent(storeId);

    fetch(url, { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                cachedInventory = res.data;
                renderInventoryTable(cachedInventory);
                updateDashboardStats();
            } else {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-red-500">Lỗi nạp tồn kho: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-red-500">Không thể kết nối máy chủ</td></tr>`;
            console.error('[Module 1] Fetch Inventory error:', err);
        });
}

function filterInventoryLocal() {
    const search = document.getElementById('inventory-search').value.toLowerCase().trim();
    if (!search) {
        renderInventoryTable(cachedInventory);
        return;
    }

    const filtered = cachedInventory.filter(item => 
        (item.productName && item.productName.toLowerCase().includes(search)) ||
        (item.sku && item.sku.toLowerCase().includes(search)) ||
        (item.storeName && item.storeName.toLowerCase().includes(search))
    );
    renderInventoryTable(filtered);
}

function renderInventoryTable(items) {
    const tbody = document.getElementById('inventory-table-body');
    const badge = document.getElementById('inventory-count-badge');
    if (!tbody) return;

    if (badge) badge.innerText = `Tổng bản ghi: ${items.length}`;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-10 text-gray-400"><i class="fas fa-boxes-stacked text-3xl mb-2"></i><p>Chưa có dữ liệu tồn kho nào</p></td></tr>`;
        return;
    }

    let html = '';
    items.forEach(inv => {
        let statusBadge = '';
        if (inv.quantity > 30) {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Còn hàng</span>';
        } else if (inv.quantity > 0) {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Sắp hết</span>';
        } else {
            statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Hết hàng</span>';
        }

        html += `
            <tr class="hover:bg-amber-50/30 transition-colors">
                <td class="p-4">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-700">
                        <i class="fas fa-store text-brand-orange"></i> ${inv.storeName || 'Cửa hàng chính'}
                    </span>
                </td>
                <td class="p-4 font-mono font-bold text-xs text-brand-orange">${inv.sku}</td>
                <td class="p-4 font-semibold text-gray-800">${inv.productName}</td>
                <td class="p-4">
                    <span class="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                        ${inv.color || '-'} / ${inv.size || '-'}
                    </span>
                </td>
                <td class="p-4 font-bold text-gray-900">${formatVND(inv.price)}</td>
                <td class="p-4 font-extrabold text-base ${inv.quantity > 0 ? 'text-gray-900' : 'text-red-500'}">
                    ${inv.quantity}
                </td>
                <td class="p-4 text-xs font-bold text-gray-500">${inv.reserved}</td>
                <td class="p-4">${statusBadge}</td>
                <td class="p-4 text-right">
                    <button onclick="openStockModal(${inv.id}, '${inv.productName.replace(/'/g, "\\'")}', '${inv.sku}', ${inv.quantity})" 
                            class="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 transition-colors inline-flex items-center gap-1">
                        <i class="fas fa-edit"></i> Sửa kho
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Modal Cập nhật nhanh số lượng kho
function openStockModal(invId, prodName, sku, currentQty) {
    const modal = document.getElementById('stock-modal');
    const content = document.getElementById('stock-modal-content');

    document.getElementById('stock-inv-id').value = invId;
    document.getElementById('stock-modal-sub').innerText = 'Mã SKU: ' + sku;
    document.getElementById('stock-prod-name').innerText = prodName;
    document.getElementById('stock-qty-input').value = currentQty;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
        document.getElementById('stock-qty-input').focus();
    }, 10);
}

function closeStockModal() {
    const modal = document.getElementById('stock-modal');
    const content = document.getElementById('stock-modal-content');
    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
}

function handleUpdateStock(event) {
    event.preventDefault();
    const invId = parseInt(document.getElementById('stock-inv-id').value);
    const newQty = parseInt(document.getElementById('stock-qty-input').value) || 0;

    const formData = new FormData();
    formData.append('inventoryId', invId);
    formData.append('quantity', newQty);

    fetch(window.API_BASE + '/Admin/UpdateStock', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeStockModal();
            showToast('Cập nhật số lượng tồn kho thành công!', 'success');
            fetchInventory();
            fetchProducts();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        showToast('Lỗi kết nối: ' + err.message, 'error');
    });
}

// Cập nhật thống kê Dashboard
function updateDashboardStats() {
    const elProducts = document.getElementById('stat-total-products');
    const elStock = document.getElementById('stat-total-stock');
    const elCategories = document.getElementById('stat-total-categories');
    const elUsers = document.getElementById('stat-total-users');

    if (elProducts && cachedProducts.length > 0) {
        elProducts.innerText = cachedProducts.length;
    }
    if (elCategories && cachedCategories.length > 0) {
        elCategories.innerText = cachedCategories.length;
    }
    if (elStock && cachedInventory.length > 0) {
        const total = cachedInventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
        elStock.innerText = total.toLocaleString();
    }
    if (elUsers && cachedUsers.length > 0) {
        elUsers.innerText = cachedUsers.length;
    }
    const elStores = document.getElementById('stat-total-stores');
    if (elStores && Array.isArray(cachedStores) && cachedStores.length > 0) {
        elStores.innerText = `${cachedStores.length} Chi nhánh`;
    }
}

// =========================================================================
// USERS & STAFF LOGIC
// =========================================================================

function fetchUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu Users...</td></tr>`;

    fetch(window.API_BASE + '/Admin/GetUsers', { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cachedUsers = data.data;
                renderUsersTable(cachedUsers);
                updateDashboardStats();
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">Lỗi kết nối CSDL</td></tr>`;
            }
        })
        .catch(err => {
            console.error('[Users] Fetch error:', err);
        });
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    let html = '';
    users.forEach(u => {
        const isAdmin = u.role === 'Admin';
        const isManager = u.role === 'Manager' || u.role === 'Quản lý';
        const isStaff = u.role === 'Staff' || u.role === 'Nhân viên';
        
        let roleBadgeClass = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        let roleDisplayName = '🛒 Khách hàng';
        let avatarBg = 'bg-emerald-100 text-emerald-700';

        if (isAdmin) {
            roleBadgeClass = 'bg-rose-100 text-rose-700 border border-rose-200';
            roleDisplayName = '⚡ Quản trị viên (Admin)';
            avatarBg = 'bg-rose-100 text-rose-700';
        } else if (isManager) {
            roleBadgeClass = 'bg-purple-100 text-purple-700 border border-purple-200';
            roleDisplayName = '👑 Quản lý (Manager)';
            avatarBg = 'bg-purple-100 text-purple-700';
        } else if (isStaff) {
            roleBadgeClass = 'bg-blue-100 text-blue-700 border border-blue-200';
            roleDisplayName = '👤 Nhân viên (Staff)';
            avatarBg = 'bg-blue-100 text-blue-700';
        }

        html += `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="p-4 flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xs shadow-sm">
                        ${(u.fullName || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span class="font-bold text-gray-800 block">${u.fullName || u.username}</span>
                        <span class="text-[11px] text-gray-400">ID: #${u.id}</span>
                    </div>
                </td>
                <td class="p-4 font-mono text-gray-600 text-xs">${u.username}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${roleBadgeClass}">
                        ${roleDisplayName}
                    </span>
                </td>
                <td class="p-4 text-right whitespace-nowrap">
                    <button onclick="openUserMenuModal('${u.username}', '${(u.fullName || u.username).replace(/'/g, "\\'")}', '${u.role || ''}', ${u.roleId || 0})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1" title="Phân quyền menu riêng cho tài khoản ${u.username}">
                        <i class="fas fa-user-shield"></i>
                    </button>
                    <button onclick="openUserEditModal(${u.id})" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-1" title="Chỉnh sửa tài khoản">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button onclick="deleteUser(${u.id}, '${u.username}')" class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa tài khoản">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// User Modal Functions
function openUserCreateModal() {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    document.getElementById('user-modal-title').innerText = 'Thêm tài khoản mới';
    document.getElementById('user-modal-id').value = '';
    document.getElementById('user-modal-fullname').value = '';
    document.getElementById('user-modal-username').value = '';
    document.getElementById('user-modal-username').disabled = false;
    document.getElementById('user-modal-password').value = '';
    document.getElementById('user-modal-password').required = true;
    document.getElementById('user-modal-password-hint').innerText = 'Tối thiểu 3 ký tự';
    document.getElementById('user-modal-role').value = 'Customer';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('user-modal-content').classList.remove('scale-95');
        document.getElementById('user-modal-content').classList.add('scale-100');
    }, 10);
}

function openUserEditModal(userId) {
    const user = cachedUsers.find(u => u.id === userId);
    if (!user) return;
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    document.getElementById('user-modal-title').innerText = 'Chỉnh sửa tài khoản';
    document.getElementById('user-modal-id').value = user.id;
    document.getElementById('user-modal-fullname').value = user.fullName || '';
    document.getElementById('user-modal-username').value = user.username;
    document.getElementById('user-modal-username').disabled = true;
    document.getElementById('user-modal-password').value = '';
    document.getElementById('user-modal-password').required = false;
    document.getElementById('user-modal-password-hint').innerText = 'Để trống nếu không đổi mật khẩu';
    
    let currentRole = user.role;
    if (currentRole === 'Admin') currentRole = 'Admin';
    else if (currentRole === 'Manager' || currentRole === 'Quản lý') currentRole = 'Manager';
    else if (currentRole === 'Staff' || currentRole === 'Nhân viên') currentRole = 'Staff';
    else currentRole = 'Customer';
    document.getElementById('user-modal-role').value = currentRole;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('user-modal-content').classList.remove('scale-95');
        document.getElementById('user-modal-content').classList.add('scale-100');
    }, 10);
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    document.getElementById('user-modal-content').classList.remove('scale-100');
    document.getElementById('user-modal-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

function handleSaveUser(e) {
    e.preventDefault();
    const id = document.getElementById('user-modal-id').value;
    const fullName = document.getElementById('user-modal-fullname').value.trim();
    const username = document.getElementById('user-modal-username').value.trim();
    const password = document.getElementById('user-modal-password').value;
    const roleName = document.getElementById('user-modal-role').value;

    const formData = new FormData();
    if (id) formData.append('id', id);
    formData.append('fullName', fullName);
    formData.append('username', username);
    if (password) formData.append('password', password);
    formData.append('roleName', roleName);

    const btn = document.getElementById('btn-save-user');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang lưu...';
    }

    fetch(window.API_BASE + '/Admin/SaveUser', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Lưu tài khoản';
        }
        if (data.success) {
            showToast(id ? 'Cập nhật tài khoản thành công!' : 'Tạo tài khoản mới thành công!', 'success');
            closeUserModal();
            fetchUsers();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Lưu tài khoản';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

function deleteUser(id, username) {
    if (confirm(`Bạn có chắc muốn xóa tài khoản "${username}"?`)) {
        fetch(window.API_BASE + '/Admin/DeleteUser/' + id, { method: 'POST', mode: 'cors' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('Đã xóa tài khoản thành công!', 'success');
                    fetchUsers();
                } else {
                    showToast('Lỗi: ' + data.message, 'error');
                }
            })
            .catch(err => showToast('Lỗi kết nối máy chủ', 'error'));
    }
}

// =========================================================================
// QUẢN LÝ PHÂN QUYỀN MENU THEO VAI TRÒ (CHUẨN GIAO DIỆN THEO FORM NGƯỜI DÙNG)
// CHỈ DUY NHẤT ADMIN MỚI CÓ QUYỀN PHÂN MENU CHO: Quản lý, Nhân viên, Khách hàng
// =========================================================================

let cachedRoleMenuPermissions = {};
let currentEditingRole = 'Manager';
let currentPermissionTargetType = 'role'; // 'role' hoặc 'user'
let currentEditingUsername = null;
let currentEditingUserFullName = null;
let currentEditingUserRole = null;
let currentEditingRoleId = null;

// 1. Lấy dữ liệu và hiển thị bảng vai trò (Form Ảnh 1)
function fetchRoleMenuTable() {
    const tableBody = document.getElementById('role-menu-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="p-8 text-center text-gray-500">
                <i class="fas fa-spinner fa-spin text-2xl text-blue-600 mb-2"></i>
                <p>Đang tải danh sách phân quyền menu theo vai trò...</p>
            </td>
        </tr>
    `;

    fetch(window.API_BASE + '/Admin/GetRoleMenuPermissions', { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cachedRoleMenuPermissions = data.allPermissions || {};
                renderRoleMenuTable(data.roles || []);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500 font-semibold">${data.message || 'Lỗi tải danh sách vai trò!'}</td></tr>`;
            }
        })
        .catch(err => {
            console.error('[RoleMenu] Fetch error:', err);
            // Fallback danh sách vai trò chuẩn
            const defaultRoles = [
                { stt: 1, roleCode: 'Manager', roleName: 'Quản lý', roleId: 4, desc: 'Quản lý hoạt động kinh doanh, đơn hàng, kho và doanh thu' },
                { stt: 2, roleCode: 'Staff', roleName: 'Nhân viên', roleId: 2, desc: 'Nhân viên xử lý đơn hàng, xuất nhập kho và sản phẩm' },
                { stt: 3, roleCode: 'Customer', roleName: 'Khách hàng', roleId: 3, desc: 'Khách hàng mua sắm, đặt đơn và theo dõi đơn' },
                { stt: 4, roleCode: 'Admin', roleName: 'Admin Hệ thống', roleId: 1, desc: 'Toàn quyền quản trị hệ thống và phân quyền menu' }
            ];
            renderRoleMenuTable(defaultRoles);
        });
}

function renderRoleMenuTable(roles) {
    const tableBody = document.getElementById('role-menu-table-body');
    if (!tableBody) return;

    let html = '';
    roles.forEach(r => {
        const isAdmin = r.roleCode === 'Admin';
        const isManager = r.roleCode === 'Manager';
        const isStaff = r.roleCode === 'Staff';
        const isCustomer = r.roleCode === 'Customer';

        let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        let roleIcon = '<i class="fas fa-user-tie text-blue-600"></i>';

        if (isAdmin) {
            badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
            roleIcon = '<i class="fas fa-shield-alt text-rose-600"></i>';
        } else if (isManager) {
            badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
            roleIcon = '<i class="fas fa-user-shield text-purple-600"></i>';
        } else if (isCustomer) {
            badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            roleIcon = '<i class="fas fa-user text-emerald-600"></i>';
        }

        html += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="p-4 text-center font-bold text-gray-500">${r.stt}</td>
                <td class="p-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-lg ${badgeColor} border flex items-center justify-center text-sm shadow-xs">
                            ${roleIcon}
                        </div>
                        <div>
                            <p class="font-bold text-gray-900">${r.roleName}</p>
                            <span class="text-[11px] text-gray-400 font-mono">${r.roleCode}</span>
                        </div>
                    </div>
                </td>
                <td class="p-4 text-center font-mono font-bold text-gray-700">
                    <span class="px-2.5 py-1 bg-gray-100 rounded-lg text-xs">${r.roleId}</span>
                </td>
                <td class="p-4 text-gray-600 text-xs">${r.desc || ''}</td>
                <td class="p-4 text-center">
                    <button onclick="openRoleMenuModal('${r.roleCode}', '${r.roleName}', ${r.roleId})" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 mx-auto active:scale-95">
                        <i class="fas fa-shield-alt"></i> Phân quyền
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// ==========================================
// HỆ THỐNG PHÂN QUYỀN MENU (THEO VAI TRÒ & THEO TÀI KHOẢN CỤ THỂ)
// ==========================================
currentPermissionTargetType = 'role';
currentEditingRole = 'Manager';
currentEditingUsername = null;
currentEditingUserFullName = null;
currentEditingUserRole = null;
currentEditingRoleId = null;

// 2. Mở Modal Phân quyền Menu theo Vai trò (Từ tab Quản lý menu)
function openRoleMenuModal(roleCode = 'Manager', roleName = null, roleId = null) {
    // Chỉ Admin mới được phép mở modal phân quyền
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const user = currentUserStr ? JSON.parse(currentUserStr) : { role: 'Customer' };
    if (user.role !== 'Admin') {
        showToast('Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu!', 'error');
        return;
    }

    currentPermissionTargetType = 'role';
    currentEditingRole = roleCode;
    currentEditingUsername = null;

    const modal = document.getElementById('modal-role-menu');
    const content = document.getElementById('modal-role-menu-content');
    if (!modal || !content) return;

    const targetTypeLabel = document.getElementById('modal-target-type-label');
    if (targetTypeLabel) targetTypeLabel.innerText = 'vai trò';

    const nameDisplay = document.getElementById('modal-role-name-display');
    const select = document.getElementById('modal-role-select');
    const userBadge = document.getElementById('modal-user-badge');
    const overrideNotice = document.getElementById('modal-override-notice');
    const resetUserBtn = document.getElementById('btn-reset-user-override');
    const subtitle = document.getElementById('modal-subtitle-display');

    if (userBadge) userBadge.classList.add('hidden');
    if (overrideNotice) overrideNotice.classList.add('hidden');
    if (resetUserBtn) resetUserBtn.classList.add('hidden');
    if (subtitle) subtitle.innerText = 'Cấu hình chi tiết quyền truy cập và hiển thị các menu trong hệ thống';

    if (select) {
        select.disabled = false;
        select.value = roleCode;
    }

    if (nameDisplay) {
        const displayTitles = {
            'Manager': 'Quản lý',
            'Staff': 'Nhân viên',
            'Customer': 'Khách hàng',
            'Admin': 'Admin Hệ thống'
        };
        nameDisplay.innerText = roleName || displayTitles[roleCode] || roleCode;
    }

    // Hiển thị modal với hiệu ứng
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);

    // Tải dữ liệu quyền của vai trò này
    reloadRoleMenuPermissions();
}

// 2b. Mở Modal Phân quyền Menu theo Từng Tài Khoản Cụ Thể (Từ tab Khách hàng & Staff)
function openUserMenuModal(username, fullName = null, roleName = null, roleId = null) {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const user = currentUserStr ? JSON.parse(currentUserStr) : { role: 'Customer' };
    if (user.role !== 'Admin') {
        showToast('Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu!', 'error');
        return;
    }

    currentPermissionTargetType = 'user';
    currentEditingUsername = username;
    currentEditingUserFullName = fullName || username;
    currentEditingUserRole = roleName || 'Customer';
    currentEditingRoleId = roleId;

    let roleCode = 'Customer';
    if (roleId === 1 || (roleName && roleName.toLowerCase().includes('admin'))) roleCode = 'Admin';
    else if (roleId === 4 || (roleName && roleName.toLowerCase().includes('quản lý'))) roleCode = 'Manager';
    else if (roleId === 2 || (roleName && roleName.toLowerCase().includes('nhân viên'))) roleCode = 'Staff';
    currentEditingRole = roleCode;

    const modal = document.getElementById('modal-role-menu');
    const content = document.getElementById('modal-role-menu-content');
    if (!modal || !content) return;

    const targetTypeLabel = document.getElementById('modal-target-type-label');
    if (targetTypeLabel) targetTypeLabel.innerText = 'tài khoản';

    const nameDisplay = document.getElementById('modal-role-name-display');
    const select = document.getElementById('modal-role-select');
    const userBadge = document.getElementById('modal-user-badge');
    const subtitle = document.getElementById('modal-subtitle-display');

    if (nameDisplay) {
        nameDisplay.innerText = `${currentEditingUserFullName} (${username})`;
    }
    if (subtitle) {
        subtitle.innerText = `Cấu hình phân quyền menu riêng biệt cho tài khoản: ${username} (Vai trò: ${roleName || roleCode})`;
    }

    if (select) {
        select.value = roleCode;
        select.disabled = true; // Cố định vai trò gốc của tài khoản
    }

    if (userBadge) {
        userBadge.innerText = `@${username}`;
        userBadge.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);

    reloadUserMenuPermissions(username);
}

// 3. Đóng Modal Phân quyền
function closeRoleMenuModal() {
    const modal = document.getElementById('modal-role-menu');
    const content = document.getElementById('modal-role-menu-content');
    if (!modal || !content) return;

    modal.classList.add('opacity-0');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
}

// 4. Khi thay đổi vai trò trong dropdown của Modal (chỉ có tác dụng khi ở chế độ vai trò)
function onRoleModalSelectChange() {
    if (currentPermissionTargetType === 'user') return;
    const select = document.getElementById('modal-role-select');
    if (!select) return;
    const newRole = select.value;
    const nameDisplay = document.getElementById('modal-role-name-display');
    if (nameDisplay) {
        const titles = { 'Admin': 'Admin Hệ thống', 'Manager': 'Quản lý', 'Staff': 'Nhân viên', 'Customer': 'Khách hàng' };
        nameDisplay.innerText = titles[newRole] || newRole;
    }
    currentEditingRole = newRole;
    reloadRoleMenuPermissions();
}

// 5. Nút [ Lấy menu ] (Tải lại quyền từ server)
function reloadCurrentModalPermissions() {
    if (currentPermissionTargetType === 'user' && currentEditingUsername) {
        reloadUserMenuPermissions(currentEditingUsername);
    } else {
        reloadRoleMenuPermissions();
    }
}

function reloadRoleMenuPermissions() {
    const roleCode = currentEditingRole || 'Manager';
    fetch(`${window.API_BASE}/Admin/GetRoleMenuPermissions?role=${roleCode}`, { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.permissions) {
                applyPermissionsToModalCheckboxes(data.permissions);
                showToast(`Đã lấy dữ liệu menu của vai trò: ${data.targetRole || roleCode}`, 'info');
            } else {
                fallbackPermissionsCheckboxes(roleCode);
            }
        })
        .catch(err => {
            console.error('[RoleMenu] Error fetching permissions:', err);
            fallbackPermissionsCheckboxes(roleCode);
        });
}

function reloadUserMenuPermissions(username) {
    fetch(`${window.API_BASE}/Admin/GetUserMenuPermissions?username=${encodeURIComponent(username)}`, { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.permissions) {
                applyPermissionsToModalCheckboxes(data.permissions);
                const notice = document.getElementById('modal-override-notice');
                const resetBtn = document.getElementById('btn-reset-user-override');
                if (data.hasCustomOverride) {
                    if (notice) notice.classList.remove('hidden');
                    if (resetBtn) resetBtn.classList.remove('hidden');
                } else {
                    if (notice) notice.classList.add('hidden');
                    if (resetBtn) resetBtn.classList.add('hidden');
                }
                showToast(`Đã lấy dữ liệu menu cho tài khoản: ${username}`, 'info');
            } else {
                fallbackPermissionsCheckboxes(currentEditingRole);
            }
        })
        .catch(err => {
            console.error('[UserMenu] Error fetching permissions:', err);
            fallbackPermissionsCheckboxes(currentEditingRole);
        });
}

// Khôi phục quyền về mặc định theo vai trò (Xóa override của tài khoản)
function resetUserMenuToRoleDefault() {
    if (!currentEditingUsername) return;
    if (!confirm(`Bạn có chắc muốn xóa phân quyền riêng của tài khoản "${currentEditingUsername}" và khôi phục menu theo vai trò mặc định không?`)) {
        return;
    }

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const user = currentUserStr ? JSON.parse(currentUserStr) : { role: 'Customer' };

    fetch(window.API_BASE + '/Admin/SaveUserMenuPermissions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Role': user.role
        },
        body: JSON.stringify({
            username: currentEditingUsername,
            currentUserRole: user.role,
            resetToDefault: true
        }),
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || 'Đã khôi phục phân quyền theo vai trò thành công!', 'success');
            localStorage.removeItem('user_menu_permissions_' + currentEditingUsername.toLowerCase());
            reloadUserMenuPermissions(currentEditingUsername);
            if (user.username && user.username.toLowerCase() === currentEditingUsername.toLowerCase()) {
                applyRoleMenuPermissions();
            }
        } else {
            showToast(data.message || 'Lỗi khôi phục phân quyền!', 'error');
        }
    })
    .catch(err => {
        console.error('[ResetUserMenu] Error:', err);
        showToast('Lỗi kết nối khi khôi phục phân quyền!', 'error');
    });
}

function applyPermissionsToModalCheckboxes(perm) {
    const mapping = {
        'role-perm-dashboard': !!perm.dashboard,
        'role-perm-orders': !!perm.orders,
        'role-perm-revenue': !!perm.revenue,
        'role-perm-products': !!perm.products,
        'role-perm-inventory': !!perm.inventory,
        'role-perm-categories': !!perm.categories,
        'role-perm-users': !!perm.users,
        'role-perm-storefront': perm.storefront !== false
    };

    for (const [id, checked] of Object.entries(mapping)) {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    }
}

function fallbackPermissionsCheckboxes(roleCode) {
    if (currentPermissionTargetType === 'user' && currentEditingUsername) {
        const savedUser = localStorage.getItem('user_menu_permissions_' + currentEditingUsername.toLowerCase());
        if (savedUser) {
            try {
                applyPermissionsToModalCheckboxes(JSON.parse(savedUser));
                return;
            } catch(e) {}
        }
    }
    const saved = localStorage.getItem('role_menu_permissions_' + roleCode);
    if (saved) {
        try {
            applyPermissionsToModalCheckboxes(JSON.parse(saved));
            return;
        } catch(e) {}
    }
    loadDefaultRolePermissions();
}

// 6. Nút [ Lấy menu mặc định ]
function loadDefaultRolePermissions() {
    const roleCode = currentEditingRole || 'Manager';
    let defaultPerm = {};

    if (roleCode === 'Manager') {
        defaultPerm = {
            dashboard: true,
            orders: true,
            revenue: true,
            products: true,
            inventory: true,
            categories: true,
            users: true,
            storefront: true
        };
    } else if (roleCode === 'Staff') {
        defaultPerm = {
            dashboard: false,
            orders: true,
            revenue: false,
            products: true,
            inventory: true,
            categories: false,
            users: false,
            storefront: true
        };
    } else if (roleCode === 'Customer') {
        defaultPerm = {
            dashboard: false,
            orders: false,
            revenue: false,
            products: false,
            inventory: false,
            categories: false,
            users: false,
            storefront: true
        };
    } else {
        defaultPerm = {
            dashboard: true, orders: true, revenue: true, products: true,
            inventory: true, categories: true, users: true, storefront: true
        };
    }

    applyPermissionsToModalCheckboxes(defaultPerm);
    showToast(`Đã nạp menu mặc định cho vai trò: ${roleCode}`, 'info');
}

// 7. Nút [ Chọn tất cả ] & [ Bỏ chọn tất cả ]
function selectAllRoleMenus(selectVal = true) {
    const menuIds = [
        'role-perm-dashboard',
        'role-perm-orders',
        'role-perm-revenue',
        'role-perm-products',
        'role-perm-inventory',
        'role-perm-categories',
        'role-perm-users',
        'role-perm-storefront'
    ];

    menuIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = selectVal;
    });

    showToast(selectVal ? 'Đã chọn tất cả menu!' : 'Đã bỏ chọn tất cả menu!', 'info');
}

// 8. Nút [ Phân quyền ] (Lưu cấu hình phân menu)
function saveRoleMenuPermissionsAction() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const user = currentUserStr ? JSON.parse(currentUserStr) : { role: 'Customer' };
    
    // BẢO VỆ NGHIÊM NGẶT: CHỈ ADMIN MỚI ĐƯỢC LƯU
    if (user.role !== 'Admin') {
        showToast('Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu!', 'error');
        return;
    }

    const saveBtn = document.getElementById('btn-save-role-menu');
    const originalText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang lưu...';
    }

    const permData = {
        dashboard: document.getElementById('role-perm-dashboard')?.checked || false,
        orders: document.getElementById('role-perm-orders')?.checked || false,
        revenue: document.getElementById('role-perm-revenue')?.checked || false,
        products: document.getElementById('role-perm-products')?.checked || false,
        inventory: document.getElementById('role-perm-inventory')?.checked || false,
        categories: document.getElementById('role-perm-categories')?.checked || false,
        users: document.getElementById('role-perm-users')?.checked || false,
        storefront: document.getElementById('role-perm-storefront')?.checked || false
    };

    if (currentPermissionTargetType === 'user' && currentEditingUsername) {
        // LƯU PHÂN QUYỀN CHO TỪNG TÀI KHOẢN CỤ THỂ
        const payload = Object.assign({}, permData, {
            username: currentEditingUsername,
            currentUserRole: user.role
        });

        fetch(window.API_BASE + '/Admin/SaveUserMenuPermissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify(payload),
            mode: 'cors'
        })
        .then(res => res.json())
        .then(data => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }

            if (data.success) {
                showToast(data.message || `Đã lưu phân quyền menu thành công cho tài khoản ${currentEditingUsername}!`, 'success');
                localStorage.setItem('user_menu_permissions_' + currentEditingUsername.toLowerCase(), JSON.stringify(permData));
                closeRoleMenuModal();

                // Cập nhật giao diện ngay lập tức nếu tài khoản đang đăng nhập là tài khoản này
                if (user.username && user.username.toLowerCase() === currentEditingUsername.toLowerCase()) {
                    applyRoleMenuPermissions();
                }
            } else {
                showToast(data.message || 'Lỗi lưu phân quyền tài khoản!', 'error');
            }
        })
        .catch(err => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
            console.error('[SaveUserMenu] Error:', err);
            localStorage.setItem('user_menu_permissions_' + currentEditingUsername.toLowerCase(), JSON.stringify(permData));
            showToast('Đã lưu phân quyền tài khoản trên bộ nhớ cục bộ!', 'success');
            closeRoleMenuModal();
        });
    } else {
        // LƯU PHÂN QUYỀN CHO TOÀN BỘ VAI TRÒ
        const targetRole = currentEditingRole || 'Manager';
        const payload = Object.assign({}, permData, {
            targetRole: targetRole,
            currentUserRole: user.role
        });

        fetch(window.API_BASE + '/Admin/SaveRoleMenuPermissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify(payload),
            mode: 'cors'
        })
        .then(res => res.json())
        .then(data => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }

            if (data.success) {
                showToast(data.message || 'Đã lưu phân quyền menu thành công!', 'success');
                localStorage.setItem('role_menu_permissions_' + targetRole, JSON.stringify(permData));
                closeRoleMenuModal();
                fetchRoleMenuTable();
            } else {
                showToast(data.message || 'Lỗi lưu phân quyền menu!', 'error');
            }
        })
        .catch(err => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
            console.error('[SaveRoleMenu] Error:', err);
            localStorage.setItem('role_menu_permissions_' + targetRole, JSON.stringify(permData));
            showToast('Đã lưu phân quyền menu trên bộ nhớ cục bộ!', 'success');
            closeRoleMenuModal();
        });
    }
}

// 9. Áp dụng phân quyền Menu cho giao diện người dùng hiện tại
function applyRoleMenuPermissions() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (!currentUserStr) return;

    const user = JSON.parse(currentUserStr);
    const userRole = user.role;
    const username = (user.username || '').toLowerCase();

    console.log('[RoleMenu] Đang áp dụng quyền menu cho vai trò:', userRole, 'tài khoản:', username);

    const menuManagementLink = document.getElementById('menu-management');

    // QUY TẮC BẮT BUỘC: CHỈ ADMIN MỚI THẤY MENU QUẢN LÝ MENU
    if (userRole === 'Admin') {
        if (menuManagementLink) menuManagementLink.style.display = 'flex';
    } else {
        // Ẩn hoàn toàn mục Quản lý menu cho các vai trò khác (Quản lý, Nhân viên, Khách hàng)
        if (menuManagementLink) menuManagementLink.style.display = 'none';
    }

    // Tải quyền active của role / user từ backend
    fetch(`${window.API_BASE}/Admin/GetActiveMenuPermissions?role=${encodeURIComponent(userRole)}&username=${encodeURIComponent(username)}`, { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.permissions) {
                window.activeUserPermissions = data.permissions;
                enforceMenuVisibility(data.permissions);
            } else {
                fallbackApplyMenuVisibility(userRole, username);
            }
        })
        .catch(err => {
            console.error('[RoleMenu] Error getting active permissions:', err);
            fallbackApplyMenuVisibility(userRole, username);
        });
}

function enforceMenuVisibility(perm) {
    const menuMap = [
        { id: 'menu-dashboard', tab: 'tab-dashboard', enabled: perm.dashboard },
        { id: 'menu-orders', tab: 'tab-orders', enabled: perm.orders },
        { id: 'menu-revenue', tab: 'tab-revenue', enabled: perm.revenue },
        { id: 'menu-products', tab: 'tab-products', enabled: perm.products },
        { id: 'menu-inventory', tab: 'tab-inventory', enabled: perm.inventory },
        { id: 'menu-categories', tab: 'tab-categories', enabled: perm.categories },
        { id: 'menu-users', tab: 'tab-users', enabled: perm.users },
        { id: 'menu-storefront', tab: null, enabled: perm.storefront !== false }
    ];

    let firstAllowedTab = null;

    menuMap.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            if (item.enabled === false) {
                el.style.display = 'none';
            } else {
                el.style.display = 'flex';
                if (!firstAllowedTab && item.tab) {
                    firstAllowedTab = item.tab;
                }
            }
        }
    });

    // Nếu tab hiện tại đang bị cấm, tự chuyển sang tab đầu tiên được phép
    const currentActiveTab = document.querySelector('.tab-content:not(.hidden)');
    if (currentActiveTab) {
        const currentTabId = currentActiveTab.id;
        const currentItem = menuMap.find(m => m.tab === currentTabId);
        if (currentItem && currentItem.enabled === false && firstAllowedTab) {
            console.log('[RoleMenu] Chuyển hướng khỏi tab bị cấm sang:', firstAllowedTab);
            switchTab(firstAllowedTab);
        }
    }
}

function fallbackApplyMenuVisibility(userRole, username = '') {
    if (username) {
        const savedUser = localStorage.getItem('user_menu_permissions_' + username.toLowerCase());
        if (savedUser) {
            try {
                enforceMenuVisibility(JSON.parse(savedUser));
                return;
            } catch(e) {}
        }
    }
    const saved = localStorage.getItem('role_menu_permissions_' + userRole);
    if (saved) {
        try {
            enforceMenuVisibility(JSON.parse(saved));
            return;
        } catch(e) {}
    }
    // Mặc định cho Manager: cho phép hầu hết ngoại trừ Quản lý menu
    if (userRole === 'Manager' || userRole === 'Quản lý') {
        enforceMenuVisibility({
            dashboard: true, orders: true, revenue: true, products: true,
            inventory: true, categories: true, users: true, storefront: true
        });
    } else if (userRole === 'Staff' || userRole === 'Nhân viên') {
        enforceMenuVisibility({
            dashboard: false, orders: true, revenue: false, products: true,
            inventory: true, categories: false, users: false, storefront: true
        });
    }
}

// Tương thích ngược với các nút gọi hàm cũ
function openPermissionModal(preselectedUsername = null) {
    openRoleMenuModal('Staff', 'Nhân viên', 2);
}
function closePermissionModal() {
    closeRoleMenuModal();
}
function openPermissionModalForUser(username) {
    const u = (cachedUsers || []).find(x => x.username && x.username.toLowerCase() === (username || '').toLowerCase());
    if (u) {
        openUserMenuModal(u.username, u.fullName || u.username, u.role, u.roleId);
    } else {
        openUserMenuModal(username, username, 'Customer', 3);
    }
}

// 7. Áp dụng phân quyền cho giao diện Staff (chạy trong staff.html)
function applyStaffPermissions() {
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    if (!currentUserStr) return;

    const user = JSON.parse(currentUserStr);
    // Nếu là Admin vào staff.html thì cấp toàn quyền
    if (user.role === 'Admin') {
        return;
    }

    const username = (user.username || '').toLowerCase();

    fetch(window.API_BASE + '/Admin/GetStaffPermissions?username=' + encodeURIComponent(username), { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.permissions) {
                enforceStaffPermissions(res.permissions);
            }
        })
        .catch(err => {
            console.error('[StaffPermissions] API error, using localStorage fallback:', err);
            const localUser = localStorage.getItem('staff_permissions_' + username);
            const localAll = localStorage.getItem('staff_permissions_all');
            const perm = localUser ? JSON.parse(localUser) : (localAll ? JSON.parse(localAll) : { orders: true, products: true, inventory: true });
            enforceStaffPermissions(perm);
        });
}

function enforceStaffPermissions(perm) {
    window.currentStaffPermissions = perm;

    const menuOrders = document.getElementById('menu-orders');
    const menuProducts = document.getElementById('menu-products');
    const menuInventory = document.getElementById('menu-inventory');

    if (menuOrders) menuOrders.style.display = perm.orders ? 'flex' : 'none';
    if (menuProducts) menuProducts.style.display = perm.products ? 'flex' : 'none';
    if (menuInventory) menuInventory.style.display = perm.inventory ? 'flex' : 'none';

    // Tìm tab đầu tiên được phép truy cập
    let firstAllowed = null;
    if (perm.orders) firstAllowed = 'orders';
    else if (perm.products) firstAllowed = 'products';
    else if (perm.inventory) firstAllowed = 'inventory';

    // Kiểm tra xem tab hiện tại có được phép không
    const currentActiveTab = document.querySelector('.staff-tab:not(.hidden)');
    if (currentActiveTab) {
        const currentName = currentActiveTab.id.replace('tab-', '');
        if (perm[currentName] === false) {
            if (firstAllowed) {
                switchStaffTab(firstAllowed);
            } else {
                currentActiveTab.innerHTML = '<div class="p-10 text-center text-gray-500 font-bold"><i class="fas fa-lock text-3xl mb-3 block text-amber-500"></i>Bạn chưa được cấp quyền truy cập các chức năng này. Vui lòng liên hệ Admin.</div>';
            }
        }
    }
}

// =========================================================================
// MODULE 2: QUẢN LÝ ĐƠN HÀNG (ORDER MANAGEMENT)
// =========================================================================

let cachedOrders = [];
let currentOrderDetail = null;
let orderSearchTimeout = null;

// Helper: Badge trạng thái đơn hàng
function getOrderStatusBadge(status, text) {
    const s = parseInt(status);
    switch (s) {
        case 1: // Chờ xử lý
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>${text || 'Chờ xử lý'}</span>`;
        case 2: // Đang chuẩn bị
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>${text || 'Đang chuẩn bị'}</span>`;
        case 3: // Đang giao hàng
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80"><span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>${text || 'Đang giao hàng'}</span>`;
        case 4: // Đã giao hàng
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>${text || 'Đã giao hàng'}</span>`;
        case 5: // Đã hủy
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>${text || 'Đã hủy'}</span>`;
        default:
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">${text || 'Không xác định'}</span>`;
    }
}

// Helper: Badge trạng thái thanh toán
function getPaymentStatusBadge(status, text) {
    const s = parseInt(status);
    switch (s) {
        case 1: // Đã thanh toán
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800"><i class="fas fa-check text-[10px]"></i>Đã thanh toán</span>`;
        case 2: // Đã hoàn tiền
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800"><i class="fas fa-undo text-[10px]"></i>Đã hoàn tiền</span>`;
        default: // 0: COD Chưa thu
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700"><i class="fas fa-money-bill-wave text-[10px]"></i>COD</span>`;
    }
}

// 1. Fetch danh sách đơn hàng từ API
function fetchOrders(showAlert = false) {
    const statusFilter = document.getElementById('order-status-filter')?.value || '';
    const storeFilter = document.getElementById('order-store-filter')?.value || '';
    const searchVal = document.getElementById('order-search-input')?.value.trim() || '';

    let url = window.API_BASE + '/Admin/GetOrders?';
    if (statusFilter) url += 'status=' + encodeURIComponent(statusFilter) + '&';
    if (storeFilter) url += 'storeId=' + encodeURIComponent(storeFilter) + '&';
    if (searchVal) url += 'search=' + encodeURIComponent(searchVal);

    const fullTbody = document.getElementById('orders-full-table-body');
    if (fullTbody && cachedOrders.length === 0) {
        fullTbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải dữ liệu đơn hàng...</td></tr>`;
    }

    fetch(url, { mode: 'cors' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(res => {
            if (res.success) {
                cachedOrders = res.data;
                const stats = res.stats || {};

                // Cập nhật thẻ KPI trên Tab Orders
                const elTotal = document.getElementById('stat-order-total');
                const elPending = document.getElementById('stat-order-pending');
                const elShipping = document.getElementById('stat-order-shipping');
                const elDelivered = document.getElementById('stat-order-delivered');
                if (elTotal) elTotal.innerText = stats.totalOrders ?? cachedOrders.length;
                if (elPending) elPending.innerText = stats.pendingOrders ?? 0;
                if (elShipping) elShipping.innerText = stats.shippingOrders ?? 0;
                if (elDelivered) elDelivered.innerText = stats.deliveredOrders ?? 0;

                // Cập nhật Badge trên Sidebar Menu "Đơn hàng"
                const menuBadge = document.querySelector('#menu-orders span.bg-red-500, #menu-orders span.rounded-full');
                if (menuBadge) {
                    const pendingCount = stats.pendingOrders ?? 0;
                    menuBadge.innerText = pendingCount;
                    menuBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
                }

                // Cập nhật Thống kê trên Dashboard (nếu có thẻ)
                const dashOrders = document.getElementById('stat-total-orders') || document.getElementById('stat-orders');
                const dashRevenue = document.getElementById('stat-total-revenue') || document.getElementById('stat-revenue');
                if (dashOrders) dashOrders.innerText = stats.totalOrders ?? cachedOrders.length;
                if (dashRevenue) dashRevenue.innerText = formatVND(stats.totalRevenue ?? 0);

                // Cập nhật Store Filter dropdown nếu chưa có
                populateOrderStoreFilter();

                // Render cả 2 bảng
                renderFullOrdersTable(cachedOrders);
                renderOrders(cachedOrders);

                if (showAlert) showToast('Đã làm mới dữ liệu đơn hàng!', 'success');
            } else {
                console.error('[Orders] API error:', res.message);
                if (showAlert) showToast('Lỗi: ' + res.message, 'error');
            }
        })
        .catch(err => {
            console.error('[Orders] Fetch error:', err);
            if (fullTbody) {
                fullTbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-rose-500"><i class="fas fa-exclamation-triangle mr-2"></i>Không thể tải đơn hàng từ server.</td></tr>`;
            }
        });
}

// 2. Điền danh sách Store vào bộ lọc đơn hàng
function populateOrderStoreFilter() {
    const select = document.getElementById('order-store-filter');
    if (!select || select.options.length > 1) return;

    if (Array.isArray(cachedStores) && cachedStores.length > 0) {
        cachedStores.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.innerText = s.name;
            select.appendChild(opt);
        });
    }
}

// 3. Render bảng đầy đủ trong tab Quản lý đơn hàng (Module 2)
function renderFullOrdersTable(orders) {
    const tbody = document.getElementById('orders-full-table-body');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-gray-400">
                    <i class="fas fa-inbox text-4xl mb-3 text-gray-300 block"></i>
                    <span class="font-medium text-sm">Không tìm thấy đơn hàng nào phù hợp.</span>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    orders.forEach(o => {
        html += `
            <tr class="hover:bg-gray-50/60 transition-colors">
                <td class="p-4 font-mono font-bold text-xs">
                    <a href="javascript:void(0)" onclick="viewOrderDetail(${o.orderId})" class="text-brand-orange hover:underline flex items-center gap-1.5">
                        <i class="fas fa-receipt text-[11px]"></i>${o.orderCode}
                    </a>
                </td>
                <td class="p-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-gray-800 text-sm">${o.customerName}</span>
                        <span class="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                            <i class="fas fa-phone-alt text-[10px] text-gray-400"></i>${o.customerPhone || 'Chưa có SĐT'}
                        </span>
                    </div>
                </td>
                <td class="p-4 text-xs text-gray-600 whitespace-nowrap">
                    <div class="flex items-center gap-1.5">
                        <i class="far fa-clock text-gray-400"></i>
                        <span>${o.createdAt}</span>
                    </div>
                    <span class="text-[11px] text-gray-400 block mt-0.5">${o.storeName}</span>
                </td>
                <td class="p-4 text-center font-bold text-gray-700">
                    <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs">${o.itemCount} món</span>
                </td>
                <td class="p-4 font-bold text-gray-900 whitespace-nowrap">
                    ${formatVND(o.totalAmount)}
                </td>
                <td class="p-4 whitespace-nowrap">
                    ${getOrderStatusBadge(o.orderStatus, o.orderStatusText)}
                </td>
                <td class="p-4 whitespace-nowrap">
                    ${getPaymentStatusBadge(o.paymentStatus, o.paymentStatusText)}
                </td>
                <td class="p-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="viewOrderDetail(${o.orderId})" class="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1" title="Xem chi tiết đơn">
                            <i class="fas fa-eye"></i> Chi tiết
                        </button>
                        ${o.orderStatus === 1 ? `
                            <button onclick="confirmOrderAction(${o.orderId}, event)" class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1" title="Xác nhận duyệt đơn">
                                <i class="fas fa-check"></i> Xác nhận
                            </button>
                        ` : ''}
                        <button onclick="deleteOrderAction(${o.orderId}, '${o.orderCode}', event)" class="w-8 h-8 rounded-lg text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 transition-all flex items-center justify-center shadow-sm" title="Xóa vĩnh viễn đơn hàng">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// 4. Render bảng Đơn hàng gần đây (trên Dashboard và Staff page)
function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const list = orders || cachedOrders;
    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400 text-xs">Chưa có đơn hàng nào trong hệ thống.</td></tr>`;
        return;
    }

    let html = '';
    list.forEach(o => {
        const isPending = (o.orderStatus === 1 || o.orderStatus === '1');
        html += `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="p-4 font-mono font-bold text-xs text-brand-orange">
                    <a href="javascript:void(0)" onclick="viewOrderDetail(${o.orderId})" class="hover:underline flex items-center gap-1.5">
                        <i class="fas fa-receipt text-[11px]"></i>${o.orderCode}
                    </a>
                </td>
                <td class="p-4">
                    <span class="font-bold text-gray-800 text-sm block">${o.customerName}</span>
                    <span class="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                        <i class="fas fa-phone-alt text-[10px] text-gray-400"></i>${o.customerPhone || 'Chưa có SĐT'}
                    </span>
                </td>
                <td class="p-4 text-xs text-gray-500 whitespace-nowrap">${o.createdAt}</td>
                <td class="p-4 font-bold text-gray-900">${formatVND(o.totalAmount)}</td>
                <td class="p-4">${getOrderStatusBadge(o.orderStatus, o.orderStatusText)}</td>
                <td class="p-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                        ${isPending ? `
                            <button type="button" onclick="confirmOrderAction(${o.orderId}, event)" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5" title="Xác nhận đơn hàng và chuẩn bị giao">
                                <i class="fas fa-check-circle"></i> Xác nhận
                            </button>
                        ` : ''}
                        <button type="button" onclick="viewOrderDetail(${o.orderId})" class="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors flex items-center gap-1">
                            <i class="fas fa-eye text-xs"></i> Chi tiết
                        </button>
                        <button type="button" onclick="deleteOrderAction(${o.orderId}, '${o.orderCode}', event)" class="w-8 h-8 rounded-xl text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 transition-all flex items-center justify-center shadow-sm" title="Xóa đơn hàng này">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// 4.1. Xác nhận đặt hàng nhanh cho nhân viên
function confirmOrderAction(orderId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Xác nhận duyệt và đặt hàng cho đơn này để bắt đầu giao cho khách?')) return;

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('status', 3); // 3: Đang giao hàng / Đã xác nhận

    fetch(window.API_BASE + '/Admin/UpdateOrderStatus', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('✅ Đã xác nhận đơn hàng thành công!', 'success');
            fetchOrders(false);
            if (currentOrderDetail && currentOrderDetail.orderId === orderId) {
                viewOrderDetail(orderId);
            }
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        console.error('[ConfirmOrder] Error:', err);
        showToast('Lỗi kết nối máy chủ!', 'error');
    });
}

// 4.2. Xóa đơn hàng khỏi hệ thống
function deleteOrderAction(orderId, orderCode, event) {
    if (event) event.stopPropagation();

    const displayCode = orderCode || ('#' + orderId);
    if (!confirm(`Bạn có chắc chắn muốn XÓA vĩnh viễn đơn hàng "${displayCode}"?\n\nLƯU Ý: Thao tác này sẽ xóa toàn bộ sản phẩm và chi tiết của đơn hàng khỏi hệ thống và không thể khôi phục!`)) {
        return;
    }

    fetch(window.API_BASE + '/Admin/DeleteOrder/' + orderId, {
        method: 'POST',
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || 'Đã xóa đơn hàng thành công!', 'success');
            if (currentOrderDetail && currentOrderDetail.orderId === orderId) {
                closeOrderDetailModal();
            }
            fetchOrders(false);
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        console.error('[DeleteOrder] Error:', err);
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

// 5. Filter & Search Debounce
function filterOrders() {
    fetchOrders(false);
}

function debounceOrderSearch() {
    clearTimeout(orderSearchTimeout);
    orderSearchTimeout = setTimeout(() => {
        fetchOrders(false);
    }, 350);
}

// 6. Xem chi tiết đơn hàng (Modal)
function viewOrderDetail(orderId) {
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');
    if (!modal || !content) return;

    // Reset nội dung
    const codeEl = document.getElementById('modal-order-code');
    const itemsEl = document.getElementById('modal-order-items-body');
    if (codeEl) codeEl.innerText = 'Đang tải...';
    if (itemsEl) itemsEl.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải chi tiết đơn hàng...</td></tr>`;

    // Hiển thị modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);

    fetch(window.API_BASE + '/Admin/GetOrderDetail/' + orderId, { mode: 'cors' })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(res => {
            if (res.success && res.data) {
                currentOrderDetail = res.data;
                populateOrderDetailModal(currentOrderDetail);
            } else {
                showToast('Lỗi: ' + (res.message || 'Không tìm thấy chi tiết đơn'), 'error');
                closeOrderDetailModal();
            }
        })
        .catch(err => {
            console.error('[OrderDetail] Fetch error:', err);
            showToast('Không thể tải chi tiết đơn hàng!', 'error');
            closeOrderDetailModal();
        });
}

function populateOrderDetailModal(order) {
    const codeEl = document.getElementById('modal-order-code');
    const timeEl = document.getElementById('modal-order-time');
    const statusEl = document.getElementById('modal-order-status-badge');
    const payEl = document.getElementById('modal-order-payment-badge');

    if (codeEl) codeEl.innerText = order.orderCode;
    if (timeEl) timeEl.innerText = 'Thời gian đặt: ' + order.createdAt;
    if (statusEl) statusEl.innerHTML = getOrderStatusBadge(order.orderStatus, order.orderStatusText);
    if (payEl) payEl.innerHTML = getPaymentStatusBadge(order.paymentStatus, order.paymentStatusText);

    // Người nhận
    const custName = document.getElementById('modal-customer-name');
    const custPhone = document.getElementById('modal-customer-phone');
    const custEmail = document.getElementById('modal-customer-email');
    const custAddr = document.getElementById('modal-customer-address');
    if (custName) custName.innerText = order.customer.fullName || 'Khách vãng lai';
    if (custPhone) custPhone.innerText = order.customer.phone || 'Chưa cập nhật';
    if (custEmail) custEmail.innerText = order.customer.email || 'Chưa cập nhật';
    if (custAddr) custAddr.innerText = order.shipping.fullAddress || order.shipping.addressLine || 'Chưa có địa chỉ';

    // Đơn vị xuất kho
    const storeEl = document.getElementById('modal-order-store');
    const storeAddr = document.getElementById('modal-order-store-address');
    const payMethod = document.getElementById('modal-order-payment-method');
    if (storeEl) storeEl.innerText = order.store.name;
    if (storeAddr) storeAddr.innerText = order.store.address || 'Kho trung tâm';
    if (payMethod) payMethod.innerText = order.paymentStatusText;

    // Danh sách sản phẩm
    const countEl = document.getElementById('modal-order-item-count');
    if (countEl) countEl.innerText = order.items.reduce((sum, i) => sum + i.quantity, 0);

    const itemsTbody = document.getElementById('modal-order-items-body');
    if (itemsTbody) {
        let itemsHtml = '';
        order.items.forEach(it => {
            const variantDesc = [it.color, it.size].filter(Boolean).join(' - ') || it.variantName || 'Tiêu chuẩn';
            const imgHtml = it.image ? `<img src="${it.image}" class="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0">` : `<div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><i class="fas fa-box"></i></div>`;
            itemsHtml += `
                <tr class="hover:bg-gray-50/50">
                    <td class="p-3">
                        <div class="flex items-center gap-3">
                            ${imgHtml}
                            <div>
                                <p class="font-bold text-gray-800 text-xs">${it.productName}</p>
                                <p class="text-[11px] text-gray-400 font-mono">${it.sku || ''}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-3 font-mono text-gray-500 text-[11px]">${it.sku || '-'}</td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">${variantDesc}</span>
                    </td>
                    <td class="p-3 text-right font-medium text-gray-700">${formatVND(it.unitPrice)}</td>
                    <td class="p-3 text-center font-bold text-gray-900">x${it.quantity}</td>
                    <td class="p-3 text-right font-bold text-gray-900">${formatVND(it.totalPrice)}</td>
                </tr>
            `;
        });
        itemsTbody.innerHTML = itemsHtml;
    }

    // Tổng tiền
    const subEl = document.getElementById('modal-subtotal');
    const shipEl = document.getElementById('modal-shipping-fee');
    const discEl = document.getElementById('modal-discount');
    const totalEl = document.getElementById('modal-total-amount');
    if (subEl) subEl.innerText = formatVND(order.subTotal);
    if (shipEl) shipEl.innerText = formatVND(order.shippingFee);
    if (discEl) discEl.innerText = '-' + formatVND(order.discountAmount);
    if (totalEl) totalEl.innerText = formatVND(order.totalAmount);

    // Render nút hành động theo trạng thái
    renderOrderActionButtons(order);
}

function renderOrderActionButtons(order) {
    const container = document.getElementById('modal-order-action-buttons');
    if (!container) return;

    let buttons = '';
    const s = parseInt(order.orderStatus);

    if (s === 1) { // Chờ xử lý -> Xác nhận đặt hàng / Chuẩn bị / Hủy đơn
        buttons += `
            <button onclick="confirmOrderAction(${order.orderId})" class="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-xs flex items-center gap-1.5 shadow-md">
                <i class="fas fa-check-circle"></i> Xác nhận đặt hàng (Giao ngay)
            </button>
            <button onclick="updateOrderStatusAction(${order.orderId}, 2)" class="px-3.5 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors text-xs flex items-center gap-1.5">
                <i class="fas fa-box"></i> Chuẩn bị hàng
            </button>
            <button onclick="updateOrderStatusAction(${order.orderId}, 5)" class="px-3.5 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-xs flex items-center gap-1.5">
                <i class="fas fa-ban"></i> Hủy đơn
            </button>
        `;
    } else if (s === 2) { // Đang chuẩn bị -> Giao cho vận chuyển / Hủy đơn
        buttons += `
            <button onclick="updateOrderStatusAction(${order.orderId}, 3)" class="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-xs flex items-center gap-1.5 shadow-md">
                <i class="fas fa-truck"></i> Giao cho vận chuyển
            </button>
            <button onclick="updateOrderStatusAction(${order.orderId}, 5)" class="px-3.5 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-xs flex items-center gap-1.5">
                <i class="fas fa-ban"></i> Hủy đơn
            </button>
        `;
    } else if (s === 3) { // Đang giao -> Đã giao thành công / Hủy đơn
        buttons += `
            <button onclick="updateOrderStatusAction(${order.orderId}, 4)" class="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all text-xs flex items-center gap-1.5 shadow-md">
                <i class="fas fa-check-circle"></i> Xác nhận Đã giao hàng
            </button>
            <button onclick="updateOrderStatusAction(${order.orderId}, 5)" class="px-3.5 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-xs flex items-center gap-1.5">
                <i class="fas fa-ban"></i> Hủy đơn
            </button>
        `;
    } else if (s === 4) {
        buttons += `
            <span class="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                <i class="fas fa-check-circle"></i> Đơn hàng đã hoàn thành thành công
            </span>
        `;
    } else if (s === 5) {
        buttons += `
            <span class="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5">
                <i class="fas fa-times-circle"></i> Đơn hàng đã hủy
            </span>
        `;
    }

    buttons += `
        <button type="button" onclick="deleteOrderAction(${order.orderId}, '${order.orderCode}')" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-sm" title="Xóa vĩnh viễn đơn hàng này">
            <i class="fas fa-trash-alt"></i> Xóa đơn hàng
        </button>
        <button type="button" onclick="closeOrderDetailModal()" class="px-4 py-2 text-gray-500 font-medium hover:bg-gray-200 rounded-xl transition-colors text-xs">
            Đóng
        </button>
    `;

    container.innerHTML = buttons;
}

function closeOrderDetailModal() {
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');
    if (!modal || !content) return;

    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 250);
}

// 7. Cập nhật trạng thái đơn hàng
function updateOrderStatusAction(orderId, newStatus) {
    const statusNames = { 1: 'Chờ xử lý', 2: 'Đang chuẩn bị', 3: 'Đang giao hàng', 4: 'Đã giao hàng', 5: 'Đã hủy' };
    const confirmMsg = newStatus === 5 
        ? 'Bạn có chắc chắn muốn HỦY đơn hàng này?' 
        : `Xác nhận chuyển đơn hàng sang trạng thái: "${statusNames[newStatus]}"?`;

    if (!confirm(confirmMsg)) return;

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('status', newStatus);

    fetch(window.API_BASE + '/Admin/UpdateOrderStatus', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message || 'Cập nhật trạng thái thành công!', 'success');
            // Refresh danh sách
            fetchOrders(false);
            // Refresh modal nếu đang mở
            if (currentOrderDetail && currentOrderDetail.orderId === orderId) {
                viewOrderDetail(orderId);
            }
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        console.error('[UpdateStatus] Error:', err);
        showToast('Lỗi cập nhật trạng thái đơn hàng!', 'error');
    });
}

// 8. Đổi trạng thái thanh toán
function togglePaymentStatusModal() {
    if (!currentOrderDetail) return;
    const currentPay = parseInt(currentOrderDetail.paymentStatus);
    const nextPay = currentPay === 1 ? 0 : 1;
    const nextText = nextPay === 1 ? 'Đã thanh toán' : 'Chưa thanh toán (COD)';

    if (!confirm(`Chuyển trạng thái thanh toán của đơn hàng sang: "${nextText}"?`)) return;

    const formData = new FormData();
    formData.append('orderId', currentOrderDetail.orderId);
    formData.append('paymentStatus', nextPay);

    fetch(window.API_BASE + '/Admin/UpdatePaymentStatus', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            viewOrderDetail(currentOrderDetail.orderId);
            fetchOrders(false);
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => showToast('Lỗi cập nhật thanh toán!', 'error'));
}

// 9. In hóa đơn
function printOrderInvoice() {
    if (!currentOrderDetail) return;
    const o = currentOrderDetail;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Trình duyệt đã chặn cửa sổ in (pop-up). Vui lòng cho phép pop-up!', 'warning');
        return;
    }

    let itemsTr = '';
    o.items.forEach((it, idx) => {
        itemsTr += `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>${it.productName}</strong><br><small style="color: #666;">SKU: ${it.sku || '-'} | ${it.color || ''} ${it.size || ''}</small></td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatVND(it.unitPrice)}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${it.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatVND(it.totalPrice)}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hóa đơn ${o.orderCode}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #ff5722; padding-bottom: 10px; margin-bottom: 20px; }
                .store-title { font-size: 22px; font-weight: bold; color: #ff5722; }
                .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .info-box { width: 48%; font-size: 13px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                th { background-color: #f7f7f7; border: 1px solid #ddd; padding: 8px; font-weight: bold; }
                .total-box { float: right; width: 300px; font-size: 13px; line-height: 1.8; }
                .total-row { display: flex; justify-content: space-between; }
                .grand-total { font-size: 16px; font-weight: bold; color: #ff5722; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 5px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px dashed #ddd; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div>
                    <div class="store-title">SUPERADMIN STORE</div>
                    <div style="font-size: 12px; color: #666;">Chi nhánh: ${o.store.name} - ${o.store.address}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: bold;">HÓA ĐƠN BÁN HÀNG</div>
                    <div style="font-size: 13px; color: #666;">Mã đơn: <strong>${o.orderCode}</strong></div>
                    <div style="font-size: 12px; color: #888;">Ngày: ${o.createdAt}</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-box">
                    <strong>THÔNG TIN KHÁCH HÀNG:</strong><br>
                    Khách hàng: ${o.customer.fullName}<br>
                    SĐT: ${o.customer.phone}<br>
                    Email: ${o.customer.email || 'N/A'}
                </div>
                <div class="info-box">
                    <strong>ĐỊA CHỈ NHẬN HÀNG:</strong><br>
                    Người nhận: ${o.shipping.receiverName}<br>
                    SĐT: ${o.shipping.phone}<br>
                    Địa chỉ: ${o.shipping.fullAddress}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">STT</th>
                        <th>Tên sản phẩm</th>
                        <th style="width: 100px;">Đơn giá</th>
                        <th style="width: 60px;">SL</th>
                        <th style="width: 110px;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsTr}
                </tbody>
            </table>

            <div class="total-box">
                <div class="total-row"><span>Tạm tính tiền hàng:</span> <span>${formatVND(o.subTotal)}</span></div>
                <div class="total-row"><span>Phí vận chuyển:</span> <span>${formatVND(o.shippingFee)}</span></div>
                <div class="total-row"><span>Giảm giá:</span> <span>-${formatVND(o.discountAmount)}</span></div>
                <div class="total-row grand-total"><span>TỔNG CỘNG:</span> <span>${formatVND(o.totalAmount)}</span></div>
                <div style="margin-top: 5px; font-size: 12px; color: #555;">Trạng thái: <strong>${o.paymentStatusText}</strong></div>
            </div>

            <div style="clear: both;"></div>

            <div class="footer">
                Cảm ơn quý khách đã mua sắm tại SuperAdmin Store!<br>
                Hotline hỗ trợ: 1900 2911 - Email: support@webdemo.vn
            </div>
            <script>
                window.onload = function() { window.print(); };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function logout() {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Staff Tab Navigation
function switchStaffTab(tabName) {
    if (window.currentStaffPermissions && window.currentStaffPermissions[tabName] === false) {
        showToast('Bạn không được cấp quyền truy cập chức năng này!', 'warning');
        return;
    }

    document.querySelectorAll('.staff-tab').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('block');
        tab.style.display = 'none';
    });

    const targetTab = document.getElementById('tab-' + tabName);
    if (targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('block');
        targetTab.style.display = 'block';
    }

    document.querySelectorAll('aside nav a').forEach(a => {
        a.className = 'flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors cursor-pointer';
    });

    const activeMenu = document.getElementById('menu-' + tabName);
    if (activeMenu) {
        activeMenu.className = 'flex items-center gap-3 px-4 py-3 bg-brand-orange/20 text-brand-orange rounded-xl font-medium transition-colors cursor-pointer';
    }

    // Cập nhật tiêu đề Topbar
    const heading = document.querySelector('header h1');
    if (heading) {
        const titles = {
            'orders': 'Xử lý Đơn hàng (Staff View)',
            'products': 'Quản lý Sản phẩm (Staff View)',
            'inventory': 'Tra cứu & Quản lý Tồn kho (Staff View)'
        };
        heading.innerText = titles[tabName] || 'Nhân viên bán hàng';
    }

    if (tabName === 'orders') {
        fetchOrders();
    } else if (tabName === 'products') {
        fetchCategories();
        fetchProducts();
    } else if (tabName === 'inventory') {
        fetchInventory();
    }
}

// ==========================================
// IMAGE UPLOAD & PREVIEW HANDLERS
// ==========================================
function previewProductImage(url) {
    const previewImg = document.getElementById('prod-image-preview');
    const placeholder = document.getElementById('prod-image-placeholder');
    const removeBtn = document.getElementById('btn-remove-prod-image');
    if (!previewImg || !placeholder) return;

    if (url && url.trim() !== '') {
        const fullUrl = url.startsWith('http') ? url : (window.API_BASE + url);
        previewImg.src = fullUrl;
        previewImg.onload = () => {
            previewImg.classList.remove('hidden');
            placeholder.classList.add('hidden');
            if (removeBtn) {
                removeBtn.classList.remove('hidden');
                removeBtn.classList.add('flex');
            }
        };
        previewImg.onerror = () => {
            // Keep preview hidden if broken
            previewImg.classList.add('hidden');
            placeholder.classList.remove('hidden');
            if (removeBtn) {
                removeBtn.classList.remove('hidden');
                removeBtn.classList.add('flex');
            }
        };
    } else {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        placeholder.classList.remove('hidden');
        if (removeBtn) {
            removeBtn.classList.add('hidden');
            removeBtn.classList.remove('flex');
        }
    }
}

function clearProductImage() {
    const urlInput = document.getElementById('prod-image-url');
    const fileInput = document.getElementById('prod-image-file');
    const status = document.getElementById('prod-image-upload-status');
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    if (status) status.innerText = '';
    previewProductImage('');
}

function handleProductImageFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const status = document.getElementById('prod-image-upload-status');
    if (status) status.innerHTML = '<span class="text-brand-orange text-xs"><i class="fas fa-spinner fa-spin mr-1"></i> Đang tải ảnh lên...</span>';

    const formData = new FormData();
    formData.append('file', file);

    fetch(window.API_BASE + '/Admin/UploadImage', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const urlInput = document.getElementById('prod-image-url');
            if (urlInput) urlInput.value = data.url;
            previewProductImage(data.url);
            if (status) status.innerHTML = '<span class="text-green-600 font-semibold text-xs"><i class="fas fa-check-circle"></i> Đã tải ảnh lên!</span>';
            showToast('Tải ảnh sản phẩm thành công!', 'success');
        } else {
            if (status) status.innerHTML = `<span class="text-red-500 text-xs"><i class="fas fa-exclamation-triangle"></i> ${data.message || 'Lỗi tải ảnh'}</span>`;
            showToast(data.message || 'Lỗi khi tải ảnh!', 'error');
        }
    })
    .catch(err => {
        console.error('Lỗi upload ảnh:', err);
        if (status) status.innerHTML = '<span class="text-red-500 text-xs"><i class="fas fa-exclamation-triangle"></i> Lỗi kết nối máy chủ!</span>';
        showToast('Không thể kết nối đến máy chủ upload!', 'error');
    });
}

// =========================================================================
// =========================================================================
// QUẢN LÝ DANH MỤC (CATEGORIES) - ROLE ADMIN
// =========================================================================

let cachedCategoriesAdmin = [];

function generateVietnameseSlug(str) {
    if (!str) return '';
    str = str.toLowerCase();
    str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    str = str.replace(/[đĐ]/g, 'd');
    str = str.replace(/[^a-z0-9\s-]/g, '');
    str = str.trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    return str;
}

function fetchCategoriesAdmin(showAlert = false) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin text-xl text-indigo-600 mb-2 block"></i>Đang tải danh sách danh mục...</td></tr>`;

    fetch(window.API_BASE + '/Admin/GetCategories', { mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cachedCategoriesAdmin = data.data || [];
                updateCategoryStats(cachedCategoriesAdmin);
                filterCategoriesTable();
                if (showAlert) showToast('Đã làm mới danh mục!', 'success');
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-red-500 font-medium">Lỗi: ${data.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error('[Categories] Fetch error:', err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-red-500 font-medium"><i class="fas fa-exclamation-triangle mr-2"></i>Lỗi kết nối máy chủ khi nạp danh mục</td></tr>`;
        });
}

function updateCategoryStats(list) {
    const totalEl = document.getElementById('stat-total-cats');
    const activeEl = document.getElementById('stat-active-cats');
    const hiddenEl = document.getElementById('stat-hidden-cats');

    const total = list.length;
    const active = list.filter(c => c.isActive).length;
    const hidden = total - active;

    if (totalEl) totalEl.innerText = total;
    if (activeEl) activeEl.innerText = active;
    if (hiddenEl) hiddenEl.innerText = hidden;
}

function filterCategoriesTable() {
    const searchVal = (document.getElementById('category-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('category-status-filter')?.value || 'all';

    let list = cachedCategoriesAdmin || [];
    if (searchVal) {
        list = list.filter(c => (c.name || '').toLowerCase().includes(searchVal) || (c.slug || '').toLowerCase().includes(searchVal));
    }
    if (statusVal === 'active') {
        list = list.filter(c => c.isActive);
    } else if (statusVal === 'hidden') {
        list = list.filter(c => !c.isActive);
    }

    const badge = document.getElementById('category-count-badge');
    if (badge) badge.innerText = `Đang hiển thị: ${list.length} danh mục`;

    renderCategoriesTable(list);
}

function getCategoryIcon(name, slug) {
    const lower = (name + ' ' + (slug || '')).toLowerCase();
    if (lower.includes('nam')) return { icon: 'fa-tshirt', bg: 'bg-indigo-100 text-indigo-600' };
    if (lower.includes('nữ') || lower.includes('nu')) return { icon: 'fa-female', bg: 'bg-pink-100 text-pink-600' };
    if (lower.includes('uống') || lower.includes('coffee') || lower.includes('nước') || lower.includes('trà')) return { icon: 'fa-coffee', bg: 'bg-blue-100 text-blue-600' };
    if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('thực phẩm')) return { icon: 'fa-cookie-bite', bg: 'bg-amber-100 text-amber-600' };
    if (lower.includes('nhanh') || lower.includes('pizza') || lower.includes('burger')) return { icon: 'fa-pizza-slice', bg: 'bg-red-100 text-red-600' };
    if (lower.includes('công nghệ') || lower.includes('phụ kiện') || lower.includes('tai nghe')) return { icon: 'fa-headphones', bg: 'bg-purple-100 text-purple-600' };
    if (lower.includes('tươi') || lower.includes('rau') || lower.includes('quả') || lower.includes('thịt')) return { icon: 'fa-apple-alt', bg: 'bg-emerald-100 text-emerald-600' };
    if (lower.includes('kem') || lower.includes('lạnh')) return { icon: 'fa-ice-cream', bg: 'bg-yellow-100 text-yellow-600' };
    if (lower.includes('y tế') || lower.includes('thuốc') || lower.includes('sức khỏe')) return { icon: 'fa-pills', bg: 'bg-teal-100 text-teal-600' };
    if (lower.includes('cá nhân') || lower.includes('mỹ phẩm') || lower.includes('xà phòng')) return { icon: 'fa-pump-soap', bg: 'bg-violet-100 text-violet-600' };
    return { icon: 'fa-tag', bg: 'bg-indigo-100 text-indigo-600' };
}

function renderCategoriesTable(list) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">
            <i class="fas fa-th-large text-3xl text-gray-300 block mb-2"></i>
            Chưa có danh mục nào phù hợp. Hãy nhấn <strong>"+ Thêm danh mục mới"</strong>.
        </td></tr>`;
        return;
    }

    let html = '';
    list.forEach(c => {
        const iconInfo = getCategoryIcon(c.name, c.slug);
        const isActive = c.isActive;

        html += `
            <tr class="hover:bg-gray-50/70 transition-colors">
                <td class="p-4 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${iconInfo.bg} flex items-center justify-center text-base shadow-sm shrink-0">
                        <i class="fas ${iconInfo.icon}"></i>
                    </div>
                    <div>
                        <span class="font-bold text-gray-800 text-sm block">${c.name}</span>
                        <span class="text-[11px] text-gray-400 font-mono">ID: #${c.id}</span>
                    </div>
                </td>
                <td class="p-4 font-mono text-gray-600 text-xs">
                    <span class="bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">${c.slug}</span>
                </td>
                <td class="p-4 text-center">
                    <span class="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold border border-indigo-100">
                        ${c.productCount || 0} sản phẩm
                    </span>
                </td>
                <td class="p-4 text-center">
                    ${isActive ? `
                        <button type="button" onclick="toggleCategoryStatus(${c.id})" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 transition-all shadow-sm group cursor-pointer" title="Danh mục đang HIỂN THỊ trên trang chủ. Bấm vào đây để ẨN đi.">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Đang hiển thị</span>
                            <i class="fas fa-toggle-on text-emerald-600 text-base ml-1 group-hover:scale-110 transition-transform"></i>
                        </button>
                    ` : `
                        <button type="button" onclick="toggleCategoryStatus(${c.id})" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all shadow-sm group cursor-pointer" title="Danh mục đang BỊ ẨN khỏi trang chủ. Bấm vào đây để HIỂN THỊ lại.">
                            <span class="w-2 h-2 rounded-full bg-rose-400"></span>
                            <span>Đang ẩn</span>
                            <i class="fas fa-toggle-off text-rose-400 text-base ml-1 group-hover:scale-110 transition-transform"></i>
                        </button>
                    `}
                </td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <button type="button" onclick="openCategoryEditModal(${c.id})" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm" title="Chỉnh sửa thông tin danh mục">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button type="button" onclick="toggleCategoryStatus(${c.id})" class="px-3 py-1.5 ${isActive ? 'bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700' : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700'} rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm" title="${isActive ? 'Ẩn danh mục' : 'Hiện danh mục'}">
                            <i class="fas ${isActive ? 'fa-eye-slash' : 'fa-eye'}"></i> ${isActive ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button type="button" onclick="deleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm" title="Xóa danh mục">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function openCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    document.getElementById('category-form')?.reset();
    document.getElementById('category-modal-title').innerText = 'Thêm Danh mục mới';
    document.getElementById('category-modal-id').value = '';
    const slugInput = document.getElementById('category-modal-slug');
    if (slugInput) {
        slugInput.value = '';
        delete slugInput.dataset.manual;
    }
    document.getElementById('category-modal-active').checked = true;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('category-modal-content')?.classList.remove('scale-95');
        document.getElementById('category-modal-content')?.classList.add('scale-100');
        document.getElementById('category-modal-name')?.focus();
    }, 10);
}

function openCategoryEditModal(id) {
    const cat = cachedCategoriesAdmin.find(c => c.id === id);
    if (!cat) return;
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    document.getElementById('category-modal-title').innerText = 'Chỉnh sửa Danh mục #' + cat.id;
    document.getElementById('category-modal-id').value = cat.id;
    document.getElementById('category-modal-name').value = cat.name;
    const slugInput = document.getElementById('category-modal-slug');
    if (slugInput) {
        slugInput.value = cat.slug || '';
        slugInput.dataset.manual = 'true';
    }
    document.getElementById('category-modal-active').checked = !!cat.isActive;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('category-modal-content')?.classList.remove('scale-95');
        document.getElementById('category-modal-content')?.classList.add('scale-100');
        document.getElementById('category-modal-name')?.focus();
    }, 10);
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const content = document.getElementById('category-modal-content');
    if (content) {
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
    }
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function handleSaveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('category-modal-id').value;
    const name = document.getElementById('category-modal-name').value.trim();
    const slug = document.getElementById('category-modal-slug').value.trim();
    const isActive = document.getElementById('category-modal-active').checked;

    if (!name) {
        showToast('Vui lòng nhập tên danh mục!', 'warning');
        return;
    }

    const formData = new FormData();
    if (id) formData.append('id', id);
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('isActive', isActive);

    const btn = document.getElementById('btn-save-category');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang lưu...';
    }

    fetch(window.API_BASE + '/Admin/SaveCategory', {
        method: 'POST',
        body: formData,
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Lưu danh mục';
        }
        if (data.success) {
            showToast(data.message, 'success');
            closeCategoryModal();
            fetchCategoriesAdmin();
            fetchCategories(); // Đồng bộ dropdown sản phẩm
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save mr-1"></i> Lưu danh mục';
        }
        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
    });
}

function toggleCategoryStatus(id) {
    fetch(window.API_BASE + '/Admin/ToggleCategoryStatus/' + id, {
        method: 'POST',
        mode: 'cors'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            fetchCategoriesAdmin();
            fetchCategories();
        } else {
            showToast('Lỗi: ' + data.message, 'error');
        }
    })
    .catch(err => showToast('Lỗi kết nối máy chủ: ' + err.message, 'error'));
}

function deleteCategory(id, name) {
    if (confirm(`Bạn có chắc muốn xóa danh mục "${name}"?\n(Lưu ý: Nếu danh mục đã có sản phẩm, bạn nên chọn Ẩn thay vì Xóa).`)) {
        fetch(window.API_BASE + '/Admin/DeleteCategory/' + id, {
            method: 'POST',
            mode: 'cors'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast(data.message, 'success');
                fetchCategoriesAdmin();
                fetchCategories();
            } else {
                showToast('Lỗi: ' + data.message, 'error');
            }
        })
        .catch(err => showToast('Lỗi kết nối máy chủ: ' + err.message, 'error'));
    }
}

// ==========================================
// MODULE 3: BÁO CÁO DOANH THU (CHO ADMIN & QUẢN LÝ)
// ==========================================
let currentRevenueMode = 'month'; // 'day' | 'month' | 'year'
let revenueChartInstance = null;
let currentRevenueChartType = 'bar'; // 'bar' | 'line'
let lastRevenueReportData = null;

function setRevenueMode(mode) {
    currentRevenueMode = mode;
    
    // Toggle button styles
    const btnDay = document.getElementById('btn-mode-day');
    const btnMonth = document.getElementById('btn-mode-month');
    const btnYear = document.getElementById('btn-mode-year');
    
    [btnDay, btnMonth, btnYear].forEach(btn => {
        if (!btn) return;
        btn.className = 'px-5 py-2 rounded-xl text-sm font-bold transition-all text-gray-600 hover:text-gray-900';
    });

    const activeBtn = mode === 'day' ? btnDay : (mode === 'month' ? btnMonth : btnYear);
    if (activeBtn) {
        activeBtn.className = 'px-5 py-2 rounded-xl text-sm font-bold transition-all bg-white text-emerald-600 shadow-sm';
    }

    // Toggle filter container visibility
    const cDay = document.getElementById('filter-container-day');
    const cMonth = document.getElementById('filter-container-month');
    const cYear = document.getElementById('filter-container-year');

    if (mode === 'day') {
        if (cDay) cDay.classList.remove('hidden');
        if (cMonth) cMonth.classList.add('hidden');
        if (cYear) cYear.classList.add('hidden');
        
        // Default today's date if empty
        const dateInput = document.getElementById('revenue-date-picker');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        }
    } else if (mode === 'month') {
        if (cDay) cDay.classList.add('hidden');
        if (cMonth) cMonth.classList.remove('hidden');
        if (cYear) cYear.classList.remove('hidden');
    } else { // 'year'
        if (cDay) cDay.classList.add('hidden');
        if (cMonth) cMonth.classList.add('hidden');
        if (cYear) cYear.classList.remove('hidden');
    }

    fetchRevenueReport();
}

function toggleRevenueChartType(type) {
    currentRevenueChartType = type;
    const btnBar = document.getElementById('btn-chart-bar');
    const btnLine = document.getElementById('btn-chart-line');
    
    if (type === 'bar') {
        if (btnBar) {
            btnBar.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-800 shadow-sm transition-all';
        }
        if (btnLine) {
            btnLine.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-gray-800 transition-all';
        }
    } else {
        if (btnLine) {
            btnLine.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-800 shadow-sm transition-all';
        }
        if (btnBar) {
            btnBar.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-gray-800 transition-all';
        }
    }

    if (lastRevenueReportData && lastRevenueReportData.chart) {
        renderRevenueChart(lastRevenueReportData.chart, lastRevenueReportData.reportType);
    }
}

function fetchRevenueReport() {
    const apiBase = window.API_BASE || '';
    const params = new URLSearchParams();
    params.append('type', currentRevenueMode);

    const datePicker = document.getElementById('revenue-date-picker');
    const monthSelect = document.getElementById('revenue-month-select');
    const yearSelect = document.getElementById('revenue-year-select');
    const storeSelect = document.getElementById('revenue-store-select');
    const statusSelect = document.getElementById('revenue-status-filter');

    if (currentRevenueMode === 'day') {
        let d = datePicker ? datePicker.value : '';
        if (!d) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            d = `${yyyy}-${mm}-${dd}`;
            if (datePicker) datePicker.value = d;
        }
        params.append('date', d);
    } else if (currentRevenueMode === 'month') {
        const m = monthSelect ? monthSelect.value : (new Date().getMonth() + 1);
        const y = yearSelect ? yearSelect.value : new Date().getFullYear();
        params.append('month', m);
        params.append('year', y);
    } else if (currentRevenueMode === 'year') {
        const y = yearSelect ? yearSelect.value : new Date().getFullYear();
        params.append('year', y);
    }

    if (storeSelect && storeSelect.value) {
        params.append('storeId', storeSelect.value);
    }
    if (statusSelect && statusSelect.value) {
        params.append('statusFilter', statusSelect.value);
    }

    // Loading indicator
    const totalEl = document.getElementById('rev-stat-total');
    if (totalEl) totalEl.innerHTML = '<i class="fas fa-spinner fa-spin text-xl text-emerald-200"></i>';

    fetch(`${apiBase}/Admin/GetRevenueReport?${params.toString()}`)
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                lastRevenueReportData = res;
                renderRevenueSummary(res.summary, res.filter, res.reportType);
                renderRevenueChart(res.chart, res.reportType);
                renderRevenueTable(res.tableData, res.reportType);
                renderTopProducts(res.topProducts);
                renderStoreBreakdown(res.storeBreakdown);
                renderRevenueOrders(res.orders);
            } else {
                showToast('Lỗi tải báo cáo: ' + (res.message || 'Không xác định'), 'error');
            }
        })
        .catch(err => {
            console.error('[Revenue] Lỗi kết nối API:', err);
            showToast('Không thể kết nối đến máy chủ báo cáo!', 'error');
        });
}

function renderRevenueSummary(summary, filter, reportType) {
    if (!summary) return;

    const totalEl = document.getElementById('rev-stat-total');
    const ordersEl = document.getElementById('rev-stat-orders');
    const aovEl = document.getElementById('rev-stat-aov');
    const shipEl = document.getElementById('rev-stat-shipping');
    const discEl = document.getElementById('rev-stat-discount');
    const periodLabel = document.getElementById('rev-stat-period-label');
    const chartTitle = document.getElementById('revenue-chart-title');
    const tableSub = document.getElementById('rev-table-sub');

    if (totalEl) totalEl.innerText = formatVND(summary.totalRevenue);
    if (ordersEl) ordersEl.innerText = summary.totalOrders + ' đơn';
    if (aovEl) aovEl.innerText = formatVND(summary.averageOrderValue);
    if (shipEl) shipEl.innerText = formatVND(summary.totalShippingFee);
    if (discEl) discEl.innerText = 'Giảm giá: ' + formatVND(summary.totalDiscount);

    // Cập nhật card trên dashboard nếu có
    const dashRevenue = document.getElementById('stat-total-revenue');
    if (dashRevenue) dashRevenue.innerText = formatVND(summary.totalRevenue);

    let periodText = '';
    if (reportType === 'day') {
        const d = filter.date || '';
        periodText = `Ngày ${d ? d.split('-').reverse().join('/') : 'Hôm nay'}`;
        if (chartTitle) chartTitle.innerHTML = `<i class="fas fa-chart-column text-emerald-500"></i> Diễn biến doanh thu theo khung giờ (${periodText})`;
        if (tableSub) tableSub.innerText = `Chi tiết doanh thu 24 khung giờ trong ${periodText}`;
    } else if (reportType === 'month') {
        periodText = `Tháng ${filter.month}/${filter.year}`;
        if (chartTitle) chartTitle.innerHTML = `<i class="fas fa-chart-column text-emerald-500"></i> Diễn biến doanh thu từng ngày trong ${periodText}`;
        if (tableSub) tableSub.innerText = `Chi tiết doanh thu các ngày trong ${periodText}`;
    } else {
        periodText = `Cả năm ${filter.year}`;
        if (chartTitle) chartTitle.innerHTML = `<i class="fas fa-chart-column text-emerald-500"></i> Diễn biến doanh thu 12 tháng năm ${filter.year}`;
        if (tableSub) tableSub.innerText = `Chi tiết doanh thu 12 tháng năm ${filter.year}`;
    }

    if (periodLabel) periodLabel.innerHTML = `<i class="fas fa-clock mr-1"></i> Kỳ: <b>${periodText}</b>`;
}

function renderRevenueChart(chartData, reportType) {
    if (!chartData) return;
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
        revenueChartInstance = null;
    }

    if (typeof Chart === 'undefined') {
        console.warn('[Revenue] Chart.js chưa được tải!');
        return;
    }

    const ctx = canvas.getContext('2d');
    const labels = chartData.labels || [];
    const revenueValues = chartData.revenue || [];
    const orderValues = chartData.orderCount || [];

    const isLine = currentRevenueChartType === 'line';

    revenueChartInstance = new Chart(ctx, {
        type: isLine ? 'line' : 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doanh thu (VNĐ)',
                    data: revenueValues,
                    backgroundColor: isLine ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.85)',
                    borderColor: '#10b981',
                    borderWidth: 2,
                    borderRadius: isLine ? 0 : 8,
                    fill: isLine,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Số đơn hàng',
                    data: orderValues,
                    type: 'line',
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2.5,
                    borderDash: [4, 4],
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4,
                    tension: 0.2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: "'Inter', sans-serif", size: 12, weight: 'bold' }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.yAxisID === 'y') {
                                return ' Doanh thu: ' + formatVND(context.parsed.y);
                            }
                            return ' Số đơn hàng: ' + context.parsed.y + ' đơn';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#f3f4f6' },
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
                            if (value >= 1000) return (value / 1000).toFixed(0) + ' k';
                            return value;
                        },
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        stepSize: 1,
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                }
            }
        }
    });
}

function renderRevenueTable(tableData, reportType) {
    const tbody = document.getElementById('rev-time-table-body');
    const badge = document.getElementById('rev-table-count-badge');
    if (!tbody) return;

    if (!tableData || tableData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400">Không có dữ liệu trong khoảng thời gian này.</td></tr>';
        if (badge) badge.innerText = '0 mốc';
        return;
    }

    if (badge) badge.innerText = `${tableData.length} mốc`;

    let html = '';
    tableData.forEach(row => {
        const hasData = row.revenue > 0 || row.orderCount > 0;
        html += `
            <tr class="hover:bg-gray-50/80 transition-colors ${hasData ? 'font-medium' : 'text-gray-400'}">
                <td class="p-3.5 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${hasData ? 'bg-emerald-500' : 'bg-gray-200'}"></span>
                    <span class="${hasData ? 'text-gray-800 font-semibold' : 'text-gray-400'}">${row.timeLabel}</span>
                </td>
                <td class="p-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold ${row.orderCount > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}">
                        ${row.orderCount}
                    </span>
                </td>
                <td class="p-3.5 text-right font-bold ${hasData ? 'text-emerald-600' : 'text-gray-400'}">
                    ${formatVND(row.revenue)}
                </td>
                <td class="p-3.5 text-right text-xs text-gray-500">
                    ${row.averageValue > 0 ? formatVND(row.averageValue) : '-'}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function renderTopProducts(topProducts) {
    const container = document.getElementById('rev-top-products-list');
    if (!container) return;

    if (!topProducts || topProducts.length === 0) {
        container.innerHTML = '<div class="py-6 text-center text-xs text-gray-400">Chưa có sản phẩm nào bán ra trong kỳ báo cáo này.</div>';
        return;
    }

    const rankColors = [
        'bg-amber-400 text-white',
        'bg-slate-300 text-gray-700',
        'bg-amber-600 text-white',
        'bg-gray-100 text-gray-600',
        'bg-gray-100 text-gray-600'
    ];

    let html = '';
    topProducts.forEach((p, idx) => {
        html += `
            <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-lg ${rankColors[idx] || 'bg-gray-100 text-gray-600'} flex items-center justify-center font-bold text-xs shrink-0">
                        ${idx + 1}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 text-xs line-clamp-1">${p.productName}</p>
                        <p class="text-[11px] text-gray-400">Mã: ${p.productCode} &bull; Đã bán: <b class="text-gray-700">${p.quantitySold}</b></p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-bold text-xs text-emerald-600">${formatVND(p.revenue)}</span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderStoreBreakdown(storeBreakdown) {
    const container = document.getElementById('rev-stores-breakdown-list');
    if (!container) return;

    if (!storeBreakdown || storeBreakdown.length === 0) {
        container.innerHTML = '<div class="py-6 text-center text-xs text-gray-400">Không có dữ liệu chi nhánh.</div>';
        return;
    }

    const totalRev = storeBreakdown.reduce((sum, s) => sum + (s.revenue || 0), 0) || 1;

    let html = '';
    storeBreakdown.forEach(s => {
        const pct = Math.round((s.revenue / totalRev) * 100);
        html += `
            <div class="p-3 rounded-xl bg-gray-50 space-y-2">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-gray-800 flex items-center gap-1.5">
                        <i class="fas fa-location-dot text-red-500 text-[11px]"></i> ${s.storeName}
                    </span>
                    <span class="font-black text-emerald-600">${formatVND(s.revenue)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Số đơn: <b class="text-gray-700">${s.orderCount}</b></span>
                    <span>Tỷ trọng: <b class="text-emerald-700">${pct}%</b></span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderRevenueOrders(orders) {
    const tbody = document.getElementById('rev-orders-table-body');
    const badge = document.getElementById('rev-orders-count-badge');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">Không có đơn hàng nào được ghi nhận trong kỳ báo cáo này.</td></tr>';
        if (badge) badge.innerText = '0 đơn hàng';
        return;
    }

    if (badge) badge.innerText = `${orders.length} đơn hàng`;

    let html = '';
    orders.forEach(o => {
        html += `
            <tr class="hover:bg-gray-50/80 transition-colors">
                <td class="p-3.5 font-bold text-gray-900 whitespace-nowrap">
                    <span class="text-brand-orange">#${o.orderCode}</span>
                </td>
                <td class="p-3.5">
                    <p class="font-semibold text-gray-800">${o.customerName}</p>
                    <p class="text-xs text-gray-400">${o.customerPhone || 'Không có SĐT'}</p>
                </td>
                <td class="p-3.5 text-xs text-gray-600 whitespace-nowrap">
                    ${o.storeName}
                </td>
                <td class="p-3.5 text-xs text-gray-500 whitespace-nowrap">
                    ${o.createdAt}
                </td>
                <td class="p-3.5 text-right font-black text-gray-900 whitespace-nowrap">
                    ${formatVND(o.totalAmount)}
                </td>
                <td class="p-3.5 text-center whitespace-nowrap">
                    ${getOrderStatusBadge(o.orderStatus, o.orderStatusText)}
                </td>
                <td class="p-3.5 text-center whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${o.paymentStatus === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${o.paymentStatusText}
                    </span>
                </td>
                <td class="p-3.5 text-right whitespace-nowrap">
                    <button onclick="viewOrderDetail(${o.orderId})" class="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                        <i class="fas fa-eye mr-1"></i> Chi tiết
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function exportRevenueToCsv() {
    if (!lastRevenueReportData || !lastRevenueReportData.tableData) {
        showToast('Chưa có dữ liệu báo cáo để xuất!', 'error');
        return;
    }

    const reportType = lastRevenueReportData.reportType;
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'BÁO CÁO DOANH THU SUPERSTORE\n';
    csv += `Loại báo cáo: ${reportType === 'day' ? 'Theo Ngày' : (reportType === 'month' ? 'Theo Tháng' : 'Theo Năm')}\n`;
    csv += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
    csv += `Tổng doanh thu: ${lastRevenueReportData.summary.totalRevenue}\n`;
    csv += `Tổng số đơn: ${lastRevenueReportData.summary.totalOrders}\n\n`;

    csv += 'Thời gian,Số đơn hàng,Doanh thu (VNĐ),Giá trị trung bình (VNĐ)\n';
    lastRevenueReportData.tableData.forEach(row => {
        csv += `"${row.timeLabel}",${row.orderCount},${row.revenue},${row.averageValue}\n`;
    });

    if (lastRevenueReportData.orders && lastRevenueReportData.orders.length > 0) {
        csv += '\nDANH SÁCH ĐƠN HÀNG TRONG KỲ\n';
        csv += 'Mã đơn,Khách hàng,Số điện thoại,Chi nhánh,Thời gian,Tổng tiền (VNĐ),Trạng thái đơn,Thanh toán\n';
        lastRevenueReportData.orders.forEach(o => {
            csv += `"${o.orderCode}","${o.customerName}","${o.customerPhone}","${o.storeName}","${o.createdAt}",${o.totalAmount},"${o.orderStatusText}","${o.paymentStatusText}"\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCao_DoanhThu_${reportType}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file báo cáo CSV / Excel thành công!', 'success');
}

function printRevenueReport() {
    window.print();
}

// Export functions explicitly to window to ensure HTML onclick can always access them
window.setRevenueMode = setRevenueMode;
window.toggleRevenueChartType = toggleRevenueChartType;
window.fetchRevenueReport = fetchRevenueReport;
window.exportRevenueToCsv = exportRevenueToCsv;
window.printRevenueReport = printRevenueReport;
window.switchTab = switchTab;
window.switchStaffTab = switchStaffTab;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.addVariantRow = addVariantRow;
window.handleSaveProduct = handleSaveProduct;
window.deleteProduct = deleteProduct;
window.openStockModal = openStockModal;
window.closeStockModal = closeStockModal;
window.handleUpdateStock = handleUpdateStock;
window.openPermissionModal = openPermissionModal;
window.openPermissionModalForUser = openPermissionModalForUser;
window.openUserMenuModal = openUserMenuModal;
window.resetUserMenuToRoleDefault = resetUserMenuToRoleDefault;
window.reloadCurrentModalPermissions = reloadCurrentModalPermissions;
window.reloadUserMenuPermissions = reloadUserMenuPermissions;
window.onPermissionTargetChange = onPermissionTargetChange;
window.saveStaffPermissionsAction = saveStaffPermissionsAction;
window.resetDefaultPermissions = resetDefaultPermissions;
window.closePermissionModal = closePermissionModal;
window.applyStaffPermissions = applyStaffPermissions;
window.fetchProducts = fetchProducts;
window.fetchInventory = fetchInventory;
window.fetchUsers = fetchUsers;
window.deleteUser = deleteUser;
window.showToast = showToast;
window.logout = logout;
window.initModule1 = initModule1;
window.previewProductImage = previewProductImage;
window.clearProductImage = clearProductImage;
window.handleProductImageFileSelect = handleProductImageFileSelect;
window.fetchOrders = fetchOrders;
window.filterOrders = filterOrders;
window.debounceOrderSearch = debounceOrderSearch;
window.viewOrderDetail = viewOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.updateOrderStatusAction = updateOrderStatusAction;
window.confirmOrderAction = confirmOrderAction;
window.deleteOrderAction = deleteOrderAction;
window.togglePaymentStatusModal = togglePaymentStatusModal;
window.printOrderInvoice = printOrderInvoice;
window.fetchCategoriesAdmin = fetchCategoriesAdmin;
window.filterCategoriesTable = filterCategoriesTable;
window.generateVietnameseSlug = generateVietnameseSlug;
window.openCategoryModal = openCategoryModal;
window.openCategoryEditModal = openCategoryEditModal;
window.closeCategoryModal = closeCategoryModal;
window.handleSaveCategory = handleSaveCategory;
window.toggleCategoryStatus = toggleCategoryStatus;
window.deleteCategory = deleteCategory;

// =========================================================================
// BANNER MANAGEMENT (ADMIN)
// =========================================================================
let cachedBannerConfig = {
    mode: 'gradient',
    tag: 'Siêu khuyến mãi',
    title: 'Ngày hội\nSiêu Sale 50%',
    description: 'Áp dụng cho toàn bộ đồ uống và đồ ăn nhanh. Freeship cho đơn từ 99K.',
    buttonText: 'Mua Ngay',
    buttonLink: '#flash-sale-products',
    iconClass: 'fas fa-hamburger',
    gradientFrom: '#ff5722',
    gradientTo: '#ff8a50',
    imageUrl: '',
    imageLink: '#flash-sale-products'
};

function fetchBannerConfigAdmin() {
    fetch(window.API_BASE + '/Admin/GetBannerConfig', { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                cachedBannerConfig = res.data;
                renderBannerAdminForm(res.data);
            }
        })
        .catch(err => {
            console.error('[Banner] Lỗi tải cấu hình banner:', err);
            showToast('Không tải được cấu hình banner: ' + err.message, 'error');
        });
}

function renderBannerAdminForm(data) {
    if (!data) return;

    // Set mode
    const mode = data.mode || 'gradient';
    const radio = document.querySelector(`input[name="banner_mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    switchBannerMode(mode, false);

    // Image fields
    const elImgUrl = document.getElementById('banner-image-url');
    if (elImgUrl) elImgUrl.value = data.imageUrl || '';
    const elImgLink = document.getElementById('banner-image-link');
    if (elImgLink) elImgLink.value = data.imageLink || '#flash-sale-products';

    // Gradient fields
    const elTag = document.getElementById('banner-tag-input');
    if (elTag) elTag.value = data.tag || 'Siêu khuyến mãi';
    const elTitle = document.getElementById('banner-title-input');
    if (elTitle) elTitle.value = data.title || 'Ngày hội\nSiêu Sale 50%';
    const elDesc = document.getElementById('banner-desc-input');
    if (elDesc) elDesc.value = data.description || '';
    const elBtnText = document.getElementById('banner-btn-text-input');
    if (elBtnText) elBtnText.value = data.buttonText || 'Mua Ngay';
    const elBtnLink = document.getElementById('banner-btn-link-input');
    if (elBtnLink) elBtnLink.value = data.buttonLink || '#flash-sale-products';
    const elIcon = document.getElementById('banner-icon-select');
    if (elIcon) elIcon.value = data.iconClass || 'fas fa-hamburger';

    // Colors
    const fromColor = data.gradientFrom || '#ff5722';
    const toColor = data.gradientTo || '#ff8a50';
    const elGradFrom = document.getElementById('banner-grad-from');
    if (elGradFrom) elGradFrom.value = fromColor;
    const elGradFromText = document.getElementById('banner-grad-from-text');
    if (elGradFromText) elGradFromText.value = fromColor;
    const elGradTo = document.getElementById('banner-grad-to');
    if (elGradTo) elGradTo.value = toColor;
    const elGradToText = document.getElementById('banner-grad-to-text');
    if (elGradToText) elGradToText.value = toColor;

    // Updated at
    const elUpdated = document.getElementById('banner-last-updated');
    if (elUpdated) {
        elUpdated.innerText = data.updatedAt ? `Cập nhật lần cuối: ${data.updatedAt}` : 'Chưa cập nhật lần nào';
    }

    previewBannerLive();
}

function switchBannerMode(mode, triggerPreview = true) {
    const isImage = mode === 'image';
    const imgFields = document.getElementById('banner-mode-image-fields');
    const gradFields = document.getElementById('banner-mode-gradient-fields');
    const labelGrad = document.getElementById('label-mode-gradient');
    const labelImg = document.getElementById('label-mode-image');

    if (imgFields) imgFields.classList.toggle('hidden', !isImage);
    if (gradFields) gradFields.classList.toggle('hidden', isImage);

    if (labelGrad) {
        if (!isImage) {
            labelGrad.className = 'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-brand-orange bg-orange-50/50';
        } else {
            labelGrad.className = 'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-gray-200 hover:border-gray-300';
        }
    }
    if (labelImg) {
        if (isImage) {
            labelImg.className = 'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-brand-orange bg-orange-50/50';
        } else {
            labelImg.className = 'flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all border-gray-200 hover:border-gray-300';
        }
    }

    if (triggerPreview) previewBannerLive();
}

function syncColorInput(type) {
    if (type === 'from') {
        const c = document.getElementById('banner-grad-from').value;
        document.getElementById('banner-grad-from-text').value = c;
    } else {
        const c = document.getElementById('banner-grad-to').value;
        document.getElementById('banner-grad-to-text').value = c;
    }
    previewBannerLive();
}

function syncColorInputText(type) {
    if (type === 'from') {
        const c = document.getElementById('banner-grad-from-text').value;
        if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
            document.getElementById('banner-grad-from').value = c;
        }
    } else {
        const c = document.getElementById('banner-grad-to-text').value;
        if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
            document.getElementById('banner-grad-to').value = c;
        }
    }
    previewBannerLive();
}

function previewBannerLive() {
    const preview = document.getElementById('admin-banner-preview');
    if (!preview) return;

    const mode = document.querySelector('input[name="banner_mode"]:checked')?.value || 'gradient';

    if (mode === 'image') {
        const imgUrl = document.getElementById('banner-image-url')?.value.trim() || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200';
        const imgLink = document.getElementById('banner-image-link')?.value.trim() || '#flash-sale-products';

        preview.className = 'rounded-3xl overflow-hidden shadow-xl p-0 relative transition-all duration-300';
        preview.style.background = 'none';
        preview.innerHTML = `
            <div class="relative w-full overflow-hidden rounded-3xl group">
                <img src="${imgUrl}" alt="Banner Preview" class="w-full h-auto object-cover max-h-[360px] rounded-3xl"
                     onerror="this.parentElement.innerHTML='<div class=\\'p-12 text-center text-red-500 font-bold bg-white\\'><i class=\\'fas fa-exclamation-triangle mr-2\\'></i>Không tải được ảnh, vui lòng kiểm tra lại URL hoặc file vừa upload!</div>'">
                <div class="absolute bottom-3 left-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-xl font-medium">
                    <i class="fas fa-link mr-1"></i> Link đích: ${imgLink}
                </div>
            </div>
        `;
    } else {
        const fromColor = document.getElementById('banner-grad-from')?.value || '#ff5722';
        const toColor = document.getElementById('banner-grad-to')?.value || '#ff8a50';
        const tag = document.getElementById('banner-tag-input')?.value || 'Siêu khuyến mãi';
        const rawTitle = document.getElementById('banner-title-input')?.value || 'Ngày hội\nSiêu Sale 50%';
        const titleHtml = rawTitle.replace(/\n/g, '<br/>');
        const desc = document.getElementById('banner-desc-input')?.value || 'Áp dụng cho toàn bộ đồ uống và đồ ăn nhanh. Freeship cho đơn từ 99K.';
        const btnText = document.getElementById('banner-btn-text-input')?.value || 'Mua Ngay';
        const btnLink = document.getElementById('banner-btn-link-input')?.value || '#flash-sale-products';
        const iconClass = document.getElementById('banner-icon-select')?.value || 'fas fa-hamburger';

        preview.className = 'rounded-3xl overflow-hidden shadow-xl p-8 md:p-12 text-white relative flex flex-col md:flex-row items-center justify-between transition-all duration-300';
        preview.style.background = `linear-gradient(135deg, ${fromColor}, ${toColor})`;

        preview.innerHTML = `
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div class="relative z-10 md:w-1/2 space-y-4">
                <span class="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm inline-block">${tag}</span>
                <h1 class="text-3xl md:text-5xl font-bold leading-tight">${titleHtml}</h1>
                <p class="text-white/90 text-sm md:text-base">${desc}</p>
                <div class="pt-2">
                    <span class="inline-block bg-white text-brand-orange px-6 py-2.5 rounded-full font-bold text-xs shadow-lg">${btnText}</span>
                    <span class="text-[11px] text-white/80 ml-3 italic"><i class="fas fa-link mr-1"></i>${btnLink}</span>
                </div>
            </div>
            
            <div class="relative z-10 md:w-1/2 mt-6 md:mt-0 flex justify-center">
                <div class="w-48 h-48 md:w-56 md:h-56 bg-white/20 backdrop-blur-md rounded-full border-4 border-white/30 flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <i class="${iconClass} text-6xl md:text-7xl text-white/90 drop-shadow-lg floating-animation"></i>
                </div>
            </div>
        `;
    }
}

function uploadBannerImageAdmin(fileInput) {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const statusEl = document.getElementById('banner-file-status');
    if (statusEl) {
        statusEl.innerHTML = `<span class="text-brand-orange font-bold"><i class="fas fa-spinner fa-spin mr-1"></i>Đang tải file lên (${file.name})...</span>`;
    }

    const formData = new FormData();
    formData.append('file', file);

    fetch(window.API_BASE + '/Admin/UploadBannerImage', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if (res.success && res.url) {
            const urlInput = document.getElementById('banner-image-url');
            if (urlInput) urlInput.value = res.url;
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-emerald-600 font-bold"><i class="fas fa-check-circle mr-1"></i>Đã tải ảnh thành công: ${file.name}</span>`;
            }
            showToast('Tải ảnh banner lên máy chủ thành công!', 'success');
            previewBannerLive();
        } else {
            if (statusEl) {
                statusEl.innerHTML = `<span class="text-red-500 font-bold"><i class="fas fa-times-circle mr-1"></i>Lỗi tải ảnh: ${res.message || 'Thất bại'}</span>`;
            }
            showToast('Lỗi tải ảnh: ' + (res.message || 'Không thành công'), 'error');
        }
    })
    .catch(err => {
        if (statusEl) {
            statusEl.innerHTML = `<span class="text-red-500 font-bold"><i class="fas fa-times-circle mr-1"></i>Lỗi kết nối máy chủ!</span>`;
        }
        showToast('Lỗi kết nối: ' + err.message, 'error');
    });
}

function saveBannerConfigAdmin() {
    const btn = document.getElementById('btn-save-banner');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu...`;
    }

    const mode = document.querySelector('input[name="banner_mode"]:checked')?.value || 'gradient';
    const configData = {
        mode: mode,
        imageUrl: document.getElementById('banner-image-url')?.value.trim() || '',
        imageLink: document.getElementById('banner-image-link')?.value.trim() || '#flash-sale-products',
        tag: document.getElementById('banner-tag-input')?.value.trim() || 'Siêu khuyến mãi',
        title: document.getElementById('banner-title-input')?.value.trim() || 'Ngày hội\nSiêu Sale 50%',
        description: document.getElementById('banner-desc-input')?.value.trim() || '',
        buttonText: document.getElementById('banner-btn-text-input')?.value.trim() || 'Mua Ngay',
        buttonLink: document.getElementById('banner-btn-link-input')?.value.trim() || '#flash-sale-products',
        iconClass: document.getElementById('banner-icon-select')?.value || 'fas fa-hamburger',
        gradientFrom: document.getElementById('banner-grad-from')?.value || '#ff5722',
        gradientTo: document.getElementById('banner-grad-to')?.value || '#ff8a50'
    };

    fetch(window.API_BASE + '/Admin/SaveBannerConfig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
    })
    .then(res => res.json())
    .then(res => {
        if (res.success) {
            showToast(res.message || 'Lưu cài đặt Banner thành công!', 'success');
            const elUpdated = document.getElementById('banner-last-updated');
            if (elUpdated && res.data && res.data.updatedAt) {
                elUpdated.innerText = `Cập nhật lần cuối: ${res.data.updatedAt}`;
            }
        } else {
            showToast('Lỗi lưu banner: ' + res.message, 'error');
        }
    })
    .catch(err => {
        showToast('Lỗi kết nối: ' + err.message, 'error');
    })
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-save mr-2"></i>Lưu cài đặt Banner`;
        }
    });
}

// Window exports
window.fetchBannerConfigAdmin = fetchBannerConfigAdmin;
window.renderBannerAdminForm = renderBannerAdminForm;
window.switchBannerMode = switchBannerMode;
window.uploadBannerImageAdmin = uploadBannerImageAdmin;
window.previewBannerLive = previewBannerLive;
window.syncColorInput = syncColorInput;
window.syncColorInputText = syncColorInputText;
window.saveBannerConfigAdmin = saveBannerConfigAdmin;



