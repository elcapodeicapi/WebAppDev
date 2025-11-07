using System.Diagnostics.Eventing.Reader;
using Microsoft.EntityFrameworkCore;

namespace WebAppDev.AuthApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Rooms> Rooms => Set<Rooms>();
    public DbSet<Groups> Groups => Set<Groups>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.UseSqlite("Data Source=WebApp.db");
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<GroupsMembership>()
            .HasKey(g => new { g.GroupId, g.UserId });
        modelBuilder.Entity<RoomBookings>()
            .HasKey(r => new { r.RoomId, r.UserId });
        modelBuilder.Entity<EventParticipation>()
            .HasKey(e => new { e.EventId, e.UserId });
    }
}
