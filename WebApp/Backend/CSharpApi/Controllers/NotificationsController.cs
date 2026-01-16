using Microsoft.AspNetCore.Mvc;
using WebAppDev.AuthApi.DTOs;
using WebAppDev.AuthApi.Filters;
using WebAppDev.AuthApi.Services;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationsController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    [SessionRequired]
    public async Task<IActionResult> GetNotifications()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            var notifications = await _notificationService.GetNotificationsAsync(userId);
            return Ok(notifications);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("summary")]
    [SessionRequired]
    public async Task<IActionResult> GetNotificationSummary()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            var summary = await _notificationService.GetNotificationSummaryAsync(userId);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("tomorrow-events")]
    [SessionRequired]
    public async Task<IActionResult> GetTomorrowEvents()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            var events = await _notificationService.GetTomorrowEventsAsync(userId);
            return Ok(events);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("pending-invitations")]
    [SessionRequired]
    public async Task<IActionResult> GetPendingInvitations()
    {
        var userIdObj = HttpContext.Items["UserId"];
        if (userIdObj is null) return Unauthorized();
        var userId = (int)userIdObj;

        try
        {
            var invitations = await _notificationService.GetPendingInvitationsAsync(userId);
            return Ok(invitations);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
