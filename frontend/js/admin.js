document.addEventListener('DOMContentLoaded', async () => {
  // Protect this page - Admin only
  protectDashboard('admin');

  renderNavbar('dash');

  const user = getCurrentUser();

  // Render users list
  function renderUsers() {
    try {
      const users = getUsers();

      const usersList = document.getElementById('users-list');
      if (!users || users.length === 0) {
        usersList.innerHTML = `
          <div class="empty-state">
            <p>No users registered yet.</p>
          </div>
        `;
        return;
      }

      const usersByRole = {};
      users.forEach((u) => {
        if (!usersByRole[u.role]) usersByRole[u.role] = [];
        usersByRole[u.role].push(u);
      });

      let html = '';
      for (const [role, roleUsers] of Object.entries(usersByRole)) {
        html += `
          <h3 style="margin-top: 2rem; margin-bottom: 1rem; text-transform: capitalize;">${role}s (${roleUsers.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            ${roleUsers
              .map(
                (u) => `
              <div class="card">
                <h4 style="margin: 0 0 0.3rem;">${u.name}</h4>
                <p style="margin: 0.2rem 0; color: var(--muted); font-size: 0.9rem;">${u.email}</p>
                <p style="margin: 0.8rem 0 0; font-size: 0.85rem;">
                  <span class="badge badge-info">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
                </p>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      usersList.innerHTML = html;
    } catch (error) {
      console.error('Error rendering users:', error);
      document.getElementById('users-list').innerHTML = `
        <div class="alert alert-danger">Error loading users. Please try again.</div>
      `;
    }
  }

  // Render all events with approval controls
  async function renderEvents() {
    try {
      const raw = await getEvents();
      const events = (Array.isArray(raw) ? raw : raw.events || [])
        .map((event) => ({
          ...event,
          id: event._id || event.id,
          locationText: typeof event.location === 'string' 
            ? event.location 
            : event.location?.city || 'Not specified',
          dateText: event.date ? new Date(event.date).toLocaleDateString() : 'TBD',
          isApproved: (event.status || '').toLowerCase() === 'approved'
        }));

      const wrap = document.getElementById('all-events');

      if (!events || events.length === 0) {
        wrap.innerHTML = `
          <div class="empty-state">
            <p>No events found.</p>
          </div>
        `;
        return;
      }

      // Group by status
      const approved = events.filter((e) => e.isApproved);
      const pending = events.filter((e) => !e.isApproved);

      let html = '';

      if (pending.length > 0) {
        html += `
          <h3 style="margin-bottom: 1rem; color: var(--warning);">Pending Approval (${pending.length})</h3>
          <div style="display: grid; gap: 1rem; margin-bottom: 2rem;">
            ${pending
              .map(
                (event) => `
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem;">
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.3rem;">${event.title}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; color: var(--muted);">
                      <p style="margin: 0;">📅 ${event.dateText}</p>
                      <p style="margin: 0;">📍 ${event.locationText}</p>
                    </div>
                  </div>
                  <span class="badge badge-warning">Pending</span>
                </div>
                <p style="margin: 0 0 1rem; color: var(--muted);">${event.description.substring(0, 80)}${event.description.length > 80 ? '...' : ''}</p>
                <div class="card-footer">
                  <button class="btn btn-success" data-action="approve" data-id="${event.id}">Approve</button>
                  <button class="btn btn-danger" data-action="reject" data-id="${event.id}">Reject</button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      if (approved.length > 0) {
        html += `
          <h3 style="margin-bottom: 1rem; color: var(--success);">Approved (${approved.length})</h3>
          <div style="display: grid; gap: 1rem;">
            ${approved
              .map(
                (event) => `
              <div class="card" style="opacity: 0.85;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.3rem;">${event.title}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; color: var(--muted);">
                      <p style="margin: 0;">📅 ${event.dateText}</p>
                      <p style="margin: 0;">📍 ${event.locationText}</p>
                    </div>
                  </div>
                  <span class="badge badge-info">Approved</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        `;
      }

      wrap.innerHTML = html;

      // Attach event listeners to buttons
      wrap.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.action;
          const id = btn.dataset.id;
          const isApproving = action === 'approve';

          btn.disabled = true;
          const originalText = btn.textContent;
          btn.textContent = isApproving ? 'Approving...' : 'Rejecting...';

          try {
            // Find and update the event in backend (for demo, we'll just update status)
            const event = events.find((e) => e.id === id);
            if (event) {
              event.status = isApproving ? 'approved' : 'rejected';
              // In a real app, this would call an API endpoint
              // For now, just re-render to show the change
              setTimeout(() => {
                renderEvents();
              }, 500);
            }
          } catch (error) {
            console.error('Error updating event:', error);
            btn.disabled = false;
            btn.textContent = originalText;
          }
        });
      });
    } catch (error) {
      console.error('Error rendering events:', error);
      document.getElementById('all-events').innerHTML = `
        <div class="alert alert-danger">Error loading events. Please try again.</div>
      `;
    }
  }

  // Initial render
  renderUsers();
  renderEvents();
});
