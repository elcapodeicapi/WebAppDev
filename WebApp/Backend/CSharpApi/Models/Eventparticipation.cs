using System.Text.Json.Serialization;

namespace WebAppDev.AuthApi.Models;

public class EventParticipation
{
    public int UserId { get; set; }
    public User? User { get; set; }
    public int EventId { get; set; }
    [JsonIgnore]
    public Events? Event { get; set; }
    public string Status { get; set; } = string.Empty;
}