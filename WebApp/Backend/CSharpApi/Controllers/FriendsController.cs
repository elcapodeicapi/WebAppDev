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

        [HttpPost("request")]
        [SessionRequired]
        public async Task<ActionResult<object>> SendRequest([FromBody] int friendId)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            if (friendId == userId) return BadRequest("Cannot friend yourself");
            var exists = await _db.Friendships.AnyAsync(f => (f.UserId == userId && f.FriendId == friendId) || (f.UserId == friendId && f.FriendId == userId));
            if (exists) return Conflict(new { success = false, message = "Friendship already exists or pending" });
            _db.Friendships.Add(new Friendship { UserId = userId, FriendId = friendId, Status = "Pending" });
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("accept")]
        [SessionRequired]
        public async Task<ActionResult<object>> Accept([FromBody] int requesterId)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
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

            // Check if same booking: any booking today with same room and overlapping time
            var today = DateTime.Today;
            var myBookings = await _db.RoomBookings
                .Where(rb => rb.UserId == userId && rb.BookingDate == today)
                .Select(rb => new { rb.RoomId, rb.StartTime, rb.EndTime })
                .ToListAsync();

            var friendBookings = await _db.RoomBookings
                .Where(rb => friendIds.Contains(rb.UserId) && rb.BookingDate == today)
                .Select(rb => new { rb.UserId, rb.RoomId, rb.StartTime, rb.EndTime })
                .ToListAsync();

            var result = new List<FriendInfoDto>();
            foreach (var f in friends)
            {
                var online = onlineIds.Contains(f.Id);
                bool same = false;
                foreach (var mb in myBookings)
                {
                    foreach (var fb in friendBookings.Where(b => b.UserId == f.Id))
                    {
                        if (mb.RoomId == fb.RoomId)
                        {
                            // simple overlap check
                            if (mb.StartTime < fb.EndTime && fb.StartTime < mb.EndTime) { same = true; break; }
                        }
                    }
                    if (same) break;
                }
                result.Add(new FriendInfoDto { Id = f.Id, Username = f.Username, Online = online, SameBooking = same });
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
        }

        [HttpGet("detail/{id:int}")]
        [SessionRequired]
        public async Task<ActionResult<FriendDetailDto>> Detail(int id)
        {
            var userIdObj = HttpContext.Items["UserId"]; if (userIdObj is null) return Unauthorized();
            var userId = (int)userIdObj;
            // ensure friendship exists and accepted
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

            return Ok(new FriendDetailDto
            {
                Id = friend.Id,
                Username = friend.Username,
                Online = online,
                SharesBookingToday = sharesToday,
                UpcomingBookings = upcoming
            });
        }
    }
}
