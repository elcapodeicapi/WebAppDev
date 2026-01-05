namespace WebAppDev.AuthApi.DTOs;

public sealed class UserSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public sealed class EventParticipationDto
{
    public int UserId { get; set; }
    public int EventId { get; set; }
    public string Status { get; set; } = string.Empty;
    public UserSummaryDto? User { get; set; }
}

public sealed class EventReviewDto
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public int UserId { get; set; }
    public int? Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public UserSummaryDto? User { get; set; }
}

public sealed class EventDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public int DurationHours { get; set; }
    public string Host { get; set; } = string.Empty;
    public string Attendees { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int CreatedBy { get; set; }

    public List<EventParticipationDto> EventParticipation { get; set; } = new();
    public List<EventReviewDto> Reviews { get; set; } = new();
}

public sealed class CreateEventReviewRequest
{
    public int? Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}
