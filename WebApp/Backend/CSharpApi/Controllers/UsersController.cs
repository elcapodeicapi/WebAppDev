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

    // GET: api/users
    [HttpGet]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<UserLite>>> Get()
    {
        var users = await _db.Users
            .OrderBy(u => u.Username)
            .Select(u => new UserLite(u.Id, u.Username, u.Name))
            .ToListAsync();
        return Ok(users);
    }
}
