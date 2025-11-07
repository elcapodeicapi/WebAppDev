using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Seed;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        var users = new List<(string fullName, string email, string password)>
        {
            ("John Doe", "test@example.com", "Password123!"),
            ("Jane Smith", "jane@example.com", "Secret123!")
        };

        foreach (var (fullName, email, password) in users)
        {
            PasswordHasher.CreatePasswordHash(password, out var hash, out var salt);
            db.Users.Add(new User
            {
                Name = fullName,
                Email = email,
                PasswordHash = hash,
                PasswordSalt = salt
            });
        }

        await db.SaveChangesAsync();
    }
}
