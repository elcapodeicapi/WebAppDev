using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Seed;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync() && await db.Rooms.AnyAsync()) return;

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

        if (!await db.Rooms.AnyAsync())
        {
            var rooms = new List<Rooms>
            {
                new() { RoomName = "A", Capacity = 1, Location = "Main" },
                new() { RoomName = "B", Capacity = 1, Location = "Main" },
                new() { RoomName = "C", Capacity = 1, Location = "Main" },
                new() { RoomName = "D", Capacity = 1, Location = "Main" },
                new() { RoomName = "E", Capacity = 1, Location = "Main" },
                new() { RoomName = "F", Capacity = 1, Location = "Main" },
                new() { RoomName = "G", Capacity = 1, Location = "Main" },
                new() { RoomName = "H", Capacity = 1, Location = "Main" },
                new() { RoomName = "I", Capacity = 1, Location = "Main" },
                new() { RoomName = "J", Capacity = 1, Location = "Main" }
            };

            await db.Rooms.AddRangeAsync(rooms);
        }

        await db.SaveChangesAsync();
    }
}
