using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Services;

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

    private static EventDto MapEventToDto(Events e)
    {
        return new EventDto
        {
            Id = e.Id,
            Title = e.Title,
            Description = e.Description,
            EventDate = e.EventDate,
            DurationHours = e.DurationHours,
            Host = e.Host,
            Attendees = e.Attendees,
            Location = e.Location,
            CreatedBy = e.CreatedBy,
            EventParticipation = (e.EventParticipation ?? new List<EventParticipation>())
                .Select(p => new EventParticipationDto
                {
                    UserId = p.UserId,
                    EventId = p.EventId,
                    Status = p.Status,
                    User = p.User == null
                        ? null
                        : new UserSummaryDto
                        {
                            Id = p.User.Id,
                            Name = p.User.Name,
                            Username = p.User.Username,
                            Role = p.User.Role,
                        }
                })
                .ToList(),
            Reviews = (e.Reviews ?? new List<EventReview>())
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new EventReviewDto
                {
                    Id = r.Id,
                    EventId = r.EventId,
                    UserId = r.UserId,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    User = r.User == null
                        ? null
                        : new UserSummaryDto
                        {
                            Id = r.User.Id,
                            Name = r.User.Name,
                            Username = r.User.Username,
                            Role = r.User.Role,
                        }
                })
                .ToList(),
        };
    }

    [HttpGet("mine")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetMine()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var list = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .Where(e => e.EventParticipation.Any(p =>
                p.UserId == userId && (p.Status == "Going" || p.Status == "Host")))
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list.Select(MapEventToDto));
    }

    [HttpGet("invited")]
    [SessionRequired]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetInvited()
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        var list = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId && p.Status == "Invited"))
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list.Select(MapEventToDto));
    }

    [HttpGet("admin/all")]
    [SessionRequired]
    public async Task<ActionResult<object>> GetAllAdmin()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        
        var user = await _db.Users.FindAsync(userId);
        if (user?.Role != "Admin") return BadRequest(new { message = "Only admins can access this endpoint" });

        var list = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
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
                Participants = e.EventParticipation.Select(p => new { p.UserId, p.Status, User = p.User == null ? null : new { p.User.Id, p.User.Name, p.User.Username, p.User.Role } }),
                ReviewCount = e.Reviews.Count,
                Reviews = e.Reviews.OrderByDescending(r => r.CreatedAt).Select(r => new { r.Id, r.UserId, r.Rating, r.Comment, r.CreatedAt, r.UpdatedAt, User = r.User == null ? null : new { r.User.Id, r.User.Name, r.User.Username, r.User.Role } })
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetAll()
    {
        var list = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .ToListAsync();
        return Ok(list.Select(MapEventToDto));
    }

    [HttpGet("upcoming")]
    public async Task<ActionResult<IEnumerable<EventDto>>> GetUpcoming()
    {
        var list = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .Where(e => e.EventDate >= DateTime.UtcNow)
            .OrderBy(e => e.EventDate)
            .ToListAsync();
        return Ok(list.Select(MapEventToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDto>> Get(int id)
    {
        var item = await _db.Events
            .AsNoTracking()
            .AsSplitQuery()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (item == null) return NotFound();
        return Ok(MapEventToDto(item));
    }

    [HttpPost]
    [SessionRequired]
    public async Task<ActionResult<Events>> Create([FromBody] CreateEventRequest req)
    {
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

        int? roomId = req.RoomId;
        Rooms? roomForBooking = null;
        if (roomId != null)
        {
            roomForBooking = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == roomId.Value);
            if (roomForBooking == null)
            {
                return BadRequest(new { message = "Room not found" });
            }
        }
        else if (!string.IsNullOrWhiteSpace(req.Location))
        {
            roomForBooking = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomName == req.Location);
            if (roomForBooking != null)
            {
                roomId = roomForBooking.Id;
            }
        }

        SemaphoreSlim? roomLock = null;
        if (roomId != null)
        {
            roomLock = RoomBookingLock.ForRoomDate(roomId.Value, startDateTime.Date);
            await roomLock.WaitAsync();
        }

        try
        {
            if (roomId != null)
            {
                var startTimeOnly = TimeOnly.FromDateTime(startDateTime);
                var endTimeOnly = TimeOnly.FromDateTime(endDateTime);

                var hasBookingConflict = await _db.RoomBookings.AnyAsync(rb =>
                    rb.RoomId == roomId.Value &&
                    rb.BookingDate.Date == startDateTime.Date &&
                    rb.StartTime < endTimeOnly &&
                    rb.EndTime > startTimeOnly);

                if (hasBookingConflict)
                {
                    return Conflict(new { message = "Room is already booked for that time range." });
                }
            }

        if (roomId == null && !string.IsNullOrWhiteSpace(req.Location))
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

        int hostUserId = userId;
        
        var currentUser = await _db.Users.FindAsync(userId);
        if (currentUser?.Role == "Admin" && !string.IsNullOrWhiteSpace(req.Host))
        {
            var hostUser = await _db.Users.FirstOrDefaultAsync(u => 
                u.Name == req.Host || 
                u.Username == req.Host || 
                u.Email == req.Host);
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
            Location = roomForBooking?.RoomName ?? req.Location,
            CreatedBy = hostUserId
        };

        _db.Events.Add(evt);
        await _db.SaveChangesAsync();

        if (evt.CreatedBy > 0)
        {
            _db.Set<EventParticipation>().Add(new EventParticipation
            {
                EventId = evt.Id,
                UserId = evt.CreatedBy,
                Status = "Going"
            });
        }

        if (roomId != null && evt.CreatedBy > 0)
        {
            var startTimeOnly = TimeOnly.FromDateTime(startDateTime);
            var endTimeOnly = TimeOnly.FromDateTime(endDateTime);

            var hasBookingConflict = await _db.RoomBookings.AnyAsync(rb =>
                rb.RoomId == roomId.Value &&
                rb.BookingDate.Date == startDateTime.Date &&
                rb.StartTime < endTimeOnly &&
                rb.EndTime > startTimeOnly);

            if (hasBookingConflict)
            {
                return Conflict(new { message = "Room is already booked for that time range." });
            }

            var attendeeCount = 0;
            if (!string.IsNullOrWhiteSpace(req.Attendees))
            {
                attendeeCount = req.Attendees
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => s.Trim())
                    .Count(s => !string.IsNullOrWhiteSpace(s));
            }

            var booking = new RoomBookings
            {
                RoomId = roomId.Value,
                UserId = evt.CreatedBy,
                BookingDate = startDateTime.Date,
                StartTime = startTimeOnly,
                EndTime = endTimeOnly,
                Purpose = $"Event:{evt.Id}:{evt.Title}",
                NumberOfPeople = attendeeCount + 1
            };
            _db.RoomBookings.Add(booking);
        }

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
        finally
        {
            if (roomLock != null) roomLock.Release();
        }
    }

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

        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            return BadRequest(new { message = "Only the event creator or admin can edit this event" });

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

        int? roomId = req.RoomId;
        Rooms? roomForBooking = null;
        if (roomId != null)
        {
            roomForBooking = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == roomId.Value);
            if (roomForBooking == null)
            {
                return BadRequest(new { message = "Room not found" });
            }
        }
        else if (!string.IsNullOrWhiteSpace(req.Location))
        {
            roomForBooking = await _db.Rooms.FirstOrDefaultAsync(r => r.RoomName == req.Location);
            if (roomForBooking != null)
            {
                roomId = roomForBooking.Id;
            }
        }

        var existingEventBooking = await _db.RoomBookings
            .FirstOrDefaultAsync(rb => rb.Purpose != null && rb.Purpose.StartsWith($"Event:{id}:") );

        if (roomId != null)
        {
            var startTimeOnly = TimeOnly.FromDateTime(startDateTime);
            var endTimeOnly = TimeOnly.FromDateTime(endDateTime);

            var hasBookingConflict = await _db.RoomBookings.AnyAsync(rb =>
                rb.RoomId == roomId.Value &&
                rb.BookingDate.Date == startDateTime.Date &&
                rb.StartTime < endTimeOnly &&
                rb.EndTime > startTimeOnly &&
                (existingEventBooking == null || rb.Id != existingEventBooking.Id));

            if (hasBookingConflict)
            {
                return Conflict(new { message = "Room is already booked for that time range." });
            }
        }

        if (roomId == null && !string.IsNullOrWhiteSpace(req.Location))
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

        evt.Title = req.Title;
        evt.Description = req.Description;
        evt.EventDate = startDateTime;
        evt.DurationHours = req.DurationHours;
        evt.Host = req.Host;
        evt.Attendees = req.Attendees;
        evt.Location = roomForBooking?.RoomName ?? req.Location;

        if (roomId != null)
        {
            var startTimeOnly = TimeOnly.FromDateTime(startDateTime);
            var endTimeOnly = TimeOnly.FromDateTime(endDateTime);

            var attendeeCount = 0;
            if (!string.IsNullOrWhiteSpace(req.Attendees))
            {
                attendeeCount = req.Attendees
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(s => s.Trim())
                    .Count(s => !string.IsNullOrWhiteSpace(s));
            }

            if (existingEventBooking == null)
            {
                _db.RoomBookings.Add(new RoomBookings
                {
                    RoomId = roomId.Value,
                    UserId = evt.CreatedBy,
                    BookingDate = startDateTime.Date,
                    StartTime = startTimeOnly,
                    EndTime = endTimeOnly,
                    Purpose = $"Event:{evt.Id}:{evt.Title}",
                    NumberOfPeople = attendeeCount + 1
                });
            }
            else
            {
                existingEventBooking.RoomId = roomId.Value;
                existingEventBooking.UserId = evt.CreatedBy;
                existingEventBooking.BookingDate = startDateTime.Date;
                existingEventBooking.StartTime = startTimeOnly;
                existingEventBooking.EndTime = endTimeOnly;
                existingEventBooking.Purpose = $"Event:{evt.Id}:{evt.Title}";
                existingEventBooking.NumberOfPeople = attendeeCount + 1;
                _db.Entry(existingEventBooking).State = EntityState.Modified;
            }
        }
        else if (existingEventBooking != null)
        {
            _db.RoomBookings.Remove(existingEventBooking);
        }

        if (!string.IsNullOrWhiteSpace(req.Attendees))
        {
            var usernames = req.Attendees
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (usernames.Length > 0)
            {
                var existingUserIds = await _db.EventParticipations
                    .Where(p => p.EventId == id)
                    .Select(p => p.UserId)
                    .ToListAsync();

                var usersToInvite = await _db.Users
                    .Where(u => usernames.Contains(u.Username))
                    .Select(u => new { u.Id, u.Username })
                    .ToListAsync();

                foreach (var u in usersToInvite)
                {
                    if (existingUserIds.Contains(u.Id)) continue;

                    if (u.Id == evt.CreatedBy) continue;

                    _db.EventParticipations.Add(new EventParticipation
                    {
                        EventId = id,
                        UserId = u.Id,
                        Status = "Invited"
                    });
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

    [HttpDelete("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Delete(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;
        
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            return BadRequest(new { message = "Only the event creator or admin can delete this event" });

        var existingEventBooking = await _db.RoomBookings
            .FirstOrDefaultAsync(rb => rb.Purpose != null && rb.Purpose.StartsWith($"Event:{id}:") );
        if (existingEventBooking != null)
        {
            _db.RoomBookings.Remove(existingEventBooking);
        }

        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
        return NoContent();
    }

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

    [HttpPost("{id}/decline")]
    [SessionRequired]
    public async Task<IActionResult> DeclineOrLeaveEvent(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { message = "Event not found" });

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

    [HttpPost("attend")]
    [SessionRequired]
    public async Task<ActionResult<object>> AttendEvent([FromBody] AttendanceRequest req)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var currentUserId = (int)userIdObj;

        var currentUser = await _db.Users.FindAsync(currentUserId);
        if (req.UserId != currentUserId && currentUser?.Role != "Admin")
            return BadRequest(new { message = "You can only register yourself for events" });

        var evt = await _db.Events
            .Include(e => e.EventParticipation)
            .FirstOrDefaultAsync(e => e.Id == req.EventId);
        
        if (evt == null)
            return NotFound(new { message = "Event not found" });

        var existingParticipation = await _db.Set<EventParticipation>()
            .SingleOrDefaultAsync(p => p.EventId == req.EventId && p.UserId == req.UserId);
        
        if (existingParticipation != null)
            return BadRequest(new { message = "User is already attending this event" });

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

            if (evt.EventDate < existingEventEndTime && eventEndTime > existingEvent.EventDate)
            {
                return BadRequest(new { 
                    message = $"Scheduling conflict: You already have '{existingEvent.Title}' scheduled at that time" 
                });
            }
        }

        var participation = new EventParticipation
        {
            EventId = req.EventId,
            UserId = req.UserId,
            Status = "Going"
        };

        _db.Set<EventParticipation>().Add(participation);
        await _db.SaveChangesAsync();

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

    [HttpGet("{id}/participants")]
    public async Task<ActionResult<IEnumerable<object>>> GetParticipants(int id)
    {
        var list = await _db.Set<EventParticipation>()
            .Where(p => p.EventId == id)
            .Join(_db.Users, p => p.UserId, u => u.Id, (p, u) => new { u.Id, u.Username, p.Status })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("{id}/reviews")]
    [SessionRequired]
    public async Task<ActionResult<EventReviewDto>> UpsertReview(int id, [FromBody] CreateEventReviewRequest req)
    {
        var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        if (req == null)
        {
            return BadRequest(new { error = "Body is required." });
        }

        if (req.Rating.HasValue && (req.Rating.Value < 1 || req.Rating.Value > 5))
        {
            return BadRequest(new { error = "Rating must be between 1 and 5." });
        }

        var comment = (req.Comment ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(comment))
        {
            return BadRequest(new { error = "Comment is required." });
        }

        var evExists = await _db.Events.AsNoTracking().AnyAsync(e => e.Id == id);
        if (!evExists)
        {
            return NotFound(new { error = "Event not found." });
        }

        var isAttendee = await _db.EventParticipations.AsNoTracking().AnyAsync(p =>
            p.EventId == id &&
            p.UserId == userId &&
            (p.Status == "Going" || p.Status == "Host"));

        if (!isAttendee)
        {
            return Forbid();
        }

        var existing = await _db.EventReviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.EventId == id && r.UserId == userId);

        if (existing == null)
        {
            existing = new EventReview
            {
                EventId = id,
                UserId = userId,
                Rating = req.Rating,
                Comment = comment,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.EventReviews.Add(existing);
        }
        else
        {
            existing.Rating = req.Rating;
            existing.Comment = comment;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        if (existing.User == null)
        {
            existing.User = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        }

        var dto = new EventReviewDto
        {
            Id = existing.Id,
            EventId = existing.EventId,
            UserId = existing.UserId,
            Rating = existing.Rating,
            Comment = existing.Comment,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = existing.UpdatedAt,
            User = existing.User == null ? null : new UserSummaryDto { Id = existing.User.Id, Name = existing.User.Name, Username = existing.User.Username, Role = existing.User.Role }
        };

        return Ok(dto);
    }
}
