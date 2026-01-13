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
            Username = user.Username,
            Email = user.Email,
            FullName = user.Name,
            PhoneNumber = user.PhoneNumber,
            JobTitle = user.JobTitle,
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

        var session = new Session { UserId = user.Id, ExpiresAt = DateTime.UtcNow.AddHours(8), LastActivityUtc = DateTime.UtcNow };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.Name,
            PhoneNumber = user.PhoneNumber,
            JobTitle = user.JobTitle,
            Role = user.Role,
            SessionId = session.Id
        };
    }

    public async Task<(bool active, string? adminName, int userId)> GetSessionAsync(string sid)
    {
        if (string.IsNullOrWhiteSpace(sid)) return (false, null, 0);
        var session = await _db.Sessions.Include(s => s.User).SingleOrDefaultAsync(s => s.Id == sid);
        if (session is null || session.User is null) return (false, null, 0);
        if (session.Revoked || session.ExpiresAt <= DateTime.UtcNow) return (false, null, 0);
        
        session.LastActivityUtc = DateTime.UtcNow;
        var newExpiry = DateTime.UtcNow.AddHours(8);
        
        session.ExpiresAt = newExpiry;
        await _db.SaveChangesAsync();
        var isAdmin = string.Equals(session.User.Role, "Admin", StringComparison.OrdinalIgnoreCase);
        return (true, isAdmin ? session.User.Name : null, session.User.Id);
    }

    public async Task LogoutAsync(string sid)
    {
        var s = await _db.Sessions.FindAsync(sid);
        if (s is null) return;
        s.Revoked = true;
        await _db.SaveChangesAsync();
    }

    public async Task<AuthResponse> UpdateProfileAsync(UpdateProfileRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.SessionId))
            return new AuthResponse { Success = false, Message = "Missing session" };

        var session = await _db.Sessions.Include(s => s.User).SingleOrDefaultAsync(s => s.Id == request.SessionId);
        if (session == null || session.User == null)
            return new AuthResponse { Success = false, Message = "Invalid session" };

        var user = session.User;

        if (!string.IsNullOrWhiteSpace(request.Username) && !string.Equals(request.Username, user.Username, StringComparison.OrdinalIgnoreCase))
        {
            var existsU = await _db.Users.AnyAsync(u => u.Username == request.Username && u.Id != user.Id);
            if (existsU) return new AuthResponse { Success = false, Message = "Username already in use" };
            user.Username = request.Username;
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !string.Equals(request.Email, user.Email, StringComparison.OrdinalIgnoreCase))
        {
            var exists = await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != user.Id);
            if (exists) return new AuthResponse { Success = false, Message = "Email already in use" };
            user.Email = request.Email;
        }

        if (!string.IsNullOrWhiteSpace(request.FullName)) user.Name = request.FullName;
        user.PhoneNumber = request.PhoneNumber;
        user.JobTitle = request.JobTitle;

        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Success = true,
            Message = "Profile updated",
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.Name,
            PhoneNumber = user.PhoneNumber,
            JobTitle = user.JobTitle,
            Role = user.Role
        };
    }
}
