using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EventsController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/events/mine - events I'm participating in
    [HttpGet("mine")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<Events>>> GetMine()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId))
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events/invited - events where I'm invited
    [HttpGet("invited")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<Events>>> GetInvited()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId && p.Status == "Invited"))
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events/admin/all - all events with details (admin only)
    [HttpGet("admin/all")]
    [SessionRequired]
    public async Task<ActionResult<object>> GetAllAdmin()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        
        // Verify user is admin
        var user = await _db.Users.FindAsync(userId);
        if (user?.Role != "Admin") return Forbid();

        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .OrderByDescending(e => e.EventDate)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.EventDate,
                e.DurationHours,
                e.Host,
                e.Location,
                CreatedByUser = _db.Users.Where(u => u.Id == e.CreatedBy).Select(u => u.Name).FirstOrDefault(),
                ParticipantCount = e.EventParticipation.Count,
                Participants = e.EventParticipation.Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => new { u.Id, u.Name, u.Username, p.Status })
            })
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Events>>> GetAll()
    {
        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events/upcoming
    [HttpGet("upcoming")]
    public async Task<ActionResult<IEnumerable<Events>>> GetUpcoming()
    {
        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .Where(e => e.EventDate >= DateTime.UtcNow)
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Events>> Get(int id)
    {
        var item = await _db.Events
            .Include(e => e.EventParticipation)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    // POST: api/events
    [HttpPost]
    [SessionRequired]
    public async Task<ActionResult<Events>> Create([FromBody] CreateEventRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        DateTime datePart;
        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy format." });
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(req.StartTime))
        {
            if (!DateTime.TryParse(req.StartTime, out var dt))
            {
                return BadRequest(new { message = "StartTime could not be parsed (e.g. '9 AM')." });
            }
            timePart = dt.TimeOfDay;
        }

        var startDateTime = datePart.Date + timePart;
        var endDateTime = startDateTime.AddHours(req.DurationHours);

        if (!string.IsNullOrWhiteSpace(req.Location))
        {
            var hasConflict = await _db.Events.AnyAsync(e =>
                e.Location == req.Location &&
                e.EventDate < endDateTime &&
                e.EventDate.AddHours(e.DurationHours) > startDateTime);

            if (hasConflict)
            {
                return BadRequest(new { message = "Room is full pick another room" });
            }
        }

        var evt = new Events
        {
            Title = req.Title,
            Description = req.Description,
            EventDate = startDateTime,
            DurationHours = req.DurationHours,
            Host = req.Host,
            Attendees = req.Attendees,
            Location = req.Location,
            CreatedBy = (int)(HttpContext.Items["UserId"] ?? 0)
        };

        // Ensure creator is a participant (Host)
        if (evt.CreatedBy > 0)
        {
            _db.Set<EventParticipation>().Add(new EventParticipation
            {
                Event = evt,
                UserId = evt.CreatedBy,
                Status = "Host"
            });
        }

        // Also create a room booking entry if the event is tied to a room (Location)
        if (!string.IsNullOrWhiteSpace(evt.Location) && evt.CreatedBy > 0)
        {
            var room = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomName == evt.Location);
            if (room != null)
            {
                var booking = new RoomBookings
                {
                    RoomId = room.Id,
                    UserId = evt.CreatedBy,
                    BookingDate = startDateTime.Date,
                    StartTime = TimeOnly.FromDateTime(startDateTime),
                    EndTime = TimeOnly.FromDateTime(endDateTime),
                    Purpose = evt.Description
                };
                _db.RoomBookings.Add(booking);
            }
        }

        // Optionally add attendees from comma-separated usernames as Invited
        if (!string.IsNullOrWhiteSpace(req.Attendees))
        {
            var usernames = req.Attendees.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.Trim()).ToArray();
            if (usernames.Length > 0)
            {
                var users = await _db.Users.Where(u => usernames.Contains(u.Username)).ToListAsync();
                foreach (var u in users)
                {
                    if (u.Id == evt.CreatedBy) continue;
                    _db.Set<EventParticipation>().Add(new EventParticipation
                    {
                        Event = evt,
                        UserId = u.Id,
                        Status = "Invited"
                    });
                }
            }
        }

        _db.Events.Add(evt);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = evt.Id }, evt);
    }

    // PUT: api/events/{id}
    [HttpPut("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Update(int id, [FromBody] CreateEventRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        // Parse date and time
        DateTime datePart;
        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy format." });
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(req.StartTime))
        {
            if (!DateTime.TryParse(req.StartTime, out var dt))
            {
                return BadRequest(new { message = "StartTime could not be parsed (e.g. '9 AM')." });
            }
            timePart = dt.TimeOfDay;
        }

        var startDateTime = datePart.Date + timePart;
        var endDateTime = startDateTime.AddHours(req.DurationHours);

        if (!string.IsNullOrWhiteSpace(req.Location))
        {
            var hasConflict = await _db.Events.AnyAsync(e =>
                e.Id != id &&
                e.Location == req.Location &&
                e.EventDate < endDateTime &&
                e.EventDate.AddHours(e.DurationHours) > startDateTime);

            if (hasConflict)
            {
                return BadRequest(new { message = "Room is full pick another room" });
            }
        }

        // Update the event
        evt.Title = req.Title;
        evt.Description = req.Description;
        evt.EventDate = startDateTime;
        evt.DurationHours = req.DurationHours;
        evt.Host = req.Host;
        evt.Attendees = req.Attendees;
        evt.Location = req.Location;

        _db.Entry(evt).State = EntityState.Modified;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _db.Events.AnyAsync(e => e.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    // DELETE: api/events/{id}
    [HttpDelete("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Delete(int id)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();
        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public class ParticipationRequest { public string Status { get; set; } = "Going"; }

    // POST: api/events/{id}/participation
    [HttpPost("{id}/participation")]
    [SessionRequired]
    public async Task<ActionResult> SetParticipation(int id, [FromBody] ParticipationRequest body)
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        var part = await _db.Set<EventParticipation>().SingleOrDefaultAsync(p => p.EventId == id && p.UserId == userId);
        if (part == null)
        {
            part = new EventParticipation { EventId = id, UserId = userId, Status = body.Status };
            _db.Set<EventParticipation>().Add(part);
        }
        else
        {
            part.Status = body.Status;
        }
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // DELETE: api/events/{id}/participation
    [HttpDelete("{id}/participation")]
    [SessionRequired]
    public async Task<ActionResult> RemoveParticipation(int id)
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var part = await _db.Set<EventParticipation>().SingleOrDefaultAsync(p => p.EventId == id && p.UserId == userId);
        if (part == null) return NotFound();
        _db.Remove(part);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET: api/events/{id}/participants
    [HttpGet("{id}/participants")]
    public async Task<ActionResult<IEnumerable<object>>> GetParticipants(int id)
    {
        var list = await _db.Set<EventParticipation>()
            .Where(p => p.EventId == id)
            .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => new { u.Id, u.Username, p.Status })
            .ToListAsync();
        return Ok(list);
    }
}
