# Backend (C# API)

This folder contains a minimal ASP.NET Core Web API that provides Register and Login endpoints backed by SQLite via Entity Framework Core.

- Project path: `WebApp/Backend/CSharpApi`
- Default URL: `http://localhost:5217`
- Database: SQLite file `auth.db` created next to the project on first run
- CORS: allows Vite dev server at `http://localhost:5173`

## Endpoints

- `POST /api/auth/register`
  - body: `{ "fullName": "John Doe", "email": "john@example.com", "password": "Secret123!" }`
  - returns: `{ success, message, userId, email, fullName }`

- `POST /api/auth/login`
  - body: `{ "email": "test@example.com", "password": "Password123!" }`
  - returns: `{ success, message, userId, email, fullName }`

## Mock data

On first run the API seeds two users:
- `test@example.com` / `Password123!`
- `jane@example.com` / `Secret123!`

## Run locally

Prereqs: .NET SDK 8.0+

From the project folder:

```powershell
# restore & run
cd WebApp/Backend/CSharpApi
 dotnet restore
 dotnet run
```

The API will start at `http://localhost:5217`.
