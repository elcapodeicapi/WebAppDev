using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.Filters;

namespace WebAppDev.AuthApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AttendanceController(AppDbContext db)
        {
            _db = db;
        }

        public class AttendRequest
        {
            public int UserId { get; set; } // optional; when present, must match session; otherwise filled from session
            public int EventId { get; set; }
            public string? Status { get; set; } // optional override (Going/Declined)
        }

        // POST api/attendance
        // Accept/attend an invited event for the logged-in user
        [HttpPost]
        [SessionRequired]
        public async Task<IActionResult> Attend([FromBody] AttendRequest req)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { error = "Login required" });
            var sessionUserId = (int)userIdObj;

            // If body userId is missing or mismatched, force to session user
            if (req.UserId == 0 || req.UserId != sessionUserId)
            {
                req.UserId = sessionUserId;
            }

            var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == req.EventId);
            if (ev == null)
                return NotFound(new { error = "Event not found" });

            var newStatus = string.IsNullOrWhiteSpace(req.Status) ? "Going" : req.Status!.Trim();
            if (newStatus != "Going" && newStatus != "Declined")
            {
                return BadRequest(new { error = "Status must be 'Going' or 'Declined'." });
            }

            if (newStatus == "Going")
            {
                // Availability check: prevent overlapping 'Going' events for the user
                var start = ev.EventDate;
                var end = ev.EventDate.AddHours(ev.DurationHours);
                var hasOverlap = await _db.EventParticipations
                    .Where(p => p.UserId == req.UserId && p.Status == "Going")
                    .Include(p => p.Event)
                    .AnyAsync(p => p.Event != null &&
                                   p.Event.EventDate < end && start < p.Event.EventDate.AddHours(p.Event.DurationHours));

                if (hasOverlap)
                {
                    return BadRequest(new { error = "You already have a going event overlapping with this time." });
                }
            }

            // Must have an invitation to attend
            var participation = await _db.EventParticipations
                .FirstOrDefaultAsync(p => p.EventId == req.EventId && p.UserId == req.UserId);

            if (participation == null)
            {
                return BadRequest(new { error = "No invitation found for this user and event." });
            }

            // Allow changing state from Invited (and legacy Interested) to Going/Declined.
            if (participation.Status == newStatus)
            {
                return Ok(ev);
            }

            participation.Status = newStatus;
            await _db.SaveChangesAsync();

            return Ok(ev);
        }

        // GET api/attendance/{eventId}/attendees
        [HttpGet("{eventId}/attendees")]
        public async Task<IActionResult> GetAttendees([FromRoute] int eventId)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { error = "Login required" });

            var ev = await _db.Events.FirstOrDefaultAsync(e => e.Id == eventId);
            if (ev == null)
                return NotFound(new { error = "Event not found" });

            var list = await _db.EventParticipations
                .Where(p => p.EventId == eventId)
                .Include(p => p.User)
                .Select(p => new { id = p.UserId, username = p.User != null ? p.User.Username : "", status = p.Status })
                .ToListAsync();

            return Ok(list);
        }

        // DELETE api/attendance/{eventId}
        // Allows logged-in user to un-attend an event (set Declined or remove participation)
        [HttpDelete("{eventId}")]
        [SessionRequired]
        public async Task<IActionResult> Unattend([FromRoute] int eventId)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized(new { error = "Login required" });
            var sessionUserId = (int)userIdObj;

            var participation = await _db.EventParticipations
                .FirstOrDefaultAsync(p => p.EventId == eventId && p.UserId == sessionUserId);

            if (participation == null)
                return NotFound(new { error = "No attendance record found" });

            // Business rule: keep invitation history by updating status to Declined
            participation.Status = "Declined";
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
