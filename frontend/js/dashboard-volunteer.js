document.addEventListener('DOMContentLoaded', async () => {
  // Protect this page - volunteers only
  protectDashboard('volunteer');

  renderNavbar('dash');

  const user = getCurrentUser();

  try {
    // Update welcome section with user profile
    document.getElementById('welcome-name').textContent = user.name || 'Volunteer';
    document.getElementById('hours').textContent = user.hours || 0;
    document.getElementById('points').textContent = user.points || 0;

    // Load joined events
    const joinedWrap = document.getElementById('joined-events-list');
    const applications = getApplications().filter((app) => app.userId === user.id);
    document.getElementById('joined-events').textContent = applications.length;

    if (applications.length === 0) {
      joinedWrap.innerHTML = `
        <div class="empty-state">
          <p>You haven't joined any events yet. <a href="events.html" style="color: var(--primary);">Browse events</a></p>
        </div>
      `;
    } else {
      const events = await getEvents();
      const eventList = Array.isArray(events) ? events : events.events || [];

      joinedWrap.innerHTML = applications
        .map((app) => {
          const event = eventList.find((e) => String(e.id || e._id) === String(app.eventId));
          const appliedDate = new Date(app.appliedAt).toLocaleDateString();
          const eventTitle = event ? event.title : 'Event (Deleted)';
          const eventType = event ? event.type : 'Unknown';

          return `
            <div class="card">
              <span class="badge badge-primary">${eventType}</span>
              <h3 style="margin: 0.6rem 0 0.3rem;">${eventTitle}</h3>
              <p style="color: var(--muted); font-size: 0.9rem;">Applied ${appliedDate}</p>
              ${event ? `<a href="event-details.html?id=${event._id || event.id}" class="btn btn-secondary btn-sm">View Event</a>` : ''}
            </div>
          `;
        })
        .join('');
    }

    // Load recommendations
    const events = await getEvents();
    const eventList = (Array.isArray(events) ? events : events.events || [])
      .filter((e) => {
        const status = (e.status || '').toLowerCase();
        return !status || status === 'approved';
      })
      .filter((e) => !applications.find((a) => String(a.eventId) === String(e.id || e._id)))
      .slice(0, 4);

    const recsContainer = document.getElementById('recommendations');
    if (eventList.length === 0) {
      recsContainer.innerHTML = `
        <div class="empty-state">
          <p>No new events available. Check back soon!</p>
        </div>
      `;
    } else {
      recsContainer.innerHTML = eventList
        .map((event) => {
          const eventId = event._id || event.id;
          const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
          const eventLocation = typeof event.location === 'string' 
            ? event.location 
            : event.location?.city || 'Not specified';

          return `
            <div class="card">
              <div style="margin-bottom: 0.8rem;">
                <span class="badge badge-info">${event.type || 'Community'}</span>
              </div>
              <h3 style="margin: 0 0 0.5rem;">${event.title}</h3>
              <p style="margin: 0.3rem 0; color: var(--muted); font-size: 0.9rem;">${event.description}</p>
              <div style="margin: 0.8rem 0; font-size: 0.85rem; color: var(--muted);">
                <p style="margin: 0.2rem 0;">📍 ${eventLocation}</p>
                <p style="margin: 0.2rem 0;">📅 ${eventDate}</p>
              </div>
              <div class="card-footer">
                <a class="btn btn-primary" href="event-details.html?id=${eventId}">View Event</a>
              </div>
            </div>
          `;
        })
        .join('');
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    document.getElementById('joined-events-list').innerHTML = `
      <div class="alert alert-danger">
        Error loading your events. Please try refreshing the page.
      </div>
    `;
  }
});
