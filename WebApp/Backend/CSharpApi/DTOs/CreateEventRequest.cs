using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.DTOs;

public class CreateEventRequest
{
    [Required]
    public string Title { get; set; } = string.Empty;

    
    [Required]
    public string Date { get; set; } = string.Empty;

    public string StartTime { get; set; } = "9 AM";

 
    public int DurationHours { get; set; } = 1;

    public string Host { get; set; } = string.Empty;

 
    public string Attendees { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;
}
