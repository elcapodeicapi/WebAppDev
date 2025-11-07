public class Rooms
{
    public int Id { get; set; }
    public string RoomName { get; set; } = null!;
    public int Capacity { get; set; }
    public string Location { get; set; } = null!;
    public List<RoomBookings> RoomBookings { get; set; } = new();
}