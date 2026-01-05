using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FriendsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public FriendsController(AppDbContext db) { _db = db; }

        public class FriendRequestCreateDto { public string Username { get; set; } = string.Empty; }

        [HttpPost("request")]
        [SessionRequired]
        public async Task<ActionResult<object>> SendRequest([FromBody] FriendRequestCreateDto dto)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            if (string.IsNullOrWhiteSpace(dto.Username)) return BadRequest(new { success = false, message = "Username required" });
            var friend = await _db.Users.SingleOrDefaultAsync(u => u.Username == dto.Username);
            if (friend == null) return NotFound(new { success = false, message = "User not found" });
            var friendId = friend.Id;
            if (friendId == userId) return BadRequest("Cannot friend yourself");
            var exists = await _db.Friendships.AnyAsync(f => (f.UserId == userId && f.FriendId == friendId) || (f.UserId == friendId && f.FriendId == userId));
            if (exists) return Conflict(new { success = false, message = "Friendship already exists or pending" });
            _db.Friendships.Add(new Friendship { UserId = userId, FriendId = friendId, Status = "Pending" });
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        public class FriendAcceptDto { public string Username { get; set; } = string.Empty; }

        [HttpPost("accept")]
        [SessionRequired]
        public async Task<ActionResult<object>> Accept([FromBody] FriendAcceptDto dto)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            if (string.IsNullOrWhiteSpace(dto.Username)) return BadRequest(new { success = false, message = "Username required" });
            var requester = await _db.Users.SingleOrDefaultAsync(u => u.Username == dto.Username);
            if (requester == null) return NotFound(new { success = false, message = "Requester not found" });
            var requesterId = requester.Id;
            var fr = await _db.Friendships.SingleOrDefaultAsync(f => f.UserId == requesterId && f.FriendId == userId && f.Status == "Pending");
            if (fr == null) return NotFound(new { success = false, message = "No pending request" });
            fr.Status = "Accepted";
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        public class FriendInfoDto
        {
            public int Id { get; set; }
            public string Username { get; set; } = string.Empty;
            public bool Online { get; set; }
            public bool SameBooking { get; set; }
            public bool SameEvent { get; set; }
        }

        [HttpGet]
        [SessionRequired]
        public async Task<ActionResult<IEnumerable<FriendInfoDto>>> List()
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;

            var friendIds = await _db.Friendships
                .Where(f => (f.UserId == userId || f.FriendId == userId) && f.Status == "Accepted")
                .Select(f => f.UserId == userId ? f.FriendId : f.UserId)
                .ToListAsync();

            var friends = await _db.Users
                .Where(u => friendIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Username })
                .ToListAsync();

            var onlineIds = await _db.Sessions
                .Where(s => !s.Revoked && s.ExpiresAt > DateTime.UtcNow)
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync();

            var today = DateTime.Today;
            var myBookings = await _db.RoomBookings
                .Where(rb => rb.UserId == userId && rb.BookingDate == today)
                .Select(rb => new { rb.RoomId, rb.StartTime, rb.EndTime })
                .ToListAsync();

            var friendBookings = await _db.RoomBookings
                .Where(rb => friendIds.Contains(rb.UserId) && rb.BookingDate == today)
                .Select(rb => new { rb.UserId, rb.RoomId, rb.StartTime, rb.EndTime })
                .ToListAsync();

            var myTodayEvents = await _db.Events
                .Where(e => e.EventParticipation.Any(p => p.UserId == userId) && e.EventDate.Date == today)
                .Select(e => new { e.EventDate, EndTime = e.EventDate.AddHours(e.DurationHours) })
                .ToListAsync();

            var friendsTodayEvents = await _db.Events
                .Where(e => e.EventParticipation.Any(p => friendIds.Contains(p.UserId)) && e.EventDate.Date == today)
                .Select(e => new { e.EventDate, EndTime = e.EventDate.AddHours(e.DurationHours), UserIds = e.EventParticipation.Select(p => p.UserId) })
                .ToListAsync();

            var result = new List<FriendInfoDto>();
            foreach (var f in friends)
            {
                var online = onlineIds.Contains(f.Id);
                bool same = false;
                bool sameEvent = false;
                foreach (var mb in myBookings)
                {
                    foreach (var fb in friendBookings.Where(b => b.UserId == f.Id))
                    {
                        if (mb.RoomId == fb.RoomId)
                        {
                            if (mb.StartTime < fb.EndTime && fb.StartTime < mb.EndTime) { same = true; break; }
                        }
                    }
                    if (same) break;
                }
                if (!sameEvent && myTodayEvents.Count > 0)
                {
                    var friendEvents = friendsTodayEvents.Where(e => e.UserIds.Contains(f.Id)).ToList();
                    foreach (var me in myTodayEvents)
                    {
                        foreach (var fe in friendEvents)
                        {
                            if (me.EventDate < fe.EndTime && fe.EventDate < me.EndTime) { sameEvent = true; break; }
                        }
                        if (sameEvent) break;
                    }
                }

                result.Add(new FriendInfoDto { Id = f.Id, Username = f.Username, Online = online, SameBooking = same, SameEvent = sameEvent });
            }

            return Ok(result);
        }

        public class FriendRequestDto
        {
            public int RequesterId { get; set; }
            public string Username { get; set; } = string.Empty;
        }

        [HttpGet("requests")]
        [SessionRequired]
        public async Task<ActionResult<IEnumerable<FriendRequestDto>>> IncomingRequests()
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            var reqs = await _db.Friendships
                .Where(f => f.FriendId == userId && f.Status == "Pending")
                .Join(_db.Users, f => f.UserId, u => u.Id, (f, u) => new FriendRequestDto { RequesterId = u.Id, Username = u.Username })
                .ToListAsync();
            return Ok(reqs);
        }

        public class FriendDetailDto
        {
            public int Id { get; set; }
            public string Username { get; set; } = string.Empty;
            public bool Online { get; set; }
            public IEnumerable<object> UpcomingBookings { get; set; } = Array.Empty<object>();
            public bool SharesBookingToday { get; set; }
            public IEnumerable<object> UpcomingEvents { get; set; } = Array.Empty<object>();
            public bool SharesEventToday { get; set; }
        }

        [HttpGet("detail/{id:int}")]
        [SessionRequired]
        public async Task<ActionResult<FriendDetailDto>> Detail(int id)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            var isFriend = await _db.Friendships.AnyAsync(f => (f.UserId == userId && f.FriendId == id || f.UserId == id && f.FriendId == userId) && f.Status == "Accepted");
            if (!isFriend) return NotFound(new { success = false, message = "Not friends" });

            var friend = await _db.Users.Where(u => u.Id == id).Select(u => new { u.Id, u.Username }).SingleOrDefaultAsync();
            if (friend == null) return NotFound(new { success = false, message = "User not found" });

            var online = await _db.Sessions.AnyAsync(s => s.UserId == id && !s.Revoked && s.ExpiresAt > DateTime.UtcNow);
            var today = DateTime.Today;
            var myBookings = await _db.RoomBookings.Where(rb => rb.UserId == userId && rb.BookingDate == today).Select(rb => new { rb.RoomId, rb.StartTime, rb.EndTime }).ToListAsync();
            var friendBookingsToday = await _db.RoomBookings.Where(rb => rb.UserId == id && rb.BookingDate == today).Select(rb => new { rb.RoomId, rb.StartTime, rb.EndTime }).ToListAsync();
            bool sharesToday = false;
            foreach (var mb in myBookings)
            {
                foreach (var fb in friendBookingsToday)
                {
                    if (mb.RoomId == fb.RoomId && mb.StartTime < fb.EndTime && fb.StartTime < mb.EndTime) { sharesToday = true; break; }
                }
                if (sharesToday) break;
            }

            var upcoming = await _db.RoomBookings.Where(rb => rb.UserId == id && rb.BookingDate >= today)
                .OrderBy(rb => rb.BookingDate).ThenBy(rb => rb.StartTime)
                .Take(10)
                .Select(rb => new { rb.RoomId, rb.BookingDate, StartTime = rb.StartTime.ToString(), EndTime = rb.EndTime.ToString() })
                .ToListAsync();

            var myTodayEvents2 = await _db.Events
                .Where(e => e.EventParticipation.Any(p => p.UserId == userId) && e.EventDate.Date == today)
                .Select(e => new { e.EventDate, EndTime = e.EventDate.AddHours(e.DurationHours) })
                .ToListAsync();

            var friendTodayEvents = await _db.Events
                .Where(e => e.EventParticipation.Any(p => p.UserId == id) && e.EventDate.Date == today)
                .Select(e => new { e.EventDate, EndTime = e.EventDate.AddHours(e.DurationHours) })
                .ToListAsync();

            bool sharesEventToday = false;
            foreach (var me in myTodayEvents2)
            {
                foreach (var fe in friendTodayEvents)
                {
                    if (me.EventDate < fe.EndTime && fe.EventDate < me.EndTime) { sharesEventToday = true; break; }
                }
                if (sharesEventToday) break;
            }

            var upcomingEvents = await _db.Events
                .Where(e => e.EventParticipation.Any(p => p.UserId == id) && e.EventDate >= today)
                .OrderBy(e => e.EventDate)
                .Take(10)
                .Select(e => new { e.Id, e.Title, Start = e.EventDate, End = e.EventDate.AddHours(e.DurationHours), e.Location })
                .ToListAsync();

            return Ok(new FriendDetailDto
            {
                Id = friend.Id,
                Username = friend.Username,
                Online = online,
                SharesBookingToday = sharesToday,
                UpcomingBookings = upcoming,
                SharesEventToday = sharesEventToday,
                UpcomingEvents = upcomingEvents
            });
        }
    }
}
