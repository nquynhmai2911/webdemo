using System.Web.Mvc;

namespace WebDemo.Controllers
{
    public class BaseController : Controller
    {
        protected override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            bool skipAuthorization = filterContext.ActionDescriptor.IsDefined(typeof(AllowAnonymousAttribute), inherit: true)
                                 || filterContext.ActionDescriptor.ControllerDescriptor.IsDefined(typeof(AllowAnonymousAttribute), inherit: true);

            if (skipAuthorization)
            {
                base.OnActionExecuting(filterContext);
                return;
            }

            if (Session["UserID"] == null)
            {
                filterContext.Result = new RedirectResult("~/login.html");
                return;
            }
            base.OnActionExecuting(filterContext);
        }

        // Quản lý (Manager) hoặc Quản trị viên (Admin) - RoleID 1 hoặc 4
        protected bool IsAdmin()
        {
            if (Session["RoleID"] == null) return false;
            int roleId = (int)Session["RoleID"];
            return roleId == 1 || roleId == 4;
        }

        // Kiểm tra vai trò Quản lý / Admin
        protected bool IsManagerOrAdmin()
        {
            return IsAdmin();
        }

        // Quản lý, Admin hoặc Staff đều được
        protected bool IsStaffOrAdmin()
        {
            if (Session["RoleID"] == null) return false;
            int roleId = (int)Session["RoleID"];
            return roleId == 1 || roleId == 2 || roleId == 4;
        }
    }
}
