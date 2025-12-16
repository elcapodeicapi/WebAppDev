using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoomsController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/rooms/availability?date=2025-12-19
    [HttpGet("availability")]
    [SessionRequired]
    public async Task<ActionResult> GetAvailability([FromQuery] string date)
    {
        if (!DateTime.TryParse(date, out var parsedDate))
        {
            return BadRequest(new { message = "Date must be in a valid format (e.g. yyyy-MM-dd)." });
        }

        var targetDate = parsedDate.Date;

        var rooms = await _db.Rooms
            .Include(r => r.RoomBookings)
            .OrderBy(r => r.RoomName)
            .ToListAsync();

        var result = rooms.Select(r => new
        {
            r.Id,
            r.RoomName,
            r.Capacity,
            r.Location,
            Bookings = r.RoomBookings
                .Where(rb => rb.BookingDate.Date == targetDate)
                .OrderBy(rb => rb.StartTime)
                .Select(rb => new
                {
                    rb.UserId,
                    rb.BookingDate,
                    StartTime = rb.StartTime.ToString(),
                    EndTime = rb.EndTime.ToString(),
                    rb.Purpose
                })
        });

        return Ok(result);
    }

    // POST: api/rooms/book - book a room for a time range
    [HttpPost("book")]
    [SessionRequired]
    public async Task<ActionResult> Book([FromBody] CreateRoomBookingRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
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
            return BadRequest(new { message = "Room is already booked for that time range" });
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
}
