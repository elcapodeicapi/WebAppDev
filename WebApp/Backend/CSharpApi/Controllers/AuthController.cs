using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.Services;

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
        return Ok(resp);
    }

    [HttpGet("session")]
    public async Task<ActionResult<object>> GetSession([FromQuery] string sid)
    {
        var (active, adminName) = await _auth.GetSessionAsync(sid);
        if (!active) return Ok(new { active = false });
        if (!string.IsNullOrEmpty(adminName)) return Ok(new { active = true, adminName });
        return Ok(new { active = true });
    }

    [HttpPost("logout")]
    public async Task<ActionResult> Logout([FromBody] string sid)
    {
        if (string.IsNullOrWhiteSpace(sid)) return BadRequest();
        await _auth.LogoutAsync(sid);
        return NoContent();
    }

    [HttpPost("profile")]
    public async Task<ActionResult<AuthResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
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
    public async Task<ActionResult<IEnumerable<BookingDto>>> GetBookings([FromQuery] string sid)
    {
        if (string.IsNullOrWhiteSpace(sid)) return Unauthorized();

        var session = await _db.Sessions.Include(s => s.User).SingleOrDefaultAsync(s => s.Id == sid);
        if (session == null || session.User == null) return Unauthorized();

        var userId = session.User.Id;

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
