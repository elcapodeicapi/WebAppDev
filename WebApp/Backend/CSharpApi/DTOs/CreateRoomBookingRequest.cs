using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.DTOs;

public class CreateRoomBookingRequest
{
    [Required]
    public int RoomId { get; set; }


    [Required]
    public string Date { get; set; } = string.Empty;


    [Required]
    public string StartTime { get; set; } = "9 AM";

 
    [Range(1, 24)]
    public int DurationHours { get; set; } = 1;

    [Required]
    [Range(1, 1000)]
    public int NumberOfPeople { get; set; } = 1;

    public string? Purpose { get; set; }
}
