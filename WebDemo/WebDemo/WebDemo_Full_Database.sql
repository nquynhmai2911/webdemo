-- ==============================================================================
-- HỆ THỐNG QUẢN LÝ BÁN HÀNG SUPERSTORE (WEBDEMO)
-- SCRIPT TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU & DỮ LIỆU MẪU ĐẦY ĐỦ (FULL DATABASE SETUP SCRIPT V2)
-- Hỗ trợ: Microsoft SQL Server 2016 trở lên / SQL Server Express
-- Bao gồm: 21 BẢNG CHUẨN HÓA 3NF VỚI ĐẦY ĐỦ CÁC BẢNG TRUNG GIAN & TRƯỜNG DỮ LIỆU FRONTEND
-- ==============================================================================

USE [master];
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'WebDemo')
BEGIN
    CREATE DATABASE [WebDemo];
    PRINT N'🎉 Tạo mới cơ sở dữ liệu [WebDemo] thành công!';
END
ELSE
BEGIN
    PRINT N'ℹ️ Cơ sở dữ liệu [WebDemo] đã tồn tại, tiến hành cập nhật cấu trúc bảng...';
END
GO

USE [WebDemo];
GO

-- ==============================================================================
-- 1. DỌN DẸP KHÓA NGOẠI VÀ BẢNG CŨ ĐỂ TẠO MỚI SẠCH SẼ
-- ==============================================================================
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
               ' DROP CONSTRAINT ' + QUOTENAME(name) + ';' + CHAR(13)
FROM sys.foreign_keys;
IF @sql <> N''
    EXEC sp_executesql @sql;
GO

-- Xóa các bảng nếu tồn tại
IF OBJECT_ID(N'[dbo].[Order_Coupons]', 'U') IS NOT NULL DROP TABLE [dbo].[Order_Coupons];
IF OBJECT_ID(N'[dbo].[Order_Returns]', 'U') IS NOT NULL DROP TABLE [dbo].[Order_Returns];
IF OBJECT_ID(N'[dbo].[Order_Details]', 'U') IS NOT NULL DROP TABLE [dbo].[Order_Details];
IF OBJECT_ID(N'[dbo].[Orders]', 'U') IS NOT NULL DROP TABLE [dbo].[Orders];
IF OBJECT_ID(N'[dbo].[Coupons]', 'U') IS NOT NULL DROP TABLE [dbo].[Coupons];
IF OBJECT_ID(N'[dbo].[Customer_Addresses]', 'U') IS NOT NULL DROP TABLE [dbo].[Customer_Addresses];
IF OBJECT_ID(N'[dbo].[Wishlists]', 'U') IS NOT NULL DROP TABLE [dbo].[Wishlists];
IF OBJECT_ID(N'[dbo].[Support_Tickets]', 'U') IS NOT NULL DROP TABLE [dbo].[Support_Tickets];
IF OBJECT_ID(N'[dbo].[Product_Reviews]', 'U') IS NOT NULL DROP TABLE [dbo].[Product_Reviews];
IF OBJECT_ID(N'[dbo].[Customers]', 'U') IS NOT NULL DROP TABLE [dbo].[Customers];
IF OBJECT_ID(N'[dbo].[Store_Inventory]', 'U') IS NOT NULL DROP TABLE [dbo].[Store_Inventory];
IF OBJECT_ID(N'[dbo].[Product_Variants]', 'U') IS NOT NULL DROP TABLE [dbo].[Product_Variants];
IF OBJECT_ID(N'[dbo].[Product_Images]', 'U') IS NOT NULL DROP TABLE [dbo].[Product_Images];
IF OBJECT_ID(N'[dbo].[Product_Tags]', 'U') IS NOT NULL DROP TABLE [dbo].[Product_Tags];
IF OBJECT_ID(N'[dbo].[Tags]', 'U') IS NOT NULL DROP TABLE [dbo].[Tags];
IF OBJECT_ID(N'[dbo].[Products]', 'U') IS NOT NULL DROP TABLE [dbo].[Products];
IF OBJECT_ID(N'[dbo].[Brands]', 'U') IS NOT NULL DROP TABLE [dbo].[Brands];
IF OBJECT_ID(N'[dbo].[Categories]', 'U') IS NOT NULL DROP TABLE [dbo].[Categories];
IF OBJECT_ID(N'[dbo].[Stores]', 'U') IS NOT NULL DROP TABLE [dbo].[Stores];
IF OBJECT_ID(N'[dbo].[Users]', 'U') IS NOT NULL DROP TABLE [dbo].[Users];
IF OBJECT_ID(N'[dbo].[Roles]', 'U') IS NOT NULL DROP TABLE [dbo].[Roles];
GO

-- ==============================================================================
-- 2. TẠO CẤU TRÚC 21 BẢNG CHUẨN HÓA (3NF) VỚI CÁC BẢNG TRUNG GIAN
-- ==============================================================================

-- BẢNG 1: Roles (Vai trò người dùng)
CREATE TABLE [dbo].[Roles] (
    [RoleID] INT IDENTITY(1,1) NOT NULL,
    [RoleName] NVARCHAR(50) NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([RoleID] ASC),
    CONSTRAINT [UQ_Roles_RoleName] UNIQUE NONCLUSTERED ([RoleName] ASC)
);
GO

-- BẢNG 2: Users (Tài khoản người dùng nội bộ: Admin, Staff, Manager)
CREATE TABLE [dbo].[Users] (
    [UserID] INT IDENTITY(1,1) NOT NULL,
    [UserName] VARCHAR(50) NOT NULL,
    [Password] VARCHAR(100) NOT NULL,
    [FullName] NVARCHAR(100) NOT NULL,
    [RoleID] INT NOT NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT ((1)),
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_Users_CreatedAt] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserID] ASC),
    CONSTRAINT [UQ_Users_UserName] UNIQUE NONCLUSTERED ([UserName] ASC),
    CONSTRAINT [FK_Users_Roles] FOREIGN KEY ([RoleID]) REFERENCES [dbo].[Roles] ([RoleID])
);
GO

-- BẢNG 3: Stores (Chi nhánh / Cửa hàng bán lẻ)
CREATE TABLE [dbo].[Stores] (
    [store_id] INT IDENTITY(1,1) NOT NULL,
    [store_code] VARCHAR(20) NOT NULL,
    [store_name] NVARCHAR(150) NOT NULL,
    [address] NVARCHAR(255) NULL,
    [phone] VARCHAR(20) NULL,
    [email] VARCHAR(100) NULL,
    [is_active] BIT NOT NULL CONSTRAINT [DF_Stores_is_active] DEFAULT ((1)),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Stores_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Stores] PRIMARY KEY CLUSTERED ([store_id] ASC),
    CONSTRAINT [UQ_Stores_store_code] UNIQUE NONCLUSTERED ([store_code] ASC)
);
GO

-- BẢNG 4: Categories (Danh mục sản phẩm đa cấp)
CREATE TABLE [dbo].[Categories] (
    [category_id] INT IDENTITY(1,1) NOT NULL,
    [parent_id] INT NULL,
    [category_name] NVARCHAR(100) NOT NULL,
    [slug] VARCHAR(120) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [DF_Categories_is_active] DEFAULT ((1)),
    CONSTRAINT [PK_Categories] PRIMARY KEY CLUSTERED ([category_id] ASC),
    CONSTRAINT [UQ_Categories_slug] UNIQUE NONCLUSTERED ([slug] ASC),
    CONSTRAINT [FK_Categories_Parent] FOREIGN KEY ([parent_id]) REFERENCES [dbo].[Categories] ([category_id])
);
GO

-- BẢNG 5: Brands (Thương hiệu / Hãng sản xuất)
CREATE TABLE [dbo].[Brands] (
    [brand_id] INT IDENTITY(1,1) NOT NULL,
    [brand_name] NVARCHAR(100) NOT NULL,
    [brand_code] VARCHAR(50) NOT NULL,
    [logo_url] NVARCHAR(500) NULL,
    [origin_country] NVARCHAR(100) NULL,
    [is_active] BIT NOT NULL CONSTRAINT [DF_Brands_is_active] DEFAULT ((1)),
    CONSTRAINT [PK_Brands] PRIMARY KEY CLUSTERED ([brand_id] ASC),
    CONSTRAINT [UQ_Brands_code] UNIQUE NONCLUSTERED ([brand_code] ASC)
);
GO

-- BẢNG 6: Products (Sản phẩm gốc - kèm các trường Frontend phong phú)
CREATE TABLE [dbo].[Products] (
    [product_id] INT IDENTITY(1,1) NOT NULL,
    [category_id] INT NOT NULL,
    [brand_id] INT NULL,
    [product_code] VARCHAR(50) NOT NULL,
    [product_name] NVARCHAR(255) NOT NULL,
    [short_description] NVARCHAR(500) NULL,
    [description] NVARCHAR(MAX) NULL,
    [base_price] DECIMAL(18,2) NOT NULL,
    [original_price] DECIMAL(18,2) NULL,
    [discount_percent] INT NOT NULL CONSTRAINT [DF_Products_discount] DEFAULT ((0)),
    [rating_avg] DECIMAL(3,1) NOT NULL CONSTRAINT [DF_Products_rating] DEFAULT ((5.0)),
    [review_count] INT NOT NULL CONSTRAINT [DF_Products_reviews] DEFAULT ((0)),
    [sold_count] INT NOT NULL CONSTRAINT [DF_Products_sold] DEFAULT ((0)),
    [is_featured] BIT NOT NULL CONSTRAINT [DF_Products_featured] DEFAULT ((0)),
    [is_flash_sale] BIT NOT NULL CONSTRAINT [DF_Products_flash_sale] DEFAULT ((0)),
    [warranty_months] INT NOT NULL CONSTRAINT [DF_Products_warranty] DEFAULT ((12)),
    [origin] NVARCHAR(100) NULL CONSTRAINT [DF_Products_origin] DEFAULT (N'Chính hãng'),
    [is_active] BIT NOT NULL CONSTRAINT [DF_Products_is_active] DEFAULT ((1)),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Products_created_at] DEFAULT (GETDATE()),
    [updated_at] DATETIME NULL,
    [image_url] NVARCHAR(500) NULL,
    CONSTRAINT [PK_Products] PRIMARY KEY CLUSTERED ([product_id] ASC),
    CONSTRAINT [UQ_Products_product_code] UNIQUE NONCLUSTERED ([product_code] ASC),
    CONSTRAINT [FK_Products_Categories] FOREIGN KEY ([category_id]) REFERENCES [dbo].[Categories] ([category_id]),
    CONSTRAINT [FK_Products_Brands] FOREIGN KEY ([brand_id]) REFERENCES [dbo].[Brands] ([brand_id])
);
GO

-- BẢNG 7: Tags (Thẻ nhãn sản phẩm: Hot Deal, Flash Sale, Bán chạy, Freeship...)
CREATE TABLE [dbo].[Tags] (
    [tag_id] INT IDENTITY(1,1) NOT NULL,
    [tag_name] NVARCHAR(100) NOT NULL,
    [tag_slug] VARCHAR(100) NOT NULL,
    [badge_color] VARCHAR(50) NOT NULL CONSTRAINT [DF_Tags_color] DEFAULT ('bg-red-500 text-white'),
    [icon] VARCHAR(50) NULL CONSTRAINT [DF_Tags_icon] DEFAULT ('fa-fire'),
    CONSTRAINT [PK_Tags] PRIMARY KEY CLUSTERED ([tag_id] ASC),
    CONSTRAINT [UQ_Tags_slug] UNIQUE NONCLUSTERED ([tag_slug] ASC)
);
GO

-- BẢNG 8: Product_Tags (BẢNG TRUNG GIAN M-N GIỮA PRODUCTS VÀ TAGS)
CREATE TABLE [dbo].[Product_Tags] (
    [product_id] INT NOT NULL,
    [tag_id] INT NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Product_Tags_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Product_Tags] PRIMARY KEY CLUSTERED ([product_id] ASC, [tag_id] ASC),
    CONSTRAINT [FK_ProductTags_Products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[Products] ([product_id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductTags_Tags] FOREIGN KEY ([tag_id]) REFERENCES [dbo].[Tags] ([tag_id]) ON DELETE CASCADE
);
GO

-- BẢNG 9: Product_Variants (Biến thể sản phẩm - Màu sắc, Size, Color Hex cho Frontend)
CREATE TABLE [dbo].[Product_Variants] (
    [variant_id] INT IDENTITY(1,1) NOT NULL,
    [product_id] INT NOT NULL,
    [sku] VARCHAR(50) NOT NULL,
    [variant_name] NVARCHAR(100) NULL,
    [color] NVARCHAR(50) NULL,
    [color_hex] VARCHAR(10) NULL, -- Mã HEX trực quan cho nút chọn màu Frontend (#1E293B, #FFFFFF)
    [size] NVARCHAR(20) NULL,
    [barcode] VARCHAR(50) NULL,
    [weight_grams] INT NOT NULL CONSTRAINT [DF_Product_Variants_weight] DEFAULT ((250)),
    [price] DECIMAL(18,2) NOT NULL,
    [variant_image] NVARCHAR(500) NULL,
    [is_active] BIT NOT NULL CONSTRAINT [DF_Product_Variants_is_active] DEFAULT ((1)),
    CONSTRAINT [PK_Product_Variants] PRIMARY KEY CLUSTERED ([variant_id] ASC),
    CONSTRAINT [UQ_Product_Variants_sku] UNIQUE NONCLUSTERED ([sku] ASC),
    CONSTRAINT [FK_ProductVariants_Products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[Products] ([product_id]) ON DELETE CASCADE
);
GO

-- BẢNG 10: Store_Inventory (BẢNG TRUNG GIAN M-N QUẢN LÝ TỒN KHO THEO CHI NHÁNH & BIẾN THỂ)
CREATE TABLE [dbo].[Store_Inventory] (
    [inventory_id] INT IDENTITY(1,1) NOT NULL,
    [store_id] INT NOT NULL,
    [variant_id] INT NOT NULL,
    [quantity] INT NOT NULL CONSTRAINT [DF_Store_Inventory_quantity] DEFAULT ((0)),
    [reserved_quantity] INT NOT NULL CONSTRAINT [DF_Store_Inventory_reserved_quantity] DEFAULT ((0)),
    [updated_at] DATETIME NULL,
    CONSTRAINT [PK_Store_Inventory] PRIMARY KEY CLUSTERED ([inventory_id] ASC),
    CONSTRAINT [UQ_Store_Variant] UNIQUE NONCLUSTERED ([store_id] ASC, [variant_id] ASC),
    CONSTRAINT [FK_StoreInventory_Stores] FOREIGN KEY ([store_id]) REFERENCES [dbo].[Stores] ([store_id]),
    CONSTRAINT [FK_StoreInventory_Variants] FOREIGN KEY ([variant_id]) REFERENCES [dbo].[Product_Variants] ([variant_id])
);
GO

-- BẢNG 11: Product_Images (Bộ sưu tập album đa ảnh cho Sản phẩm)
CREATE TABLE [dbo].[Product_Images] (
    [image_id] INT IDENTITY(1,1) NOT NULL,
    [product_id] INT NOT NULL,
    [image_url] NVARCHAR(500) NOT NULL,
    [is_thumbnail] BIT NOT NULL CONSTRAINT [DF_Product_Images_is_thumbnail] DEFAULT ((0)),
    [display_order] INT NOT NULL CONSTRAINT [DF_Product_Images_display_order] DEFAULT ((1)),
    CONSTRAINT [PK_Product_Images] PRIMARY KEY CLUSTERED ([image_id] ASC),
    CONSTRAINT [FK_ProductImages_Products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[Products] ([product_id]) ON DELETE CASCADE
);
GO

-- BẢNG 12: Coupons (Mã giảm giá / Voucher khuyến mãi)
CREATE TABLE [dbo].[Coupons] (
    [coupon_id] INT IDENTITY(1,1) NOT NULL,
    [coupon_code] VARCHAR(50) NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [discount_type] VARCHAR(20) NOT NULL CONSTRAINT [DF_Coupons_type] DEFAULT ('percentage'), -- 'percentage' hoặc 'fixed'
    [discount_value] DECIMAL(18,2) NOT NULL,
    [min_order_value] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Coupons_min_order] DEFAULT ((0)),
    [max_discount] DECIMAL(18,2) NULL,
    [usage_limit] INT NOT NULL CONSTRAINT [DF_Coupons_usage_limit] DEFAULT ((100)),
    [used_count] INT NOT NULL CONSTRAINT [DF_Coupons_used_count] DEFAULT ((0)),
    [start_date] DATETIME NOT NULL CONSTRAINT [DF_Coupons_start_date] DEFAULT (GETDATE()),
    [end_date] DATETIME NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [DF_Coupons_is_active] DEFAULT ((1)),
    CONSTRAINT [PK_Coupons] PRIMARY KEY CLUSTERED ([coupon_id] ASC),
    CONSTRAINT [UQ_Coupons_code] UNIQUE NONCLUSTERED ([coupon_code] ASC)
);
GO

-- BẢNG 13: Customers (Khách hàng - kèm điểm thưởng & hạng thành viên VIP)
CREATE TABLE [dbo].[Customers] (
    [customer_id] INT IDENTITY(1,1) NOT NULL,
    [email] VARCHAR(150) NOT NULL,
    [password_hash] VARCHAR(255) NOT NULL,
    [full_name] NVARCHAR(100) NOT NULL,
    [phone] VARCHAR(20) NULL,
    [gender] TINYINT NULL,
    [date_of_birth] DATE NULL,
    [avatar_url] NVARCHAR(500) NULL,
    [loyalty_points] INT NOT NULL CONSTRAINT [DF_Customers_loyalty_points] DEFAULT ((100)),
    [membership_tier] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Customers_membership_tier] DEFAULT (N'Thành viên Bạc'),
    [is_active] BIT NOT NULL CONSTRAINT [DF_Customers_is_active] DEFAULT ((1)),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Customers_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Customers] PRIMARY KEY CLUSTERED ([customer_id] ASC),
    CONSTRAINT [UQ_Customers_email] UNIQUE NONCLUSTERED ([email] ASC)
);
GO

-- BẢNG 14: Customer_Addresses (Sổ địa chỉ giao nhận của khách hàng)
CREATE TABLE [dbo].[Customer_Addresses] (
    [address_id] INT IDENTITY(1,1) NOT NULL,
    [customer_id] INT NOT NULL,
    [receiver_name] NVARCHAR(100) NOT NULL,
    [phone] VARCHAR(20) NOT NULL,
    [address_line] NVARCHAR(255) NOT NULL,
    [ward] NVARCHAR(100) NULL,
    [district] NVARCHAR(100) NULL,
    [province] NVARCHAR(100) NULL,
    [is_default] BIT NOT NULL CONSTRAINT [DF_Customer_Addresses_is_default] DEFAULT ((0)),
    CONSTRAINT [PK_Customer_Addresses] PRIMARY KEY CLUSTERED ([address_id] ASC),
    CONSTRAINT [FK_CustomerAddresses_Customers] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[Customers] ([customer_id]) ON DELETE CASCADE
);
GO

-- BẢNG 15: Orders (Đơn hàng - kèm phương thức thanh toán, đơn vị vận chuyển, mã tracking)
CREATE TABLE [dbo].[Orders] (
    [order_id] INT IDENTITY(1,1) NOT NULL,
    [order_code] VARCHAR(30) NOT NULL,
    [customer_id] INT NOT NULL,
    [store_id] INT NOT NULL,
    [shipping_address_id] INT NOT NULL,
    [order_status] TINYINT NOT NULL, -- 1=Chờ xử lý, 2=Đang đóng gói, 3=Đang giao, 4=Đã giao, 5=Đã hủy
    [payment_status] TINYINT NOT NULL CONSTRAINT [DF_Orders_payment_status] DEFAULT ((0)), -- 0=Chưa TT, 1=Đã TT
    [payment_method] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Orders_payment_method] DEFAULT (N'COD'),
    [shipping_carrier] NVARCHAR(100) NOT NULL CONSTRAINT [DF_Orders_shipping_carrier] DEFAULT (N'Giao Hàng Nhanh (GHN)'),
    [tracking_code] VARCHAR(50) NULL,
    [estimated_delivery] DATE NULL,
    [customer_notes] NVARCHAR(500) NULL,
    [cancel_reason] NVARCHAR(255) NULL,
    [total_amount] DECIMAL(18,2) NOT NULL,
    [shipping_fee] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Orders_shipping_fee] DEFAULT ((0)),
    [discount_amount] DECIMAL(18,2) NOT NULL CONSTRAINT [DF_Orders_discount_amount] DEFAULT ((0)),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Orders_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED ([order_id] ASC),
    CONSTRAINT [UQ_Orders_order_code] UNIQUE NONCLUSTERED ([order_code] ASC),
    CONSTRAINT [FK_Orders_Customers] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[Customers] ([customer_id]),
    CONSTRAINT [FK_Orders_Stores] FOREIGN KEY ([store_id]) REFERENCES [dbo].[Stores] ([store_id]),
    CONSTRAINT [FK_Orders_Addresses] FOREIGN KEY ([shipping_address_id]) REFERENCES [dbo].[Customer_Addresses] ([address_id])
);
GO

-- BẢNG 16: Order_Details (BẢNG TRUNG GIAN M-N CHI TIẾT ĐƠN HÀNG VÀ BIẾN THỂ)
CREATE TABLE [dbo].[Order_Details] (
    [order_detail_id] INT IDENTITY(1,1) NOT NULL,
    [order_id] INT NOT NULL,
    [variant_id] INT NOT NULL,
    [quantity] INT NOT NULL,
    [unit_price] DECIMAL(18,2) NOT NULL,
    [total_price] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [PK_Order_Details] PRIMARY KEY CLUSTERED ([order_detail_id] ASC),
    CONSTRAINT [UQ_Order_Variant] UNIQUE NONCLUSTERED ([order_id] ASC, [variant_id] ASC),
    CONSTRAINT [FK_OrderDetails_Orders] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders] ([order_id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrderDetails_Variants] FOREIGN KEY ([variant_id]) REFERENCES [dbo].[Product_Variants] ([variant_id])
);
GO

-- BẢNG 17: Order_Coupons (BẢNG TRUNG GIAN M-N LỊCH SỬ ÁP DỤNG VOUCHER VÀO ĐƠN HÀNG)
CREATE TABLE [dbo].[Order_Coupons] (
    [order_coupon_id] INT IDENTITY(1,1) NOT NULL,
    [order_id] INT NOT NULL,
    [coupon_id] INT NOT NULL,
    [discount_applied] DECIMAL(18,2) NOT NULL,
    [used_at] DATETIME NOT NULL CONSTRAINT [DF_Order_Coupons_used_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Order_Coupons] PRIMARY KEY CLUSTERED ([order_coupon_id] ASC),
    CONSTRAINT [FK_OrderCoupons_Orders] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders] ([order_id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OrderCoupons_Coupons] FOREIGN KEY ([coupon_id]) REFERENCES [dbo].[Coupons] ([coupon_id])
);
GO

-- BẢNG 18: Wishlists (BẢNG TRUNG GIAN M-N DANH SÁCH YÊU THÍCH CỦA KHÁCH HÀNG)
CREATE TABLE [dbo].[Wishlists] (
    [wishlist_id] INT IDENTITY(1,1) NOT NULL,
    [customer_id] INT NOT NULL,
    [product_id] INT NOT NULL,
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Wishlists_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Wishlists] PRIMARY KEY CLUSTERED ([wishlist_id] ASC),
    CONSTRAINT [UQ_Wishlist_Customer_Product] UNIQUE NONCLUSTERED ([customer_id] ASC, [product_id] ASC),
    CONSTRAINT [FK_Wishlists_Customers] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[Customers] ([customer_id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Wishlists_Products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[Products] ([product_id]) ON DELETE CASCADE
);
GO

-- BẢNG 19: Product_Reviews (Đánh giá & Bình luận sản phẩm)
CREATE TABLE [dbo].[Product_Reviews] (
    [review_id] INT IDENTITY(1,1) NOT NULL,
    [product_id] INT NOT NULL,
    [customer_id] INT NULL,
    [reviewer_name] NVARCHAR(100) NOT NULL,
    [rating] TINYINT NOT NULL CONSTRAINT [DF_Product_Reviews_rating] DEFAULT ((5)),
    [comment] NVARCHAR(MAX) NOT NULL,
    [admin_reply] NVARCHAR(MAX) NULL,
    [is_verified_purchase] BIT NOT NULL CONSTRAINT [DF_Product_Reviews_verified] DEFAULT ((1)),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Product_Reviews_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Product_Reviews] PRIMARY KEY CLUSTERED ([review_id] ASC),
    CONSTRAINT [FK_ProductReviews_Products] FOREIGN KEY ([product_id]) REFERENCES [dbo].[Products] ([product_id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProductReviews_Customers] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[Customers] ([customer_id])
);
GO

-- BẢNG 20: Order_Returns (Yêu cầu đổi/trả hàng và hoàn tiền)
CREATE TABLE [dbo].[Order_Returns] (
    [return_id] INT IDENTITY(1,1) NOT NULL,
    [order_id] INT NOT NULL,
    [reason] NVARCHAR(255) NOT NULL,
    [details] NVARCHAR(MAX) NULL,
    [refund_bank] NVARCHAR(100) NULL,
    [refund_account] VARCHAR(50) NULL,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Order_Returns_status] DEFAULT (N'Đang chờ duyệt đổi/trả'),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Order_Returns_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Order_Returns] PRIMARY KEY CLUSTERED ([return_id] ASC),
    CONSTRAINT [FK_OrderReturns_Orders] FOREIGN KEY ([order_id]) REFERENCES [dbo].[Orders] ([order_id]) ON DELETE CASCADE
);
GO

-- BẢNG 21: Support_Tickets (Yêu cầu khiếu nại / Hỗ trợ kỹ thuật)
CREATE TABLE [dbo].[Support_Tickets] (
    [ticket_id] INT IDENTITY(1,1) NOT NULL,
    [customer_id] INT NULL,
    [full_name] NVARCHAR(100) NOT NULL,
    [phone] VARCHAR(20) NOT NULL,
    [email] VARCHAR(150) NULL,
    [category] NVARCHAR(100) NOT NULL,
    [content] NVARCHAR(MAX) NOT NULL,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [DF_Support_Tickets_status] DEFAULT (N'Đang tiếp nhận xử lý'),
    [created_at] DATETIME NOT NULL CONSTRAINT [DF_Support_Tickets_created_at] DEFAULT (GETDATE()),
    CONSTRAINT [PK_Support_Tickets] PRIMARY KEY CLUSTERED ([ticket_id] ASC),
    CONSTRAINT [FK_SupportTickets_Customers] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[Customers] ([customer_id])
);
GO

PRINT N'✅ Khởi tạo cấu trúc 21 bảng chuẩn hóa 3NF thành công!';
GO
