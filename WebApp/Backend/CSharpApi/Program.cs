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
    if (app.Environment.IsDevelopment())
    {
        // In development, DO NOT drop the DB automatically.
        // Optionally allow a forced reset with an environment variable DB_RESET=true
        var reset = Environment.GetEnvironmentVariable("DB_RESET");
        var shouldReset = string.Equals(reset, "true", StringComparison.OrdinalIgnoreCase) || reset == "1";
        if (shouldReset)
        {
            await db.Database.EnsureDeletedAsync();
        }
        // Ensure database exists according to current model (no migrations needed for dev)
        await db.Database.EnsureCreatedAsync();
    }
    else
    {
        // In production, apply migrations
        await db.Database.MigrateAsync();
    }
    await DbInitializer.SeedAsync(db);
    
    // Ensure OfficeAttendances table exists for development
    if (app.Environment.IsDevelopment())
    {
        var connection = db.Database.GetDbConnection();
        connection.Open();
        var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS OfficeAttendances (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId INTEGER NOT NULL,
                Date TEXT NOT NULL,
                Status TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES Users (Id)
            )";
        command.ExecuteNonQuery();
    }
}

app.Run();
