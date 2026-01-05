using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.Services;
using WebAppDev.AuthApi.Filters;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly AuthService _auth;

    public AuthController(AppDbContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    private string? GetSessionId()
    {
        // Prefer HttpOnly cookie
        var cookieSid = Request.Cookies["sid"];
        if (!string.IsNullOrWhiteSpace(cookieSid)) return cookieSid;
        // Fallback to header (e.g., for non-cookie clients)
        var headerSid = Request.Headers["X-Session-Id"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerSid)) return headerSid;
        return null;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Invalid input" });
        }
        var resp = await _auth.RegisterAsync(request);
        if (!resp.Success)
        {
            if (resp.Message.Contains("in use", StringComparison.OrdinalIgnoreCase)) return Conflict(resp);
            return BadRequest(resp);
        }
        return Ok(resp);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Invalid input" });
        }
        var resp = await _auth.LoginAsync(request);
        if (!resp.Success) return Unauthorized(resp);
        // Set HttpOnly cookie with session id
        if (!string.IsNullOrEmpty(resp.SessionId))
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false, // set true behind HTTPS in production
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddHours(8)
            };
            Response.Cookies.Append("sid", resp.SessionId, cookieOptions);
            // Do not expose session id back to client if strict; keep current shape but client should ignore
        }
        return Ok(resp);
    }

    [HttpGet("session")]
    public async Task<ActionResult<object>> GetSession()
    {
        var sid = GetSessionId() ?? string.Empty;
        var (active, adminName, userId) = await _auth.GetSessionAsync(sid);
        if (!active) return Ok(new { active = false });
        if (!string.IsNullOrEmpty(adminName)) return Ok(new { active = true, adminName, userId });
        return Ok(new { active = true, userId });
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        var sid = GetSessionId();
        if (string.IsNullOrWhiteSpace(sid)) return BadRequest();
        await _auth.LogoutAsync(sid);
        // Clear cookie
        Response.Cookies.Delete("sid");
        return NoContent();
    }

    [HttpPost("profile")]
    public async Task<ActionResult<AuthResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        // Always resolve session from cookie/header, ignore body SessionId
        request.SessionId = GetSessionId();
        var resp = await _auth.UpdateProfileAsync(request);
        if (!resp.Success)
        {
            if (resp.Message?.Contains("in use", StringComparison.OrdinalIgnoreCase) == true) return Conflict(resp);
            if (resp.Message == "Missing session" || resp.Message == "Invalid session") return Unauthorized(resp);
            return BadRequest(resp);
        }
        return Ok(resp);
    }

    // Simple ping to verify controller is reachable
    [HttpGet("ping")]
    public ActionResult<string> Ping()
    {
        return Ok("pong");
    }

    [HttpGet("bookings")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var bookings = await _db.RoomBookings
            .Where(rb => rb.UserId == userId && rb.BookingDate >= DateTime.Today)
            .Include(rb => rb.Room)
            .OrderBy(rb => rb.BookingDate).ThenBy(rb => rb.StartTime)
            .Select(rb => new BookingDto
            {
                RoomId = rb.RoomId,
                RoomName = rb.Room.RoomName,
                BookingDate = rb.BookingDate,
                StartTime = rb.StartTime.ToString(),
                EndTime = rb.EndTime.ToString(),
                Purpose = rb.Purpose
            }).ToListAsync();

        return Ok(bookings);
    }
}
