using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using System.Diagnostics;

namespace WebDemo
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);

            Debug.WriteLine("[WebDemo] ===== Application Started on port 2911 =====");
        }

        /// <summary>
        /// Thêm CORS header cho phép frontend (file:// hoặc localhost khác port)
        /// gọi API mà không bị trình duyệt chặn.
        /// </summary>
        protected void Application_BeginRequest(object sender, EventArgs e)
        {
            var response = HttpContext.Current.Response;
            var request = HttpContext.Current.Request;

            string origin = request.Headers["Origin"];
            if (string.IsNullOrEmpty(origin) || origin == "null")
            {
                response.AddHeader("Access-Control-Allow-Origin", "*");
            }
            else
            {
                response.AddHeader("Access-Control-Allow-Origin", origin);
                response.AddHeader("Access-Control-Allow-Credentials", "true");
            }
            response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept");

            // Log từng request để debug
            Debug.WriteLine($"[WebDemo] {request.HttpMethod} {request.Url.PathAndQuery} | Origin: {origin}");

            // Preflight OPTIONS request
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Flush();
                HttpContext.Current.ApplicationInstance.CompleteRequest();
            }
        }
    }
}
