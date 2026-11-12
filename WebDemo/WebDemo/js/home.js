// js/home.js
// Quản lý hiển thị sản phẩm và tương tác mua hàng phía người mua (Buyer Storefront)

window.API_BASE = window.API_BASE || (window.location.origin.includes(':2911') ? '' : 'http://localhost:2911');

let activeProducts = [];

const fallbackMockProducts = [
    {
        id: 1,
        code: 'SP-AT-01',
        name: 'Áo Thun Cotton Compact Cổ Tròn',
        price: 189000,
        originalPrice: 220000,
        discount: 15,
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400',
        categoryId: 1,
        categoryName: 'Thời Trang Nam',
        totalStock: 345
    },
    {
        id: 2,
        code: 'SP-SM-02',
        name: 'Áo Sơ Mi Oxford Dài Tay',
        price: 350000,
        originalPrice: 420000,
        discount: 16,
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=400',
        categoryId: 1,
        categoryName: 'Thời Trang Nam',
        totalStock: 100
    },
    {
        id: 3,
        code: 'SP-VD-03',
        name: 'Váy Đầm Hoa Nhí Vintage',
        price: 420000,
        originalPrice: 500000,
        discount: 16,
        image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=400',
        categoryId: 2,
        categoryName: 'Thời Trang Nữ',
        totalStock: 25
    },
    {
        id: 4,
        code: 'SP-CF-04',
        name: 'Cà Phê Cold Brew Đóng Chai 250ml',
        price: 45000,
        originalPrice: 55000,
        discount: 18,
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=400',
        categoryId: 3,
        categoryName: 'Đồ Uống & Nước Giải Khát',
        totalStock: 90
    },
    {
        id: 5,
        code: 'SP-TR-05',
        name: 'Trà Sữa Ô Long Nướng Trân Châu',
        price: 38000,
        originalPrice: 45000,
        discount: 15,
        image: 'https://images.unsplash.com/photo-1558857563-b37cbef7a7dc?auto=format&fit=crop&q=80&w=400',
        categoryId: 3,
        categoryName: 'Đồ Uống & Nước Giải Khát',
        totalStock: 150
    },
    {
        id: 6,
        code: 'SP-BK-06',
        name: 'Bánh Mì Bơ Tỏi Phô Mai Chảy',
        price: 55000,
        originalPrice: 65000,
        discount: 15,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
        categoryId: 4,
        categoryName: 'Thực Phẩm & Bánh Kẹo',
        totalStock: 30
    },
    {
        id: 7,
        code: 'SP-TA-07',
        name: 'Tai Nghe Không Dây True Wireless Pro',
        price: 590000,
        originalPrice: 750000,
        discount: 21,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400',
        categoryId: 5,
        categoryName: 'Phụ Kiện Công Nghệ',
        totalStock: 130
    }
];

function getProductImageUrl(rawUrl) {
    if (!rawUrl || rawUrl.trim() === '') {
        return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400';
    }
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        return rawUrl;
    }
    const base = window.API_BASE || '';
    return base + rawUrl;
}

function loadStorefrontProducts() {
    const container = document.getElementById('flash-sale-products');
    if (!container) return;

    container.innerHTML = `
        <div class="col-span-full py-10 text-center text-gray-400">
            <i class="fas fa-spinner fa-spin text-3xl text-brand-orange mb-3"></i>
            <p class="text-sm">Đang tải sản phẩm từ CSDL SQL Server...</p>
        </div>
    `;

    fetch((window.API_BASE || '') + '/Admin/GetProducts')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.data && data.data.length > 0) {
                activeProducts = data.data.filter(p => p.isActive !== false).map(p => {
                    const price = p.basePrice || (p.variants && p.variants[0] ? p.variants[0].price : 100000);
                    const originalPrice = p.originalPrice || Math.round((price * 1.25) / 1000) * 1000;
                    const discount = p.discountPercent || Math.round(((originalPrice - price) / originalPrice) * 100) || 15;
                    return {
                        id: p.id,
                        code: p.code,
                        name: p.name,
                        price: price,
                        originalPrice: originalPrice,
                        discount: discount,
                        rating: p.ratingAvg || 4.9,
                        reviewCount: p.reviewCount || 128,
                        soldCount: p.soldCount || 950,
                        isFeatured: p.isFeatured || false,
                        isFlashSale: p.isFlashSale || false,
                        warrantyMonths: p.warrantyMonths || 12,
                        origin: p.origin || 'Chính hãng',
                        brandName: p.brandName || '',
                        shortDescription: p.shortDescription || p.description || '',
                        tags: p.tags || [],
                        image: getProductImageUrl(p.imageUrl),
                        categoryId: p.categoryId,
                        categoryName: p.categoryName || 'Sản phẩm',
                        totalStock: p.totalStock,
                        variants: p.variants || []
                    };
                });
                renderProductGrid(activeProducts);
            } else {
                activeProducts = fallbackMockProducts;
                renderProductGrid(activeProducts);
            }
        })
        .catch(err => {
            console.warn('Lỗi kết nối API /Admin/GetProducts, tải dữ liệu mẫu dự phòng:', err);
            activeProducts = fallbackMockProducts;
            renderProductGrid(activeProducts);
        });
}

function renderProductGrid(products) {
    const container = document.getElementById('flash-sale-products');
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <i class="fas fa-search text-4xl text-gray-300 mb-3 block"></i>
                <h4 class="font-bold text-gray-700 text-sm">Không tìm thấy sản phẩm phù hợp!</h4>
                <p class="text-xs text-gray-400 mt-1">Vui lòng thử tìm kiếm bằng từ khóa khác hoặc điều chỉnh lại bộ lọc giá.</p>
                <button type="button" onclick="resetProductFilters()" class="mt-4 px-4 py-2 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-md hover:bg-brand-orange/90 transition-all">
                    Xem tất cả sản phẩm
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    const fallbackImg = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400';

    products.forEach(product => {
        const isFav = typeof isProductInWishlist === 'function' ? isProductInWishlist(product.id) : false;
        const colorVariants = (product.variants || []).filter(v => v.colorHex || v.color);

        html += `
            <div class="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group relative border border-gray-100 flex flex-col h-full">
                <!-- Nút Yêu thích (Wishlist Heart Button) -->
                <button type="button" onclick="handleCardWishlistClick(event, ${product.id})" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-md flex items-center justify-center ${isFav ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'} transition-all z-20 hover:scale-110 active:scale-95" title="${isFav ? 'Bỏ khỏi yêu thích' : 'Lưu vào danh sách yêu thích'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart text-xs"></i>
                </button>
                
                <!-- Huy hiệu Thẻ nhãn (Product Tags từ bảng trung gian) & Giảm giá -->
                <div class="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20 pointer-events-none">
                    ${(product.tags && product.tags.length > 0) ? product.tags.slice(0, 2).map(t => `
                        <span class="${t.badgeColor || 'bg-rose-500 text-white'} text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1 backdrop-blur-xs">
                            <i class="fas ${t.icon || 'fa-tag'} text-[8px]"></i> ${t.tagName}
                        </span>
                    `).join('') : ''}
                    ${product.discount > 0 ? `
                        <span class="bg-gradient-to-r from-red-600 to-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm w-fit">
                            -${product.discount}%
                        </span>
                    ` : ''}
                </div>
                
                <div class="relative overflow-hidden aspect-square bg-gray-50 flex items-center justify-center cursor-pointer" onclick="openProductDetail(${product.id})">
                    <img id="product-img-${product.id}" src="${product.image}" alt="${product.name}" 
                         onerror="this.src='${fallbackImg}'"
                         class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                    <!-- Overlay actions -->
                    <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onclick="event.stopPropagation(); openProductDetail(${product.id})" class="bg-white text-gray-800 w-10 h-10 rounded-full flex items-center justify-center hover:bg-brand-orange hover:text-white transition-colors transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-lg" title="Xem chi tiết & Đánh giá">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-4 flex-1 flex flex-col">
                    <!-- Danh mục, Thương hiệu & Xuất xứ -->
                    <div class="flex items-center justify-between gap-1 mb-1">
                        <span class="text-[10px] font-bold text-brand-orange uppercase">${product.code || ''}</span>
                        <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium truncate max-w-[120px]">${product.categoryName}</span>
                    </div>

                    <div class="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
                        <span class="inline-flex items-center gap-0.5 text-emerald-600 font-medium"><i class="fas fa-check-circle text-[9px]"></i> ${product.origin || 'Chính hãng'}</span>
                        ${product.brandName ? `<span class="text-gray-300">•</span><span class="font-semibold text-gray-600">${product.brandName}</span>` : ''}
                    </div>

                    <h3 class="text-sm text-gray-800 font-semibold line-clamp-2 mb-2 group-hover:text-brand-orange transition-colors cursor-pointer" onclick="openProductDetail(${product.id})" title="${product.name}">${product.name}</h3>
                    
                    <div class="mt-auto">
                        <!-- Giá bán & Giá gốc gạch ngang -->
                        <div class="flex items-baseline gap-2 mb-1.5 flex-wrap">
                            <span class="text-base md:text-lg font-bold text-red-600">${formatCurrency(product.price)}</span>
                            ${product.originalPrice && product.originalPrice > product.price ? `
                                <span class="text-xs text-gray-400 line-through font-normal">${formatCurrency(product.originalPrice)}</span>
                            ` : ''}
                        </div>

                        <!-- Đánh giá sao & Đã bán (Social Proof) -->
                        <div class="flex items-center justify-between text-[11px] mb-2 text-gray-500">
                            <div class="flex items-center gap-1 text-amber-500 font-semibold">
                                <i class="fas fa-star text-[10px]"></i>
                                <span>${Number(product.rating || 4.9).toFixed(1)}</span>
                                <span class="text-gray-400 font-normal">(${product.reviewCount || 128})</span>
                            </div>
                            <span class="text-gray-500 font-medium">Đã bán ${product.soldCount > 1000 ? (product.soldCount / 1000).toFixed(1) + 'k' : (product.soldCount || 150)}</span>
                        </div>

                        <!-- Bộ chọn màu trực quan (Color Hex Swatches) -->
                        ${colorVariants.length > 0 ? `
                            <div class="flex items-center gap-1 mb-2">
                                <span class="text-[10px] text-gray-400 mr-0.5">Màu:</span>
                                ${colorVariants.slice(0, 4).map(v => `
                                    <span class="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-xs inline-block" 
                                          style="background-color: ${v.colorHex || '#94a3b8'};" 
                                          title="${v.color || 'Màu sắc'}"></span>
                                `).join('')}
                                ${colorVariants.length > 4 ? `<span class="text-[9px] text-gray-400 font-medium">+${colorVariants.length - 4}</span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="w-full bg-red-100 rounded-full h-1.5 mb-2">
                            <div class="bg-red-500 h-1.5 rounded-full" style="width: ${Math.min(100, Math.max(20, (product.totalStock || 50)))}%"></div>
                        </div>
                        <div class="text-[11px] text-gray-500 flex justify-between items-center mb-3">
                            <span>Tồn kho: <b>${product.totalStock !== undefined ? product.totalStock : 'Sẵn hàng'}</b></span>
                            <span class="text-emerald-600 font-medium"><i class="fas fa-shield-alt mr-1"></i>BH ${product.warrantyMonths || 12}T</span>
                        </div>
                        
                        <!-- Bộ 2 nút: Thêm giỏ hàng (Trái) & Mua ngay (Phải) -->
                        <div class="grid grid-cols-2 gap-2 mt-1">
                            <button type="button" onclick="addToCart(event, ${product.id})" class="w-full bg-orange-50 text-brand-orange py-2 px-1 rounded-xl text-xs font-bold hover:bg-orange-100 hover:border-brand-orange border border-orange-200 transition-all flex items-center justify-center gap-1 active:scale-95 shadow-sm" title="Thêm vào giỏ hàng">
                                <i class="fas fa-cart-plus text-xs"></i> <span>Thêm giỏ</span>
                            </button>
                            <button type="button" onclick="buyNow(event, ${product.id})" class="w-full bg-gradient-to-r from-brand-orange to-brand-DEFAULT text-white py-2 px-1 rounded-xl text-xs font-bold hover:shadow-md hover:shadow-brand-orange/30 hover:opacity-95 transition-all flex items-center justify-center gap-1 active:scale-95 shadow-sm" title="Mua ngay sản phẩm">
                                <i class="fas fa-bolt text-xs"></i> <span>Mua ngay</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function addToCart(event, productId) {
    const product = activeProducts.find(p => p.id === productId);
    if (!product) return;

    // Check if already in cart
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        const defaultVar = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
        const defaultVariantId = defaultVar ? (defaultVar.variantId || defaultVar.id) : product.id;
        cart.push({
            id: product.id,
            variantId: defaultVariantId,
            name: product.name,
            price: defaultVar && defaultVar.price ? defaultVar.price : product.price,
            image: product.image,
            quantity: 1,
            selectedColor: defaultVar ? defaultVar.color : '',
            selectedSize: defaultVar ? defaultVar.size : ''
        });
    }

    saveCart();
    
    // Fly animation
    flyToCartAnimation(event, productId);
}

function flyToCartAnimation(event, productId) {
    const product = activeProducts.find(p => p.id === productId);
    const prodName = product ? product.name : 'sản phẩm';
    const imgId = `product-img-${productId}`;
    const productImg = document.getElementById(imgId);
    const cartIcon = document.querySelector('.fa-shopping-basket');
    
    if(!productImg || !cartIcon) {
        showToast('Đã thêm ' + prodName + ' vào giỏ hàng!', 'success');
        return;
    }

    // Clone image
    const cloneImg = productImg.cloneNode();
    const imgRect = productImg.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    cloneImg.classList.add('fly-to-cart');
    cloneImg.style.top = `${imgRect.top}px`;
    cloneImg.style.left = `${imgRect.left}px`;
    cloneImg.style.width = `${imgRect.width}px`;
    cloneImg.style.height = `${imgRect.height}px`;

    document.body.appendChild(cloneImg);

    // Trigger reflow
    void cloneImg.offsetWidth;

    // Animate to cart
    cloneImg.style.top = `${cartRect.top}px`;
    cloneImg.style.left = `${cartRect.left}px`;
    cloneImg.style.width = '20px';
    cloneImg.style.height = '20px';
    cloneImg.style.opacity = '0';

    // Heartbeat cart icon
    setTimeout(() => {
        cartIcon.classList.add('scale-125', 'text-brand-orange');
        setTimeout(() => {
            cartIcon.classList.remove('scale-125', 'text-brand-orange');
        }, 300);
    }, 600);

    // Remove clone and show toast
    setTimeout(() => {
        cloneImg.remove();
        showToast('Đã thêm ' + prodName + ' vào giỏ hàng!', 'success');
    }, 800);
}

function buyNow(event, productId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const product = activeProducts.find(p => p.id === productId);
    if (!product) return;

    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < 1) existingItem.quantity = 1;
    } else {
        const defaultVar = (product.variants && product.variants.length > 0) ? product.variants[0] : null;
        const defaultVariantId = defaultVar ? (defaultVar.variantId || defaultVar.id) : product.id;
        cart.push({
            id: product.id,
            variantId: defaultVariantId,
            name: product.name,
            price: defaultVar && defaultVar.price ? defaultVar.price : product.price,
            image: product.image,
            quantity: 1,
            selectedColor: defaultVar ? defaultVar.color : '',
            selectedSize: defaultVar ? defaultVar.size : ''
        });
    }

    saveCart();

    // Mở ngay modal thanh toán để khách hàng nhập địa chỉ và xác nhận
    if (typeof handleCheckout === 'function') {
        handleCheckout();
    }
}

// =========================================================================
// DANH MỤC NỔI BẬT (LOAD ĐỘNG TỪ BẢNG CATEGORIES)
// =========================================================================

let activeCategories = [];
let selectedCategoryId = null;

function loadStorefrontCategories() {
    const container = document.getElementById('home-categories-list');
    if (!container) return;

    fetch((window.API_BASE || '') + '/Admin/GetCategories?onlyActive=true')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data && res.data.length > 0) {
                activeCategories = res.data;
                renderStorefrontCategories(activeCategories);
            } else {
                container.innerHTML = '<div class="col-span-full py-4 text-center text-gray-400 text-xs">Chưa có danh mục nào.</div>';
            }
        })
        .catch(err => {
            console.error('[Categories] Storefront load error:', err);
        });
}

function getCategoryIconConfig(name, slug) {
    const lower = (name + ' ' + (slug || '')).toLowerCase();
    if (lower.includes('nhanh') || lower.includes('pizza') || lower.includes('burger')) 
        return { icon: 'fa-pizza-slice', bg: 'bg-orange-100 text-orange-500 group-hover:bg-orange-500' };
    if (lower.includes('uống') || lower.includes('coffee') || lower.includes('nước')) 
        return { icon: 'fa-coffee', bg: 'bg-blue-100 text-blue-500 group-hover:bg-blue-500' };
    if (lower.includes('tươi') || lower.includes('rau') || lower.includes('quả')) 
        return { icon: 'fa-apple-alt', bg: 'bg-green-100 text-green-500 group-hover:bg-green-500' };
    if (lower.includes('cá nhân') || lower.includes('mỹ phẩm')) 
        return { icon: 'fa-pump-soap', bg: 'bg-purple-100 text-purple-500 group-hover:bg-purple-500' };
    if (lower.includes('bánh') || lower.includes('kẹo') || lower.includes('thực phẩm')) 
        return { icon: 'fa-cookie', bg: 'bg-red-100 text-red-500 group-hover:bg-red-500' };
    if (lower.includes('kem') || lower.includes('lạnh')) 
        return { icon: 'fa-ice-cream', bg: 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-500' };
    if (lower.includes('y tế') || lower.includes('thuốc')) 
        return { icon: 'fa-pills', bg: 'bg-teal-100 text-teal-600 group-hover:bg-teal-500' };
    if (lower.includes('nam')) 
        return { icon: 'fa-tshirt', bg: 'bg-indigo-100 text-indigo-500 group-hover:bg-indigo-500' };
    if (lower.includes('nữ') || lower.includes('nu')) 
        return { icon: 'fa-female', bg: 'bg-pink-100 text-pink-500 group-hover:bg-pink-500' };
    if (lower.includes('công nghệ') || lower.includes('phụ kiện') || lower.includes('tai nghe')) 
        return { icon: 'fa-headphones', bg: 'bg-violet-100 text-violet-500 group-hover:bg-violet-500' };
    return { icon: 'fa-tag', bg: 'bg-amber-100 text-amber-500 group-hover:bg-amber-500' };
}

function renderStorefrontCategories(categories) {
    const container = document.getElementById('home-categories-list');
    if (!container) return;

    let html = '';
    categories.forEach(c => {
        const conf = getCategoryIconConfig(c.name, c.slug);
        const isSelected = selectedCategoryId === c.id;

        html += `
            <a href="javascript:void(0)" onclick="selectStoreCategory(${c.id})" class="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group ${isSelected ? 'ring-2 ring-brand-orange bg-orange-50/50' : ''}">
                <div class="w-12 h-12 rounded-full flex items-center justify-center transition-colors group-hover:text-white ${conf.bg}">
                    <i class="fas ${conf.icon} text-lg"></i>
                </div>
                <span class="text-xs font-semibold text-gray-700 text-center line-clamp-1 group-hover:text-brand-orange transition-colors">${c.name}</span>
            </a>
        `;
    });

    // Nút "Tất cả" để reset bộ lọc
    const isAllSelected = selectedCategoryId === null;
    html += `
        <a href="javascript:void(0)" onclick="selectStoreCategory(null)" class="flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all group ${isAllSelected ? 'ring-2 ring-brand-orange bg-orange-50/50' : ''}">
            <div class="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center transition-colors group-hover:bg-gray-700 group-hover:text-white">
                <i class="fas fa-th-large text-base"></i>
            </div>
            <span class="text-xs font-semibold text-gray-700 text-center group-hover:text-brand-orange transition-colors">Tất cả</span>
        </a>
    `;

    container.innerHTML = html;
}

// =========================================================================
// TÌM KIẾM, BỘ LỌC GIÁ & SẮP XẾP SẢN PHẨM (ROLE KHÁCH HÀNG: DUYỆT & LỌC SP)
// =========================================================================

let currentSearchQuery = '';

function handleSearchProducts(query) {
    currentSearchQuery = (query || '').trim().toLowerCase();
    const dInput = document.getElementById('search-input-desktop');
    const mInput = document.getElementById('search-input-mobile');
    if (dInput && dInput.value !== query) dInput.value = query;
    if (mInput && mInput.value !== query) mInput.value = query;
    applyProductFilters();
}

function applyProductFilters() {
    const priceFilter = document.getElementById('filter-price-range') ? document.getElementById('filter-price-range').value : 'all';
    const sortBy = document.getElementById('sort-products-by') ? document.getElementById('sort-products-by').value : 'default';
    const resetBtn = document.getElementById('btn-reset-filters');
    const banner = document.getElementById('filter-result-banner');
    const bannerText = document.getElementById('filter-result-text');

    let list = [...activeProducts];

    // 1. Lọc theo danh mục
    if (selectedCategoryId !== null) {
        const selectedCat = activeCategories.find(c => Number(c.id) === selectedCategoryId);
        const catName = selectedCat ? selectedCat.name.toLowerCase().trim() : '';
        list = list.filter(p => {
            if (p.categoryId !== undefined && p.categoryId !== null && Number(p.categoryId) === selectedCategoryId) return true;
            if (p.categoryName && catName) {
                const pCat = p.categoryName.toLowerCase().trim();
                return pCat === catName || pCat.includes(catName) || catName.includes(pCat);
            }
            return false;
        });
    }

    // 2. Lọc theo tìm kiếm từ khóa (tên, mã SP, danh mục)
    if (currentSearchQuery) {
        list = list.filter(p => {
            const name = (p.name || '').toLowerCase();
            const code = (p.code || '').toLowerCase();
            const cat = (p.categoryName || '').toLowerCase();
            return name.includes(currentSearchQuery) || code.includes(currentSearchQuery) || cat.includes(currentSearchQuery);
        });
    }

    // 3. Lọc theo khoảng giá
    if (priceFilter === 'under100') {
        list = list.filter(p => p.price < 100000);
    } else if (priceFilter === '100to300') {
        list = list.filter(p => p.price >= 100000 && p.price <= 300000);
    } else if (priceFilter === '300to500') {
        list = list.filter(p => p.price > 300000 && p.price <= 500000);
    } else if (priceFilter === 'above500') {
        list = list.filter(p => p.price > 500000);
    }

    // 4. Sắp xếp
    if (sortBy === 'price-asc') {
        list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    // Cập nhật banner & nút reset
    const hasFilter = currentSearchQuery || priceFilter !== 'all' || sortBy !== 'default' || selectedCategoryId !== null;
    if (resetBtn) {
        if (hasFilter) {
            resetBtn.classList.remove('hidden');
            resetBtn.classList.add('inline-flex');
        } else {
            resetBtn.classList.add('hidden');
            resetBtn.classList.remove('inline-flex');
        }
    }

    if (banner && bannerText) {
        if (hasFilter) {
            banner.classList.remove('hidden');
            let info = `Đang hiển thị <strong>${list.length}</strong> sản phẩm`;
            if (currentSearchQuery) info += ` cho từ khóa "<strong>${currentSearchQuery}</strong>"`;
            if (selectedCategoryId !== null) {
                const sCat = activeCategories.find(c => Number(c.id) === selectedCategoryId);
                if (sCat) info += ` thuộc danh mục "<strong>${sCat.name}</strong>"`;
            }
            bannerText.innerHTML = info;
        } else {
            banner.classList.add('hidden');
        }
    }

    renderProductGrid(list);
}

function resetProductFilters() {
    currentSearchQuery = '';
    selectedCategoryId = null;
    const dInput = document.getElementById('search-input-desktop');
    const mInput = document.getElementById('search-input-mobile');
    const priceSelect = document.getElementById('filter-price-range');
    const sortSelect = document.getElementById('sort-products-by');

    if (dInput) dInput.value = '';
    if (mInput) mInput.value = '';
    if (priceSelect) priceSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'default';

    renderStorefrontCategories(activeCategories);
    applyProductFilters();
}

function handleCardWishlistClick(event, productId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if (typeof toggleWishlist === 'function') {
        toggleWishlist(productId);
    }
}

function selectStoreCategory(catId) {
    selectedCategoryId = (catId !== null && catId !== undefined) ? Number(catId) : null;
    renderStorefrontCategories(activeCategories);
    applyProductFilters();
}

// Hàm bí danh tương thích để không bao giờ bị lỗi ReferenceError
function renderProducts(products) {
    renderProductGrid(products);
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 10) {
        navbar.classList.add('shadow-md');
    } else {
        navbar.classList.remove('shadow-md');
    }
});

// =========================================================================
// BANNER MANAGEMENT (HOME STOREFRONT)
// =========================================================================
function loadStorefrontBanner() {
    const apiBase = window.API_BASE || '';
    fetch(apiBase + '/Admin/GetBannerConfig', { mode: 'cors' })
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data) {
                renderStorefrontBanner(res.data);
            }
        })
        .catch(err => {
            console.warn('[Banner] Không tải được cấu hình banner từ DB:', err);
        });
}

function renderStorefrontBanner(cfg) {
    const container = document.getElementById('hero-banner-container');
    if (!container) return;

    if (cfg.mode === 'image' && cfg.imageUrl) {
        // Chế độ hiển thị ảnh
        container.className = 'rounded-3xl overflow-hidden shadow-2xl relative transition-all duration-300';
        container.style.background = 'none';
        container.innerHTML = `
            <a href="${cfg.imageLink || '#flash-sale-products'}" class="block group w-full">
                <img src="${cfg.imageUrl}" alt="${cfg.title || 'Banner'}" 
                     class="w-full h-auto object-cover max-h-[420px] rounded-3xl transform group-hover:scale-[1.01] transition-transform duration-500 shadow-lg"
                     onerror="this.parentElement.innerHTML='<div class=\\'p-12 text-center text-gray-400 font-bold\\'>Ảnh banner lỗi, vui lòng kiểm tra lại đường dẫn ảnh!</div>'">
            </a>
        `;
    } else {
        // Chế độ gradient + text + icon
        container.className = 'rounded-3xl overflow-hidden text-white p-8 md:p-16 relative shadow-2xl flex flex-col md:flex-row items-center justify-between transition-all duration-300';
        const fromColor = cfg.gradientFrom || '#ff5722';
        const toColor = cfg.gradientTo || '#ff8a50';
        container.style.background = `linear-gradient(135deg, ${fromColor}, ${toColor})`;

        const titleHtml = (cfg.title || 'Ngày hội\nSiêu Sale 50%').replace(/\n/g, '<br/>');
        const tag = cfg.tag || 'Siêu khuyến mãi';
        const desc = cfg.description || '';
        const btnText = cfg.buttonText || 'Mua Ngay';
        const btnLink = cfg.buttonLink || '#flash-sale-products';
        const iconClass = cfg.iconClass || 'fas fa-hamburger';

        container.innerHTML = `
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div class="relative z-10 md:w-1/2 space-y-6">
                <span class="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider backdrop-blur-sm">${tag}</span>
                <h1 class="text-4xl md:text-6xl font-bold leading-tight">${titleHtml}</h1>
                <p class="text-white/90 text-lg">${desc}</p>
                <a href="${btnLink}" class="inline-block bg-white text-brand-orange px-8 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0">${btnText}</a>
            </div>
            
            <div class="relative z-10 md:w-1/2 mt-8 md:mt-0 flex justify-center">
                <div class="w-64 h-64 bg-white/20 backdrop-blur-md rounded-full border-4 border-white/30 flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <i class="${iconClass} text-8xl text-white/90 drop-shadow-lg floating-animation"></i>
                </div>
            </div>
        `;
    }
}

// =========================================================================
// COUPONS / VOUCHERS MANAGEMENT (BẢNG TRUNG GIAN & COUPONS DB)
// =========================================================================
function loadStorefrontCoupons() {
    const container = document.getElementById('home-coupons-list');
    if (!container) return;

    fetch((window.API_BASE || '') + '/Admin/GetCoupons')
        .then(res => res.json())
        .then(res => {
            if (res.success && res.data && res.data.length > 0) {
                let html = '';
                res.data.forEach(c => {
                    const isPercent = c.discount_type === 'percentage';
                    const discountDisplay = isPercent ? `-${c.discount_value}%` : `-${formatCurrency(c.discount_value)}`;
                    html += `
                        <div class="bg-gradient-to-r from-orange-50 via-amber-50 to-pink-50 border border-orange-200/80 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:shadow-md transition-all group">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-gradient-to-br from-brand-orange to-brand-DEFAULT text-white rounded-xl flex flex-col items-center justify-center font-black text-xs shadow-sm group-hover:scale-105 transition-transform">
                                    <i class="fas fa-gift text-sm mb-0.5"></i>
                                    <span>${discountDisplay}</span>
                                </div>
                                <div>
                                    <div class="font-extrabold text-gray-900 text-sm tracking-wider font-mono">${c.coupon_code}</div>
                                    <p class="text-[11px] text-gray-600 line-clamp-1">${c.description || 'Ưu đãi đặt hàng'}</p>
                                    <span class="text-[10px] text-emerald-600 font-medium"><i class="fas fa-check-circle mr-1"></i>Đơn từ ${formatCurrency(c.min_order_value || 0)}</span>
                                </div>
                            </div>
                            <button type="button" onclick="copyCouponCode('${c.coupon_code}')" class="px-3.5 py-1.5 bg-white text-brand-orange border border-brand-orange text-xs font-bold rounded-xl hover:bg-brand-orange hover:text-white transition-all shadow-xs active:scale-95 shrink-0">
                                Lưu mã
                            </button>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } else {
                const sec = document.getElementById('coupons-section');
                if (sec) sec.style.display = 'none';
            }
        })
        .catch(() => {
            const sec = document.getElementById('coupons-section');
            if (sec) sec.style.display = 'none';
        });
}

function copyCouponCode(code) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
    }
    if (typeof showToast === 'function') {
        showToast(`Đã lưu mã giảm giá "${code}" vào bộ nhớ tạm!`, 'success');
    } else {
        alert(`Đã lưu mã giảm giá "${code}"!`);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadStorefrontProducts();
    loadStorefrontCategories();
    loadStorefrontCoupons();
    loadStorefrontBanner();
});

// Export to window
window.loadStorefrontProducts = loadStorefrontProducts;
window.loadStorefrontCategories = loadStorefrontCategories;
window.loadStorefrontCoupons = loadStorefrontCoupons;
window.loadStorefrontBanner = loadStorefrontBanner;
window.copyCouponCode = copyCouponCode;
window.selectStoreCategory = selectStoreCategory;
window.addToCart = addToCart;
window.buyNow = buyNow;
window.handleSearchProducts = handleSearchProducts;
window.applyProductFilters = applyProductFilters;
window.resetProductFilters = resetProductFilters;
window.handleCardWishlistClick = handleCardWishlistClick;
