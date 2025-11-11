using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Seed;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

            var users = new List<(string name, string username, string email, string password, string role)>
        {
                ("Alice Admin", "alice", "admin@example.com", "AdminPass123!", "Admin"),
                ("Evan Employee", "evan", "evan@example.com", "Employee123!", "Employee"),
                ("Emma Employee", "emma", "emma@example.com", "Employee123!", "Employee")
        };

            foreach (var (name, username, email, password, role) in users)
        {
            PasswordHasher.CreatePasswordHash(password, out var hash, out var salt);
            db.Users.Add(new User
            {
        Name = name,
                    Username = username,
                Email = email,
                PasswordHash = hash,
        PasswordSalt = salt,
        Role = role
            });
        }

        await db.SaveChangesAsync();
    }
}
