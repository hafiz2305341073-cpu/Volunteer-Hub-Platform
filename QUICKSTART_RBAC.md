# Role-Based Dashboard System - Quick Reference

## 🚀 Quick Start

### 1. **Demo Accounts**
```
Volunteer:  vol@vh.com      / 123456
NGO:        ngo@vh.com      / 123456
Admin:      admin@vh.com    / 123456
```

### 2. **Database Models**

**User Document** (MongoDB):
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  name: "User Name",
  role: "volunteer" | "ngo" | "admin",  // ← Used by roleMiddleware
  password: "hashed",
  createdAt: Date
}
```

**Event Document**:
```javascript
{
  _id: ObjectId,
  title: "Event Name",
  description: "...",
  createdBy: userId,  // ← NGO can only see own events
  status: "pending" | "approved" | "rejected",
  applicants: [userId, ...],
  date: Date,
  location: { city: "...", ... }
}
```

---

## 📊 Role Comparison

| Feature | Volunteer | NGO | Admin |
|---------|-----------|-----|-------|
| **Dashboard** | `/dashboard-volunteer.html` | `/dashboard-ngo.html` | `/admin.html` |
| **View Events** | ✅ All | ✅ All + own | ✅ All |
| **Create Event** | ❌ | ✅ | ❌ |
| **Approve Events** | ❌ | ❌ | ✅ |
| **Apply for Event** | ✅ | ❌ | ❌ |
| **View Applicants** | ❌ | ✅ own only | ✅ All |
| **Manage Users** | ❌ | ❌ | ✅ |
| **API Protection** | None | `requireRoles('ngo')` | `requireRoles('admin')` |

---

## 🔐 Security Architecture

### **Front-End (Layer 1: UX Protection)**
**File**: `frontend/js/common.js`

```javascript
// 1. Check if user is logged in
protectDashboard('ngo');  // Validates role before page loads
// Result: Redirect if wrong role + show alert

// 2. Build navigation based on role
renderNavbar(activeTab);  // Shows role-specific links
// Volunteer: Events, My Dashboard
// NGO: Create Event, My Events
// Admin: Admin Panel, All Events

// 3. Generic login check (public pages)
requireLogin();  // Prevents page access if not logged in
```

### **Back-End (Layer 2: API Protection)**
**File**: `backend/src/middleware/roleMiddleware.js`

```javascript
// Apply to protected routes
app.post('/api/events', requireRoles('ngo'), createEvent);
app.get('/api/admin/users', requireRoles('admin'), listUsers);

// How it works:
// 1. Extract token from Authorization header
// 2. Verify token validity
// 3. Query MongoDB: Find user by ID, check role field
// 4. Compare: role in database vs allowed roles
// 5. Result: ✅ Allow OR ❌ Reject with 403 Forbidden
```

---

## 🛠️ Implementation Files

### **Backend**

**1. Middleware (Role Checking)**
```
backend/src/middleware/roleMiddleware.js
├── checkRole(allowedRoles)      → Factory function
├── isVolunteer                  → Middleware for volunteer-only
├── isNGO                        → Middleware for ngo-only
├── isAdmin                      → Middleware for admin-only
├── isVolunteerOrNGO             → Middleware for multiple roles
└── isAuthenticated              → Basic login check
```

**2. Protected Routes**
```
eventRoutes.js:
├── GET /events                  → Public (all users)
├── GET /events/ngo/my-events    → Protected: requireRoles('ngo')
├── POST /events                 → Protected: requireRoles('ngo', 'admin')
├── PATCH /events/:id            → Protected: requireRoles('ngo', 'admin')
└── DELETE /events/:id           → Protected: requireRoles('ngo', 'admin')

adminRoutes.js:
├── GET /admin/users             → Protected: requireRoles('admin')
├── GET /admin/events            → Protected: requireRoles('admin')
└── PATCH /admin/events/:id/approve → Protected: requireRoles('admin')

applicationRoutes.js:
├── POST /applications/:eventId  → Protected: requireRoles('volunteer')
└── GET /applications/my         → Protected: requireRoles('volunteer')
```

### **Frontend**

**1. Authentication & Session** (`common.js`)
```
Session Storage (localStorage):
├── session.user                 → Current logged-in user object
├── session.role                 → User's role (volunteer|ngo|admin)
├── session.token                → Firebase JWT token
├── events.list                  → Cached events
└── applications.list            → Cached applications
```

**2. Dashboard Pages** (Protected)
```
dashboard-volunteer.html         → protectDashboard('volunteer')
├── Event List
├── Event Details Modal
├── Application Form
└── My Applications

dashboard-ngo.html               → protectDashboard('ngo')
├── Create Event Form
├── My Events List
├── Applicants List
└── Manage Event Modal

admin.html                        → protectDashboard('admin')
├── Users List (grouped by role)
├── All Events (pending + approved)
├── Event Approve/Reject Buttons
└── Statistics
```

---

## 🔄 User Flow Examples

### **Scenario 1: Volunteer Login & Browse**
```
1. User logs in: vol@vh.com / 123456
2. Backend returns: { id, email, role: 'volunteer', token }
3. Frontend saves to localStorage
4. redirectByRole() → Check role → Navigate to /dashboard-volunteer.html
5. Dashboard loads → protectDashboard('volunteer') → ✅ Matches → Page renders
6. Navbar shows: Home, Events, My Dashboard, Logout
7. User can: View events, Apply, See applications
8. User CANNOT: Create events, Approve events
```

### **Scenario 2: NGO Create Event & Manage**
```
1. User logs in: ngo@vh.com / 123456
2. Frontend saves role: 'ngo'
3. redirectByRole() → Navigate to /dashboard-ngo.html
4. Navbar shows: Home, Create Event, My Events, Logout
5. User fills event form → POST /api/events
6. Backend middleware: requireRoles('ngo') 
   → Checks DB: role='ngo' ✅ → Event created
7. Event appears in: "My Events" tab
8. NGO can: See applicants, Accept/Reject volunteers
9. NGO CANNOT: Approve events for platform, See other NGO's events
```

### **Scenario 3: Admin Approve Event**
```
1. User logs in: admin@vh.com / 123456
2. Frontend saves role: 'admin'
3. Redirects to /admin.html
4. Navbar shows: Home, Events, Admin Panel, All Events
5. Admin sees: ALL pending events across ALL NGOs
6. Clicks "Approve" → PATCH /api/admin/events/:id/approve
7. Backend: requireRoles('admin') → DB check ✅ → Event approved
8. Event now visible to volunteers
9. Admin can: Manage all users, View all events, Approve/Reject globally
```

### **Scenario 4: Failed Access Attempt**
```
1. Volunteer logged in locally
2. User manually types: /admin.html in URL
3. protectDashboard('admin') executes:
   → Gets current user from session
   → Checks: user.role !== 'admin'
   → Shows alert: "Admin access required. Redirecting..."
   → Calls redirectByRole() → Redirects to /dashboard-volunteer.html
4. Volunteer cannot access admin panel
```

---

## 🛡️ Security Checklist

- [x] **Frontend validation** → `protectDashboard()` checks role before page loads
- [x] **Backend verification** → `requireRoles()` middleware validates role on every request
- [x] **Database storage** → Role stored in MongoDB, not just frontend
- [x] **Token validation** → Firebase token verified before role check
- [x] **Forbidden response** → API returns `403 Forbidden` for wrong role
- [x] **Role isolation** → Each role sees only appropriate data
- [x] **Navigation isolation** → Navbar shows role-specific links
- [x] **Page isolation** → Dashboard pages require exact role match
- [x] **Session fallback** → If backend fails, frontend protects with localStorage role

---

## 🧪 Testing Commands

### **Test 1: Volunteer Cannot Create Event**
```bash
# Get volunteer user ID (UUID from DB)
VOLUNTEER_ID="xxxxx"
TOKEN="volunteer_token"

# Try to create event
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "date": "2025-01-01"}'

# Expected: 403 Forbidden
#   Message: "Insufficient permissions. Required role: ngo, admin"
```

### **Test 2: NGO Can Create Event**
```bash
NGO_TOKEN="ngo_token"

curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer $NGO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Beach Cleanup", "date": "2025-01-15", "location": {"city": "SF"}}'

# Expected: 201 Created
#   Response: { _id, title, createdBy, status: "pending" }
```

### **Test 3: Admin Can See All Events**
```bash
ADMIN_TOKEN="admin_token"

curl -X GET http://localhost:5000/api/admin/events \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected: 200 OK
#   Response: Array of ALL events (pending + approved)
```

### **Test 4: Volunteer Auto-Redirect**
```bash
# 1. Login as volunteer
# 2. Try to access /dashboard-ngo.html
# Result: Should redirect to /dashboard-volunteer.html

# 3. Try to access /admin.html
# Result: Should redirect to /dashboard-volunteer.html

# 4. Other roles same pattern
```

---

## 📚 File Structure Reference

```
f:\Project\
├── frontend/
│   ├── index.html                    (Public landing, calls renderNavbar)
│   ├── login.html                    (Login form)
│   ├── register.html                 (Registration form)
│   ├── events.html                   (Browse all events)
│   ├── dashboard-volunteer.html       (⭐ Protected: volunteer)
│   ├── dashboard-ngo.html             (⭐ Protected: ngo)
│   ├── admin.html                     (⭐ Protected: admin)
│   ├── event-details.html             (Event detail view)
│   ├── style.css                      (Global styling)
│   └── js/
│       ├── common.js                  (Auth functions, navBar, protectDashboard)
│       ├── index.js                   (Landing page logic)
│       ├── auth.js                    (Login/Register logic)
│       ├── events.js                  (Browse events logic)
│       ├── dashboard-volunteer.js     (Volunteer dashboard + protection)
│       ├── dashboard-ngo.js           (NGO dashboard + protection)
│       ├── admin.js                   (Admin panel + protection)
│       └── event-details.js           (Event detail view)
│
├── backend/
│   ├── server.js                      (Express app setup)
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js      (Token verification + requireRoles)
│   │   │   └── roleMiddleware.js      (⭐ Role-based access control)
│   │   ├── routes/
│   │   │   ├── eventRoutes.js         (Protected event endpoints)
│   │   │   ├── adminRoutes.js         (Protected admin endpoints)
│   │   │   ├── applicationRoutes.js   (Protected application endpoints)
│   │   │   └── userRoutes.js          (User endpoints)
│   │   ├── controllers/
│   │   │   └── userController.js      (User DB operations)
│   │   └── models/
│   │       └── User.js                (User schema with role field)
│   └── package.json
│
├── ROLE_BASED_SYSTEM.md               (Detailed RBAC documentation)
└── QUICKSTART_RBAC.md                 (This file - Quick reference)
```

---

## 🔧 Common Issues & Solutions

### **Issue: Frontend allows access but API returns 403**
```
Solution: 
- Frontend protects page → Correct ✅
- Backend rejects API call → Correct ✅
- This means role mismatch in backend DB

Debug:
1. Check user.role in MongoDB
2. Verify middleware is applied to route
3. Check requireRoles() function in authMiddleware.js
```

### **Issue: Session expires, user still sees dashboard**
```
Solution:
- localStorage shows outdated role
- Real user session expired in backend

Debug:
1. Add session expiration check in protectDashboard()
2. Verify token validity before page load
3. Add logout on 401/403 response from API
```

### **Issue: Volunteer sees NGO's events**
```
Solution:
- API should filter events by createdBy field
- Backend should return only user's own events

Debug:
1. In /events/ngo/my-events route
2. Add filter: { createdBy: req.user.id }
3. Test with different NGO accounts
```

### **Issue: Navbar doesn't update after role change**
```
Solution:
- renderNavbar() only runs on page load
- Switch roles without full page reload → navbar stale

Debug:
1. Add navbar refresh after login
2. Call renderNavbar() in login success handler
3. Or add event listener to storage changes
```

---

## 📝 Troubleshooting Workflow

**1. User can't access dashboard**
```
Check order:
1. Is user logged in? → Check localStorage.session
2. Is login token valid? → Try re-login
3. Does role match dashboard? → Check user.role
4. Is protectDashboard() blocking? → Check console
5. Is backend session valid? → Try API call
```

**2. API returns 403 Forbidden**
```
Check order:
1. Does token exist? → Check Authorization header
2. Is token valid? → Verify expiration
3. Is user in DB? → Check MongoDB collections
4. Does user.role match required role? → Check requireRoles() middleware
5. Is middleware applied to route? → Check route definition
```

**3. Role-based data not filtering**
```
Check order:
1. Does query filter by role? → Check controller logic
2. Does filter field exist? → Check MongoDB schema
3. Are results cached? → Check localStorage clear
4. Is API returning wrong data? → Verify backend logic with same user ID
```

---

## 🚦 Next Steps

1. **Test all three roles** → Login, navigate, verify access
2. **Test API protection** → Make requests as wrong role
3. **Test page access** → Try accessing wrong dashboard
4. **Test navigation** → Verify navbar updates per role
5. **Test logout** → Clear session, verify redirect to login
6. **Test concurrent sessions** → Same user in multiple tabs
7. **Performance** → Check middleware overhead
8. **Error handling** → Test expired tokens, missing roles

---

**For detailed documentation, see**: [ROLE_BASED_SYSTEM.md](ROLE_BASED_SYSTEM.md)

**Questions?** Check the Troubleshooting section above or review the ROLE_BASED_SYSTEM.md implementation details.
