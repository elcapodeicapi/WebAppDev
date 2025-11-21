namespace WebAppDev.AuthApi.DTOs;

public class UpdateProfileRequest
{
    public string? SessionId { get; set; }
    public string? FullName { get; set; }
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
}
