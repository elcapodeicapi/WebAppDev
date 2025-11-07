public class Groups
{
    public int Id { get; set; }
    public string GroupName { get; set; } = null!;
    public string Description { get; set; } = null!;
    public List<User> Users { get; set; } = new();
}