using System.ComponentModel.DataAnnotations;

namespace WebAppDev.AuthApi.DTOs;

public class LoginRequest
{
    public string? Username { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    [Required]
    public string Password { get; set; } = string.Empty;
}
