using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.DTOs;

public class CreateEventRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Date in dd/MM/yyyy format (e.g. 05/12/2025)
    /// </summary>
    [Required]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Start time as string (e.g. "9 AM")
    /// </summary>
    public string StartTime { get; set; } = "9 AM";

    /// <summary>
    /// Duration in hours
    /// </summary>
    public int DurationHours { get; set; } = 1;

    public string Host { get; set; } = string.Empty;

    /// <summary>
    /// Comma separated attendees (e.g. "alice,bob,charlie")
    /// </summary>
    public string Attendees { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;
}
