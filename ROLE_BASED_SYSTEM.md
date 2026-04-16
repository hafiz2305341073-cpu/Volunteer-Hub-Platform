# Role-Based Dashboard System - Documentation

## System Overview

The Volunteer Hub implements a **complete role-based access control (RBAC)** system with three distinct user roles:

1. **Volunteer** - Browse and apply for events
2. **NGO/Organization** - Create and manage events, view applicants
3. **Admin** - System administration, event approval, user management

---

## Backend Architecture

### 1. Role-Based Middleware

**File**: `src/middleware/authMiddleware.js` & `src/middleware/roleMiddleware.js`

#### Available Middleware:
```javascript
// Check specific role
const { checkRole } = require('../middleware/roleMiddleware');
router.get('/route', verifyFirebaseToken, checkRole(['volunteer']), handler);

// Pre-defined role checks
const { isVolunteer, isNGO, isAdmin, isVolunteerOrNGO, isAuthenticated } = require('../middleware/roleMiddleware');

router.get('/volunteer-only', verifyFirebaseToken, isVolunteer, handler);
router.get('/ngo-only', verifyFirebaseToken, isNGO, handler);
router.get('/admin-only', verifyFirebaseToken, isAdmin, handler);
```

#### Flow:
1. `verifyFirebaseToken` - Validates JWT token and extracts user info
2. `requireRoles()` or `checkRole()` - Verifies user has required role
3. If authorized → passes to controller
4. If unauthorized → returns 403 Forbidden

---

### 2. Protected API Endpoints

#### **PUBLIC ENDPOINTS** (No Auth Required)
```
GET  /api/events              → List all approved events
GET  /api/events/:eventId     → Get specific event details
```

#### **VOLUNTEER ENDPOINTS** (role === 'volunteer')
```
POST   /api/applications/apply/:eventId      → Apply for event
GET    /api/applications/my-applications     → Get user's applications
PUT    /api/applications/:appId/withdraw     → Withdraw application
```

#### **NGO ENDPOINTS** (role === 'ngo')
```
POST   /api/events                        → Create new event
PUT    /api/events/:eventId               → Update own event
DELETE /api/events/:eventId               → Delete own event
GET    /api/events/ngo/my-events          → Get NGO's events (NEW)
GET    /api/applications/event/:eventId   → Get applicants for event
PUT    /api/applications/:appId/status    → Approve/reject applicant
```

#### **ADMIN ENDPOINTS** (role === 'admin')
```
GET    /api/admin/events/pending          → List pending events
GET    /api/admin/events/approved         → List approved events
PUT    /api/admin/approve-event/:eventId  → Approve event
PUT    /api/admin/reject-event/:eventId   → Reject event
GET    /api/admin/dashboard/stats         → Platform statistics
PUT    /api/admin/users/:userId/deactivate → Deactivate user
PUT    /api/admin/users/:userId/reactivate → Reactivate user
GET    /api/users                         → Get all users
```

---

## Frontend Architecture

### 1. Authentication Flow

**File**: `js/common.js`

#### Key Functions:
```javascript
// Get current logged-in user
const user = getCurrentUser();
// Returns: { id, name, email, role: 'volunteer'|'ngo'|'admin', ... }

// Store user after login
setCurrentUser(user);

// Clear session
logout();

// Protect dashboard access
protectDashboard('volunteer'); // Only volunteer role can access
protectDashboard('ngo');       // Only ngo can access
protectDashboard('admin');     // Only admin can access

// Auto-redirect based on role
redirectByRole(user);
// volunteer → /dashboard-volunteer.html
// ngo       → /dashboard-ngo.html
// admin     → /admin.html
```

### 2. Navigation System

**File**: `js/common.js` → `renderNavbar()`

The navbar automatically adjusts based on user role:

**Unauthenticated User:**
- Home
- Events
- Login
- Register

**Volunteer:**
- Home
- Events
- My Dashboard
- User Name (volunteer)
- Logout

**NGO:**
- Home
- Events
- Organization Panel
- Browse Events
- Organization Name (ngo)
- Logout

**Admin:**
- Home
- Events
- Admin Panel
- All Events
- Admin Name (admin)
- Logout

---

### 3. Dashboard Pages

#### **Volunteer Dashboard** (`dashboard-volunteer.html`)
**Access**: Volunteer role only
**Features**:
- Personal profile (Name, Role, ID)
- Dashboard stats (Events Joined, Hours, Points)
- List of applied/joined events
- Recommended events to apply for
- Real-time event filtering

#### **NGO Dashboard** (`dashboard-ngo.html`)
**Access**: NGO role only
**Features**:
- Create new event form (title, description, date, location, type)
- List of created events with status
- Applicant list per event
- View applicant details (Name, ID, Applied Date)
- Event management (view, edit details in cards)

#### **Admin Dashboard** (`admin.html`)
**Access**: Admin role only
**Features**:
- Pending events with approve/reject buttons
- Approved events list
- All users grouped by role (volunteer, ngo, admin)
- User count per role
- Platform statistics
- Event status management

---

## Security Implementation

### 1. Frontend Security
```javascript
// Always verify login before accessing protected pages
protectDashboard(requiredRole); 
// Automatically redirects if:
// - Not logged in
// - Wrong role
// - Invalid session

// Role-based navigation
if (user.role === 'admin') {
  // Show admin panel link
}
```

### 2. Backend Security
```javascript
// NEVER trust frontend role claim
// Always verify in backend middleware

router.get('/admin-only', 
  verifyFirebaseToken,    // ← Verify token is valid
  requireRoles('admin'),  // ← Check database for actual role
  handler
);
```

### 3. Session Management
- Role stored in user document in MongoDB
- Each API call verifies token + checks database role
- Session expires with Firebase token expiry
- localStorage used for demo fallback only

---

## Usage Examples

### Example 1: Volunteer Login & Dashboard Access

```
1. User navigates to login.html
2. Enters: email=vol@vh.com, password=123456
3. Backend validates via Firebase + MongoDB
4. Frontend receives: { id: "...", name: "Volunteer Demo", role: "volunteer" }
5. common.js calls: redirectByRole(user)
6. User redirected to: dashboard-volunteer.html
7. dashboard-volunteer.js calls: protectDashboard('volunteer')
8. Access granted ✓
9. Navbar shows: Home, Events, My Dashboard, Logout
```

### Example 2: NGO Creates Event

```
1. NGO logged in, viewing dashboard-ngo.html
2. protectDashboard('ngo') checks role ✓
3. NGO fills form & clicks "Create Event"
4. Frontend validation passes
5. POST /api/events called (with Firebase token)
6. Backend:
   - verifyFirebaseToken() → extracts user from db
   - requireRoles('ngo') → checks role === 'ngo' ✓
   - createEvent() → creates event with createdBy = user.id
7. Event appears in "Your Events" list
8. Event status = "pending" (waiting admin approval)
```

### Example 3: Admin Approves Event

```
1. Admin logged in, viewing admin.html
2. protectDashboard('admin') checks role ✓
3. Admin sees pending events section
4. Clicks "Approve" button on event
5. PUT /api/admin/approve-event/:eventId called
6. Backend:
   - verifyFirebaseToken() → extracts user
   - requireRoles('admin') → checks role === 'admin' ✓
   - approveEvent() → updates event.status = 'approved'
7. Event now appears in "Approved Events" section
8. Event becomes visible to volunteers in /events
```

### Example 4: Access Denial

```
1. Volunteer tries direct URL to admin.html
2. admin.js loads
3. protectDashboard('admin') executes
4. getCurrentUser() returns role='volunteer'
5. Role !== 'admin' → condition fails
6. Alert shown: "Access denied. This page is for admins only..."
7. redirectByRole() called
8. User redirected to dashboard-volunteer.html
```

---

## Error Handling

### Backend Errors

**401 Unauthorized** - No token or invalid token
```json
{
  "message": "Unauthorized: Missing Bearer token."
}
```

**403 Forbidden** - Valid token but insufficient role
```json
{
  "message": "Access denied. This action requires one of these roles: admin. Your role: volunteer"
}
```

**404 Not Found** - Resource doesn't exist
```json
{
  "message": "User not found."
}
```

### Frontend Errors

- **Invalid login**: Error message displayed, form remains
- **Access denied**: Alert popup + auto-redirect to correct dashboard
- **API failure**: Alert with error message + user can retry
- **Session expired**: Auto-redirect to login page

---

## Role Comparison Table

| Feature | Volunteer | NGO | Admin |
|---------|-----------|-----|-------|
| Browse Events | ✓ | ✓ | ✓ |
| Apply for Events | ✓ | ✗ | ✗ |
| Create Events | ✗ | ✓ | ✓ |
| Edit Own Events | ✗ | ✓ | ✓ |
| Approve Events | ✗ | ✗ | ✓ |
| View Applicants | ✗ | ✓ (own) | ✓ (all) |
| View All Users | ✗ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✓ |
| Gamification Stats | ✓ | ✗ | ✗ |
| Platform Stats | ✗ | ✗ | ✓ |

---

## Testing the System

### Demo Accounts

```
1. Volunteer:
   Email: vol@vh.com
   Password: 123456
   
2. NGO:
   Email: ngo@vh.com
   Password: 123456
   
3. Admin:
   Email: admin@vh.com
   Password: 123456
```

### Test Scenarios

1. **Login as Volunteer**:
   - Verify redirected to dashboard-volunteer.html
   - Verify navbar shows "My Dashboard"
   - Try accessing /admin.html directly → should redirect

2. **Login as NGO**:
   - Create event via form
   - Verify event appears in "Your Events"
   - Verify event is in "pending" status
   - Logout and login as admin
   
3. **Login as Admin**:
   - Verify event appears in "Pending Events"
   - Click "Approve" button
   - Logout and login as volunteer
   - Verify event now appears in browsable events

4. **Security Test**:
   - Login as volunteer
   - Direct URL to admin.html
   - Verify access denied + redirect

---

## Development Notes

### Adding New Role-Protected Route

1. **Backend** (`src/routes/newroute.js`):
```javascript
const { requireRoles } = require('../middleware/authMiddleware');

router.post('/protected', 
  verifyFirebaseToken,
  requireRoles('ngo', 'admin'),  // ← Specify allowed roles
  handler
);
```

2. **Frontend** (`js/page.js`):
```javascript
document.addEventListener('DOMContentLoaded', () => {
  protectDashboard('ngo');  // ← Require ngo role
  // Page code...
});
```

---

## Troubleshooting

**Issue**: User can access pages they shouldn't
**Solution**: Check `protectDashboard()` call is in JS file. Ensure role names match (case-sensitive).

**Issue**: API returns 403 Forbidden
**Solution**: Verify token was sent in Authorization header. Check user role in MongoDB matches expected role.

**Issue**: Role doesn't load after login
**Solution**: Ensure `setCurrentUser(user)` is called after login. Check localStorage KEYS.session.

---

## File Structure

```
frontend/
├── dashboard-volunteer.html    (Volunteer Dashboard)
├── dashboard-ngo.html          (NGO Dashboard)
├── admin.html                  (Admin Dashboard)
├── js/
│   ├── common.js               (Auth + Shared Functions)
│   ├── dashboard-volunteer.js  (Volunteer Logic)
│   ├── dashboard-ngo.js        (NGO Logic)
│   └── admin.js                (Admin Logic)

backend/
├── src/
│   ├── middleware/
│   │   ├── authMiddleware.js   (Token verification)
│   │   └── roleMiddleware.js   (Role-based access)
│   ├── routes/
│   │   ├── eventRoutes.js
│   │   ├── applicationRoutes.js
│   │   ├── adminRoutes.js
│   │   └── userRoutes.js
│   └── controllers/
│       ├── eventController.js
│       ├── applicationController.js
│       └── adminController.js
```

---

**Last Updated**: April 14, 2026
**Version**: 1.0.0
