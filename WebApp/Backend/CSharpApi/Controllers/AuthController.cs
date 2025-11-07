using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Invalid input" });
        }

        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
        {
            return Conflict(new AuthResponse { Success = false, Message = "Email already in use" });
        }

        PasswordHasher.CreatePasswordHash(request.Password, out var hash, out var salt);

        var user = new User
        {
            Name = request.FullName,
            Email = request.Email,
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Registered successfully",
            UserId = user.Id,
            Email = user.Email,
            FullName = user.Name
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new AuthResponse { Success = false, Message = "Invalid input" });
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
        if (user is null)
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Invalid email or password" });
        }

        var ok = PasswordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        if (!ok)
        {
            return Unauthorized(new AuthResponse { Success = false, Message = "Invalid email or password" });
        }

        return Ok(new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            UserId = user.Id,
            Email = user.Email,
            FullName = user.Name
        });
    }
}
