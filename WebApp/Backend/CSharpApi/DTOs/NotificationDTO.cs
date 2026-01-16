namespace WebAppDev.AuthApi.DTOs;

public class NotificationDTO
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string ActionUrl { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}

public class NotificationSummaryDTO
{
    public int TomorrowEventsCount { get; set; }
    public int PendingInvitationsCount { get; set; }
    public int TotalCount { get; set; }
}

public class EventNotificationDTO
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
}

public class InvitationNotificationDTO
{
    public int EventId { get; set; }
    public string EventTitle { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string? Location { get; set; }
    public string HostName { get; set; } = string.Empty;
}
