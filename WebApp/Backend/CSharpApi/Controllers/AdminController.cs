using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly AdminService _adminService;

    public AdminController(AdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("users")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> GetUsers()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _adminService.GetUserByIdAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can access user management" });

        var users = await _adminService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("users/{id}")]
    [SessionRequired]
    public async Task<ActionResult<object>> GetUser(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _adminService.GetUserByIdAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can access user management" });

        var user = await _adminService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }

    [HttpPut("users/{id}")]
    [SessionRequired]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _adminService.GetUserByIdAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can update users" });

        try
        {
            await _adminService.UpdateUserAsync(id, request, userId);
            return Ok(new { message = "User updated successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("users/{id}")]
    [SessionRequired]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var currentUser = await _adminService.GetUserByIdAsync(userId);
        if (currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only admins can delete users" });

        try
        {
            await _adminService.DeleteUserAsync(id, userId);
            return Ok(new { message = "User deleted successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
