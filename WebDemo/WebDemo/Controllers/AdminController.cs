using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;

namespace WebDemo.Controllers
{
    public class AdminController : BaseController
    {
        public ActionResult Index()
        {
            if (!IsAdmin())
            {
                return RedirectToAction("Index", "Staff"); 
            }

            ViewBag.FullName = Session["FullName"];
            return View();
        }

        // --- API ENDPOINTS CHO AJAX ---
        Models.WebDemoEntities2 db = new Models.WebDemoEntities2();

        private string GetErrorMessage(System.Exception ex)
        {
            var valEx = ex as System.Data.Entity.Validation.DbEntityValidationException;
            if (valEx != null)
            {
                var errors = valEx.EntityValidationErrors
                    .SelectMany(v => v.ValidationErrors)
                    .Select(e => e.ErrorMessage);
                return string.Join("; ", errors);
            }

            var current = ex;
            while (current.InnerException != null)
            {
                current = current.InnerException;
            }

            string msg = current.Message;
            if (msg.Contains("FK__") || msg.Contains("FOREIGN KEY"))
            {
                return "Lỗi ràng buộc dữ liệu: Vai trò hoặc dữ liệu tham chiếu không hợp lệ trong hệ thống!";
            }
            if (msg.Contains("UQ__") || msg.Contains("UNIQUE KEY") || msg.Contains("duplicate key") || msg.Contains("Cannot insert duplicate key"))
            {
                return "Dữ liệu này đã tồn tại trong hệ thống (trùng lặp)!";
            }

            return msg;
        }

        #region User Endpoints
        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetRoles()
        {
            try
            {
                var roles = db.Roles.Select(r => new {
                    id = r.RoleID,
                    roleName = r.RoleName
                }).ToList();
                return Json(new { success = true, data = roles }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetUsers()
        {
            try
            {
                var users = db.Users.Select(u => new {
                    id = u.UserID,
                    fullName = u.FullName,
                    username = u.UserName,
                    password = u.Password,
                    role = u.Role != null ? u.Role.RoleName : "Customer",
                    roleId = u.RoleID
                }).ToList();
                return Json(new { success = true, data = users }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveUser(int? id, string fullName, string username, string password, string roleName)
        {
            try
            {
                // 1. Kiểm tra họ và tên
                if (string.IsNullOrWhiteSpace(fullName))
                {
                    return Json(new { success = false, message = "Vui lòng nhập họ và tên!" });
                }
                fullName = fullName.Trim();
                if (fullName.Length > 100)
                {
                    return Json(new { success = false, message = "Họ và tên không được vượt quá 100 ký tự!" });
                }

                // 2. Kiểm tra tên đăng nhập
                if (string.IsNullOrWhiteSpace(username))
                {
                    return Json(new { success = false, message = "Vui lòng nhập tên đăng nhập!" });
                }
                username = username.Trim();
                if (username.Length < 3 || username.Length > 50)
                {
                    return Json(new { success = false, message = "Tên đăng nhập phải từ 3 đến 50 ký tự!" });
                }
                if (username.Contains(" "))
                {
                    return Json(new { success = false, message = "Tên đăng nhập không được chứa khoảng trắng!" });
                }

                // 3. Kiểm tra vai trò
                if (string.IsNullOrWhiteSpace(roleName))
                {
                    return Json(new { success = false, message = "Vui lòng chọn vai trò người dùng!" });
                }
                roleName = roleName.Trim();

                // Chuẩn hóa tên Role
                string normalizedRoleName = "Customer";
                string rLower = roleName.ToLower();
                if (rLower == "admin" || rLower == "quantri" || rLower == "quản trị" || rLower == "superadmin")
                {
                    normalizedRoleName = "Admin";
                }
                else if (rLower == "manager" || rLower == "quanly" || rLower == "quản lý" || rLower == "quan ly")
                {
                    normalizedRoleName = "Manager";
                }
                else if (rLower == "staff" || rLower == "nhanvien" || rLower == "nhân viên" || rLower == "nhan vien")
                {
                    normalizedRoleName = "Staff";
                }
                else if (rLower == "customer" || rLower == "khachhang" || rLower == "khách hàng" || rLower == "khach hang")
                {
                    normalizedRoleName = "Customer";
                }
                else
                {
                    normalizedRoleName = roleName;
                }

                // Tìm Role trong database (không phân biệt hoa thường)
                var role = db.Roles.FirstOrDefault(r => r.RoleName.ToLower() == normalizedRoleName.ToLower() || r.RoleName.ToLower() == roleName.ToLower());
                if (role == null)
                {
                    role = new Models.Role { RoleName = normalizedRoleName };
                    db.Roles.Add(role);
                    db.SaveChanges();
                }
                int roleId = role.RoleID;

                // 4. Xử lý Cập nhật hoặc Tạo mới
                if (id.HasValue && id.Value > 0)
                {
                    // Update
                    var user = db.Users.Find(id.Value);
                    if (user == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy người dùng cần cập nhật!" });
                    }

                    if (!user.UserName.Equals(username, System.StringComparison.OrdinalIgnoreCase) &&
                        db.Users.Any(u => u.UserID != id.Value && u.UserName.ToLower() == username.ToLower()))
                    {
                        return Json(new { success = false, message = "Tên đăng nhập này đã có người sử dụng!" });
                    }

                    if (!string.IsNullOrWhiteSpace(password))
                    {
                        if (password.Length < 3)
                        {
                            return Json(new { success = false, message = "Mật khẩu phải có ít nhất 3 ký tự!" });
                        }
                        if (password.Length > 100)
                        {
                            return Json(new { success = false, message = "Mật khẩu không được vượt quá 100 ký tự!" });
                        }
                        user.Password = password;
                    }

                    user.FullName = fullName;
                    user.UserName = username;
                    user.RoleID = roleId;
                    db.SaveChanges();
                }
                else
                {
                    // Create
                    if (string.IsNullOrWhiteSpace(password))
                    {
                        return Json(new { success = false, message = "Vui lòng nhập mật khẩu!" });
                    }
                    if (password.Length < 3)
                    {
                        return Json(new { success = false, message = "Mật khẩu phải có ít nhất 3 ký tự!" });
                    }
                    if (password.Length > 100)
                    {
                        return Json(new { success = false, message = "Mật khẩu không được vượt quá 100 ký tự!" });
                    }

                    if (db.Users.Any(u => u.UserName.ToLower() == username.ToLower()))
                    {
                        return Json(new { success = false, message = "Tên đăng nhập này đã có người sử dụng!" });
                    }

                    var newUser = new Models.User
                    {
                        FullName = fullName,
                        UserName = username,
                        Password = password,
                        RoleID = roleId,
                        IsActive = true,
                        CreatedAt = System.DateTime.Now
                    };
                    db.Users.Add(newUser);
                    db.SaveChanges();
                }
                return Json(new { success = true, message = "Lưu tài khoản thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult DeleteUser(int id)
        {
            try
            {
                var user = db.Users.Find(id);
                if (user != null)
                {
                    db.Users.Remove(user);
                    db.SaveChanges();
                    return Json(new { success = true, message = "Đã xóa tài khoản thành công!" });
                }
                return Json(new { success = false, message = "Không tìm thấy người dùng cần xóa!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }
        #endregion



        #region Product & Category Endpoints (Module 1)

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetCategories(bool? onlyActive)
        {
            try
            {
                var query = db.Categories.AsQueryable();
                if (onlyActive.GetValueOrDefault(false))
                {
                    query = query.Where(c => c.is_active);
                }

                var list = query.Select(c => new {
                    id = c.category_id,
                    name = c.category_name,
                    slug = c.slug,
                    isActive = c.is_active,
                    productCount = c.Products.Count
                }).ToList();

                return Json(new { success = true, data = list }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveCategory(int? id, string name, string slug, bool? isActive)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(name))
                {
                    return Json(new { success = false, message = "Vui lòng nhập tên danh mục / menu!" });
                }
                name = name.Trim();
                if (string.IsNullOrWhiteSpace(slug))
                {
                    slug = GenerateSlug(name);
                }
                else
                {
                    slug = slug.Trim().ToLower();
                }

                if (id.HasValue && id.Value > 0)
                {
                    var cat = db.Categories.Find(id.Value);
                    if (cat == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy danh mục cần sửa!" });
                    }
                    cat.category_name = name;
                    cat.slug = slug;
                    if (isActive.HasValue) cat.is_active = isActive.Value;
                    db.SaveChanges();

                    return Json(new { success = true, message = "Cập nhật menu danh mục thành công!" });
                }
                else
                {
                    var newCat = new Models.Category
                    {
                        category_name = name,
                        slug = slug,
                        is_active = isActive ?? true
                    };
                    db.Categories.Add(newCat);
                    db.SaveChanges();

                    return Json(new { success = true, message = "Thêm menu danh mục mới thành công!", id = newCat.category_id });
                }
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult ToggleCategoryStatus(int id)
        {
            try
            {
                var cat = db.Categories.Find(id);
                if (cat == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy danh mục!" });
                }

                cat.is_active = !cat.is_active;
                db.SaveChanges();

                return Json(new { 
                    success = true, 
                    message = cat.is_active ? "Đã hiển thị menu '" + cat.category_name + "' lên trang chủ!" : "Đã ẩn menu '" + cat.category_name + "' khỏi trang chủ!",
                    isActive = cat.is_active
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult DeleteCategory(int id)
        {
            try
            {
                var cat = db.Categories.Find(id);
                if (cat == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy danh mục cần xóa!" });
                }

                int prodCount = db.Products.Count(p => p.category_id == id);
                if (prodCount > 0)
                {
                    return Json(new { 
                        success = false, 
                        message = "Không thể xóa vì đang có " + prodCount + " sản phẩm thuộc menu danh mục này! Bạn có thể chọn tính năng ẨN thay vì xóa." 
                    });
                }

                db.Categories.Remove(cat);
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa menu danh mục thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        private string GenerateSlug(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";
            string normalized = text.Trim().ToLower();
            string[] vietnamese = new string[] {
                "a|à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ",
                "o|ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ",
                "e|è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ",
                "u|ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ",
                "i|ì|í|ị|ỉ|ĩ",
                "y|ỳ|ý|ỵ|ỷ|ỹ",
                "d|đ"
            };
            foreach (var group in vietnamese)
            {
                var chars = group.Split('|');
                var rep = chars[0];
                for (int i = 1; i < chars.Length; i++)
                {
                    normalized = normalized.Replace(chars[i], rep);
                }
            }
            normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"[^a-z0-9\s-]", "");
            normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\s+", "-").Trim('-');
            return normalized;
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetStores()
        {
            try
            {
                var list = db.Stores.Where(s => s.is_active).Select(s => new {
                    id = s.store_id,
                    code = s.store_code,
                    name = s.store_name,
                    address = s.address,
                    phone = s.phone
                }).ToList();

                return Json(new { success = true, data = list }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        public class ProductExtraDto
        {
            public int product_id { get; set; }
            public decimal? original_price { get; set; }
            public int? discount_percent { get; set; }
            public decimal? rating_avg { get; set; }
            public int? review_count { get; set; }
            public int? sold_count { get; set; }
            public bool? is_featured { get; set; }
            public bool? is_flash_sale { get; set; }
            public int? warranty_months { get; set; }
            public string origin { get; set; }
            public string short_description { get; set; }
            public string brand_name { get; set; }
        }

        public class VariantExtraDto
        {
            public int variant_id { get; set; }
            public string color_hex { get; set; }
            public string barcode { get; set; }
            public int? weight_grams { get; set; }
        }

        public class ProductTagItemDto
        {
            public int product_id { get; set; }
            public string tag_name { get; set; }
            public string badge_color { get; set; }
            public string icon { get; set; }
        }

        public class CouponDto
        {
            public int coupon_id { get; set; }
            public string coupon_code { get; set; }
            public string description { get; set; }
            public string discount_type { get; set; }
            public decimal discount_value { get; set; }
            public decimal min_order_value { get; set; }
            public decimal? max_discount { get; set; }
            public int usage_limit { get; set; }
            public int used_count { get; set; }
            public bool is_active { get; set; }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetCoupons()
        {
            try
            {
                var coupons = db.Database.SqlQuery<CouponDto>(@"
                    SELECT coupon_id, coupon_code, description, discount_type, discount_value, 
                           min_order_value, max_discount, usage_limit, used_count, is_active
                    FROM Coupons
                    WHERE is_active = 1 AND end_date >= GETDATE()
                    ORDER BY discount_value DESC
                ").ToList();
                return Json(new { success = true, data = coupons }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetProducts(string search = null, int? categoryId = null)
        {
            try
            {
                var query = db.Products.AsQueryable();

                if (!string.IsNullOrEmpty(search))
                {
                    search = search.Trim().ToLower();
                    query = query.Where(p => p.product_name.ToLower().Contains(search) || p.product_code.ToLower().Contains(search));
                }

                if (categoryId.HasValue && categoryId.Value > 0)
                {
                    query = query.Where(p => p.category_id == categoryId.Value);
                }

                // Nạp thông tin mở rộng từ các cột Frontend và Bảng trung gian mới
                Dictionary<int, ProductExtraDto> extraMap = new Dictionary<int, ProductExtraDto>();
                Dictionary<int, VariantExtraDto> varExtraMap = new Dictionary<int, VariantExtraDto>();
                List<ProductTagItemDto> tagList = new List<ProductTagItemDto>();

                try
                {
                    var extras = db.Database.SqlQuery<ProductExtraDto>(@"
                        SELECT p.product_id, p.original_price, p.discount_percent, p.rating_avg, 
                               p.review_count, p.sold_count, p.is_featured, p.is_flash_sale, 
                               p.warranty_months, p.origin, p.short_description, b.brand_name
                        FROM Products p
                        LEFT JOIN Brands b ON p.brand_id = b.brand_id
                    ").ToList();
                    foreach (var e in extras) extraMap[e.product_id] = e;

                    var vExtras = db.Database.SqlQuery<VariantExtraDto>(@"
                        SELECT variant_id, color_hex, barcode, weight_grams FROM Product_Variants
                    ").ToList();
                    foreach (var ve in vExtras) varExtraMap[ve.variant_id] = ve;

                    tagList = db.Database.SqlQuery<ProductTagItemDto>(@"
                        SELECT pt.product_id, t.tag_name, t.badge_color, t.icon
                        FROM Product_Tags pt
                        INNER JOIN Tags t ON pt.tag_id = t.tag_id
                    ").ToList();
                }
                catch { }

                var list = query.OrderByDescending(p => p.created_at).ToList().Select(p => {
                    var ext = extraMap.ContainsKey(p.product_id) ? extraMap[p.product_id] : null;
                    var pTags = tagList.Where(t => t.product_id == p.product_id).Select(t => new {
                        tagName = t.tag_name,
                        badgeColor = t.badge_color,
                        icon = t.icon
                    }).ToList();

                    decimal origPrice = (ext != null && ext.original_price.HasValue && ext.original_price.Value > 0) 
                        ? ext.original_price.Value 
                        : Math.Round(p.base_price * 1.25m / 1000m) * 1000m;

                    int discPercent = (ext != null && ext.discount_percent.HasValue && ext.discount_percent.Value > 0)
                        ? ext.discount_percent.Value
                        : (origPrice > p.base_price ? (int)Math.Round((origPrice - p.base_price) / origPrice * 100) : 15);

                    return new {
                        id = p.product_id,
                        code = p.product_code,
                        name = p.product_name,
                        description = p.description,
                        shortDescription = (ext != null && !string.IsNullOrEmpty(ext.short_description)) ? ext.short_description : p.description,
                        imageUrl = p.image_url,
                        categoryId = p.category_id,
                        categoryName = p.Category != null ? p.Category.category_name : "Sản phẩm",
                        brandName = ext != null ? ext.brand_name : null,
                        basePrice = p.base_price,
                        originalPrice = origPrice,
                        discountPercent = discPercent,
                        ratingAvg = (ext != null && ext.rating_avg.HasValue) ? (double)ext.rating_avg.Value : 4.9,
                        reviewCount = (ext != null && ext.review_count.HasValue) ? ext.review_count.Value : 128,
                        soldCount = (ext != null && ext.sold_count.HasValue) ? ext.sold_count.Value : 950,
                        isFeatured = (ext != null && ext.is_featured.HasValue) ? ext.is_featured.Value : false,
                        isFlashSale = (ext != null && ext.is_flash_sale.HasValue) ? ext.is_flash_sale.Value : false,
                        warrantyMonths = (ext != null && ext.warranty_months.HasValue) ? ext.warranty_months.Value : 12,
                        origin = (ext != null && !string.IsNullOrEmpty(ext.origin)) ? ext.origin : "Chính hãng",
                        tags = pTags,
                        isActive = p.is_active,
                        createdAt = p.created_at,
                        totalStock = p.Product_Variants.SelectMany(v => v.Store_Inventory).Sum(i => (int?)i.quantity) ?? 0,
                        variantCount = p.Product_Variants.Count,
                        variants = p.Product_Variants.Select(v => {
                            var ve = varExtraMap.ContainsKey(v.variant_id) ? varExtraMap[v.variant_id] : null;
                            return new {
                                variantId = v.variant_id,
                                sku = v.sku,
                                variantName = v.variant_name,
                                color = v.color,
                                colorHex = ve != null ? ve.color_hex : null,
                                barcode = ve != null ? ve.barcode : null,
                                weightGrams = ve != null ? ve.weight_grams : 250,
                                size = v.size,
                                price = v.price,
                                isActive = v.is_active,
                                totalQuantity = v.Store_Inventory.Sum(i => (int?)i.quantity) ?? 0
                            };
                        }).ToList()
                    };
                }).ToList();

                return Json(new { success = true, data = list }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        public class VariantInputModel
        {
            public int? variantId { get; set; }
            public string sku { get; set; }
            public string variantName { get; set; }
            public string color { get; set; }
            public string size { get; set; }
            public decimal price { get; set; }
            public int initialStock { get; set; }
        }

        public class ProductInputModel
        {
            public int? id { get; set; }
            public int categoryId { get; set; }
            public string code { get; set; }
            public string name { get; set; }
            public string description { get; set; }
            public string imageUrl { get; set; }
            public decimal basePrice { get; set; }
            public bool isActive { get; set; }
            public int? storeId { get; set; }
            public List<VariantInputModel> variants { get; set; }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UploadImage()
        {
            try
            {
                if (Request.Files.Count > 0)
                {
                    var file = Request.Files[0];
                    if (file != null && file.ContentLength > 0)
                    {
                        string ext = System.IO.Path.GetExtension(file.FileName);
                        string safeFileName = "prod_" + System.DateTime.Now.Ticks + ext;
                        string folderPath = Server.MapPath("~/images/products/");
                        if (!System.IO.Directory.Exists(folderPath))
                        {
                            System.IO.Directory.CreateDirectory(folderPath);
                        }

                        string fullPath = System.IO.Path.Combine(folderPath, safeFileName);
                        file.SaveAs(fullPath);

                        string relativeUrl = "/images/products/" + safeFileName;
                        return Json(new { success = true, url = relativeUrl });
                    }
                }
                return Json(new { success = false, message = "Không tìm thấy file ảnh tải lên!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveProduct(ProductInputModel model)
        {
            try
            {
                if (model == null)
                {
                    Request.InputStream.Seek(0, System.IO.SeekOrigin.Begin);
                    using (var reader = new System.IO.StreamReader(Request.InputStream))
                    {
                        var json = reader.ReadToEnd();
                        model = Newtonsoft.Json.JsonConvert.DeserializeObject<ProductInputModel>(json);
                    }
                }

                if (model == null)
                {
                    return Json(new { success = false, message = "Dữ liệu sản phẩm không hợp lệ!" });
                }

                int defaultStoreId = model.storeId ?? db.Stores.Select(s => s.store_id).FirstOrDefault();
                if (defaultStoreId == 0) defaultStoreId = 1;

                Models.Product product = null;

                if (model.id.HasValue && model.id.Value > 0)
                {
                    // Update
                    product = db.Products.Find(model.id.Value);
                    if (product == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy sản phẩm cần cập nhật!" });
                    }

                    product.category_id = model.categoryId;
                    product.product_code = model.code;
                    product.product_name = model.name;
                    product.description = model.description;
                    product.image_url = model.imageUrl;
                    product.base_price = model.basePrice;
                    product.is_active = model.isActive;
                    product.updated_at = System.DateTime.Now;
                }
                else
                {
                    // Create
                    if (db.Products.Any(p => p.product_code == model.code))
                    {
                        return Json(new { success = false, message = "Mã sản phẩm đã tồn tại!" });
                    }

                    product = new Models.Product
                    {
                        category_id = model.categoryId,
                        product_code = model.code,
                        product_name = model.name,
                        description = model.description,
                        image_url = model.imageUrl,
                        base_price = model.basePrice,
                        is_active = model.isActive,
                        created_at = System.DateTime.Now,
                        updated_at = System.DateTime.Now
                    };
                    db.Products.Add(product);
                    db.SaveChanges(); // Lấy product_id
                }

                // Xử lý các biến thể
                if (model.variants != null && model.variants.Count > 0)
                {
                    foreach (var v in model.variants)
                    {
                        Models.Product_Variants variant = null;
                        if (v.variantId.HasValue && v.variantId.Value > 0)
                        {
                            variant = db.Product_Variants.Find(v.variantId.Value);
                        }

                        if (variant != null)
                        {
                            variant.sku = v.sku;
                            variant.variant_name = v.variantName;
                            variant.color = v.color;
                            variant.size = v.size;
                            variant.price = v.price;

                            // Đồng bộ số lượng tồn kho Store_Inventory cho biến thể khi sửa sản phẩm
                            var invList = db.Store_Inventory.Where(si => si.variant_id == variant.variant_id).ToList();
                            if (invList.Count == 0)
                            {
                                db.Store_Inventory.Add(new Models.Store_Inventory
                                {
                                    store_id = defaultStoreId,
                                    variant_id = variant.variant_id,
                                    quantity = v.initialStock >= 0 ? v.initialStock : 0,
                                    reserved_quantity = 0,
                                    updated_at = System.DateTime.Now
                                });
                            }
                            else if (invList.Count == 1)
                            {
                                invList[0].quantity = v.initialStock >= 0 ? v.initialStock : 0;
                                invList[0].updated_at = System.DateTime.Now;
                            }
                            else
                            {
                                int currentTotal = invList.Sum(i => i.quantity);
                                int diff = (v.initialStock >= 0 ? v.initialStock : 0) - currentTotal;
                                if (diff != 0)
                                {
                                    var targetInv = invList.FirstOrDefault(i => i.store_id == defaultStoreId) ?? invList[0];
                                    targetInv.quantity = Math.Max(0, targetInv.quantity + diff);
                                    targetInv.updated_at = System.DateTime.Now;
                                }
                            }
                        }
                        else
                        {
                            variant = new Models.Product_Variants
                            {
                                product_id = product.product_id,
                                sku = string.IsNullOrEmpty(v.sku) ? (product.product_code + "-" + System.Guid.NewGuid().ToString().Substring(0, 4).ToUpper()) : v.sku,
                                variant_name = string.IsNullOrEmpty(v.variantName) ? product.product_name : v.variantName,
                                color = v.color,
                                size = v.size,
                                price = v.price > 0 ? v.price : product.base_price,
                                is_active = true
                            };
                            db.Product_Variants.Add(variant);
                            db.SaveChanges();

                            // Khởi tạo tồn kho tại các chi nhánh
                            var allStores = db.Stores.ToList();
                            if (allStores.Count > 0)
                            {
                                foreach (var st in allStores)
                                {
                                    int qty = st.store_id == defaultStoreId 
                                        ? (v.initialStock > 0 ? v.initialStock : 0) 
                                        : (v.initialStock > 0 ? Math.Max(5, (int)(v.initialStock * 0.4)) : 0);
                                    db.Store_Inventory.Add(new Models.Store_Inventory
                                    {
                                        store_id = st.store_id,
                                        variant_id = variant.variant_id,
                                        quantity = qty,
                                        reserved_quantity = 0,
                                        updated_at = System.DateTime.Now
                                    });
                                }
                            }
                            else
                            {
                                db.Store_Inventory.Add(new Models.Store_Inventory
                                {
                                    store_id = defaultStoreId,
                                    variant_id = variant.variant_id,
                                    quantity = v.initialStock > 0 ? v.initialStock : 0,
                                    reserved_quantity = 0,
                                    updated_at = System.DateTime.Now
                                });
                            }
                        }
                    }
                }
                else if (!model.id.HasValue || model.id.Value == 0)
                {
                    // Tự động tạo 1 biến thể mặc định nếu không có biến thể
                    var defaultVariant = new Models.Product_Variants
                    {
                        product_id = product.product_id,
                        sku = product.product_code + "-DEFAULT",
                        variant_name = product.product_name,
                        color = "Tiêu chuẩn",
                        size = "Freesize",
                        price = product.base_price,
                        is_active = true
                    };
                    db.Product_Variants.Add(defaultVariant);
                    db.SaveChanges();

                    var inv = new Models.Store_Inventory
                    {
                        store_id = defaultStoreId,
                        variant_id = defaultVariant.variant_id,
                        quantity = 50,
                        reserved_quantity = 0,
                        updated_at = System.DateTime.Now
                    };
                    db.Store_Inventory.Add(inv);
                }

                db.SaveChanges();
                return Json(new { success = true, productId = product.product_id });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult DeleteProduct(int id)
        {
            using (var transaction = db.Database.BeginTransaction())
            {
                try
                {
                    var product = db.Products.Find(id);
                    if (product == null)
                    {
                        return Json(new { success = false, message = "Không tìm thấy sản phẩm cần xóa!" });
                    }

                    string prodName = product.product_name;

                    // 1. Xóa tồn kho (Store_Inventory) của các biến thể thuộc sản phẩm này
                    db.Database.ExecuteSqlCommand(@"
                        DELETE FROM Store_Inventory 
                        WHERE variant_id IN (SELECT variant_id FROM Product_Variants WHERE product_id = @p0)", id);

                    // 2. Lấy danh sách order_id bị ảnh hưởng trước khi xóa Order_Details
                    var affectedOrderIds = db.Database.SqlQuery<int>(@"
                        SELECT DISTINCT order_id 
                        FROM Order_Details 
                        WHERE variant_id IN (SELECT variant_id FROM Product_Variants WHERE product_id = @p0)", id).ToList();

                    // 3. Xóa các chi tiết đơn hàng (Order_Details) chứa các biến thể của sản phẩm này
                    db.Database.ExecuteSqlCommand(@"
                        DELETE FROM Order_Details 
                        WHERE variant_id IN (SELECT variant_id FROM Product_Variants WHERE product_id = @p0)", id);

                    // 4. Xóa các biến thể (Product_Variants)
                    db.Database.ExecuteSqlCommand(@"
                        DELETE FROM Product_Variants 
                        WHERE product_id = @p0", id);

                    // 5. Xóa sản phẩm chính (Products)
                    db.Database.ExecuteSqlCommand(@"
                        DELETE FROM Products 
                        WHERE product_id = @p0", id);

                    // 6. Xử lý các đơn hàng bị ảnh hưởng:
                    // Nếu đơn hàng không còn sản phẩm nào -> Xóa đơn hàng đó
                    // Nếu đơn hàng còn sản phẩm khác -> Cập nhật lại total_amount
                    foreach (var orderId in affectedOrderIds)
                    {
                        int remainingCount = db.Database.SqlQuery<int>(@"
                            SELECT COUNT(*) FROM Order_Details WHERE order_id = @p0", orderId).FirstOrDefault();

                        if (remainingCount == 0)
                        {
                            db.Database.ExecuteSqlCommand(@"DELETE FROM Orders WHERE order_id = @p0", orderId);
                        }
                        else
                        {
                            db.Database.ExecuteSqlCommand(@"
                                UPDATE Orders 
                                SET total_amount = (SELECT ISNULL(SUM(total_price), 0) FROM Order_Details WHERE order_id = @p0) + shipping_fee - discount_amount
                                WHERE order_id = @p0", orderId);
                        }
                    }

                    transaction.Commit();

                    // Detach entity khỏi EF context để tránh xung đột tracking
                    try
                    {
                        db.Entry(product).State = System.Data.Entity.EntityState.Detached;
                    }
                    catch { }

                    return Json(new { success = true, message = "Đã xóa vĩnh viễn sản phẩm '" + prodName + "' thành công!" });
                }
                catch (System.Exception ex)
                {
                    transaction.Rollback();
                    return Json(new { success = false, message = GetErrorMessage(ex) });
                }
            }
        }

        #endregion



        #region Inventory Endpoints (Module 1)

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetInventory(int? storeId = null)
        {
            try
            {
                var query = db.Store_Inventory.AsQueryable();

                if (storeId.HasValue && storeId.Value > 0)
                {
                    query = query.Where(i => i.store_id == storeId.Value);
                }

                var inventory = query.Select(i => new {
                    id = i.inventory_id,
                    storeId = i.store_id,
                    storeName = i.Store.store_name,
                    variantId = i.variant_id,
                    productId = i.Product_Variants.product_id,
                    productName = i.Product_Variants.Product.product_name,
                    variantName = i.Product_Variants.variant_name,
                    sku = i.Product_Variants.sku,
                    color = i.Product_Variants.color,
                    size = i.Product_Variants.size,
                    quantity = i.quantity,
                    reserved = i.reserved_quantity,
                    price = i.Product_Variants.price,
                    updatedAt = i.updated_at
                }).ToList();
                
                return Json(new { success = true, data = inventory }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UpdateStock(int inventoryId, int quantity)
        {
            try
            {
                var inv = db.Store_Inventory.Find(inventoryId);
                if (inv == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy bản ghi tồn kho!" });
                }

                inv.quantity = quantity;
                inv.updated_at = System.DateTime.Now;
                db.SaveChanges();

                return Json(new { success = true, newQuantity = inv.quantity });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        #endregion



        #region Order Endpoints (Module 2)

        private static string GetOrderStatusText(byte status)
        {
            switch (status)
            {
                case 1: return "Chờ xác nhận";
                case 2: return "Đang chuẩn bị";
                case 3: return "Đang giao hàng";
                case 4: return "Đã giao hàng";
                case 5: return "Đã hủy";
                default: return "Chờ xác nhận";
            }
        }

        private static string GetPaymentStatusText(byte status)
        {
            switch (status)
            {
                case 0: return "Chưa thanh toán";
                case 1: return "Đã thanh toán";
                case 2: return "Đã hoàn tiền";
                default: return "Chưa thanh toán";
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetOrders(string search = null, byte? status = null, int? storeId = null)
        {
            try
            {
                var query = db.Orders.AsQueryable();

                if (status.HasValue && status.Value > 0)
                {
                    query = query.Where(o => o.order_status == status.Value);
                }

                if (storeId.HasValue && storeId.Value > 0)
                {
                    query = query.Where(o => o.store_id == storeId.Value);
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    search = search.Trim().ToLower();
                    query = query.Where(o =>
                        o.order_code.ToLower().Contains(search) ||
                        (o.Customer != null && o.Customer.full_name.ToLower().Contains(search)) ||
                        (o.Customer != null && o.Customer.phone.Contains(search)) ||
                        (o.Customer_Addresses != null && o.Customer_Addresses.receiver_name.ToLower().Contains(search)) ||
                        (o.Customer_Addresses != null && o.Customer_Addresses.phone.Contains(search))
                    );
                }

                var list = query
                    .OrderByDescending(o => o.created_at)
                    .Select(o => new {
                        orderId = o.order_id,
                        orderCode = o.order_code,
                        customerId = o.customer_id,
                        customerName = o.Customer != null ? o.Customer.full_name : (o.Customer_Addresses != null ? o.Customer_Addresses.receiver_name : "Khách vãng lai"),
                        customerPhone = o.Customer != null ? o.Customer.phone : (o.Customer_Addresses != null ? o.Customer_Addresses.phone : ""),
                        customerEmail = o.Customer != null ? o.Customer.email : "",
                        storeId = o.store_id,
                        storeName = o.Store != null ? o.Store.store_name : "Chi nhánh chính",
                        orderStatus = o.order_status,
                        paymentStatus = o.payment_status,
                        totalAmount = o.total_amount,
                        shippingFee = o.shipping_fee,
                        discountAmount = o.discount_amount,
                        createdAt = o.created_at,
                        itemCount = o.Order_Details.Sum(d => (int?)d.quantity) ?? 0,
                        shippingAddress = o.Customer_Addresses != null ? 
                            (o.Customer_Addresses.address_line + 
                             (!string.IsNullOrEmpty(o.Customer_Addresses.ward) ? ", " + o.Customer_Addresses.ward : "") +
                             (!string.IsNullOrEmpty(o.Customer_Addresses.district) ? ", " + o.Customer_Addresses.district : "") +
                             (!string.IsNullOrEmpty(o.Customer_Addresses.province) ? ", " + o.Customer_Addresses.province : "")) : ""
                    })
                    .ToList();

                var formattedOrders = list.Select(o => new {
                    o.orderId,
                    o.orderCode,
                    o.customerId,
                    o.customerName,
                    o.customerPhone,
                    o.customerEmail,
                    o.storeId,
                    o.storeName,
                    o.orderStatus,
                    orderStatusText = GetOrderStatusText(o.orderStatus),
                    o.paymentStatus,
                    paymentStatusText = GetPaymentStatusText(o.paymentStatus),
                    o.totalAmount,
                    o.shippingFee,
                    o.discountAmount,
                    createdAt = o.createdAt.ToString("dd/MM/yyyy HH:mm:ss"),
                    createdAtRaw = o.createdAt,
                    o.itemCount,
                    o.shippingAddress
                }).ToList();

                // Thống kê nhanh toàn bộ hệ thống
                var allOrders = db.Orders.ToList();
                var stats = new {
                    totalOrders = allOrders.Count,
                    pendingOrders = allOrders.Count(o => o.order_status == 1),
                    processingOrders = allOrders.Count(o => o.order_status == 2),
                    shippingOrders = allOrders.Count(o => o.order_status == 3),
                    deliveredOrders = allOrders.Count(o => o.order_status == 4),
                    cancelledOrders = allOrders.Count(o => o.order_status == 5),
                    totalRevenue = allOrders.Where(o => o.order_status == 4).Sum(o => (decimal?)o.total_amount) ?? 0
                };

                return Json(new { success = true, data = formattedOrders, stats = stats }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetOrderDetail(int id)
        {
            try
            {
                var o = db.Orders.Find(id);
                if (o == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng!" }, JsonRequestBehavior.AllowGet);
                }

                var customer = o.Customer;
                var address = o.Customer_Addresses;
                var store = o.Store;

                var items = o.Order_Details.Select(d => new {
                    detailId = d.order_detail_id,
                    variantId = d.variant_id,
                    productId = d.Product_Variants != null ? d.Product_Variants.product_id : 0,
                    productName = (d.Product_Variants != null && d.Product_Variants.Product != null) 
                        ? d.Product_Variants.Product.product_name 
                        : "Sản phẩm",
                    variantName = d.Product_Variants != null ? d.Product_Variants.variant_name : "",
                    sku = d.Product_Variants != null ? d.Product_Variants.sku : "",
                    color = d.Product_Variants != null ? d.Product_Variants.color : "",
                    size = d.Product_Variants != null ? d.Product_Variants.size : "",
                    image = (d.Product_Variants != null && d.Product_Variants.Product != null) 
                        ? d.Product_Variants.Product.image_url 
                        : "",
                    quantity = d.quantity,
                    unitPrice = d.unit_price,
                    totalPrice = d.total_price
                }).ToList();

                var orderDetail = new {
                    orderId = o.order_id,
                    orderCode = o.order_code,
                    orderStatus = o.order_status,
                    orderStatusText = GetOrderStatusText(o.order_status),
                    paymentStatus = o.payment_status,
                    paymentStatusText = GetPaymentStatusText(o.payment_status),
                    totalAmount = o.total_amount,
                    shippingFee = o.shipping_fee,
                    discountAmount = o.discount_amount,
                    subTotal = o.total_amount - o.shipping_fee + o.discount_amount,
                    createdAt = o.created_at.ToString("dd/MM/yyyy HH:mm:ss"),
                    customer = new {
                        id = customer != null ? customer.customer_id : 0,
                        fullName = customer != null ? customer.full_name : (address != null ? address.receiver_name : "Khách hàng"),
                        email = customer != null ? customer.email : "",
                        phone = customer != null ? customer.phone : (address != null ? address.phone : "")
                    },
                    shipping = new {
                        receiverName = address != null ? address.receiver_name : (customer != null ? customer.full_name : ""),
                        phone = address != null ? address.phone : (customer != null ? customer.phone : ""),
                        addressLine = address != null ? address.address_line : "",
                        ward = address != null ? address.ward : "",
                        district = address != null ? address.district : "",
                        province = address != null ? address.province : "",
                        fullAddress = address != null ? 
                            (address.address_line + 
                             (!string.IsNullOrEmpty(address.ward) ? ", " + address.ward : "") +
                             (!string.IsNullOrEmpty(address.district) ? ", " + address.district : "") +
                             (!string.IsNullOrEmpty(address.province) ? ", " + address.province : "")) : ""
                    },
                    store = new {
                        id = store != null ? store.store_id : 0,
                        name = store != null ? store.store_name : "Chi nhánh chính",
                        address = store != null ? store.address : ""
                    },
                    items = items
                };

                return Json(new { success = true, data = orderDetail }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetCustomerOrders(string username = null, string phone = null, string fullName = null, int? customerId = null)
        {
            try
            {
                var query = db.Orders.AsQueryable();

                List<int> targetCustomerIds = new List<int>();

                if (customerId.HasValue && customerId.Value > 0)
                {
                    targetCustomerIds.Add(customerId.Value);
                }

                if (!string.IsNullOrWhiteSpace(username))
                {
                    string uname = username.Trim().ToLower();
                    var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                    if (user != null)
                    {
                        string ufn = user.FullName.Trim().ToLower();
                        var custs = db.Customers.Where(c => c.full_name.ToLower() == ufn || c.email.ToLower().Contains(uname)).Select(c => c.customer_id).ToList();
                        targetCustomerIds.AddRange(custs);
                    }
                }

                if (!string.IsNullOrWhiteSpace(phone))
                {
                    string p = phone.Trim();
                    var custs = db.Customers.Where(c => c.phone == p).Select(c => c.customer_id).ToList();
                    targetCustomerIds.AddRange(custs);
                }

                if (!string.IsNullOrWhiteSpace(fullName))
                {
                    string fn = fullName.Trim().ToLower();
                    var custs = db.Customers.Where(c => c.full_name.ToLower() == fn).Select(c => c.customer_id).ToList();
                    targetCustomerIds.AddRange(custs);
                }

                targetCustomerIds = targetCustomerIds.Distinct().ToList();

                if (targetCustomerIds.Count > 0)
                {
                    string searchName = !string.IsNullOrWhiteSpace(fullName) ? fullName.Trim().ToLower() : "";
                    query = query.Where(o => targetCustomerIds.Contains(o.customer_id) || 
                                            (searchName != "" && o.Customer != null && o.Customer.full_name.ToLower().Contains(searchName)) ||
                                            (searchName != "" && o.Customer_Addresses != null && o.Customer_Addresses.receiver_name.ToLower().Contains(searchName)));
                }
                else if (!string.IsNullOrWhiteSpace(fullName))
                {
                    string fn = fullName.Trim().ToLower();
                    query = query.Where(o => (o.Customer != null && o.Customer.full_name.ToLower().Contains(fn)) ||
                                            (o.Customer_Addresses != null && o.Customer_Addresses.receiver_name.ToLower().Contains(fn)));
                }

                var list = query
                    .OrderByDescending(o => o.created_at)
                    .Select(o => new {
                        orderId = o.order_id,
                        orderCode = o.order_code,
                        customerId = o.customer_id,
                        customerName = o.Customer != null ? o.Customer.full_name : (o.Customer_Addresses != null ? o.Customer_Addresses.receiver_name : "Khách hàng"),
                        customerPhone = o.Customer != null ? o.Customer.phone : (o.Customer_Addresses != null ? o.Customer_Addresses.phone : ""),
                        storeName = o.Store != null ? o.Store.store_name : "SuperStore",
                        orderStatus = o.order_status,
                        paymentStatus = o.payment_status,
                        totalAmount = o.total_amount,
                        shippingFee = o.shipping_fee,
                        discountAmount = o.discount_amount,
                        createdAt = o.created_at,
                        itemCount = o.Order_Details.Sum(d => (int?)d.quantity) ?? 0,
                        shippingAddress = o.Customer_Addresses != null ? 
                            (o.Customer_Addresses.address_line + 
                             (!string.IsNullOrEmpty(o.Customer_Addresses.ward) ? ", " + o.Customer_Addresses.ward : "") +
                             (!string.IsNullOrEmpty(o.Customer_Addresses.district) ? ", " + o.Customer_Addresses.district : "") +
                             (!string.IsNullOrEmpty(o.Customer_Addresses.province) ? ", " + o.Customer_Addresses.province : "")) : "",
                        items = o.Order_Details.Select(d => new {
                            detailId = d.order_detail_id,
                            variantId = d.variant_id,
                            productName = d.Product_Variants != null && d.Product_Variants.Product != null ? d.Product_Variants.Product.product_name : "Sản phẩm",
                            variantName = d.Product_Variants != null ? d.Product_Variants.variant_name : "",
                            sku = d.Product_Variants != null ? d.Product_Variants.sku : "",
                            color = d.Product_Variants != null ? d.Product_Variants.color : "",
                            size = d.Product_Variants != null ? d.Product_Variants.size : "",
                            image = (d.Product_Variants != null && d.Product_Variants.Product != null) ? d.Product_Variants.Product.image_url : "",
                            quantity = d.quantity,
                            unitPrice = d.unit_price,
                            totalPrice = d.total_price
                        }).ToList()
                    })
                    .ToList();

                var formatted = list.Select(o => new {
                    o.orderId,
                    o.orderCode,
                    o.customerId,
                    o.customerName,
                    o.customerPhone,
                    o.storeName,
                    o.orderStatus,
                    orderStatusText = GetOrderStatusText(o.orderStatus),
                    o.paymentStatus,
                    paymentStatusText = GetPaymentStatusText(o.paymentStatus),
                    o.totalAmount,
                    o.shippingFee,
                    o.discountAmount,
                    createdAt = o.createdAt.ToString("dd/MM/yyyy HH:mm:ss"),
                    createdAtRaw = o.createdAt,
                    o.itemCount,
                    o.shippingAddress,
                    o.items
                }).ToList();

                return Json(new { success = true, data = formatted }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UpdateOrderStatus(int orderId, byte status)
        {
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng!" });
                }

                if (status < 1 || status > 5)
                {
                    return Json(new { success = false, message = "Trạng thái đơn hàng không hợp lệ!" });
                }

                byte oldStatus = order.order_status;
                order.order_status = status;

                // Đồng bộ tồn kho khi thay đổi trạng thái đơn
                if (status == 5 && oldStatus != 5)
                {
                    // Chuyển sang Đã hủy -> Hoàn lại tồn kho
                    foreach (var detail in order.Order_Details)
                    {
                        var inv = db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id && i.store_id == order.store_id)
                               ?? db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id);
                        if (inv != null)
                        {
                            inv.quantity += detail.quantity;
                            inv.updated_at = System.DateTime.Now;
                        }
                    }
                }
                else if (oldStatus == 5 && status != 5)
                {
                    // Phục hồi từ Đã hủy sang trạng thái xử lý -> Trừ lại tồn kho
                    foreach (var detail in order.Order_Details)
                    {
                        var inv = db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id && i.store_id == order.store_id)
                               ?? db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id);
                        if (inv != null)
                        {
                            inv.quantity = Math.Max(0, inv.quantity - detail.quantity);
                            inv.updated_at = System.DateTime.Now;
                        }
                    }
                }

                // Nếu chuyển thành Hoàn thành (4) và chưa thanh toán -> tự động đánh dấu đã thanh toán
                if (status == 4 && order.payment_status == 0)
                {
                    order.payment_status = 1;
                }

                db.SaveChanges();
                return Json(new { 
                    success = true, 
                    message = "Đã cập nhật trạng thái đơn thành: " + GetOrderStatusText(status),
                    orderStatus = status,
                    orderStatusText = GetOrderStatusText(status),
                    paymentStatus = order.payment_status,
                    paymentStatusText = GetPaymentStatusText(order.payment_status)
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UpdatePaymentStatus(int orderId, byte paymentStatus)
        {
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng!" });
                }

                if (paymentStatus > 2)
                {
                    return Json(new { success = false, message = "Trạng thái thanh toán không hợp lệ!" });
                }

                order.payment_status = paymentStatus;
                db.SaveChanges();

                return Json(new { 
                    success = true, 
                    message = "Đã cập nhật thanh toán: " + GetPaymentStatusText(paymentStatus),
                    paymentStatus = paymentStatus,
                    paymentStatusText = GetPaymentStatusText(paymentStatus)
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult DeleteOrder(int? id)
        {
            try
            {
                int orderId = id ?? 0;
                if (orderId == 0)
                {
                    if (int.TryParse(Request["id"], out int qId)) orderId = qId;
                }

                var order = db.Orders.Find(orderId);
                if (order == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy đơn hàng cần xóa!" });
                }

                string orderCode = order.order_code;

                // Nếu đơn hàng chưa bị hủy mà bị xóa -> Hoàn lại tồn kho cho các sản phẩm
                if (order.order_status != 5)
                {
                    foreach (var detail in order.Order_Details)
                    {
                        var inv = db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id && i.store_id == order.store_id)
                               ?? db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id);
                        if (inv != null)
                        {
                            inv.quantity += detail.quantity;
                            inv.updated_at = System.DateTime.Now;
                        }
                    }
                }

                // Xóa chi tiết đơn hàng trước (nếu có)
                var details = db.Order_Details.Where(d => d.order_id == orderId).ToList();
                if (details.Any())
                {
                    db.Order_Details.RemoveRange(details);
                }

                // Xóa đơn hàng
                db.Orders.Remove(order);
                db.SaveChanges();

                return Json(new { success = true, message = "Đã xóa vĩnh viễn đơn hàng " + orderCode + " thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult CreateOrder(CreateOrderInputModel model)
        {
            try
            {
                if (model == null || model.items == null || model.items.Count == 0)
                {
                    return Json(new { success = false, message = "Đơn hàng phải có ít nhất 1 sản phẩm!" });
                }

                if (string.IsNullOrWhiteSpace(model.fullName))
                {
                    return Json(new { success = false, message = "Vui lòng nhập họ và tên người nhận!" });
                }

                if (string.IsNullOrWhiteSpace(model.phone))
                {
                    return Json(new { success = false, message = "Vui lòng nhập số điện thoại người nhận!" });
                }

                if (string.IsNullOrWhiteSpace(model.address))
                {
                    return Json(new { success = false, message = "Vui lòng nhập địa chỉ nhận hàng!" });
                }

                // 1. Tìm hoặc tạo Customer
                string email = !string.IsNullOrWhiteSpace(model.email) ? model.email.Trim().ToLower() : (model.phone.Trim() + "@khachhang.webdemo.vn");
                Models.Customer customer = null;
                if (model.customerId.HasValue && model.customerId.Value > 0)
                {
                    customer = db.Customers.Find(model.customerId.Value);
                }
                if (customer == null && !string.IsNullOrWhiteSpace(model.username))
                {
                    string uname = model.username.Trim().ToLower();
                    var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                    if (user != null)
                    {
                        string ufn = user.FullName.Trim().ToLower();
                        customer = db.Customers.FirstOrDefault(c => c.full_name.ToLower() == ufn || c.phone == model.phone.Trim() || c.email.ToLower() == email);
                    }
                }
                if (customer == null)
                {
                    customer = db.Customers.FirstOrDefault(c => c.phone == model.phone.Trim() || c.email == email || c.full_name.ToLower() == model.fullName.Trim().ToLower());
                }
                if (customer == null)
                {
                    if (db.Customers.Any(c => c.email.ToLower() == email))
                    {
                        email = model.phone.Trim() + "_" + System.Guid.NewGuid().ToString("N").Substring(0, 4) + "@khachhang.webdemo.vn";
                    }
                    customer = new Models.Customer
                    {
                        email = email,
                        password_hash = "123456",
                        full_name = model.fullName.Trim(),
                        phone = model.phone.Trim(),
                        is_active = true,
                        created_at = System.DateTime.Now
                    };
                    db.Customers.Add(customer);
                    db.SaveChanges();
                }

                // 2. Tạo địa chỉ nhận hàng
                var address = new Models.Customer_Addresses
                {
                    customer_id = customer.customer_id,
                    receiver_name = model.fullName.Trim(),
                    phone = model.phone.Trim(),
                    address_line = model.address.Trim(),
                    ward = model.ward != null ? model.ward.Trim() : "",
                    district = model.district != null ? model.district.Trim() : "",
                    province = model.province != null ? model.province.Trim() : "",
                    is_default = true
                };
                db.Customer_Addresses.Add(address);
                db.SaveChanges();

                // 3. Tính toán tổng tiền
                int storeId = model.storeId.HasValue && model.storeId.Value > 0 ? model.storeId.Value : 1;
                decimal shippingFee = model.shippingFee ?? 30000;
                decimal discountAmount = model.discountAmount ?? 0;
                decimal itemsTotal = model.items.Sum(i => i.quantity * i.price);
                decimal grandTotal = itemsTotal + shippingFee - discountAmount;
                if (grandTotal < 0) grandTotal = 0;

                string orderCode = "ORD-" + System.DateTime.Now.ToString("yyyyMMdd") + "-" + System.Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();

                // 4. Tạo Order
                var newOrder = new Models.Order
                {
                    order_code = orderCode,
                    customer_id = customer.customer_id,
                    store_id = storeId,
                    shipping_address_id = address.address_id,
                    order_status = 1, // 1 = Chờ xử lý
                    payment_status = 0, // 0 = Chưa thanh toán (COD)
                    total_amount = grandTotal,
                    shipping_fee = shippingFee,
                    discount_amount = discountAmount,
                    created_at = System.DateTime.Now
                };
                db.Orders.Add(newOrder);
                db.SaveChanges();

                // 5. Tạo Order_Details & Cập nhật tồn kho
                foreach (var item in model.items)
                {
                    int finalVariantId = item.variantId;
                    var varObj = db.Product_Variants.Find(item.variantId);

                    // Kiểm tra xem item.variantId có phải là product_id không
                    var prodObj = db.Products.Find(item.variantId);
                    if (prodObj != null && prodObj.Product_Variants != null && prodObj.Product_Variants.Any())
                    {
                        // Nếu variantId trùng với product_id khác phân loại của varObj hoặc varObj không tồn tại
                        if (varObj == null || varObj.product_id != prodObj.product_id)
                        {
                            var matchedVar = prodObj.Product_Variants.FirstOrDefault(v => v.price == item.price)
                                          ?? prodObj.Product_Variants.FirstOrDefault();
                            if (matchedVar != null)
                            {
                                finalVariantId = matchedVar.variant_id;
                                varObj = matchedVar;
                            }
                        }
                    }

                    if (varObj == null)
                    {
                        var foundByProd = db.Product_Variants.FirstOrDefault(v => v.product_id == item.variantId);
                        if (foundByProd != null)
                        {
                            finalVariantId = foundByProd.variant_id;
                        }
                        else
                        {
                            var firstVar = db.Product_Variants.FirstOrDefault();
                            if (firstVar != null) finalVariantId = firstVar.variant_id;
                        }
                    }

                    // Tránh lỗi UQ_Order_Variant: nếu cùng variant_id trong đơn thì gộp số lượng
                    var existingDetail = db.Order_Details.Local.FirstOrDefault(d => d.order_id == newOrder.order_id && d.variant_id == finalVariantId);
                    if (existingDetail != null)
                    {
                        existingDetail.quantity += item.quantity;
                        existingDetail.total_price += (item.quantity * item.price);
                    }
                    else
                    {
                        var detail = new Models.Order_Details
                        {
                            order_id = newOrder.order_id,
                            variant_id = finalVariantId,
                            quantity = item.quantity,
                            unit_price = item.price,
                            total_price = item.quantity * item.price
                        };
                        db.Order_Details.Add(detail);
                    }

                    // Trừ tồn kho tại chi nhánh chỉ định hoặc chi nhánh có hàng
                    var inv = db.Store_Inventory.FirstOrDefault(i => i.variant_id == finalVariantId && i.store_id == storeId)
                           ?? db.Store_Inventory.FirstOrDefault(i => i.variant_id == finalVariantId);
                    if (inv != null)
                    {
                        inv.quantity = Math.Max(0, inv.quantity - item.quantity);
                        inv.updated_at = System.DateTime.Now;
                    }
                }
                db.SaveChanges();

                return Json(new { 
                    success = true, 
                    message = "Đặt hàng thành công! Mã đơn hàng của bạn là " + orderCode,
                    orderId = newOrder.order_id,
                    orderCode = orderCode
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        #endregion



        #region Permission Endpoints

        private string GetPermissionFilePath()
        {
            string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
            if (!System.IO.Directory.Exists(appData))
            {
                System.IO.Directory.CreateDirectory(appData);
            }
            return System.IO.Path.Combine(appData, "staff_permissions.json");
        }

        private Dictionary<string, StaffMenuPermission> LoadPermissionsFromFile()
        {
            try
            {
                string path = GetPermissionFilePath();
                if (System.IO.File.Exists(path))
                {
                    string json = System.IO.File.ReadAllText(path);
                    var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, StaffMenuPermission>>(json);
                    if (dict != null) return dict;
                }
            }
            catch { }

            return new Dictionary<string, StaffMenuPermission>
            {
                { "all", new StaffMenuPermission { orders = true, products = true, inventory = true } }
            };
        }

        private void SavePermissionsToFile(Dictionary<string, StaffMenuPermission> dict)
        {
            string path = GetPermissionFilePath();
            string json = Newtonsoft.Json.JsonConvert.SerializeObject(dict, Newtonsoft.Json.Formatting.Indented);
            System.IO.File.WriteAllText(path, json);
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetStaffPermissions(string username = null)
        {
            try
            {
                var dict = LoadPermissionsFromFile();

                // Lấy danh sách nhân viên để phục vụ dropdown
                var staffUsers = db.Users
                    .Where(u => u.RoleID == 2 && u.IsActive)
                    .Select(u => new {
                        id = u.UserID,
                        username = u.UserName,
                        fullName = u.FullName
                    })
                    .ToList();

                StaffMenuPermission perm;
                if (!string.IsNullOrEmpty(username) && dict.ContainsKey(username.ToLower()))
                {
                    perm = dict[username.ToLower()];
                }
                else if (dict.ContainsKey("all"))
                {
                    perm = dict["all"];
                }
                else
                {
                    perm = new StaffMenuPermission { orders = true, products = true, inventory = true };
                }

                return Json(new {
                    success = true,
                    target = string.IsNullOrEmpty(username) ? "all" : username.ToLower(),
                    permissions = perm,
                    allPermissions = dict,
                    staffList = staffUsers
                }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveStaffPermissions(StaffPermissionInputModel model)
        {
            try
            {
                if (model == null)
                {
                    return Json(new { success = false, message = "Dữ liệu không hợp lệ!" });
                }

                string key = string.IsNullOrWhiteSpace(model.username) ? "all" : model.username.Trim().ToLower();
                var dict = LoadPermissionsFromFile();

                dict[key] = new StaffMenuPermission
                {
                    orders = model.orders,
                    products = model.products,
                    inventory = model.inventory
                };

                SavePermissionsToFile(dict);

                return Json(new { 
                    success = true, 
                    message = key == "all" 
                        ? "Đã lưu phân quyền menu cho TẤT CẢ nhân viên thành công!" 
                        : "Đã lưu phân quyền menu cho nhân viên '" + key + "' thành công!"
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        #region Role & User Menu Permissions Management (Phân quyền Menu theo Vai trò & Từng Tài khoản)
        private string GetRolePermissionFilePath()
        {
            string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
            if (!System.IO.Directory.Exists(appData))
            {
                System.IO.Directory.CreateDirectory(appData);
            }
            return System.IO.Path.Combine(appData, "role_menu_permissions.json");
        }

        private string GetUserPermissionFilePath()
        {
            string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
            if (!System.IO.Directory.Exists(appData))
            {
                System.IO.Directory.CreateDirectory(appData);
            }
            return System.IO.Path.Combine(appData, "user_menu_permissions.json");
        }

        private Dictionary<string, RoleMenuPermissions> GetDefaultAllRolePermissions()
        {
            return new Dictionary<string, RoleMenuPermissions>(System.StringComparer.OrdinalIgnoreCase)
            {
                {
                    "Admin",
                    new RoleMenuPermissions {
                        dashboard = true,
                        orders = true,
                        revenue = true,
                        products = true,
                        inventory = true,
                        categories = true,
                        users = true,
                        storefront = true,
                        menu_management = true
                    }
                },
                {
                    "Manager",
                    new RoleMenuPermissions {
                        dashboard = true,
                        orders = true,
                        revenue = true,
                        products = true,
                        inventory = true,
                        categories = true,
                        users = true,
                        storefront = true,
                        menu_management = false
                    }
                },
                {
                    "Staff",
                    new RoleMenuPermissions {
                        dashboard = false,
                        orders = true,
                        revenue = false,
                        products = true,
                        inventory = true,
                        categories = false,
                        users = false,
                        storefront = true,
                        menu_management = false
                    }
                },
                {
                    "Customer",
                    new RoleMenuPermissions {
                        dashboard = false,
                        orders = false,
                        revenue = false,
                        products = false,
                        inventory = false,
                        categories = false,
                        users = false,
                        storefront = true,
                        menu_management = false
                    }
                }
            };
        }

        private Dictionary<string, RoleMenuPermissions> LoadRolePermissionsFromFile()
        {
            try
            {
                string path = GetRolePermissionFilePath();
                if (System.IO.File.Exists(path))
                {
                    string json = System.IO.File.ReadAllText(path);
                    var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, RoleMenuPermissions>>(json);
                    if (dict != null && dict.Count > 0)
                    {
                        var defaults = GetDefaultAllRolePermissions();
                        foreach (var kv in defaults)
                        {
                            if (!dict.ContainsKey(kv.Key))
                            {
                                dict[kv.Key] = kv.Value;
                            }
                        }
                        // Ensure Admin is always full
                        dict["Admin"] = new RoleMenuPermissions {
                            dashboard = true, orders = true, revenue = true, products = true,
                            inventory = true, categories = true, users = true, storefront = true, menu_management = true
                        };
                        return dict;
                    }
                }
            }
            catch { }

            return GetDefaultAllRolePermissions();
        }

        private void SaveRolePermissionsToFile(Dictionary<string, RoleMenuPermissions> dict)
        {
            string path = GetRolePermissionFilePath();
            string json = Newtonsoft.Json.JsonConvert.SerializeObject(dict, Newtonsoft.Json.Formatting.Indented);
            System.IO.File.WriteAllText(path, json);
        }

        private Dictionary<string, RoleMenuPermissions> LoadUserPermissionsFromFile()
        {
            try
            {
                string path = GetUserPermissionFilePath();
                if (System.IO.File.Exists(path))
                {
                    string json = System.IO.File.ReadAllText(path);
                    var dict = Newtonsoft.Json.JsonConvert.DeserializeObject<Dictionary<string, RoleMenuPermissions>>(json);
                    if (dict != null)
                    {
                        return new Dictionary<string, RoleMenuPermissions>(dict, System.StringComparer.OrdinalIgnoreCase);
                    }
                }
            }
            catch { }

            return new Dictionary<string, RoleMenuPermissions>(System.StringComparer.OrdinalIgnoreCase);
        }

        private void SaveUserPermissionsToFile(Dictionary<string, RoleMenuPermissions> dict)
        {
            string path = GetUserPermissionFilePath();
            string json = Newtonsoft.Json.JsonConvert.SerializeObject(dict, Newtonsoft.Json.Formatting.Indented);
            System.IO.File.WriteAllText(path, json);
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetRoleMenuPermissions(string role = null)
        {
            try
            {
                var allPermissions = LoadRolePermissionsFromFile();

                var roleList = new List<object>
                {
                    new { stt = 1, roleCode = "Manager", roleName = "Quản lý", roleId = 4, desc = "Quản lý hoạt động kinh doanh, đơn hàng, kho và doanh thu" },
                    new { stt = 2, roleCode = "Staff", roleName = "Nhân viên", roleId = 2, desc = "Nhân viên xử lý đơn hàng, xuất nhập kho và sản phẩm" },
                    new { stt = 3, roleCode = "Customer", roleName = "Khách hàng", roleId = 3, desc = "Khách hàng mua sắm, đặt đơn và theo dõi đơn" },
                    new { stt = 4, roleCode = "Admin", roleName = "Admin Hệ thống", roleId = 1, desc = "Toàn quyền quản trị hệ thống và phân quyền menu" }
                };

                RoleMenuPermissions currentPerm;
                string targetRole = string.IsNullOrWhiteSpace(role) ? "Manager" : role.Trim();
                if (targetRole.Equals("quanly", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("quản lý", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Manager";
                if (targetRole.Equals("nhanvien", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("nhân viên", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Staff";
                if (targetRole.Equals("khachhang", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("khách hàng", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Customer";

                if (allPermissions.ContainsKey(targetRole))
                {
                    currentPerm = allPermissions[targetRole];
                }
                else
                {
                    var defaults = GetDefaultAllRolePermissions();
                    currentPerm = defaults.ContainsKey(targetRole) ? defaults[targetRole] : new RoleMenuPermissions();
                }

                return Json(new {
                    success = true,
                    roles = roleList,
                    targetRole = targetRole,
                    permissions = currentPerm,
                    allPermissions = allPermissions
                }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveRoleMenuPermissions(RoleMenuSaveInputModel model)
        {
            try
            {
                if (model == null || string.IsNullOrWhiteSpace(model.targetRole))
                {
                    return Json(new { success = false, message = "Dữ liệu phân quyền không hợp lệ!" });
                }

                // KIỂM TRA QUYỀN: CHỈ ADMIN MỚI ĐƯỢC PHÂN QUYỀN MENU
                string callerRole = Request.Headers["X-User-Role"] ?? model.currentUserRole;
                if (string.IsNullOrWhiteSpace(callerRole) || !callerRole.Trim().Equals("Admin", System.StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { 
                        success = false, 
                        message = "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu cho các vai trò!" 
                    });
                }

                string targetRole = model.targetRole.Trim();
                // Chuẩn hóa tên role
                if (targetRole.Equals("quanly", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("quản lý", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Manager";
                if (targetRole.Equals("nhanvien", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("nhân viên", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Staff";
                if (targetRole.Equals("khachhang", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("khách hàng", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Customer";
                if (targetRole.Equals("admin", System.StringComparison.OrdinalIgnoreCase) || targetRole.Equals("quản trị viên", System.StringComparison.OrdinalIgnoreCase)) targetRole = "Admin";

                var allPermissions = LoadRolePermissionsFromFile();

                allPermissions[targetRole] = new RoleMenuPermissions
                {
                    dashboard = model.dashboard,
                    orders = model.orders,
                    revenue = model.revenue,
                    products = model.products,
                    inventory = model.inventory,
                    categories = model.categories,
                    users = model.users,
                    storefront = model.storefront,
                    menu_management = targetRole.Equals("Admin", System.StringComparison.OrdinalIgnoreCase) ? true : false // Admin luôn giữ mục Quản lý menu
                };

                SaveRolePermissionsToFile(allPermissions);

                string displayName = targetRole == "Manager" ? "Quản lý" : (targetRole == "Staff" ? "Nhân viên" : (targetRole == "Customer" ? "Khách hàng" : (targetRole == "Admin" ? "Admin Hệ thống" : targetRole)));

                return Json(new {
                    success = true,
                    message = "Đã lưu phân quyền menu thành công cho vai trò: " + displayName + "!",
                    targetRole = targetRole,
                    permissions = allPermissions[targetRole]
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetUserMenuPermissions(string username)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                {
                    return Json(new { success = false, message = "Tên tài khoản không được để trống!" }, JsonRequestBehavior.AllowGet);
                }

                string cleanUsername = username.Trim();
                var user = db.Users.FirstOrDefault(u => u.UserName.Equals(cleanUsername, System.StringComparison.OrdinalIgnoreCase));

                string roleCode = "Customer";
                string roleName = "Khách hàng";
                int roleId = 3;
                string fullName = cleanUsername;

                if (user != null)
                {
                    fullName = user.FullName ?? cleanUsername;
                    roleId = user.RoleID;
                    if (roleId == 1) { roleCode = "Admin"; roleName = "Admin Hệ thống"; }
                    else if (roleId == 4) { roleCode = "Manager"; roleName = "Quản lý"; }
                    else if (roleId == 2) { roleCode = "Staff"; roleName = "Nhân viên"; }
                    else { roleCode = "Customer"; roleName = "Khách hàng"; }
                }

                var userPermissions = LoadUserPermissionsFromFile();
                bool hasCustomOverride = userPermissions.ContainsKey(cleanUsername);

                RoleMenuPermissions currentPerm;
                if (hasCustomOverride)
                {
                    currentPerm = userPermissions[cleanUsername];
                }
                else
                {
                    var allRolePermissions = LoadRolePermissionsFromFile();
                    if (allRolePermissions.ContainsKey(roleCode))
                    {
                        currentPerm = allRolePermissions[roleCode];
                    }
                    else
                    {
                        var defaults = GetDefaultAllRolePermissions();
                        currentPerm = defaults.ContainsKey(roleCode) ? defaults[roleCode] : new RoleMenuPermissions();
                    }
                }

                if (roleCode.Equals("Admin", System.StringComparison.OrdinalIgnoreCase) || cleanUsername.Equals("admin", System.StringComparison.OrdinalIgnoreCase))
                {
                    currentPerm.menu_management = true;
                }

                return Json(new {
                    success = true,
                    username = cleanUsername,
                    fullName = fullName,
                    roleCode = roleCode,
                    roleName = roleName,
                    roleId = roleId,
                    hasCustomOverride = hasCustomOverride,
                    permissions = currentPerm
                }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveUserMenuPermissions(UserMenuSaveInputModel model)
        {
            try
            {
                if (model == null || string.IsNullOrWhiteSpace(model.username))
                {
                    return Json(new { success = false, message = "Dữ liệu phân quyền người dùng không hợp lệ!" });
                }

                // KIỂM TRA QUYỀN: CHỈ ADMIN MỚI ĐƯỢC PHÂN QUYỀN MENU
                string callerRole = Request.Headers["X-User-Role"] ?? model.currentUserRole;
                if (string.IsNullOrWhiteSpace(callerRole) || !callerRole.Trim().Equals("Admin", System.StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new { 
                        success = false, 
                        message = "Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền phân quyền menu cho từng tài khoản!" 
                    });
                }

                string username = model.username.Trim();
                var allUserPermissions = LoadUserPermissionsFromFile();

                if (model.resetToDefault == true)
                {
                    if (allUserPermissions.ContainsKey(username))
                    {
                        allUserPermissions.Remove(username);
                        SaveUserPermissionsToFile(allUserPermissions);
                    }

                    return Json(new {
                        success = true,
                        message = "Đã khôi phục phân quyền mặc định theo vai trò cho tài khoản: " + username + "!",
                        isReset = true
                    });
                }

                var userInDb = db.Users.FirstOrDefault(u => u.UserName.Equals(username, System.StringComparison.OrdinalIgnoreCase));
                bool isAdminUser = (userInDb != null && userInDb.RoleID == 1) || username.Equals("admin", System.StringComparison.OrdinalIgnoreCase);

                allUserPermissions[username] = new RoleMenuPermissions
                {
                    dashboard = model.dashboard,
                    orders = model.orders,
                    revenue = model.revenue,
                    products = model.products,
                    inventory = model.inventory,
                    categories = model.categories,
                    users = model.users,
                    storefront = model.storefront,
                    menu_management = isAdminUser ? true : false
                };

                SaveUserPermissionsToFile(allUserPermissions);

                return Json(new {
                    success = true,
                    message = "Đã lưu phân quyền menu thành công cho tài khoản: " + username + "!",
                    username = username,
                    permissions = allUserPermissions[username]
                });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetActiveMenuPermissions(string role = null, string username = null)
        {
            try
            {
                string r = string.IsNullOrWhiteSpace(role) ? "Admin" : role.Trim();
                if (string.IsNullOrWhiteSpace(role) && !string.IsNullOrWhiteSpace(username))
                {
                    var u = db.Users.FirstOrDefault(x => x.UserName.Equals(username.Trim(), System.StringComparison.OrdinalIgnoreCase));
                    if (u != null)
                    {
                        if (u.RoleID == 1) r = "Admin";
                        else if (u.RoleID == 4) r = "Manager";
                        else if (u.RoleID == 2) r = "Staff";
                        else r = "Customer";
                    }
                }

                if (r.Equals("quanly", System.StringComparison.OrdinalIgnoreCase) || r.Equals("quản lý", System.StringComparison.OrdinalIgnoreCase)) r = "Manager";
                if (r.Equals("nhanvien", System.StringComparison.OrdinalIgnoreCase) || r.Equals("nhân viên", System.StringComparison.OrdinalIgnoreCase)) r = "Staff";
                if (r.Equals("khachhang", System.StringComparison.OrdinalIgnoreCase) || r.Equals("khách hàng", System.StringComparison.OrdinalIgnoreCase)) r = "Customer";
                if (r.Equals("admin", System.StringComparison.OrdinalIgnoreCase) || r.Equals("quản trị viên", System.StringComparison.OrdinalIgnoreCase)) r = "Admin";

                // 1. Kiểm tra xem người dùng có cấu hình phân quyền RIÊNG BIỆT (User-level Override) không
                if (!string.IsNullOrWhiteSpace(username))
                {
                    string cleanUsername = username.Trim();
                    var userPermissions = LoadUserPermissionsFromFile();
                    if (userPermissions.ContainsKey(cleanUsername))
                    {
                        var userPerm = userPermissions[cleanUsername];
                        if (r.Equals("Admin", System.StringComparison.OrdinalIgnoreCase) || cleanUsername.Equals("admin", System.StringComparison.OrdinalIgnoreCase))
                        {
                            userPerm.menu_management = true; // Luôn đảm bảo Admin có quyền truy cập tab Quản lý menu
                        }

                        return Json(new {
                            success = true,
                            role = r,
                            username = cleanUsername,
                            isUserOverride = true,
                            permissions = userPerm
                        }, JsonRequestBehavior.AllowGet);
                    }
                }

                // 2. Nếu không có phân quyền riêng, lấy theo phân quyền vai trò (Role-level Permissions)
                var allPermissions = LoadRolePermissionsFromFile();
                RoleMenuPermissions perm;
                if (allPermissions.ContainsKey(r))
                {
                    perm = allPermissions[r];
                }
                else
                {
                    var defaults = GetDefaultAllRolePermissions();
                    perm = defaults.ContainsKey(r) ? defaults[r] : new RoleMenuPermissions();
                }

                if (r.Equals("Admin", System.StringComparison.OrdinalIgnoreCase))
                {
                    perm.menu_management = true; // Luôn đảm bảo Admin có quyền truy cập tab Quản lý menu
                }

                return Json(new {
                    success = true,
                    role = r,
                    username = username,
                    isUserOverride = false,
                    permissions = perm
                }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        #endregion



        #endregion



        #region Revenue Report Endpoints (Báo cáo Doanh thu Ngày/Tháng/Năm)
        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetRevenueReport(string type = "month", string date = null, int? month = null, int? year = null, int? storeId = null, string statusFilter = "completed")
        {
            try
            {
                var now = System.DateTime.Now;
                string reportType = string.IsNullOrWhiteSpace(type) ? "month" : type.ToLower().Trim();
                int targetYear = year ?? now.Year;
                int targetMonth = month ?? now.Month;

                var query = db.Orders.AsQueryable();

                if (storeId.HasValue && storeId.Value > 0)
                {
                    query = query.Where(o => o.store_id == storeId.Value);
                }

                if (statusFilter == "valid")
                {
                    query = query.Where(o => o.order_status != 5);
                }
                else if (statusFilter == "all")
                {
                    // No filter
                }
                else // default "completed"
                {
                    query = query.Where(o => o.order_status == 4 || o.payment_status == 1);
                }

                var chartLabels = new List<string>();
                var chartRevenue = new List<decimal>();
                var chartOrderCount = new List<int>();
                var tableData = new List<object>();

                List<Models.Order> filteredOrders = new List<Models.Order>();

                if (reportType == "day")
                {
                    System.DateTime targetDate;
                    if (!string.IsNullOrWhiteSpace(date) && System.DateTime.TryParse(date, out var parsedDate))
                    {
                        targetDate = parsedDate.Date;
                    }
                    else
                    {
                        targetDate = now.Date;
                    }

                    var nextDay = targetDate.AddDays(1);
                    filteredOrders = query
                        .Where(o => o.created_at >= targetDate && o.created_at < nextDay)
                        .OrderBy(o => o.created_at)
                        .ToList();

                    for (int h = 0; h < 24; h++)
                    {
                        var hourOrders = filteredOrders.Where(o => o.created_at.Hour == h).ToList();
                        decimal rev = hourOrders.Sum(o => (decimal?)o.total_amount) ?? 0;
                        int count = hourOrders.Count;

                        chartLabels.Add(h + ":00");
                        chartRevenue.Add(rev);
                        chartOrderCount.Add(count);

                        if (count > 0 || rev > 0)
                        {
                            tableData.Add(new {
                                timeLabel = string.Format("{0:00}:00 - {0:00}:59", h),
                                orderCount = count,
                                revenue = rev,
                                averageValue = count > 0 ? (rev / count) : 0
                            });
                        }
                    }
                }
                else if (reportType == "month")
                {
                    var startOfMonth = new System.DateTime(targetYear, targetMonth, 1);
                    var endOfMonth = startOfMonth.AddMonths(1);

                    filteredOrders = query
                        .Where(o => o.created_at >= startOfMonth && o.created_at < endOfMonth)
                        .OrderBy(o => o.created_at)
                        .ToList();

                    int daysInMonth = System.DateTime.DaysInMonth(targetYear, targetMonth);
                    for (int d = 1; d <= daysInMonth; d++)
                    {
                        var dayOrders = filteredOrders.Where(o => o.created_at.Day == d).ToList();
                        decimal rev = dayOrders.Sum(o => (decimal?)o.total_amount) ?? 0;
                        int count = dayOrders.Count;

                        chartLabels.Add("Ngày " + d);
                        chartRevenue.Add(rev);
                        chartOrderCount.Add(count);

                        tableData.Add(new {
                            timeLabel = string.Format("{0:00}/{1:00}/{2}", d, targetMonth, targetYear),
                            orderCount = count,
                            revenue = rev,
                            averageValue = count > 0 ? (rev / count) : 0
                        });
                    }
                }
                else // "year"
                {
                    var startOfYear = new System.DateTime(targetYear, 1, 1);
                    var endOfYear = startOfYear.AddYears(1);

                    filteredOrders = query
                        .Where(o => o.created_at >= startOfYear && o.created_at < endOfYear)
                        .OrderBy(o => o.created_at)
                        .ToList();

                    for (int m = 1; m <= 12; m++)
                    {
                        var monthOrders = filteredOrders.Where(o => o.created_at.Month == m).ToList();
                        decimal rev = monthOrders.Sum(o => (decimal?)o.total_amount) ?? 0;
                        int count = monthOrders.Count;

                        chartLabels.Add("Tháng " + m);
                        chartRevenue.Add(rev);
                        chartOrderCount.Add(count);

                        tableData.Add(new {
                            timeLabel = "Tháng " + m + "/" + targetYear,
                            orderCount = count,
                            revenue = rev,
                            averageValue = count > 0 ? (rev / count) : 0
                        });
                    }
                }

                decimal totalRevenue = filteredOrders.Sum(o => (decimal?)o.total_amount) ?? 0;
                int totalOrders = filteredOrders.Count;
                decimal averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
                decimal totalShippingFee = filteredOrders.Sum(o => (decimal?)o.shipping_fee) ?? 0;
                decimal totalDiscount = filteredOrders.Sum(o => (decimal?)o.discount_amount) ?? 0;

                var orderIds = filteredOrders.Select(o => o.order_id).ToList();
                var details = orderIds.Count > 0 
                    ? db.Order_Details.Where(d => orderIds.Contains(d.order_id)).ToList()
                    : new List<Models.Order_Details>();

                var topProducts = details
                    .GroupBy(d => new { 
                        name = (d.Product_Variants != null && d.Product_Variants.Product != null) ? d.Product_Variants.Product.product_name : "Sản phẩm",
                        code = (d.Product_Variants != null && d.Product_Variants.Product != null) ? d.Product_Variants.Product.product_code : "SP"
                    })
                    .Select(g => new {
                        productName = g.Key.name,
                        productCode = g.Key.code,
                        quantitySold = g.Sum(x => x.quantity),
                        revenue = g.Sum(x => x.total_price)
                    })
                    .OrderByDescending(x => x.revenue)
                    .Take(5)
                    .ToList();

                var allStores = db.Stores.Where(s => s.is_active).ToList();
                var storeBreakdown = allStores.Select(s => {
                    var sOrders = filteredOrders.Where(o => o.store_id == s.store_id).ToList();
                    return new {
                        storeId = s.store_id,
                        storeName = s.store_name,
                        orderCount = sOrders.Count,
                        revenue = sOrders.Sum(o => (decimal?)o.total_amount) ?? 0
                    };
                }).ToList();

                var orderList = filteredOrders
                    .OrderByDescending(o => o.created_at)
                    .Take(100)
                    .Select(o => new {
                        orderId = o.order_id,
                        orderCode = o.order_code,
                        customerName = o.Customer != null ? o.Customer.full_name : "Khách lẻ",
                        customerPhone = o.Customer != null ? o.Customer.phone : "",
                        storeName = o.Store != null ? o.Store.store_name : "Chi nhánh chính",
                        createdAt = o.created_at.ToString("dd/MM/yyyy HH:mm"),
                        totalAmount = o.total_amount,
                        orderStatus = o.order_status,
                        orderStatusText = GetOrderStatusText(o.order_status),
                        paymentStatus = o.payment_status,
                        paymentStatusText = GetPaymentStatusText(o.payment_status)
                    })
                    .ToList();

                return Json(new {
                    success = true,
                    reportType = reportType,
                    filter = new {
                        year = targetYear,
                        month = targetMonth,
                        date = date,
                        storeId = storeId,
                        statusFilter = statusFilter
                    },
                    summary = new {
                        totalRevenue = totalRevenue,
                        totalOrders = totalOrders,
                        averageOrderValue = averageOrderValue,
                        totalShippingFee = totalShippingFee,
                        totalDiscount = totalDiscount
                    },
                    chart = new {
                        labels = chartLabels,
                        revenue = chartRevenue,
                        orderCount = chartOrderCount
                    },
                    tableData = tableData,
                    topProducts = topProducts,
                    storeBreakdown = storeBreakdown,
                    orders = orderList
                }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }
        #endregion

        #region Customer Role Features (Module 4 - Shopping Experience)

        [HttpPost]
        [AllowAnonymous]
        public JsonResult ForgotPassword(string username, string newPassword)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                    return Json(new { success = false, message = "Vui lòng nhập tên đăng nhập hoặc số điện thoại!" });

                string uname = username.Trim().ToLower();
                var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                if (user == null)
                {
                    var cust = db.Customers.FirstOrDefault(c => c.phone == username.Trim() || c.email.ToLower() == uname);
                    if (cust != null)
                    {
                        user = db.Users.FirstOrDefault(u => u.FullName.ToLower() == cust.full_name.ToLower());
                    }
                }

                if (user == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy tài khoản tương ứng trên hệ thống!" });
                }

                string resetPass = !string.IsNullOrWhiteSpace(newPassword) ? newPassword.Trim() : "123456";
                user.Password = resetPass;

                var linkedCust = db.Customers.FirstOrDefault(c => c.full_name.ToLower() == user.FullName.ToLower());
                if (linkedCust != null)
                {
                    linkedCust.password_hash = resetPass;
                }

                db.SaveChanges();
                return Json(new { success = true, message = "Đặt lại mật khẩu thành công! Mật khẩu mới của bạn là: " + resetPass });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetCustomerProfile(string username)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                    return Json(new { success = false, message = "Vui lòng cung cấp tên đăng nhập!" }, JsonRequestBehavior.AllowGet);

                string uname = username.Trim().ToLower();
                var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                string userFullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName.Trim().ToLower() : "";
                var cust = db.Customers.FirstOrDefault(c => c.email.ToLower().Contains(uname) || (userFullName != "" && c.full_name.ToLower() == userFullName));

                var profile = new {
                    userId = user != null ? user.UserID : 0,
                    username = user != null ? user.UserName : username,
                    fullName = user != null ? user.FullName : (cust != null ? cust.full_name : ""),
                    email = cust != null ? cust.email : (username + "@gmail.com"),
                    phone = cust != null ? cust.phone : "",
                    gender = cust != null && cust.gender.HasValue ? (cust.gender.Value == 1 ? "Nam" : (cust.gender.Value == 0 ? "Nữ" : "Khác")) : "Nam",
                    dateOfBirth = cust != null && cust.date_of_birth.HasValue ? cust.date_of_birth.Value.ToString("yyyy-MM-dd") : "",
                    role = user != null && user.Role != null ? user.Role.RoleName : "Customer"
                };

                return Json(new { success = true, data = profile }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UpdateCustomerProfile(string username, string fullName, string phone, string email, string password, string gender, string dateOfBirth)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                    return Json(new { success = false, message = "Không tìm thấy thông tin tài khoản!" });

                string uname = username.Trim().ToLower();
                var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                if (user != null)
                {
                    if (!string.IsNullOrWhiteSpace(fullName)) user.FullName = fullName.Trim();
                    if (!string.IsNullOrWhiteSpace(password)) user.Password = password.Trim();
                }

                string userFullName = user != null && !string.IsNullOrWhiteSpace(user.FullName) ? user.FullName.Trim().ToLower() : "";
                var cust = db.Customers.FirstOrDefault(c => (userFullName != "" && c.full_name.ToLower() == userFullName) || c.email.ToLower() == uname);
                if (cust != null)
                {
                    if (!string.IsNullOrWhiteSpace(fullName)) cust.full_name = fullName.Trim();
                    if (!string.IsNullOrWhiteSpace(phone)) cust.phone = phone.Trim();
                    if (!string.IsNullOrWhiteSpace(email)) cust.email = email.Trim().ToLower();
                    if (!string.IsNullOrWhiteSpace(password)) cust.password_hash = password.Trim();
                    byte? parsedGender = null;
                    if (!string.IsNullOrWhiteSpace(gender))
                    {
                        string g = gender.Trim().ToLower();
                        if (g == "nam" || g == "1") parsedGender = 1;
                        else if (g == "nữ" || g == "nu" || g == "0") parsedGender = 0;
                        else parsedGender = 2;
                    }
                    if (parsedGender.HasValue) cust.gender = parsedGender.Value;

                    if (!string.IsNullOrWhiteSpace(dateOfBirth) && System.DateTime.TryParse(dateOfBirth, out System.DateTime dob))
                    {
                        cust.date_of_birth = dob;
                    }
                }
                else if (user != null)
                {
                    byte defaultG = 1;
                    if (!string.IsNullOrWhiteSpace(gender))
                    {
                        string g = gender.Trim().ToLower();
                        if (g == "nữ" || g == "nu" || g == "0") defaultG = 0;
                        else if (g != "nam" && g != "1") defaultG = 2;
                    }

                    cust = new Models.Customer {
                        full_name = user.FullName,
                        phone = !string.IsNullOrWhiteSpace(phone) ? phone.Trim() : "0900000000",
                        email = !string.IsNullOrWhiteSpace(email) ? email.Trim().ToLower() : (uname + "@gmail.com"),
                        password_hash = user.Password,
                        gender = defaultG,
                        is_active = true,
                        created_at = System.DateTime.Now
                    };
                    db.Customers.Add(cust);
                }

                db.SaveChanges();
                return Json(new { success = true, message = "Cập nhật hồ sơ tài khoản thành công!", fullName = user != null ? user.FullName : fullName });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetCustomerAddresses(string username)
        {
            try
            {
                string uname = !string.IsNullOrWhiteSpace(username) ? username.Trim().ToLower() : "";
                var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                string ufn = user != null ? user.FullName.Trim().ToLower() : "";

                var cust = db.Customers.FirstOrDefault(c => (ufn != "" && c.full_name.ToLower() == ufn) || c.email.ToLower().Contains(uname));
                if (cust == null)
                {
                    return Json(new { success = true, data = new object[0] }, JsonRequestBehavior.AllowGet);
                }

                var addresses = db.Customer_Addresses.Where(a => a.customer_id == cust.customer_id)
                    .OrderByDescending(a => a.is_default)
                    .ThenByDescending(a => a.address_id)
                    .Select(a => new {
                        addressId = a.address_id,
                        customerId = a.customer_id,
                        receiverName = a.receiver_name,
                        phone = a.phone,
                        addressLine = a.address_line,
                        ward = a.ward,
                        district = a.district,
                        province = a.province,
                        isDefault = a.is_default,
                        fullAddress = a.address_line + 
                            (!string.IsNullOrEmpty(a.ward) ? ", " + a.ward : "") +
                            (!string.IsNullOrEmpty(a.district) ? ", " + a.district : "") +
                            (!string.IsNullOrEmpty(a.province) ? ", " + a.province : "")
                    }).ToList();

                return Json(new { success = true, data = addresses }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveCustomerAddress(int? addressId, string username, string receiverName, string phone, string addressLine, string ward, string district, string province, bool? isDefault)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(receiverName)) return Json(new { success = false, message = "Vui lòng nhập tên người nhận!" });
                if (string.IsNullOrWhiteSpace(phone)) return Json(new { success = false, message = "Vui lòng nhập số điện thoại!" });
                if (string.IsNullOrWhiteSpace(addressLine)) return Json(new { success = false, message = "Vui lòng nhập địa chỉ nhận hàng!" });

                string uname = !string.IsNullOrWhiteSpace(username) ? username.Trim().ToLower() : "";
                var user = db.Users.FirstOrDefault(u => u.UserName.ToLower() == uname);
                string ufn = user != null ? user.FullName.Trim().ToLower() : "";

                var cust = db.Customers.FirstOrDefault(c => (ufn != "" && c.full_name.ToLower() == ufn) || c.email.ToLower().Contains(uname));
                if (cust == null)
                {
                    cust = new Models.Customer {
                        full_name = receiverName.Trim(),
                        phone = phone.Trim(),
                        email = (uname != "" ? uname : phone.Trim()) + "@gmail.com",
                        password_hash = "123456",
                        is_active = true,
                        created_at = System.DateTime.Now
                    };
                    db.Customers.Add(cust);
                    db.SaveChanges();
                }

                bool makeDefault = isDefault.GetValueOrDefault(false);

                if (addressId.HasValue && addressId.Value > 0)
                {
                    var addr = db.Customer_Addresses.Find(addressId.Value);
                    if (addr == null) return Json(new { success = false, message = "Không tìm thấy địa chỉ!" });
                    addr.receiver_name = receiverName.Trim();
                    addr.phone = phone.Trim();
                    addr.address_line = addressLine.Trim();
                    addr.ward = ward ?? "";
                    addr.district = district ?? "";
                    addr.province = province ?? "";
                    if (makeDefault)
                    {
                        var others = db.Customer_Addresses.Where(a => a.customer_id == cust.customer_id && a.address_id != addr.address_id).ToList();
                        others.ForEach(o => o.is_default = false);
                        addr.is_default = true;
                    }
                }
                else
                {
                    bool hasAny = db.Customer_Addresses.Any(a => a.customer_id == cust.customer_id);
                    if (!hasAny) makeDefault = true;

                    if (makeDefault)
                    {
                        var others = db.Customer_Addresses.Where(a => a.customer_id == cust.customer_id).ToList();
                        others.ForEach(o => o.is_default = false);
                    }

                    var addr = new Models.Customer_Addresses {
                        customer_id = cust.customer_id,
                        receiver_name = receiverName.Trim(),
                        phone = phone.Trim(),
                        address_line = addressLine.Trim(),
                        ward = ward ?? "",
                        district = district ?? "",
                        province = province ?? "",
                        is_default = makeDefault
                    };
                    db.Customer_Addresses.Add(addr);
                }

                db.SaveChanges();
                return Json(new { success = true, message = "Lưu địa chỉ thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult DeleteCustomerAddress(int id)
        {
            try
            {
                var addr = db.Customer_Addresses.Find(id);
                if (addr != null)
                {
                    db.Customer_Addresses.Remove(addr);
                    db.SaveChanges();
                    return Json(new { success = true, message = "Đã xóa địa chỉ thành công!" });
                }
                return Json(new { success = false, message = "Không tìm thấy địa chỉ cần xóa!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult CancelCustomerOrder(int orderId, string reason)
        {
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null) return Json(new { success = false, message = "Không tìm thấy đơn hàng!" });
                if (order.order_status != 1)
                {
                    return Json(new { success = false, message = "Đơn hàng đã được duyệt và đang xử lý, không thể tự hủy! Vui lòng gửi yêu cầu Đổi/Trả hoặc liên hệ hỗ trợ." });
                }

                // Hoàn lại kho
                foreach (var detail in order.Order_Details)
                {
                    var inv = db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id && i.store_id == order.store_id)
                           ?? db.Store_Inventory.FirstOrDefault(i => i.variant_id == detail.variant_id);
                    if (inv != null)
                    {
                        inv.quantity += detail.quantity;
                        inv.updated_at = System.DateTime.Now;
                    }
                }

                order.order_status = 5; // Đã hủy
                db.SaveChanges();

                return Json(new { success = true, message = "Đã hủy đơn hàng " + order.order_code + " thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SubmitOrderReturn(int orderId, string reason, string details, string refundBank, string refundAccount)
        {
            try
            {
                var order = db.Orders.Find(orderId);
                if (order == null) return Json(new { success = false, message = "Không tìm thấy đơn hàng!" });

                var reqModel = new OrderReturnRequestModel {
                    orderId = order.order_id,
                    orderCode = order.order_code,
                    customerName = order.Customer != null ? order.Customer.full_name : "",
                    phone = order.Customer != null ? order.Customer.phone : "",
                    reason = reason ?? "Đổi hàng do lỗi / không vừa",
                    details = details ?? "",
                    refundBank = refundBank ?? "",
                    refundAccount = refundAccount ?? "",
                    createdAt = System.DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                    status = "Đang chờ duyệt đổi/trả"
                };

                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                if (!System.IO.Directory.Exists(appData)) System.IO.Directory.CreateDirectory(appData);
                string file = System.IO.Path.Combine(appData, "order_returns.json");
                List<OrderReturnRequestModel> list = new List<OrderReturnRequestModel>();
                if (System.IO.File.Exists(file))
                {
                    string json = System.IO.File.ReadAllText(file);
                    list = Newtonsoft.Json.JsonConvert.DeserializeObject<List<OrderReturnRequestModel>>(json) ?? new List<OrderReturnRequestModel>();
                }
                list.Insert(0, reqModel);
                System.IO.File.WriteAllText(file, Newtonsoft.Json.JsonConvert.SerializeObject(list, Newtonsoft.Json.Formatting.Indented));

                return Json(new { success = true, message = "Yêu cầu đổi/trả đơn hàng #" + order.order_code + " đã được gửi thành công! Ban quản lý sẽ liên hệ xác nhận trong 24h làm việc." });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        public class ProductReviewDbDto
        {
            public int review_id { get; set; }
            public int product_id { get; set; }
            public string reviewer_name { get; set; }
            public byte rating { get; set; }
            public string comment { get; set; }
            public string admin_reply { get; set; }
            public bool is_verified_purchase { get; set; }
            public DateTime created_at { get; set; }
        }

        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetProductReviews(int productId)
        {
            try
            {
                // 1. Thử lấy từ bảng Product_Reviews trong Database SQL Server
                try
                {
                    var dbReviews = db.Database.SqlQuery<ProductReviewDbDto>(@"
                        SELECT review_id, product_id, reviewer_name, rating, comment, admin_reply, is_verified_purchase, created_at
                        FROM Product_Reviews
                        WHERE product_id = @p0
                        ORDER BY created_at DESC
                    ", productId).ToList();

                    if (dbReviews != null && dbReviews.Count > 0)
                    {
                        var mapped = dbReviews.Select(r => new {
                            productId = r.product_id,
                            username = "khachhang",
                            fullName = r.reviewer_name,
                            rating = (int)r.rating,
                            comment = r.comment,
                            adminReply = r.admin_reply,
                            isVerified = r.is_verified_purchase,
                            createdAt = r.created_at.ToString("dd/MM/yyyy HH:mm")
                        }).ToList();
                        double avg = mapped.Average(r => r.rating);
                        return Json(new { success = true, data = mapped, averageRating = System.Math.Round(avg, 1), totalReviews = mapped.Count }, JsonRequestBehavior.AllowGet);
                    }
                }
                catch { }

                // 2. Dự phòng file JSON nếu DB chưa có
                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                string file = System.IO.Path.Combine(appData, "product_reviews.json");
                List<ProductReviewModel> list = new List<ProductReviewModel>();
                if (System.IO.File.Exists(file))
                {
                    string json = System.IO.File.ReadAllText(file);
                    list = Newtonsoft.Json.JsonConvert.DeserializeObject<List<ProductReviewModel>>(json) ?? new List<ProductReviewModel>();
                }
                var filtered = list.Where(r => r.productId == productId).OrderByDescending(r => r.createdAt).ToList();
                double avgFallback = filtered.Any() ? filtered.Average(r => r.rating) : 5.0;

                return Json(new { success = true, data = filtered, averageRating = System.Math.Round(avgFallback, 1), totalReviews = filtered.Count }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SubmitProductReview(int productId, string username, string fullName, int rating, string comment)
        {
            try
            {
                if (rating < 1 || rating > 5) rating = 5;
                if (string.IsNullOrWhiteSpace(comment)) return Json(new { success = false, message = "Vui lòng nhập nội dung đánh giá / bình luận!" });

                string reviewer = !string.IsNullOrWhiteSpace(fullName) ? fullName.Trim() : (!string.IsNullOrWhiteSpace(username) ? username.Trim() : "Khách hàng");

                // 1. Ghi vào bảng Product_Reviews trong SQL Server
                try
                {
                    db.Database.ExecuteSqlCommand(@"
                        INSERT INTO Product_Reviews (product_id, reviewer_name, rating, comment, is_verified_purchase, created_at)
                        VALUES (@p0, @p1, @p2, @p3, 1, GETDATE())
                    ", productId, reviewer, (byte)rating, comment.Trim());
                }
                catch { }

                // 2. Đồng thời ghi vào file JSON App_Data để đảm bảo tính sẵn sàng
                var rev = new ProductReviewModel {
                    productId = productId,
                    username = username ?? "khachhang",
                    fullName = reviewer,
                    rating = rating,
                    comment = comment.Trim(),
                    createdAt = System.DateTime.Now.ToString("dd/MM/yyyy HH:mm")
                };

                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                if (!System.IO.Directory.Exists(appData)) System.IO.Directory.CreateDirectory(appData);
                string file = System.IO.Path.Combine(appData, "product_reviews.json");
                List<ProductReviewModel> list = new List<ProductReviewModel>();
                if (System.IO.File.Exists(file))
                {
                    string json = System.IO.File.ReadAllText(file);
                    list = Newtonsoft.Json.JsonConvert.DeserializeObject<List<ProductReviewModel>>(json) ?? new List<ProductReviewModel>();
                }
                list.Insert(0, rev);
                System.IO.File.WriteAllText(file, Newtonsoft.Json.JsonConvert.SerializeObject(list, Newtonsoft.Json.Formatting.Indented));

                return Json(new { success = true, message = "Cảm ơn bạn đã gửi đánh giá sản phẩm thành công!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SubmitSupportTicket(string fullName, string phone, string email, string category, string content)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(fullName)) return Json(new { success = false, message = "Vui lòng nhập họ và tên của bạn!" });
                if (string.IsNullOrWhiteSpace(phone)) return Json(new { success = false, message = "Vui lòng nhập số điện thoại để chúng tôi liên hệ hỗ trợ!" });
                if (string.IsNullOrWhiteSpace(content)) return Json(new { success = false, message = "Vui lòng nhập nội dung khiếu nại / yêu cầu hỗ trợ!" });

                var ticket = new SupportTicketModel {
                    fullName = fullName.Trim(),
                    phone = phone.Trim(),
                    email = email ?? "",
                    category = category ?? "Khiếu nại dịch vụ",
                    content = content.Trim(),
                    createdAt = System.DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"),
                    status = "Tiếp nhận thành công (Đang xử lý)"
                };

                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                if (!System.IO.Directory.Exists(appData)) System.IO.Directory.CreateDirectory(appData);
                string file = System.IO.Path.Combine(appData, "support_tickets.json");
                List<SupportTicketModel> list = new List<SupportTicketModel>();
                if (System.IO.File.Exists(file))
                {
                    string json = System.IO.File.ReadAllText(file);
                    list = Newtonsoft.Json.JsonConvert.DeserializeObject<List<SupportTicketModel>>(json) ?? new List<SupportTicketModel>();
                }
                list.Insert(0, ticket);
                System.IO.File.WriteAllText(file, Newtonsoft.Json.JsonConvert.SerializeObject(list, Newtonsoft.Json.Formatting.Indented));

                return Json(new { success = true, message = "Yêu cầu hỗ trợ & khiếu nại của bạn đã được gửi thành công! Bộ phận CSKH 24/7 sẽ liên hệ giải quyết qua số điện thoại " + phone + " trong thời gian sớm nhất." });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        #region Banner Management Endpoints
        [HttpGet]
        [AllowAnonymous]
        public JsonResult GetBannerConfig()
        {
            try
            {
                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                string file = System.IO.Path.Combine(appData, "banner_config.json");
                BannerConfigModel config = null;
                if (System.IO.File.Exists(file))
                {
                    string json = System.IO.File.ReadAllText(file);
                    config = Newtonsoft.Json.JsonConvert.DeserializeObject<BannerConfigModel>(json);
                }
                if (config == null)
                {
                    config = new BannerConfigModel {
                        mode = "gradient",
                        tag = "Siêu khuyến mãi",
                        title = "Ngày hội\nSiêu Sale 50%",
                        description = "Áp dụng cho toàn bộ đồ uống và đồ ăn nhanh. Freeship cho đơn từ 99K.",
                        buttonText = "Mua Ngay",
                        buttonLink = "#flash-sale-products",
                        iconClass = "fas fa-hamburger",
                        gradientFrom = "#ff5722",
                        gradientTo = "#ff8a50",
                        imageUrl = "",
                        imageLink = "#flash-sale-products",
                        updatedAt = System.DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss")
                    };
                }
                return Json(new { success = true, data = config }, JsonRequestBehavior.AllowGet);
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult SaveBannerConfig(BannerConfigModel model)
        {
            try
            {
                if (model == null) return Json(new { success = false, message = "Dữ liệu cấu hình banner không hợp lệ!" });

                model.mode = string.IsNullOrEmpty(model.mode) ? "gradient" : model.mode;
                model.tag = model.tag ?? "Siêu khuyến mãi";
                model.title = model.title ?? "Tiêu đề banner";
                model.description = model.description ?? "";
                model.buttonText = string.IsNullOrEmpty(model.buttonText) ? "Mua Ngay" : model.buttonText;
                model.buttonLink = string.IsNullOrEmpty(model.buttonLink) ? "#flash-sale-products" : model.buttonLink;
                model.iconClass = string.IsNullOrEmpty(model.iconClass) ? "fas fa-star" : model.iconClass;
                model.gradientFrom = string.IsNullOrEmpty(model.gradientFrom) ? "#ff5722" : model.gradientFrom;
                model.gradientTo = string.IsNullOrEmpty(model.gradientTo) ? "#ff8a50" : model.gradientTo;
                model.imageUrl = model.imageUrl ?? "";
                model.imageLink = string.IsNullOrEmpty(model.imageLink) ? "#flash-sale-products" : model.imageLink;
                model.updatedAt = System.DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss");

                string appData = System.Web.Hosting.HostingEnvironment.MapPath("~/App_Data");
                if (!System.IO.Directory.Exists(appData)) System.IO.Directory.CreateDirectory(appData);
                string file = System.IO.Path.Combine(appData, "banner_config.json");
                string jsonOutput = Newtonsoft.Json.JsonConvert.SerializeObject(model, Newtonsoft.Json.Formatting.Indented);
                System.IO.File.WriteAllText(file, jsonOutput);

                try
                {
                    string rootPath = "d:\\Lập trình web\\WebDemo\\App_Data";
                    if (System.IO.Directory.Exists(rootPath))
                    {
                        System.IO.File.WriteAllText(System.IO.Path.Combine(rootPath, "banner_config.json"), jsonOutput);
                    }
                }
                catch { }

                return Json(new { success = true, message = "Lưu cấu hình Banner thành công!", data = model });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = GetErrorMessage(ex) });
            }
        }

        [HttpPost]
        [AllowAnonymous]
        public JsonResult UploadBannerImage()
        {
            try
            {
                if (Request.Files.Count > 0)
                {
                    var file = Request.Files[0];
                    if (file != null && file.ContentLength > 0)
                    {
                        string ext = System.IO.Path.GetExtension(file.FileName);
                        string safeFileName = "banner_" + System.DateTime.Now.Ticks + ext;
                        string folderPath = Server.MapPath("~/images/banners/");
                        if (!System.IO.Directory.Exists(folderPath))
                        {
                            System.IO.Directory.CreateDirectory(folderPath);
                        }

                        string fullPath = System.IO.Path.Combine(folderPath, safeFileName);
                        file.SaveAs(fullPath);

                        try
                        {
                            string rootBannerFolder = "d:\\Lập trình web\\WebDemo\\images\\banners";
                            if (!System.IO.Directory.Exists(rootBannerFolder)) System.IO.Directory.CreateDirectory(rootBannerFolder);
                            file.SaveAs(System.IO.Path.Combine(rootBannerFolder, safeFileName));
                        }
                        catch { }

                        string relativeUrl = "/images/banners/" + safeFileName;
                        return Json(new { success = true, url = relativeUrl });
                    }
                }
                return Json(new { success = false, message = "Không tìm thấy file ảnh banner tải lên!" });
            }
            catch (System.Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #endregion
    }

    public class StaffMenuPermission
    {
        public bool orders { get; set; }
        public bool products { get; set; }
        public bool inventory { get; set; }
    }

    public class StaffPermissionInputModel
    {
        public string username { get; set; }
        public bool orders { get; set; }
        public bool products { get; set; }
        public bool inventory { get; set; }
    }

    public class OrderItemInputModel
    {
        public int variantId { get; set; }
        public int quantity { get; set; }
        public decimal price { get; set; }
    }

    public class CreateOrderInputModel
    {
        public string username { get; set; }
        public int? customerId { get; set; }
        public string fullName { get; set; }
        public string phone { get; set; }
        public string email { get; set; }
        public string address { get; set; }
        public string ward { get; set; }
        public string district { get; set; }
        public string province { get; set; }
        public int? storeId { get; set; }
        public decimal? shippingFee { get; set; }
        public decimal? discountAmount { get; set; }
        public List<OrderItemInputModel> items { get; set; }
    }

    public class RoleMenuPermissions
    {
        public bool dashboard { get; set; }
        public bool orders { get; set; }
        public bool revenue { get; set; }
        public bool products { get; set; }
        public bool inventory { get; set; }
        public bool categories { get; set; }
        public bool users { get; set; }
        public bool storefront { get; set; }
        public bool menu_management { get; set; }
    }

    public class RoleMenuSaveInputModel
    {
        public string targetRole { get; set; }
        public string currentUserRole { get; set; }
        public bool dashboard { get; set; }
        public bool orders { get; set; }
        public bool revenue { get; set; }
        public bool products { get; set; }
        public bool inventory { get; set; }
        public bool categories { get; set; }
        public bool users { get; set; }
        public bool storefront { get; set; }
    }

    public class UserMenuSaveInputModel
    {
        public string username { get; set; }
        public string currentUserRole { get; set; }
        public bool dashboard { get; set; }
        public bool orders { get; set; }
        public bool revenue { get; set; }
        public bool products { get; set; }
        public bool inventory { get; set; }
        public bool categories { get; set; }
        public bool users { get; set; }
        public bool storefront { get; set; }
        public bool? resetToDefault { get; set; }
    }

    public class OrderReturnRequestModel
    {
        public int orderId { get; set; }
        public string orderCode { get; set; }
        public string customerName { get; set; }
        public string phone { get; set; }
        public string reason { get; set; }
        public string details { get; set; }
        public string refundBank { get; set; }
        public string refundAccount { get; set; }
        public string createdAt { get; set; }
        public string status { get; set; }
    }

    public class ProductReviewModel
    {
        public int productId { get; set; }
        public string username { get; set; }
        public string fullName { get; set; }
        public int rating { get; set; }
        public string comment { get; set; }
        public string createdAt { get; set; }
    }

    public class SupportTicketModel
    {
        public string fullName { get; set; }
        public string phone { get; set; }
        public string email { get; set; }
        public string category { get; set; }
        public string content { get; set; }
        public string createdAt { get; set; }
        public string status { get; set; }
    }

    public class BannerConfigModel
    {
        public string mode { get; set; }
        public string tag { get; set; }
        public string title { get; set; }
        public string description { get; set; }
        public string buttonText { get; set; }
        public string buttonLink { get; set; }
        public string iconClass { get; set; }
        public string gradientFrom { get; set; }
        public string gradientTo { get; set; }
        public string imageUrl { get; set; }
        public string imageLink { get; set; }
        public string updatedAt { get; set; }
    }
}