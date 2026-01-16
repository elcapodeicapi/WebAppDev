using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;

namespace WebAppDev.AuthApi.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<NotificationDTO>> GetNotificationsAsync(int userId)
    {
        var notifications = new List<NotificationDTO>();

        // Get tomorrow's events for the user
        var tomorrow = DateTime.UtcNow.AddDays(1).Date;
        var tomorrowEnd = tomorrow.AddDays(1).AddTicks(-1);

        var tomorrowEvents = await _db.Events
            .AsNoTracking()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Where(e => e.EventDate >= tomorrow && e.EventDate <= tomorrowEnd)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId))
            .ToListAsync();

        foreach (var evt in tomorrowEvents)
        {
            notifications.Add(new NotificationDTO
            {
                Id = $"event_{evt.Id}",
                Type = "Event",
                Title = evt.Title,
                Message = $"Tomorrow: {evt.Title}{(string.IsNullOrEmpty(evt.Location) ? "" : $" at {evt.Location}")}",
                CreatedAt = evt.EventDate,
                ActionUrl = "/calendar",
                IsRead = false
            });
        }

        // Get pending invitations
        var invitedEvents = await _db.EventParticipations
            .AsNoTracking()
            .Include(p => p.Event)
            .Include(p => p.User)
            .Where(p => p.UserId == userId && p.Status == "Invited")
            .ToListAsync();

        foreach (var participation in invitedEvents)
        {
            notifications.Add(new NotificationDTO
            {
                Id = $"invitation_{participation.EventId}",
                Type = "Invitation",
                Title = participation.Event.Title,
                Message = $"You are invited to: {participation.Event.Title}",
                CreatedAt = participation.Event.EventDate,
                ActionUrl = "/invitations",
                IsRead = false
            });
        }

        // Sort by created date (newest first)
        notifications = notifications.OrderByDescending(n => n.CreatedAt).ToList();

        return notifications;
    }

    public async Task<NotificationSummaryDTO> GetNotificationSummaryAsync(int userId)
    {
        var tomorrow = DateTime.UtcNow.AddDays(1).Date;
        var tomorrowEnd = tomorrow.AddDays(1).AddTicks(-1);

        var tomorrowEventsCount = await _db.Events
            .AsNoTracking()
            .Include(e => e.EventParticipation)
            .Where(e => e.EventDate >= tomorrow && e.EventDate <= tomorrowEnd)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId))
            .CountAsync();

        var invitedCount = await _db.EventParticipations
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.Status == "Invited")
            .CountAsync();

        return new NotificationSummaryDTO
        {
            TomorrowEventsCount = tomorrowEventsCount,
            PendingInvitationsCount = invitedCount,
            TotalCount = tomorrowEventsCount + invitedCount
        };
    }

    public async Task<List<EventNotificationDTO>> GetTomorrowEventsAsync(int userId)
    {
        var tomorrow = DateTime.UtcNow.AddDays(1).Date;
        var tomorrowEnd = tomorrow.AddDays(1).AddTicks(-1);

        var events = await _db.Events
            .AsNoTracking()
            .Include(e => e.EventParticipation)
                .ThenInclude(p => p.User)
            .Where(e => e.EventDate >= tomorrow && e.EventDate <= tomorrowEnd)
            .Where(e => e.EventParticipation.Any(p => p.UserId == userId))
            .Select(e => new EventNotificationDTO
            {
                Id = e.Id,
                Title = e.Title,
                EventDate = e.EventDate,
                Location = e.Location
            })
            .ToListAsync();

        return events;
    }

    public async Task<List<InvitationNotificationDTO>> GetPendingInvitationsAsync(int userId)
    {
        var invitations = await _db.EventParticipations
            .AsNoTracking()
            .Include(p => p.Event)
                .ThenInclude(e => e.EventParticipation)
                    .ThenInclude(ep => ep.User)
            .Where(p => p.UserId == userId && p.Status == "Invited")
            .Select(p => new InvitationNotificationDTO
            {
                EventId = p.Event.Id,
                EventTitle = p.Event.Title,
                EventDate = p.Event.EventDate,
                Location = p.Event.Location,
                HostName = p.Event.EventParticipation
                    .FirstOrDefault(ep => ep.Status == "Host").User != null 
                        ? p.Event.EventParticipation.FirstOrDefault(ep => ep.Status == "Host").User.Name 
                        : "Unknown"
            })
            .ToListAsync();

        return invitations;
    }
}
