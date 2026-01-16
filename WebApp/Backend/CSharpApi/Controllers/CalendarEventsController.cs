using Microsoft.AspNetCore.Mvc;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CalendarEventsController : ControllerBase
{
    private readonly CalendarEventService _eventService;

    public CalendarEventsController(CalendarEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpPost]
    [SessionRequired]
    public async Task<IActionResult> Create([FromBody] CalendarEventDTO request)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            var eventId = await _eventService.CreateEventAsync(request, userId);
            return Ok(new { message = "Created event successfully", eventId });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpPut("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Update(int id, [FromBody] CalendarEventDTO request)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            await _eventService.UpdateEventAsync(id, request, userId);
            return Ok(new { message = "Updated event successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpDelete("{id}")]
    [SessionRequired]
    public async Task<IActionResult> Delete(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            await _eventService.DeleteEventAsync(id, userId);
            return Ok(new { message = "Deleted event successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var userIdObj = HttpContext.Items["UserId"];
        var currentUserId = userIdObj != null ? (int)userIdObj : (int?)null;

        try
        {
            var evt = await _eventService.GetEventAsync(id, currentUserId);
            if (evt == null) return NotFound();
            return Ok(evt);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
