using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Services;
using System.Linq;

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




    [HttpPost("{id}/invite")]
    [SessionRequired]
    public async Task<IActionResult> SendInvites(int id, [FromBody] InviteRequest request)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { message = "Event not found" });

        // Check if user is event creator or admin
        var currentUser = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && currentUser?.Role != "Admin")
            return Unauthorized(new { message = "Only event creator or admin can send invitations" });

        if (request?.Usernames == null || !request.Usernames.Any())
            return BadRequest(new { message = "Usernames are required" });

        var users = await _db.Users
            .Where(u => request.Usernames.Contains(u.Username))
            .ToListAsync();

        foreach (var user in users)
        {
            // Skip the actual host (not necessarily the creator)
            var hostUser = await _db.Users.FirstOrDefaultAsync(u => 
                u.Username == evt.Host || 
                u.Name == evt.Host);
            if (hostUser != null && user.Id == hostUser.Id) continue;

            var existingParticipation = await _db.EventParticipations
                .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == user.Id);

            if (existingParticipation == null)
            {
                _db.EventParticipations.Add(new EventParticipation
                {
                    EventId = id,
                    UserId = user.Id,
                    Status = "Invited"
                });

                // Don't add user to Attendees string yet - only when they accept
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Invitations sent successfully" });
    }

    public class InviteRequest
    {
        public List<string> Usernames { get; set; } = new();
    }

    [HttpPost("{id}/accept")]
    [SessionRequired]
    public async Task<IActionResult> AcceptInvitation(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        Console.WriteLine($"=== ACCEPT INVITATION DEBUG ===");
        Console.WriteLine($"EventId: {id}, UserId: {userId}");

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound(new { message = "Event not found" });

        Console.WriteLine($"Event found: {evt.Title}, Current Attendees: '{evt.Attendees}'");

        var participation = await _db.EventParticipations
            .FirstOrDefaultAsync(p => p.EventId == id && p.UserId == userId);

        if (participation == null)
            return NotFound(new { message = "You are not invited to this event" });

        Console.WriteLine($"Participation found, current status: {participation.Status}");

        if (participation.Status == "Going")
            return BadRequest(new { message = "You already accepted this invitation" });

        participation.Status = "Going";
        Console.WriteLine($"Status updated to 'Going'");
        
        // Add user to Attendees string now that they've accepted
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            Console.WriteLine($"User found: {user.Username}");
            // Reload the event to get the latest state
            var currentEvent = await _db.Events.FindAsync(id);
            if (currentEvent != null)
            {
                var currentAttendees = currentEvent.Attendees?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();
                Console.WriteLine($"Current attendees list: [{string.Join(", ", currentAttendees)}]");
                Console.WriteLine($"User '{user.Username}' in attendees: {currentAttendees.Contains(user.Username)}");
                
                if (!currentAttendees.Contains(user.Username))
                {
                    currentAttendees.Add(user.Username);
                    var newAttendeesString = string.Join(",", currentAttendees);
                    Console.WriteLine($"New attendees string: '{newAttendeesString}'");
                    
                    // Update the event's attendees string
                    currentEvent.Attendees = newAttendeesString;
                    _db.Events.Update(currentEvent);
                    Console.WriteLine($"Event updated in context");
                }
                else
                {
                    Console.WriteLine($"User '{user.Username}' already in attendees list");
                }
            }
            else
            {
                Console.WriteLine("CurrentEvent is null");
            }
        }
        else
        {
            Console.WriteLine("User is null");
        }
        
        await _db.SaveChangesAsync();
        Console.WriteLine($"Changes saved to database");
        Console.WriteLine($"===============================");

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

        // Remove user from Attendees string
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            // Get current event data
            var currentEvent = await _db.Events.FindAsync(id);
            if (currentEvent != null && !string.IsNullOrEmpty(currentEvent.Attendees))
            {
                var attendeesList = currentEvent.Attendees.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
                attendeesList.Remove(user.Username);
                var newAttendeesString = string.Join(",", attendeesList);
                
                // Update the event's attendees string
                currentEvent.Attendees = newAttendeesString;
                _db.Events.Update(currentEvent);
            }
        }

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
