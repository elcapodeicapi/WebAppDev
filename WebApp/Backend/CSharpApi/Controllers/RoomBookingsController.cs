using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomBookingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomBookingsController(AppDbContext db)
    {
        _db = db;
    }

    // POST: api/roombookings/book
    [HttpPost("book")]
    [SessionRequired]
    public async Task<ActionResult> Book([FromBody] CreateRoomBookingRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        var userId = (int)userIdObj;

        var room = await _db.Rooms.FindAsync(req.RoomId);
        if (room == null) return NotFound(new { message = "Room not found" });

        DateTime datePart;
        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy or yyyy-MM-dd format." });
        }

        if (!DateTime.TryParse(req.StartTime, out var startDateTime))
        {
            return BadRequest(new { message = "StartTime could not be parsed (e.g. '9 AM')." });
        }

        var startTimeOnly = TimeOnly.FromTimeSpan(startDateTime.TimeOfDay);
        var endTimeOnly = startTimeOnly.AddHours(req.DurationHours);

        var hasConflict = await _db.RoomBookings.AnyAsync(rb =>
            rb.RoomId == req.RoomId &&
            rb.BookingDate.Date == datePart.Date &&
            rb.StartTime < endTimeOnly &&
            rb.EndTime > startTimeOnly);

        if (hasConflict)
        {
            return Conflict(new { message = "Room is already booked for that time range." });
        }

        var booking = new RoomBookings
        {
            RoomId = req.RoomId,
            UserId = userId,
            BookingDate = datePart.Date,
            StartTime = startTimeOnly,
            EndTime = endTimeOnly,
            Purpose = req.Purpose
        };

        _db.RoomBookings.Add(booking);
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // GET: api/roombookings/mine
    [HttpGet("mine")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<BookingDto>>> Mine()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        var userId = (int)userIdObj;

        var list = await _db.RoomBookings
            .Where(b => b.UserId == userId)
            .Join(_db.Rooms, b => b.RoomId, r => r.Id, (b, r) => new BookingDto
            {
                RoomId = b.RoomId,
                RoomName = r.RoomName,
                BookingDate = b.BookingDate,
                StartTime = b.StartTime.ToString(),
                EndTime = b.EndTime.ToString(),
                Purpose = b.Purpose
            })
            .OrderByDescending(b => b.BookingDate)
            .ToListAsync();

        return Ok(list);
    }
}
