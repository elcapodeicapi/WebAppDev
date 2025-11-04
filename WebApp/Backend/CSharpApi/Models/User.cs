using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.Models;

// enum Role {User, Admin }

public class User
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200), EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; }

    public string JobTitle { get; set; }

    public string Rol { get; set; }

    [Required]
    public byte[] PasswordHash { get; set; } = Array.Empty<byte>();

    [Required]
    public byte[] PasswordSalt { get; set; } = Array.Empty<byte>();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
