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

        Console.WriteLine($"=== CREATING BOOKING ===");
        Console.WriteLine($"User ID: {userId}");
        Console.WriteLine($"Room ID: {req.RoomId}");
        Console.WriteLine($"Date: {datePart.Date:yyyy-MM-dd}");
        Console.WriteLine($"Time: {startTimeOnly} - {endTimeOnly}");
        Console.WriteLine($"Purpose: {req.Purpose}");
        Console.WriteLine($"========================");

        _db.RoomBookings.Add(booking);
        var saveResult = await _db.SaveChangesAsync();

        Console.WriteLine($"=== BOOKING SAVED ===");
        Console.WriteLine($"SaveAsync result: {saveResult} records affected");
        Console.WriteLine($"Booking ID: {booking.Id}");
        Console.WriteLine($"====================");

        // Verify the booking was actually saved by querying it back
        var savedBooking = await _db.RoomBookings
            .Include(rb => rb.Room)
            .FirstOrDefaultAsync(rb => rb.Id == booking.Id);

        if (savedBooking != null)
        {
            Console.WriteLine($"=== BOOKING VERIFIED ===");
            Console.WriteLine($"Found saved booking with ID: {savedBooking.Id}");
            Console.WriteLine($"Room: {savedBooking.Room?.RoomName}");
            Console.WriteLine($"========================");
            
            return Ok(new { 
                success = true, 
                bookingId = booking.Id,
                message = "Room booked successfully!",
                booking = new {
                    Id = savedBooking.Id,
                    RoomName = savedBooking.Room?.RoomName,
                    BookingDate = savedBooking.BookingDate.ToString("yyyy-MM-dd"),
                    StartTime = savedBooking.StartTime.ToString(),
                    EndTime = savedBooking.EndTime.ToString(),
                    Purpose = savedBooking.Purpose
                }
            });
        }
        else
        {
            Console.WriteLine($"=== ERROR: BOOKING NOT FOUND AFTER SAVE ===");
            return StatusCode(500, new { message = "Failed to save booking to database" });
        }
    }

    // GET: api/roombookings/mine
    [HttpGet("mine")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> GetMyBookings()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });
        var userId = (int)userIdObj;

        Console.WriteLine($"=== PROFILE: FETCHING BOOKINGS FOR USER {userId} ===");
        Console.WriteLine($"Today's date: {DateTime.Today:yyyy-MM-dd}");
        
        // First, let's check what's actually in the RoomBookings table for this user
        var allUserBookings = await _db.RoomBookings
            .Where(rb => rb.UserId == userId)
            .ToListAsync();
            
        Console.WriteLine($"Total bookings in RoomBookings table for user {userId}: {allUserBookings.Count}");
        foreach (var booking in allUserBookings)
        {
            Console.WriteLine($"  - Booking ID: {booking.Id}, RoomId: {booking.RoomId}, Date: {booking.BookingDate:yyyy-MM-dd}, Time: {booking.StartTime}-{booking.EndTime}");
            Console.WriteLine($"    Is today or future: {booking.BookingDate >= DateTime.Today}");
        }

        var bookings = await _db.RoomBookings
            .Where(rb => rb.UserId == userId && rb.BookingDate >= DateTime.Today)
            .Include(rb => rb.Room)
            .OrderBy(rb => rb.BookingDate)
            .ThenBy(rb => rb.StartTime)
            .ToListAsync();

        Console.WriteLine($"Filtered bookings (today and future): {bookings.Count}");
        
        // Debug: Log what we found
        Console.WriteLine($"=== DEBUG: Found {bookings.Count} bookings for user {userId} ===");
        foreach (var booking in bookings)
        {
            Console.WriteLine($"Booking ID: {booking.Id}, Room: {booking.Room?.RoomName ?? "NULL"}, RoomId: {booking.RoomId}");
            if (booking.Room != null)
            {
                Console.WriteLine($"  Room details: {booking.Room.RoomName}, {booking.Room.Location}, {booking.Room.Capacity}");
            }
            else
            {
                Console.WriteLine($"  Room relationship is NULL - checking RoomId: {booking.RoomId}");
                
                // Try to get the room directly
                var roomDirect = await _db.Rooms.FindAsync(booking.RoomId);
                if (roomDirect != null)
                {
                    Console.WriteLine($"  Direct room lookup: {roomDirect.RoomName}, {roomDirect.Location}, {roomDirect.Capacity}");
                }
                else
                {
                    Console.WriteLine($"  Room with ID {booking.RoomId} not found in Rooms table!");
                }
            }
        }

        var result = bookings.Select(rb => new
        {
            Id = rb.Id,
            RoomName = rb.Room?.RoomName ?? "Unknown Room",
            RoomLocation = rb.Room?.Location ?? "Unknown Location",
            RoomCapacity = rb.Room?.Capacity ?? 0,
            BookingDate = rb.BookingDate.ToString("yyyy-MM-dd"),
            StartTime = rb.StartTime.ToString(),
            EndTime = rb.EndTime.ToString(),
            Purpose = rb.Purpose,
            DurationHours = (rb.EndTime.ToTimeSpan() - rb.StartTime.ToTimeSpan()).TotalHours
        });

        Console.WriteLine($"=== RETURNING {result.Count()} BOOKINGS TO PROFILE ===");
        return Ok(result);
    }

    // GET: api/roombookings/available?date=yyyy-MM-dd
    [HttpGet("available")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<object>>> GetAvailableRooms([FromQuery] string date)
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { message = "Login required" });

        if (!DateTime.TryParseExact(date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dateOnly))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy or yyyy-MM-dd format." });
        }

        var rooms = await _db.Rooms.ToListAsync();
        var bookings = await _db.RoomBookings
            .Where(rb => rb.BookingDate.Date == dateOnly.Date)
            .ToListAsync();

        var availableRooms = rooms.Select(room =>
        {
            var roomBookings = bookings.Where(b => b.RoomId == room.Id).ToList();
            var timeSlots = new List<object>();

            // Generate hourly slots from 8 AM to 6 PM
            for (int hour = 8; hour <= 18; hour++)
            {
                var slotStart = new TimeOnly(hour, 0);
                var slotEnd = slotStart.AddHours(1);
                var isBooked = roomBookings.Any(b => b.StartTime < slotEnd && b.EndTime > slotStart);

                timeSlots.Add(new
                {
                    Time = $"{slotStart:hh:mm} - {slotEnd:hh:mm}",
                    Available = !isBooked,
                    Booking = isBooked ? roomBookings.FirstOrDefault(b => b.StartTime < slotEnd && b.EndTime > slotStart) : null
                });
            }

            return new
            {
                RoomId = room.Id,
                RoomName = room.RoomName,
                Capacity = room.Capacity,
                Location = room.Location,
                TimeSlots = timeSlots
            };
        }).ToList();

        return Ok(availableRooms);
    }
}
