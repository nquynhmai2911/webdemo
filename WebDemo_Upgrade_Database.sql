-- ==============================================================================
-- NÂNG CẤP CƠ SỞ DỮ LIỆU WEBDEMO: CHUẨN HÓA 3NF, BỔ SUNG CÁC BẢNG TRUNG GIAN
-- VÀ THÊM CÁC TRƯỜNG DỮ LIỆU ĐƯA LÊN FRONTEND
-- ==============================================================================

USE [WebDemo];
GO

-- 1. CẬP NHẬT CÁC TRƯỜNG FRONTEND CHO TOÀN BỘ SẢN PHẨM HIỆN CÓ
DECLARE @b1 INT, @b2 INT;
SELECT TOP 1 @b1 = brand_id FROM Brands WHERE brand_code = 'COOLMATE';
SELECT TOP 1 @b2 = brand_id FROM Brands WHERE brand_code = 'UNIQLO';

-- Cập nhật thông số mặc định nếu null
UPDATE [dbo].[Products]
SET 
    [brand_id] = ISNULL([brand_id], @b1),
    [original_price] = ISNULL([original_price], [base_price] * 1.25),
    [discount_percent] = CASE WHEN [discount_percent] = 0 THEN 15 ELSE [discount_percent] END,
    [rating_avg] = CASE WHEN [rating_avg] IS NULL OR [rating_avg] = 0 THEN 4.9 ELSE [rating_avg] END,
    [review_count] = CASE WHEN [review_count] = 0 THEN 128 ELSE [review_count] END,
    [sold_count] = CASE WHEN [sold_count] = 0 THEN 950 ELSE [sold_count] END,
    [is_featured] = 1,
    [is_flash_sale] = 1,
    [warranty_months] = 12,
    [origin] = N'Chính hãng Việt Nam',
    [short_description] = ISNULL([short_description], N'Sản phẩm thiết kế cao cấp, chất liệu thoáng mát, độ bền vượt trội.')
WHERE [original_price] IS NULL OR [brand_id] IS NULL;
GO

-- 2. CẬP NHẬT MÃ MÀU HEX CHO TOÀN BỘ BIẾN THỂ ĐỂ FRONTEND RENDER NÚT TRÒN MÀU
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#1E293B', [barcode] = '8936001001' WHERE ([color] LIKE N'%Đen%' OR [color] LIKE N'%Black%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#FFFFFF', [barcode] = '8936001002' WHERE ([color] LIKE N'%Trắng%' OR [color] LIKE N'%White%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#2563EB', [barcode] = '8936001003' WHERE ([color] LIKE N'%Xanh%' OR [color] LIKE N'%Blue%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#9CA3AF', [barcode] = '8936001004' WHERE ([color] LIKE N'%Xám%' OR [color] LIKE N'%Ghi%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#DC2626', [barcode] = '8936001005' WHERE ([color] LIKE N'%Đỏ%' OR [color] LIKE N'%Red%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#F59E0B', [barcode] = '8936001006' WHERE ([color] LIKE N'%Vàng%' OR [color] LIKE N'%Yellow%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#EC4899', [barcode] = '8936001007' WHERE ([color] LIKE N'%Hồng%' OR [color] LIKE N'%Pink%') AND [color_hex] IS NULL;
UPDATE [dbo].[Product_Variants] SET [color_hex] = '#4B5563' WHERE [color_hex] IS NULL;
GO

-- 3. SEED DỮ LIỆU BẢNG TRUNG GIAN Product_Tags THEO PRODUCT_ID THỰC TẾ
IF NOT EXISTS (SELECT * FROM [dbo].[Product_Tags])
BEGIN
    INSERT INTO [dbo].[Product_Tags] ([product_id], [tag_id])
    SELECT p.product_id, t.tag_id
    FROM [dbo].[Products] p
    CROSS JOIN (SELECT TOP 2 tag_id FROM [dbo].[Tags] ORDER BY tag_id ASC) t;
END
GO

-- 4. SEED DỮ LIỆU BẢNG TRUNG GIAN Wishlists
IF NOT EXISTS (SELECT * FROM [dbo].[Wishlists])
BEGIN
    INSERT INTO [dbo].[Wishlists] ([customer_id], [product_id])
    SELECT TOP 3 c.customer_id, p.product_id
    FROM [dbo].[Customers] c
    CROSS JOIN [dbo].[Products] p;
END
GO

-- 5. SEED DỮ LIỆU Product_Reviews
IF NOT EXISTS (SELECT * FROM [dbo].[Product_Reviews])
BEGIN
    INSERT INTO [dbo].[Product_Reviews] ([product_id], [customer_id], [reviewer_name], [rating], [comment], [admin_reply], [is_verified_purchase], [created_at])
    SELECT TOP 5 p.product_id, 1, N'Nguyễn Hoàng Quân', 5, 
           N'Chất lượng sản phẩm rất tuyệt vời, form dáng chuẩn đẹp, giao hàng siêu nhanh đóng gói cẩn thận!', 
           N'SuperStore xin cảm ơn quý khách đã tin dùng sản phẩm!', 1, GETDATE()
    FROM [dbo].[Products] p;
END
GO

-- 6. SEED DỮ LIỆU BẢNG TRUNG GIAN Order_Coupons
IF NOT EXISTS (SELECT * FROM [dbo].[Order_Coupons])
BEGIN
    DECLARE @sampleOrderId INT = (SELECT TOP 1 order_id FROM [dbo].[Orders]);
    DECLARE @sampleCouponId INT = (SELECT TOP 1 coupon_id FROM [dbo].[Coupons]);
    IF @sampleOrderId IS NOT NULL AND @sampleCouponId IS NOT NULL
    BEGIN
        INSERT INTO [dbo].[Order_Coupons] ([order_id], [coupon_id], [discount_applied], [used_at])
        VALUES (@sampleOrderId, @sampleCouponId, 50000, GETDATE());
    END
END
GO

PRINT N'✅ ĐÃ CẬP NHẬT DỮ LIỆU MẪU ĐỒNG BỘ VÀO TOÀN BỘ CÁC BẢNG TRUNG GIAN THÀNH CÔNG!';
GO
