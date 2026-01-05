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
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId && (p.Status == "Host" || p.Status == "Going")))
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
        if (user?.Role != "Admin") return BadRequest(new { message = "Only admins can access this endpoint" });

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
        // Any authenticated user can create events
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

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

        // Determine who the actual host should be
        int hostUserId = userId;
        
        // If this is an admin creating an event and a host is specified by name, find that user
        var currentUser = await _db.Users.FindAsync(userId);
        if (currentUser?.Role == "Admin" && !string.IsNullOrWhiteSpace(req.Host))
        {
            var hostUser = await _db.Users.FirstOrDefaultAsync(u => 
                u.Name == req.Host || 
                u.Username == req.Host || 
                u.FullName == req.Host);
            if (hostUser != null)
            {
                hostUserId = hostUser.Id;
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
            CreatedBy = hostUserId
        };

        // Add event first so it gets an ID
        _db.Events.Add(evt);
        await _db.SaveChangesAsync();

        // Ensure host is a participant (Going status so they see it in calendar)
        if (evt.CreatedBy > 0)
        {
            _db.Set<EventParticipation>().Add(new EventParticipation
            {
                EventId = evt.Id,
                UserId = evt.CreatedBy,
                Status = "Going"
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
                        EventId = evt.Id,
                        UserId = u.Id,
                        Status = "Invited"
                    });
                }
            }
        }

        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = evt.Id }, evt);
    }

    // PUT: api/events/{id}
    [HttpPut("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Update(int id, [FromBody] CreateEventRequest req)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        if (!ModelState.IsValid) return BadRequest(ModelState);

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        // Check if user is the event creator or admin
        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            return BadRequest(new { message = "Only the event creator or admin can edit this event" });

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

        // If admin is changing the host, update CreatedBy and EventParticipation
        if (user?.Role == "Admin" && !string.IsNullOrWhiteSpace(req.Host))
        {
            var newHostUser = await _db.Users.FirstOrDefaultAsync(u => 
                u.Name == req.Host || 
                u.Username == req.Host || 
                u.FullName == req.Host);
            if (newHostUser != null && newHostUser.Id != evt.CreatedBy)
            {
                // Remove old host from EventParticipation
                var oldHostParticipation = await _db.Set<EventParticipation>()
                    .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == evt.CreatedBy && (p.Status == "Host" || p.Status == "Going"));
                if (oldHostParticipation != null)
                {
                    _db.Set<EventParticipation>().Remove(oldHostParticipation);
                }

                // Update CreatedBy to new host
                evt.CreatedBy = newHostUser.Id;

                // Add new host to EventParticipation with Going status
                var newHostParticipation = await _db.Set<EventParticipation>()
                    .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == newHostUser.Id);
                
                if (newHostParticipation == null)
                {
                    _db.Set<EventParticipation>().Add(new EventParticipation
                    {
                        EventId = id,
                        UserId = newHostUser.Id,
                        Status = "Going"
                    });
                }
                else
                {
                    newHostParticipation.Status = "Going";
                }
            }
        }

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
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        // Check if user is the event creator or admin
        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            return BadRequest(new { message = "Only the event creator or admin can delete this event" });

        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/events/{id}/accept - Accept an invitation to an event
    [HttpPost("{id}/accept")]
    [SessionRequired]
    public async Task<IActionResult> AcceptInvitation(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { message = "Event not found" });

        var participation = await _db.EventParticipations
            .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == userId);

        if (participation == null)
            return NotFound(new { message = "You are not invited to this event" });

        if (participation.Status == "Going")
            return BadRequest(new { message = "You already accepted this invitation" });

        participation.Status = "Going";
        await _db.SaveChangesAsync();

        return Ok(new { message = "Invitation accepted" });
    }

    // POST: api/events/{id}/decline - Decline/leave an event
    [HttpPost("{id}/decline")]
    [SessionRequired]
    public async Task<IActionResult> DeclineOrLeaveEvent(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { message = "Event not found" });

        // Can't leave if you're the host
        if (evt.CreatedBy == userId)
            return BadRequest(new { message = "Event creator cannot leave their own event. Delete it instead." });

        var participation = await _db.EventParticipations
            .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == userId);

        if (participation == null)
            return NotFound(new { message = "You are not part of this event" });

        _db.EventParticipations.Remove(participation);
        await _db.SaveChangesAsync();

        return Ok(new { message = "You have left the event" });
    }

    public class ParticipationRequest 
    { 
        public string Status { get; set; } = "Going";
    }

    public class AttendanceRequest
    {
        public int UserId { get; set; }
        public int EventId { get; set; }
    }

    // POST: api/events/attend - User attends an event
    [HttpPost("attend")]
    [SessionRequired]
    public async Task<ActionResult<object>> AttendEvent([FromBody] AttendanceRequest req)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var currentUserId = (int)userIdObj;

        // User can only register themselves (unless admin)
        var currentUser = await _db.Users.FindAsync(currentUserId);
        if (req.UserId != currentUserId && currentUser?.Role != "Admin")
            return BadRequest(new { message = "You can only register yourself for events" });

        // Get the event
        var evt = await _db.Events
            .Include(e => e.EventParticipation)
            .FirstOrDefaultAsync(e => e.Id == req.EventId);
        
        if (evt == null)
            return NotFound(new { message = "Event not found" });

        // Check if user is already attending
        var existingParticipation = await _db.Set<EventParticipation>()
            .SingleOrDefaultAsync(p => p.EventId == req.EventId && p.UserId == req.UserId);
        
        if (existingParticipation != null)
            return BadRequest(new { message = "User is already attending this event" });

        // Check for scheduling conflicts with other events
        var userEvents = await _db.Set<EventParticipation>()
            .Where(p => p.UserId == req.UserId)
            .Select(p => p.Event)
            .Where(e => e != null)
            .ToListAsync();

        var eventEndTime = evt.EventDate.AddHours(evt.DurationHours);

        foreach (var existingEvent in userEvents)
        {
            if (existingEvent == null) continue;

            var existingEventEndTime = existingEvent.EventDate.AddHours(existingEvent.DurationHours);

            // Check for overlap: event starts before existing event ends AND event ends after existing event starts
            if (evt.EventDate < existingEventEndTime && eventEndTime > existingEvent.EventDate)
            {
                return BadRequest(new { 
                    message = $"Scheduling conflict: You already have '{existingEvent.Title}' scheduled at that time" 
                });
            }
        }

        // Add participation
        var participation = new EventParticipation
        {
            EventId = req.EventId,
            UserId = req.UserId,
            Status = "Going"
        };

        _db.Set<EventParticipation>().Add(participation);
        await _db.SaveChangesAsync();

        // Return the updated event with participants
        var updatedEvent = await _db.Events
            .Where(e => e.Id == req.EventId)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.EventDate,
                e.DurationHours,
                e.Host,
                e.Location,
                e.Attendees,
                ParticipantCount = e.EventParticipation.Count,
                Participants = e.EventParticipation.Join(_db.Users, p => p.UserId, u => u.Id, 
                    (p, u) => new { u.Id, u.Username, u.Name, p.Status })
            })
            .FirstOrDefaultAsync();

        return CreatedAtAction(nameof(GetAll), new { id = req.EventId }, updatedEvent);
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
