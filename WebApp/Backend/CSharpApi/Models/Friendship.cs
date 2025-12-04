using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.Models
{
    public class Friendship
    {
        public int Id { get; set; }
        [Required]
        public int UserId { get; set; }
        [Required]
        public int FriendId { get; set; }
        [Required]
        [MaxLength(16)]
        public string Status { get; set; } = "Pending"; // Pending | Accepted
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
