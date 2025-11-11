using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    public AuthService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Validation already done by model binder, but double-check unique constraints
        var existsUsername = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (existsUsername)
            return new AuthResponse { Success = false, Message = "Username already in use" };
        var existsEmail = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (existsEmail)
            return new AuthResponse { Success = false, Message = "Email already in use" };

        PasswordHasher.CreatePasswordHash(request.Password, out var hash, out var salt);

        var user = new User
        {
            Name = request.FullName,
            Username = request.Username,
            Email = request.Email,
            PasswordHash = hash,
            PasswordSalt = salt,
            Role = "Employee"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Success = true,
            Message = "Registered successfully",
            UserId = user.Id,
            Email = user.Email,
            FullName = user.Name,
            Role = user.Role
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        User? user = null;
        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            user = await _db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);
        }
        else if (!string.IsNullOrWhiteSpace(request.Email))
        {
            user = await _db.Users.SingleOrDefaultAsync(u => u.Email == request.Email);
        }
        if (user is null)
        {
            return new AuthResponse { Success = false, Message = "Invalid credentials" };
        }

        var ok = PasswordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
        if (!ok)
        {
            return new AuthResponse { Success = false, Message = "Invalid credentials" };
        }

        var session = new Session { UserId = user.Id };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            UserId = user.Id,
            Email = user.Email,
            FullName = user.Name,
            Role = user.Role,
            SessionId = session.Id
        };
    }

    public async Task<(bool active, string? adminName)> GetSessionAsync(string sid)
    {
        if (string.IsNullOrWhiteSpace(sid)) return (false, null);
        var session = await _db.Sessions.Include(s => s.User).SingleOrDefaultAsync(s => s.Id == sid);
        if (session is null || session.User is null) return (false, null);
        var isAdmin = string.Equals(session.User.Role, "Admin", StringComparison.OrdinalIgnoreCase);
        return (true, isAdmin ? session.User.Name : null);
    }

    public async Task LogoutAsync(string sid)
    {
        var s = await _db.Sessions.FindAsync(sid);
        if (s is null) return;
        _db.Sessions.Remove(s);
        await _db.SaveChangesAsync();
    }
}
