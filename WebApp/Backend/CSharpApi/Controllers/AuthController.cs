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
}
