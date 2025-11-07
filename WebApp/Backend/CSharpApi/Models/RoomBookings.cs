public class RoomBookings
{
    public int RoomId { get; set; }
    public Rooms Room { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime BookingDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Purpose { get; set; }
}