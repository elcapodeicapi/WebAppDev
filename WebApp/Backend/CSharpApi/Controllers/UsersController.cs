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
}
