using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Services;

public record UpdateUserRequest(string Username, string Name, string Email, string Role);

public class AdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetUserByIdAsync(int id)
    {
        return await _db.Users.FindAsync(id);
    }

    public async Task<IEnumerable<object>> GetAllUsersAsync()
    {
        return await _db.Users
            .OrderBy(u => u.Username)
            .Select(u => new
            {
                Id = u.Id,
                Username = u.Username,
                FullName = u.Name,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role
            })
            .ToListAsync();
    }

    public async Task UpdateUserAsync(int id, UpdateUserRequest request, int currentUserId)
    {
        var userToUpdate = await _db.Users.FindAsync(id);
        if (userToUpdate == null)
            throw new KeyNotFoundException("User not found");

        // Prevent admin from removing their own admin role
        if (userToUpdate.Id == currentUserId && request.Role != "Admin")
            throw new UnauthorizedAccessException("You cannot remove your own admin role");

        // Check if username is already taken by another user
        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.Id != id);
        if (existingUser != null)
            throw new ArgumentException("Username is already taken");

        userToUpdate.Username = request.Username;
        userToUpdate.Name = request.Name;
        userToUpdate.Email = request.Email;
        userToUpdate.Role = request.Role;

        await _db.SaveChangesAsync();
    }

    public async Task DeleteUserAsync(int id, int currentUserId)
    {
        var userToDelete = await _db.Users.FindAsync(id);
        if (userToDelete == null)
            throw new KeyNotFoundException("User not found");

        // Prevent admin from deleting themselves
        if (userToDelete.Id == currentUserId)
            throw new ArgumentException("You cannot delete your own account");

        // Check if user has any events they created
        var userEvents = await _db.Events
            .Where(e => e.CreatedBy == id)
            .ToListAsync();
        
        if (userEvents.Any())
        {
            throw new ArgumentException("Cannot delete user who has created events. Please delete or reassign their events first.");
        }

        // Check if user is the only participant in any events
        var userParticipations = await _db.EventParticipations
            .Where(p => p.UserId == id)
            .ToListAsync();

        _db.EventParticipations.RemoveRange(userParticipations);
        _db.Users.Remove(userToDelete);
        await _db.SaveChangesAsync();
    }
}
