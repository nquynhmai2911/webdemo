using System.Linq;
using System.Reflection;
using System.Web.Mvc;
using WebDemo.Models;          // Model1 context

namespace WebDemo.Controllers
{
    public class LoginController : Controller
    {
        // GET: Login
        public ActionResult Index()
        {
            // Mặc định cho phép khách (Guest) vào xem hàng tự do
            return Redirect("~/index.html");
        }

        [HttpPost]
        public ActionResult Authorize(UserLoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View("Index", model);
            }

            using (var db = new WebDemoEntities2())  // tên context của bạn (thường là Model1)
            {
                var user = db.Users
                    .FirstOrDefault(x => x.UserName == model.UserName
                                      && x.Password == model.Password
                                      && x.IsActive == true);

                if (user == null)
                {
                    model.LoginErrorMessage = "Tên đăng nhập hoặc mật khẩu không đúng!";
                    return View("Index", model);
                }

                // Lưu Session
                Session["UserID"] = user.UserID;
                Session["UserName"] = user.UserName;
                Session["FullName"] = user.FullName;
                Session["RoleID"] = user.RoleID;
                Session["RoleName"] = user.Role != null ? user.Role.RoleName : "Customer";

                // Phân quyền chuyển trang:
                // 1. Quản lý / Admin (RoleID == 1 hoặc 4) -> Vào trang Admin
                // 2. Nhân viên (RoleID == 2) -> Vào trang Staff
                // 3. Khách hàng (RoleID == 3) -> Vào trang Khách hàng (index.html)
                if (user.RoleID == 1 || user.RoleID == 4 || 
                    (user.Role != null && (user.Role.RoleName == "Admin" || user.Role.RoleName == "Manager" || user.Role.RoleName == "Quản lý")))
                {
                    return RedirectToAction("Index", "Admin");
                }
                else if (user.RoleID == 2 || (user.Role != null && (user.Role.RoleName == "Staff" || user.Role.RoleName == "Nhân viên")))
                {
                    return RedirectToAction("Index", "Staff");
                }
                else // Customer
                {
                    return Redirect("~/index.html");
                }
            }
        }

        public ActionResult Logout()
        {
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("Index", "Login");
        }
    }
}
