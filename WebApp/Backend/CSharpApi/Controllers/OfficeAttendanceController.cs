using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OfficeAttendanceController : ControllerBase
{
    private readonly AppDbContext _db;

    public OfficeAttendanceController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    [SessionRequired]
    public async Task<ActionResult> Set([FromBody] SetOfficeAttendanceRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        var userId = (int)userIdObj;

        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dateOnly))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy or yyyy-MM-dd format." });
        }

        var existing = await _db.OfficeAttendances
            .FirstOrDefaultAsync(oa => oa.UserId == userId && oa.Date.Date == dateOnly.Date);

        if (existing != null)
        {
            existing.Status = req.Status;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var attendance = new OfficeAttendance
            {
                UserId = userId,
                Date = dateOnly.Date,
                Status = req.Status,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.OfficeAttendances.Add(attendance);
        }

        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }

    [HttpGet("mine")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> Mine()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        var userId = (int)userIdObj;

        var list = await _db.OfficeAttendances
            .Where(oa => oa.UserId == userId)
            .OrderByDescending(oa => oa.Date)
            .ToListAsync();
        
        var result = list.Select(oa => new
        {
            oa.Id,
            Date = oa.Date.ToString("yyyy-MM-dd"),
            oa.Status,
            CreatedAt = oa.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "Z",
            UpdatedAt = oa.UpdatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss") + "Z"
        });

        return Ok(result);
    }

    [HttpGet("today")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> Today()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        
        var today = DateTime.Today;

        var users = await _db.Users
            .OrderBy(u => u.Name)
            .ToListAsync();

        var attendances = await _db.OfficeAttendances
            .Where(oa => oa.Date.Date == today)
            .ToListAsync();

        var result = users.Select(u => new
        {
            u.Id,
            u.Name,
            u.Username,
            Status = attendances.FirstOrDefault(a => a.UserId == u.Id)?.Status ?? "Not Set"
        });

        return Ok(result);
    }
}

public class SetOfficeAttendanceRequest
{
    [Required]
    public string Date { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "InOffice";
}
