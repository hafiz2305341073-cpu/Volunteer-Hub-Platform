document.addEventListener('DOMContentLoaded', async () => {
  // Protect this page - NGO only
  protectDashboard('ngo');

  renderNavbar('dash');

  const user = getCurrentUser();

  const form = document.getElementById('create-event-form');
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('description');
  const dateInput = document.getElementById('date');
  const locInput = document.getElementById('location');
  const typeInput = document.getElementById('type');
  const messageDiv = document.getElementById('message');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Load and render NGO data
  async function renderNgoData() {
    try {
      const eventsRaw = await getEvents();
      const allEvents = Array.isArray(eventsRaw) ? eventsRaw : eventsRaw.events || [];
      
      // Filter events created by this NGO
      const events = allEvents
        .filter((e) => String(e.createdBy) === String(user.id) || e.createdBy === 'ngo-demo')
        .map((event) => ({
          ...event,
          id: event._id || event.id,
          locationText: typeof event.location === 'string' 
            ? event.location 
            : event.location?.city || 'Unknown',
          dateText: event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
          statusText: !event.status || event.status.toLowerCase() === 'approved' ? 'Approved' : 'Pending'
        }));

      const myEventsContainer = document.getElementById('my-events');
      if (events.length === 0) {
        myEventsContainer.innerHTML = `
          <div class="empty-state">
            <p>No events created yet. Create one above to get started!</p>
          </div>
        `;
      } else {
        myEventsContainer.innerHTML = events
          .map((event) => `
            <div class="card">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;">
                <h3 style="margin: 0; flex: 1;">${event.title}</h3>
                <span class="badge ${event.statusText === 'Approved' ? 'badge-info' : 'badge-warning'}">${event.statusText}</span>
              </div>
              <p style="margin: 0.3rem 0; color: var(--muted); font-size: 0.9rem;">${event.description}</p>
              <p style="margin: 0.5rem 0; font-size: 0.9rem;">
                <strong>📍</strong> ${event.locationText} | <strong>📅</strong> ${event.dateText}
              </p>
              <a href="event-details.html?id=${event.id}" class="btn btn-secondary btn-sm">View Details</a>
            </div>
          `)
          .join('');
      }

      // Load applicants
      const applicantsContainer = document.getElementById('applicants');
      const applications = getApplications() || [];
      
      if (applications.length === 0) {
        applicantsContainer.innerHTML = `
          <div class="empty-state">
            <p>No applicants yet. Once volunteers apply, they'll appear here.</p>
          </div>
        `;
      } else {
        applicantsContainer.innerHTML = applications
          .map((app) => {
            const appliedDate = new Date(app.appliedAt).toLocaleDateString();
            return `
              <div class="card">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <div>
                    <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">Application ID</p>
                    <p style="margin: 0.3rem 0; font-weight: 600;">${app.id || 'N/A'}</p>
                  </div>
                  <div>
                    <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">Applied</p>
                    <p style="margin: 0.3rem 0; font-weight: 600;">${appliedDate}</p>
                  </div>
                </div>
                <p style="margin: 0.5rem 0; color: var(--muted); font-size: 0.9rem;">
                  Event ID: <code style="background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px;">${app.eventId}</code>
                </p>
              </div>
            `;
          })
          .join('');
      }
    } catch (error) {
      console.error('Error rendering NGO data:', error);
      document.getElementById('my-events').innerHTML = `
        <div class="alert alert-danger">Error loading your events. Please try again.</div>
      `;
    }
  }

  // Form submission
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageDiv.innerHTML = '';

    // Get and validate form data
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const date = dateInput.value;
    const location = locInput.value.trim();
    const type = typeInput.value.trim();

    let hasError = false;

    // Validate title
    if (!title) {
      addFieldError(titleInput, 'Event title is required');
      hasError = true;
    } else {
      removeFieldError(titleInput);
    }

    // Validate description
    if (!description || description.length < 20) {
      addFieldError(descInput, 'Description must be at least 20 characters');
      hasError = true;
    } else {
      removeFieldError(descInput);
    }

    // Validate date
    if (!date) {
      addFieldError(dateInput, 'Event date is required');
      hasError = true;
    } else {
      removeFieldError(dateInput);
    }

    // Validate location
    if (!location) {
      addFieldError(locInput, 'Event location is required');
      hasError = true;
    } else {
      removeFieldError(locInput);
    }

    // Validate type
    if (!type) {
      addFieldError(typeInput, 'Event type is required');
      hasError = true;
    } else {
      removeFieldError(typeInput);
    }

    if (hasError) {
      messageDiv.innerHTML = '<strong>Error:</strong> Please fill all required fields correctly.';
      messageDiv.style.color = 'var(--danger)';
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner" style="display: inline-block; margin-right: 0.5rem;"></span>Creating event...';

    try {
      const eventData = {
        title,
        description,
        date,
        location,
        type,
        createdBy: user.id
      };

      await createEvent(eventData);
      messageDiv.innerHTML = '<strong>Success!</strong> Event created and pending admin approval.';
      messageDiv.style.color = 'var(--success)';
      form.reset();
      
      // Reload data
      setTimeout(() => renderNgoData(), 1500);
    } catch (error) {
      console.error('Error creating event:', error);
      messageDiv.innerHTML = `<strong>Error:</strong> ${error.message || 'Failed to create event. Please try again.'}`;
      messageDiv.style.color = 'var(--danger)';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Form field helpers
  function addFieldError(field, message) {
    field.classList.add('error');
    let error = field.parentElement.querySelector('.form-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'form-error';
      field.parentElement.appendChild(error);
    }
    error.textContent = message;
  }

  function removeFieldError(field) {
    field.classList.remove('error');
    const error = field.parentElement.querySelector('.form-error');
    if (error) error.remove();
  }

  // Initial load
  renderNgoData();
});
