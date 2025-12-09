using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Seed;
using Microsoft.OpenApi.Models;
using WebAppDev.AuthApi.Services;
using WebAppDev.AuthApi.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// OpenAPI/Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WebAppDev Auth API",
        Version = "v1",
        Description = "Simple login/register API backed by SQLite"
    });
});

// CORS for Vite dev server
const string ClientCorsPolicy = "ClientCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
    {
        // Frontend dev server runs on 5173 (Vite default). Allow that origin for dev.
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// EF Core with SQLite
var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=WebAPI.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddScoped<AuthService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth API v1");
    c.RoutePrefix = "swagger"; // UI at /swagger
});
app.UseCors(ClientCorsPolicy);

// Session cookie middleware
app.UseMiddleware<SessionMiddleware>();

app.MapControllers();

// Ensure DB exists and seed mock data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Try to ensure schema includes EventParticipations; if missing, recreate DB for dev
    try
    {
        await db.Database.MigrateAsync();
        // quick check using raw SQL on sqlite_master
        var hasEventParticipations = await db.Database.ExecuteSqlRawAsync(
            "SELECT CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='EventParticipations') THEN 1 ELSE 0 END;") > 0;
        if (!hasEventParticipations)
        {
            // Dev fallback: drop and recreate
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }
    catch
    {
        // If migration fails (e.g. missing migrations), recreate schema from model
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }
    await DbInitializer.SeedAsync(db);
}

app.Run();
