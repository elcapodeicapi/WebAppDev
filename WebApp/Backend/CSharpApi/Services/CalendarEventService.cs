using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;

namespace WebAppDev.AuthApi.Services;

public class CalendarEventService
{
    private readonly AppDbContext _db;

    public CalendarEventService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> CreateEventAsync(CalendarEventDTO request, int userId)
    {
        DateTime datePart;
        if (!DateTime.TryParseExact(request.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            throw new ArgumentException("Date must be in dd/MM/yyyy format.");
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(request.StartTime))
        {
            if (!DateTime.TryParse(request.StartTime, out var dt))
            {
                throw new ArgumentException("StartTime could not be parsed (e.g. '9 AM').");
            }
            timePart = dt.TimeOfDay;
        }

        var startDateTime = datePart.Date + timePart;

        int hostUserId = userId;
        
        if (!string.IsNullOrWhiteSpace(request.Host))
        {
            var currentUser = await _db.Users.FindAsync(userId);
            if (currentUser?.Role == "Admin")
            {
                var hostUser = await _db.Users.FirstOrDefaultAsync(u => 
                    u.Name == request.Host || 
                    u.Username == request.Host || 
                    u.Email == request.Host);
                if (hostUser != null)
                    hostUserId = hostUser.Id;
            }
        }

        var evt = new Events
        {
            Title = request.Title,
            Description = request.Description,
            EventDate = startDateTime,
            DurationHours = request.DurationHours,
            Host = request.Host,
            Attendees = request.Attendees,
            Location = request.Location,
            CreatedBy = hostUserId
        };

        _db.Events.Add(evt);
        await _db.SaveChangesAsync();

        // Automatically add the creator as a participant with "Host" status
        _db.EventParticipations.Add(new EventParticipation
        {
            EventId = evt.Id,
            UserId = hostUserId,
            Status = "Host"
        });

        // Add EventParticipations for attendees if they are specified
        if (!string.IsNullOrWhiteSpace(request.Attendees))
        {
            var attendeeUsernames = request.Attendees.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(u => u.Trim())
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .ToList();

            foreach (var username in attendeeUsernames)
            {
                var attendeeUser = await _db.Users
                    .FirstOrDefaultAsync(u => u.Username == username || u.Name == username);
                
                if (attendeeUser != null && attendeeUser.Id != hostUserId)
                {
                    // Check if participation already exists
                    var existingParticipation = await _db.EventParticipations
                        .FirstOrDefaultAsync(p => p.EventId == evt.Id && p.UserId == attendeeUser.Id);
                    
                    if (existingParticipation == null)
                    {
                        _db.EventParticipations.Add(new EventParticipation
                        {
                            EventId = evt.Id,
                            UserId = attendeeUser.Id,
                            Status = "Invited" // Send invitation instead of directly adding as "Going"
                        });
                    }
                }
            }
        }
        
        await _db.SaveChangesAsync();

        return evt.Id;
    }

    public async Task UpdateEventAsync(int id, CalendarEventDTO request, int userId)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null)
            throw new KeyNotFoundException("Event not found");

        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            throw new UnauthorizedAccessException("Only event creator or admin can edit this event");

        DateTime datePart;
        if (!DateTime.TryParseExact(request.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            throw new ArgumentException("Date must be in dd/MM/yyyy format.");
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(request.StartTime))
        {
            if (!DateTime.TryParse(request.StartTime, out var dt))
            {
                throw new ArgumentException("StartTime could not be parsed (e.g. '9 AM').");
            }
            timePart = dt.TimeOfDay;
        }

        var startDateTime = datePart.Date + timePart;

        evt.Title = request.Title;
        evt.Description = request.Description;
        evt.EventDate = startDateTime;
        evt.DurationHours = request.DurationHours;
        evt.Host = request.Host;
        evt.Attendees = request.Attendees;
        evt.Location = request.Location;

        // Synchronize EventParticipations with the attendees list
        if (!string.IsNullOrWhiteSpace(request.Attendees))
        {
            var attendeeUsernames = request.Attendees.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(u => u.Trim())
                .Where(u => !string.IsNullOrWhiteSpace(u))
                .ToHashSet(); // Use HashSet for efficient lookup

            // Get current participations (excluding host)
            var currentParticipations = await _db.EventParticipations
                .Where(p => p.EventId == id && p.Status != "Host")
                .ToListAsync();

            // Add new attendees
            foreach (var username in attendeeUsernames)
            {
                var attendeeUser = await _db.Users
                    .FirstOrDefaultAsync(u => u.Username == username || u.Name == username);
                
                if (attendeeUser != null)
                {
                    var existingParticipation = currentParticipations
                        .FirstOrDefault(p => p.UserId == attendeeUser.Id);
                    
                    if (existingParticipation == null)
                    {
                        _db.EventParticipations.Add(new EventParticipation
                        {
                            EventId = id,
                            UserId = attendeeUser.Id,
                            Status = "Invited" // Send invitation instead of directly adding as "Going"
                        });
                    }
                }
            }

            // Remove attendees that are no longer in the list
            var usernamesToRemove = currentParticipations
                .Where(p => !attendeeUsernames.Contains(p.User?.Username ?? "") && 
                           !attendeeUsernames.Contains(p.User?.Name ?? ""))
                .ToList();

            foreach (var participationToRemove in usernamesToRemove)
            {
                _db.EventParticipations.Remove(participationToRemove);
            }
        }
        else
        {
            // Remove all non-host participations if attendees list is empty
            var participationsToRemove = await _db.EventParticipations
                .Where(p => p.EventId == id && p.Status != "Host")
                .ToListAsync();
            
            _db.EventParticipations.RemoveRange(participationsToRemove);
        }

        await _db.SaveChangesAsync();
    }

    public async Task DeleteEventAsync(int id, int userId)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null)
            throw new KeyNotFoundException("Event not found");

        var user = await _db.Users.FindAsync(userId);
        if (evt.CreatedBy != userId && user?.Role != "Admin")
            throw new UnauthorizedAccessException("Only event creator or admin can delete this event");

        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
    }

    public async Task<CalendarEventDTO?> GetEventAsync(int id, int? currentUserId = null)
    {
        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Include(e => e.Reviews)
                .ThenInclude(r => r.User)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (evt == null) return null;

        return new CalendarEventDTO
        {
            Id = evt.Id,
            Title = evt.Title,
            Description = evt.Description,
            Date = evt.EventDate.ToString("dd/MM/yyyy"),
            StartTime = evt.EventDate.ToString("hh:mm tt"),
            DurationHours = evt.DurationHours,
            Host = evt.Host,
            Attendees = evt.Attendees,
            Location = evt.Location,
            CreatedBy = evt.CreatedBy,
            IsMyEvent = currentUserId.HasValue && evt.CreatedBy == currentUserId.Value
        };
    }
}
