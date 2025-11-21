using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Rooms> Rooms => Set<Rooms>();
    public DbSet<RoomBookings> RoomBookings => Set<RoomBookings>();
    public DbSet<Groups> Groups => Set<Groups>();
    public DbSet<Session> Sessions => Set<Session>();

    // Removed OnConfiguring override to allow connection string from DI (Program.cs)

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<GroupsMembership>()
            .HasKey(g => new { g.GroupId, g.UserId });
        modelBuilder.Entity<RoomBookings>()
            .HasKey(r => new { r.RoomId, r.UserId });
        modelBuilder.Entity<EventParticipation>()
            .HasKey(e => new { e.EventId, e.UserId });

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<Session>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
