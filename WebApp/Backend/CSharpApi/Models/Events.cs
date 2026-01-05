public class Events
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }

    public int DurationHours { get; set; } = 1;

    public string Host { get; set; } = string.Empty;

    public string Attendees { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public int CreatedBy { get; set; }
    public List<EventParticipation> EventParticipation { get; set; } = new();

    public List<EventReview> Reviews { get; set; } = new();
}