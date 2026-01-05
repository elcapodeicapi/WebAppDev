using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Seed;
using Microsoft.OpenApi.Models;
using WebAppDev.AuthApi.Services;
using WebAppDev.AuthApi.Middleware;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();

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


const string ClientCorsPolicy = "ClientCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
    {
        
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=WebAPI.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddScoped<AuthService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Auth API v1");
    c.RoutePrefix = "swagger"; // UI at /swagger
});
app.UseCors(ClientCorsPolicy);

app.UseMiddleware<SessionMiddleware>();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (app.Environment.IsDevelopment())
    {
        var reset = Environment.GetEnvironmentVariable("DB_RESET");
        var shouldReset = string.Equals(reset, "true", StringComparison.OrdinalIgnoreCase) || reset == "1";
        if (shouldReset)
        {
            await db.Database.EnsureDeletedAsync();
        }
        await db.Database.EnsureCreatedAsync();

        static bool HasColumn(System.Data.Common.DbConnection connection, string table, string column)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = $"SELECT 1 FROM pragma_table_info('{table}') WHERE name = '{column}' LIMIT 1;";
            return cmd.ExecuteScalar() != null;
        }

        var connection = db.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            connection.Open();
        }

        var schemaOk =
            HasColumn(connection, "Rooms", "Id") &&
            HasColumn(connection, "RoomBookings", "Id") &&
            HasColumn(connection, "RoomBookings", "RoomId") &&
            HasColumn(connection, "RoomBookings", "UserId") &&
            HasColumn(connection, "RoomBookings", "NumberOfPeople") &&
            HasColumn(connection, "EventReviews", "Id") &&
            HasColumn(connection, "EventReviews", "EventId") &&
            HasColumn(connection, "EventReviews", "UserId") &&
            HasColumn(connection, "EventReviews", "Comment");

        
        connection.Close();

        if (!schemaOk)
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }
    }
    else
    {
        
        await db.Database.MigrateAsync();
    }
    await DbInitializer.SeedAsync(db);
    
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
