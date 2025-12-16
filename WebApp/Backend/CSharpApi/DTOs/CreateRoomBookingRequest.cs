using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.DTOs;

public class CreateRoomBookingRequest
{
    [Required]
    public int RoomId { get; set; }

    /// <summary>
    /// Date in dd/MM/yyyy or yyyy-MM-dd format.
    /// </summary>
    [Required]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Start time as string (e.g. "9 AM").
    /// </summary>
    [Required]
    public string StartTime { get; set; } = "9 AM";

    /// <summary>
    /// Duration in hours.
    /// </summary>
    [Range(1, 24)]
    public int DurationHours { get; set; } = 1;

    public string? Purpose { get; set; }
}
