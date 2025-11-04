using System.Security.Cryptography;

namespace WebAppDev.AuthApi.Services;

public static class PasswordHasher
{
    public static void CreatePasswordHash(string password, out byte[] hash, out byte[] salt)
    {
        using var hmac = new HMACSHA256();
        salt = hmac.Key; // random key as salt
        hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
    }

    public static bool VerifyPassword(string password, byte[] hash, byte[] salt)
    {
        using var hmac = new HMACSHA256(salt);
        var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(computedHash, hash);
    }
}
