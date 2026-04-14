document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('events');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const wrap = document.getElementById('event-detail');
  const action = document.getElementById('apply-action');
  const messageDiv = document.getElementById('message');

  if (!id) {
    wrap.innerHTML = `
      <div class="alert alert-warning">
        <strong>Error:</strong> Event ID is missing. Please select an event from the list.
      </div>
    `;
    return;
  }

  try {
    // Show loading state
    wrap.innerHTML = '<div class="text-center" style="padding: 2rem;"><div class="spinner"></div></div>';

    const raw = await getEvents();
    const events = Array.isArray(raw) ? raw : raw.events || [];
    const event = events.find((e) => String(e._id || e.id) === String(id));

    if (!event) {
      wrap.innerHTML = `
        <div class="alert alert-danger">
          <strong>Event not found.</strong> This event may have been deleted. <a href="events.html">Go back to events</a>
        </div>
      `;
      action.disabled = true;
      return;
    }

    const locationText = typeof event.location === 'string' 
      ? event.location 
      : event.location?.city || 'Not specified';
    const dateText = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
    const eventId = event._id || event.id;

    // Render event details
    wrap.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <span class="badge badge-primary">${event.type || 'Community'}</span>
      </div>
      <h2 style="margin: 0 0 0.8rem;">${event.title}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
        <div>
          <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">📅 Date</p>
          <p style="margin: 0.4rem 0; font-weight: 600;">${dateText}</p>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">📍 Location</p>
          <p style="margin: 0.4rem 0; font-weight: 600;">${locationText}</p>
        </div>
        <div>
          <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">🏷️ Type</p>
          <p style="margin: 0.4rem 0; font-weight: 600;">${event.type || 'General'}</p>
        </div>
      </div>
      <div style="margin: 2rem 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 1.5rem 0;">
        <h3>About This Event</h3>
        <p>${event.description}</p>
      </div>
      ${event.status && event.status.toLowerCase() !== 'approved' ? `
        <div class="alert alert-warning">
          <strong>Pending Approval:</strong> This event is waiting for admin approval.
        </div>
      ` : ''}
    `;

    // Handle apply button
    action.addEventListener('click', async () => {
      const user = getCurrentUser();

      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      if (user.role !== 'volunteer') {
        messageDiv.innerHTML = '<strong>Error:</strong> Only volunteers can apply for events.';
        messageDiv.style.color = 'var(--danger)';
        action.disabled = true;
        return;
      }

      // Check if already applied
      const applications = getApplications() || [];
      if (applications.find((a) => String(a.eventId) === String(eventId) && String(a.userId) === String(user.id))) {
        messageDiv.innerHTML = '<strong>Info:</strong> You have already applied for this event.';
        messageDiv.style.color = 'var(--info)';
        return;
      }

      // Disable button during submission
      action.disabled = true;
      const originalText = action.textContent;
      action.textContent = 'Applying...';

      try {
        await applyToEvent(eventId);
        messageDiv.innerHTML = '<strong>Success!</strong> Your application has been submitted. Check your dashboard for updates.';
        messageDiv.style.color = 'var(--success)';
        action.textContent = 'Applied ✓';
      } catch (error) {
        console.error('Application error:', error);
        messageDiv.innerHTML = `<strong>Error:</strong> ${error.message || 'Failed to apply. Please try again.'}`;
        messageDiv.style.color = 'var(--danger)';
        action.disabled = false;
        action.textContent = originalText;
      }
    });

    // Check user role and disable button if not volunteer
    const user = getCurrentUser();
    if (!user || user.role !== 'volunteer') {
      action.textContent = 'Login as Volunteer to Apply';
    }
  } catch (error) {
    console.error('Error loading event:', error);
    wrap.innerHTML = `
      <div class="alert alert-danger">
        Error loading event details. Please try again later.
      </div>
    `;
  }
});
