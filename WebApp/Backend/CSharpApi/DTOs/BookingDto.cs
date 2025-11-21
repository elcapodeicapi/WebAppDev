namespace WebAppDev.AuthApi.DTOs;

public class BookingDto
{
    public int RoomId { get; set; }
    public string RoomName { get; set; } = string.Empty;
    public DateTime BookingDate { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string? Purpose { get; set; }
}
