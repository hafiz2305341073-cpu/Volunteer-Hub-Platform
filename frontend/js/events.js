document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('events');

  const listWrap = document.getElementById('events-list');
  const emptyState = document.getElementById('empty-state');
  const searchInput = document.getElementById('search');
  const typeFilter = document.getElementById('type-filter');
  const locationFilter = document.getElementById('location-filter');

  // Show loading state
  listWrap.innerHTML = '<div class="text-center" style="padding: 2rem;"><div class="spinner"></div></div>';

  try {
    const raw = await getEvents();
    const allEvents = (Array.isArray(raw) ? raw : raw.events || [])
      .map((event) => {
        const id = event._id || event.id;
        const status = (event.status || '').toLowerCase();
        const location = typeof event.location === 'string' 
          ? event.location 
          : event.location?.city || 'Unknown';

        return {
          ...event,
          id,
          location,
          dateText: event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
          isVisible: !status || status === 'approved'
        };
      });

    // Get unique locations and types for filters (though we're using text input now)
    const knownTypes = [...new Set(allEvents.map((e) => e.type).filter(Boolean))];

    // Render all events initially
    function renderEvents() {
      const searchQuery = searchInput.value.trim().toLowerCase();
      const typeQuery = typeFilter.value.trim().toLowerCase();
      const locationQuery = locationFilter.value.trim().toLowerCase();

      const filtered = allEvents.filter((event) => {
        if (!event.isVisible) return false;

        const searchMatch = !searchQuery || 
          (event.title + ' ' + (event.type || '') + ' ' + (event.description || '')).toLowerCase().includes(searchQuery);

        const typeMatch = !typeQuery || 
          (event.type || '').toLowerCase().includes(typeQuery);

        const locationMatch = !locationQuery || 
          event.location.toLowerCase().includes(locationQuery);

        return searchMatch && typeMatch && locationMatch;
      });

      if (filtered.length === 0) {
        listWrap.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
      }

      listWrap.classList.remove('hidden');
      emptyState.classList.add('hidden');

      listWrap.innerHTML = filtered
        .map((event) => {
          const eventId = event.id;
          const eventDescription = event.description.substring(0, 100) + (event.description.length > 100 ? '...' : '');

          return `
            <div class="card">
              <div style="margin-bottom: 0.8rem;">
                <span class="badge badge-primary">${event.type || 'Community'}</span>
              </div>
              <h3 style="margin: 0 0 0.5rem;">${event.title}</h3>
              <p style="margin: 0.4rem 0; color: var(--muted); font-size: 0.95rem;">${eventDescription}</p>
              <div style="margin: 0.8rem 0; font-size: 0.9rem; color: var(--muted);">
                <p style="margin: 0.25rem 0;">📍 ${event.location}</p>
                <p style="margin: 0.25rem 0;">📅 ${event.dateText}</p>
              </div>
              <div class="card-footer">
                <a class="btn btn-primary" href="event-details.html?id=${eventId}">View Details</a>
              </div>
            </div>
          `;
        })
        .join('');
    }

    // Event listeners for real-time filtering
    searchInput.addEventListener('input', renderEvents);
    typeFilter.addEventListener('input', renderEvents);
    locationFilter.addEventListener('input', renderEvents);

    // Initial render
    renderEvents();
  } catch (error) {
    console.error('Error loading events:', error);
    listWrap.innerHTML = `
      <div class="alert alert-danger">
        Failed to load events. Please try again later.
      </div>
    `;
  }
});
