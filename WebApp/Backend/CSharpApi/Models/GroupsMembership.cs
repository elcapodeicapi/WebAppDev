public class GroupsMembership
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int GroupId { get; set; }
    public Groups Group { get; set; } = null!;
}