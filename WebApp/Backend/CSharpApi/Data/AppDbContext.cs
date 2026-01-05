using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Models;

namespace WebAppDev.AuthApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Rooms> Rooms => Set<Rooms>();
    public DbSet<RoomBookings> RoomBookings => Set<RoomBookings>();
    public DbSet<OfficeAttendance> OfficeAttendances => Set<OfficeAttendance>();
    public DbSet<Groups> Groups => Set<Groups>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<Events> Events => Set<Events>();
    public DbSet<EventParticipation> EventParticipations => Set<EventParticipation>();
    public DbSet<EventReview> EventReviews => Set<EventReview>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<GroupsMembership>()
            .HasKey(g => new { g.GroupId, g.UserId });
        modelBuilder.Entity<EventParticipation>()
            .HasKey(e => new { e.EventId, e.UserId });
        modelBuilder.Entity<EventParticipation>()
            .HasOne(ep => ep.User)
            .WithMany()
            .HasForeignKey(ep => ep.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<EventParticipation>()
            .HasOne(ep => ep.Event)
            .WithMany(e => e.EventParticipation)
            .HasForeignKey(ep => ep.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventReview>()
            .HasIndex(r => new { r.EventId, r.UserId })
            .IsUnique();

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

        modelBuilder.Entity<Friendship>()
            .HasIndex(f => new { f.UserId, f.FriendId })
            .IsUnique();
        modelBuilder.Entity<Friendship>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Friendship>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(f => f.FriendId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RoomBookings>()
            .HasOne(rb => rb.Room)
            .WithMany(r => r.RoomBookings)
            .HasForeignKey(rb => rb.RoomId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RoomBookings>()
            .HasOne(rb => rb.User)
            .WithMany()
            .HasForeignKey(rb => rb.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventReview>()
            .HasOne(r => r.Event)
            .WithMany(e => e.Reviews)
            .HasForeignKey(r => r.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventReview>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
