namespace WebAppDev.AuthApi.DTOs;

public class CalendarEventDTO
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public int DurationHours { get; set; }
    public string Host { get; set; } = string.Empty;
    public string Attendees { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int? RoomId { get; set; }
    public int CreatedBy { get; set; }
    public bool IsMyEvent { get; set; }
}
