public class Events
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public int CreatedBy { get; set; }
    public List<EventParticipation> EventParticipation = new();
}