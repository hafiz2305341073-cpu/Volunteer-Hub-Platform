document.addEventListener('DOMContentLoaded', async () => {
  // Render navigation based on user role
  renderNavbar('home');

  // Load featured events
  const featuredContainer = document.getElementById('featuredEvents');
  const exploreBtnHero = document.getElementById('exploreBtnHero');

  // Handle explore button
  if (exploreBtnHero) {
    exploreBtnHero.addEventListener('click', () => {
      window.location.href = 'events.html';
    });
  }

  try {
    featuredContainer.innerHTML = '<div class="text-center"><div class="spinner"></div></div>';

    const events = await getEvents();
    const eventList = Array.isArray(events) ? events : events.events || [];

    // Get approved events only, limit to 3
    const approved = eventList
      .filter((e) => !e.status || e.status.toLowerCase() === 'approved')
      .slice(0, 3);

    if (approved.length === 0) {
      featuredContainer.innerHTML = `
        <div class="empty-state">
          <p>No events available yet. Check back soon!</p>
        </div>
      `;
      return;
    }

    // Render event cards
    featuredContainer.innerHTML = approved
      .map((event) => {
        const eventId = event._id || event.id;
        const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
        const eventLocation = typeof event.location === 'string' 
          ? event.location 
          : event.location?.city || 'Not specified';

        return `
          <div class="card">
            <div style="margin-bottom: 0.8rem;">
              <span class="badge badge-primary">${event.type || 'Community'}</span>
            </div>
            <h3 style="margin: 0 0 0.6rem;">${event.title}</h3>
            <p style="margin: 0.4rem 0; color: var(--muted); font-size: 0.95rem;">${event.description}</p>
            <div style="margin: 0.8rem 0; font-size: 0.9rem;">
              <p style="margin: 0.3rem 0;"><strong>📍 Location:</strong> ${eventLocation}</p>
              <p style="margin: 0.3rem 0;"><strong>📅 Date:</strong> ${eventDate}</p>
            </div>
            <div class="card-footer">
              <a class="btn btn-primary" style="flex: 1; text-align: center;" href="event-details.html?id=${eventId}">View Details</a>
            </div>
          </div>
        `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading events:', error);
    featuredContainer.innerHTML = `
      <div class="alert alert-danger">
        Error loading events. Please try again later.
      </div>
    `;
  }
});
