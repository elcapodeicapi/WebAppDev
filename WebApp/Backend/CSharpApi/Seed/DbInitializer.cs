using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Seed;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Seed independently so we don't re-insert users when only rooms are missing (or vice versa).
        if (!await db.Users.AnyAsync())
        {
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
        }

        if (!await db.Rooms.AnyAsync())
        {
            var rooms = new List<Rooms>
            {
                new() { RoomName = "Room 1" },
                new() { RoomName = "Room 2" },
                new() { RoomName = "Room 3" },
                new() { RoomName = "Room 4" },
                new() { RoomName = "Room 5" },
                new() { RoomName = "Room 6" },
                new() { RoomName = "Room 7" },
                new() { RoomName = "Room 8" },
                new() { RoomName = "Room 9" }
            };

            await db.Rooms.AddRangeAsync(rooms);
        }

        if (db.ChangeTracker.HasChanges())
        {
            await db.SaveChangesAsync();
        }
    }
}
