using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Filters;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public UsersController(AppDbContext db) { _db = db; }

    public record UserLite(int Id, string Username, string FullName);
    public record UserFull(int Id, string Username, string Name, string Email, string Role);
    public record UpdateUserRequest(string Username, string Name, string Email, string Role);

    [HttpGet]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> Get()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        
        var user = await _db.Users.FindAsync(userId);
        if (user?.Role != "Admin")
        {
            var liteUsers = await _db.Users
                .OrderBy(u => u.Username)
                .Select(u => new UserLite(u.Id, u.Username, u.Name))
                .ToListAsync();
            return Ok(liteUsers);
        }

        var fullUsers = await _db.Users
            .OrderBy(u => u.Username)
            .Select(u => new UserFull(u.Id, u.Username, u.Name, u.Email, u.Role))
            .ToListAsync();
        return Ok(fullUsers);
    }

    [HttpPut("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _db.Users.FindAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can update users" });

        var userToUpdate = await _db.Users.FindAsync(id);
        if (userToUpdate == null)
            return NotFound(new { message = "User not found" });

        // Prevent admin from removing their own admin role
        if (userToUpdate.Id == userId && request.Role != "Admin")
            return BadRequest(new { message = "You cannot remove your own admin role" });

        // Check if username is already taken by another user
        var existingUser = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.Id != id);
        if (existingUser != null)
            return BadRequest(new { message = "Username is already taken" });

        userToUpdate.Username = request.Username;
        userToUpdate.Name = request.Name;
        userToUpdate.Email = request.Email;
        userToUpdate.Role = request.Role;

        await _db.SaveChangesAsync();
        return Ok(new { message = "User updated successfully" });
    }

    [HttpDelete("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Delete(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _db.Users.FindAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can delete users" });

        var userToDelete = await _db.Users.FindAsync(id);
        if (userToDelete == null)
            return NotFound(new { message = "User not found" });

        // Prevent admin from deleting themselves
        if (userToDelete.Id == userId)
            return BadRequest(new { message = "You cannot delete your own account" });

        _db.Users.Remove(userToDelete);
        await _db.SaveChangesAsync();
        return Ok(new { message = "User deleted successfully" });
    }
}
