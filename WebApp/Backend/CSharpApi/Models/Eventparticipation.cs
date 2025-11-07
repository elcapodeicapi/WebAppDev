public class EventParticipation
{
    public int UserId { get; set; }
    public User user { get; set; }
    public int EventId { get; set; }
    public Events Event { get; set; } = null!;
    public string Status { get; set; } = null!;
}