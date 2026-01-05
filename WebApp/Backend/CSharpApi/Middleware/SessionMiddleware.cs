using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using WebAppDev.AuthApi.Data;

namespace WebAppDev.AuthApi.Middleware
{
    public class SessionMiddleware
    {
        private readonly RequestDelegate _next;

        public SessionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, AppDbContext db)
        {
            var sid = context.Request.Cookies["sid"];
            if (!string.IsNullOrWhiteSpace(sid))
            {
                var session = await db.Sessions.Include(s => s.User).SingleOrDefaultAsync(s => s.Id == sid);
                if (session != null && !session.Revoked && session.ExpiresAt > DateTime.UtcNow)
                {
                    context.Items["SessionId"] = session.Id;
                    context.Items["UserId"] = session.UserId;
                }
            }

            await _next(context);
        }
    }
}
