using System.Text.Json.Serialization;

namespace WebAppDev.AuthApi.Models;

public class EventReview
{
    public int Id { get; set; }

    public int EventId { get; set; }
    [JsonIgnore]
    public Events? Event { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    // Optional rating (e.g., 1-5)
    public int? Rating { get; set; }

    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
