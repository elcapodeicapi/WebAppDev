using System.Collections.Concurrent;
using System.Threading;

namespace WebAppDev.AuthApi.Services;

public static class RoomBookingLock
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> Locks = new();

    public static SemaphoreSlim ForRoomDate(int roomId, DateTime date)
    {
        var key = $"{roomId}:{date:yyyy-MM-dd}";
        return Locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
    }
}
