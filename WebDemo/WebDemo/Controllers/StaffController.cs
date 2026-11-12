using System.Web.Mvc;

namespace WebDemo.Controllers
{
    public class StaffController : BaseController
    {
        public ActionResult Index()
        {
            if (!IsStaffOrAdmin())
            {
                return RedirectToAction("Index", "Login");
            }

            ViewBag.FullName = Session["FullName"];
            ViewBag.Role = Session["RoleName"];
            return View();
        }
    }
}