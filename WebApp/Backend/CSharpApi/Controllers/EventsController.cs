using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAppDev.AuthApi.Data;
using WebAppDev.AuthApi.Models;
using WebAppDev.AuthApi.DTOs;

namespace WebAppDev.AuthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EventsController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/events
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Events>>> GetAll()
    {
        var list = await _db.Events
            .Include(e => e.EventParticipation)
            .ToListAsync();
        return Ok(list);
    }

    // GET: api/events/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Events>> Get(int id)
    {
        var item = await _db.Events
            .Include(e => e.EventParticipation)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    // POST: api/events
    [HttpPost]
    public async Task<ActionResult<Events>> Create([FromBody] CreateEventRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Parse date and time (expecting date dd/MM/yyyy and time like "9 AM")
        DateTime datePart;
        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy format." });
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(req.StartTime))
        {
            if (!DateTime.TryParse(req.StartTime, out var dt))
            {
                return BadRequest(new { message = "StartTime could not be parsed (e.g. '9 AM')." });
            }
            timePart = dt.TimeOfDay;
        }

        var evt = new Events
        {
            Title = req.Title,
            Description = req.Description,
            EventDate = datePart.Date + timePart,
            DurationHours = req.DurationHours,
            Host = req.Host,
            Attendees = req.Attendees,
            Location = req.Location,
            CreatedBy = 0
        };

        _db.Events.Add(evt);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = evt.Id }, evt);
    }

    // PUT: api/events/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateEventRequest req)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();

        // Parse date and time
        DateTime datePart;
        if (!DateTime.TryParseExact(req.Date, new[] { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd" },
            System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out datePart))
        {
            return BadRequest(new { message = "Date must be in dd/MM/yyyy format." });
        }

        TimeSpan timePart = TimeSpan.Zero;
        if (!string.IsNullOrWhiteSpace(req.StartTime))
        {
            if (!DateTime.TryParse(req.StartTime, out var dt))
            {
                return BadRequest(new { message = "StartTime could not be parsed (e.g. '9 AM')." });
            }
            timePart = dt.TimeOfDay;
        }

        // Update the event
        evt.Title = req.Title;
        evt.Description = req.Description;
        evt.EventDate = datePart.Date + timePart;
        evt.DurationHours = req.DurationHours;
        evt.Host = req.Host;
        evt.Attendees = req.Attendees;
        evt.Location = req.Location;

        _db.Entry(evt).State = EntityState.Modified;
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await _db.Events.AnyAsync(e => e.Id == id)) return NotFound();
            throw;
        }
        return NoContent();
    }

    // DELETE: api/events/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var evt = await _db.Events.FindAsync(id);
        if (evt == null) return NotFound();
        _db.Events.Remove(evt);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
