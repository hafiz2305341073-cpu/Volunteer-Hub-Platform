# Role-Based Dashboard System - Architecture Overview

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER LOGIN FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────┐
│  Login Page    │
│ (login.html)   │
└────────┬───────┘
         │
         │ Email + Password
         ▼
┌─────────────────────────────────────────────────┐
│  BACKEND: Authentication                        │
├─────────────────────────────────────────────────┤
│ 1. Verify credentials in MongoDB                │
│ 2. If valid → Generate Firebase JWT token       │
│ 3. Return: { id, email, role, token }          │
│                                                  │
│ role ∈ { 'volunteer', 'ngo', 'admin' }         │
└────────────┬────────────────────────────────────┘
             │
             │ Returns user object with role
             ▼
┌──────────────────────────────────────────────────────┐
│  FRONTEND: Session Management (common.js)            │
├──────────────────────────────────────────────────────┤
│ saveSession(user)                                    │
│   → localStorage['session'] = {                      │
│       user: { id, email, name, role },              │
│       token: "firebase_jwt_token"                   │
│     }                                                │
│                                                      │
│ getCurrentUser()                                     │
│   → Returns user object from localStorage            │
│                                                      │
│ role = user.role  (volunteer|ngo|admin)            │
└────────┬───────────────────────────────────────────┘
         │
         │ Role determines navigation
         ▼
     BY ROLE
         │
    ┌────┼────┬─────────┐
    │    │    │         │
    ▼    ▼    ▼         ▼
┌──────────┐┌──────────┐┌──────────┐
│VOLUNTEER ││   NGO    ││  ADMIN   │
└──────────┘└──────────┘└──────────┘
    │          │          │
    ▼          ▼          ▼
 REDIRECT     REDIRECT   REDIRECT
    │          │          │
    ▼          ▼          ▼
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND PROTECTION (Layer 1)          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Dashboard Page                                           │
│ ├─ dashboard-volunteer.html                             │
│ │  └─ DOMContentLoaded → protectDashboard('volunteer')  │
│ │     ├─ Get user from localStorage                     │
│ │     ├─ Check: user.role === 'volunteer'              │
│ │     ├─ YES → Load page, renderNavbar()                │
│ │     └─ NO → Alert "Access denied" + redirect          │
│ │                                                        │
│ ├─ dashboard-ngo.html                                   │
│ │  └─ DOMContentLoaded → protectDashboard('ngo')        │
│ │     ├─ Check: user.role === 'ngo'                     │
│ │     └─ Same flow as above                             │
│ │                                                        │
│ └─ admin.html                                           │
│    └─ DOMContentLoaded → protectDashboard('admin')      │
│       └─ Check: user.role === 'admin'                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         │ User navigates normally
         │ (dashboard-volunteer.html, events.html, etc.)
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│                Role-Specific Navbar                      │
│            (renderNavbar() in common.js)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ VOLUNTEER NAVBAR:                                       │
│  [Home] [Events] [My Dashboard] [Logout]               │
│                                                          │
│ NGO NAVBAR:                                             │
│  [Home] [Events] [Manage Events] [Organization Panel ]  │
│  [Logout]                                               │
│                                                          │
│ ADMIN NAVBAR:                                           │
│  [Home] [Events] [Admin Panel] [All Events] [Logout]   │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         │ User clicks link → API call needed
         ▼
┌──────────────────────────────────────────────────────────┐
│         FRONTEND API CALL WITH TOKEN                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Example: Create Event (NGO only)                        │
│                                                          │
│ fetch('/api/events', {                                  │
│   method: 'POST',                                       │
│   headers: {                                            │
│     'Authorization': `Bearer ${token}`,   ← Token      │
│     'Content-Type': 'application/json'                 │
│   },                                                    │
│   body: JSON.stringify(eventData)                      │
│ })                                                      │
│                                                          │
└────────────────┬──────────────────────────────────────┘
                 │
                 │ Authorization: Bearer <token>
                 │
                 ▼
┌──────────────────────────────────────────────────────────┐
│       BACKEND PROTECTION (Layer 2 - Express Route)      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Route Definition:                                       │
│                                                          │
│ router.post('/events',                                  │
│   requireRoles('ngo', 'admin'),  ← Middleware          │
│   createEvent                     ← Controller          │
│ )                                                       │
│                                                          │
│ Middleware Flow:                                        │
│ 1. Extract token from Authorization header              │
│ 2. Verify token validity (JWT signature, expiration)    │
│ 3. Decode token → Get user ID                          │
│ 4. Query MongoDB: Find user document                    │
│ 5. Check: user.role ∈ ['ngo', 'admin']                │
│                                                          │
│    ✅ YES → req.user = user → Call next()              │
│    ❌ NO  → Return 403 Forbidden                        │
│             { error: "Insufficient permissions" }      │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         ├─ ✅ 200 OK → Event created
         │
         └─ ❌ 403 Forbidden → Show error to user


┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA ISOLATION BY ROLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

VOLUNTEER:
┌─ GET /api/events           → All events visible
├─ GET /api/events/:id       → Event details + applicant count
├─ POST /api/events/:id/apply → Apply to event
├─ GET /api/applications     → Own applications only
└─ CANNOT:
  ├─ POST /api/events        (403 Forbidden - requires ngo role)
  ├─ POST /api/admin/*       (403 Forbidden - requires admin role)
  └─ PATCH /api/events/:id   (403 Forbidden)

NGO:
┌─ GET /api/events           → All events + own flagged
├─ GET /api/events/ngo/my-events → Only NGO's created events
├─ POST /api/events          → Create new event (ownership auto-set)
├─ PATCH /api/events/:id     → Update own events only
├─ GET /api/events/:id/applicants → Applicants for own events
└─ CANNOT:
  ├─ POST /api/events/:id/approve (403 Forbidden - requires admin role)
  ├─ POST /api/admin/*       (403 Forbidden - requires admin role)
  └─ DELETE /api/events/:id  (403 Forbidden - other NGO's event)

ADMIN:
┌─ GET /api/events           → All events
├─ GET /api/events/ngo/my-events → Only returned for admin view
├─ GET /api/admin/events     → All events with approval status
├─ GET /api/admin/users      → All users grouped by role
├─ PATCH /api/admin/events/:id/approve → Approve/reject events
├─ DELETE /api/users/:id     → Remove users
└─ Can access all endpoints with role 'admin' requirement


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                       │
└─────────────────────────────────────────────────────────────────────────────┘

LAYER 1: FRONTEND CHECK
├─ protectDashboard(requiredRole)
│  ├─ Check localStorage for user + role
│  ├─ Compare user.role === requiredRole
│  ├─ If match → Render page
│  ├─ If mismatch → Alert + Redirect
│  └─ Protection: Prevents UI access, user can't navigate
├─ renderNavbar(role)
│  ├─ Show only role-appropriate links
│  └─ Volunteer won't see "Create Event" link
└─ Session validation
   ├─ Check token in localStorage
   └─ Basic client-side check

       ↓ (Bypasses with developer console - NOT trusted)

LAYER 2: BACKEND VERIFICATION (ACTUAL SECURITY)
├─ requireRoles('role1', 'role2', ...)
│  ├─ Extract token from Authorization header
│  ├─ Verify token signature (Firebase)
│  ├─ Check token expiration
│  ├─ Decode token → Get user ID
│  ├─ Query MongoDB: db.users.findById(userId)
│  ├─ Get user.role from database
│  ├─ Compare: user.role ∈ requiredRoles
│  ├─ YES → All good, process request
│  └─ NO  → Return 403 Forbidden immediately
├─ Owner verification (for updates)
│  ├─ Check createdBy field = req.user.id
│  └─ Prevents NGO from editing other NGO's events
└─ This layer CANNOT be bypassed


┌─────────────────────────────────────────────────────────────────────────────┐
│                    REQUEST-RESPONSE CYCLE EXAMPLE                           │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO: Volunteer tries to create an event (will fail)

① FRONTEND
   ├─ Volunteer logged in: user.role = 'volunteer'
   ├─ Token in localStorage: 'firebase_jwt_token'
   ├─ Navbar doesn't show "Create Event" (renderNavbar hides it)
   ├─ But dev opens console and makes manual API call:
   │  fetch('/api/events', {
   │    method: 'POST',
   │    headers: {
   │      'Authorization': 'Bearer firebase_jwt_token',
   │      'Content-Type': 'application/json'
   │    },
   │    body: JSON.stringify({title: "Test Event", ...})
   │  })
   └─ Request sent to server

② NETWORK
   └─ POST /api/events
      ├─ Headers: Authorization: Bearer firebase_jwt_token
      ├─ Body: {title: "Test Event", location: {...}, ...}
      └─ Destination: backend/src/routes/eventRoutes.js

③ BACKEND ROUTE HANDLER
   ├─ Router receives: POST /events
   ├─ Middleware queue: requireRoles('ngo', 'admin')
   │   ├─ MIDDLEWARE EXECUTES
   │   ├─ 1. Extract token: firebase_jwt_token
   │   ├─ 2. Verify: Firebase verifies signature ✅
   │   ├─ 3. Decode: {
   │   │     sub: 'volunteer_user_id',
   │   │     email: 'vol@vh.com',
   │   │     ...
   │   │   }
   │   ├─ 4. Query DB: db.users.findById('volunteer_user_id')
   │   │     Result: { _id, email, name, role: 'volunteer' }
   │   ├─ 5. Check: 'volunteer' ∈ ['ngo', 'admin'] → FALSE
   │   ├─ ❌ DENY ACCESS
   │   ├─ Return: 403 Forbidden
   │   └─ Response: {
   │       status: 403,
   │       error: "Insufficient permissions",
   │       required: "ngo, admin",
   │       current: "volunteer"
   │     }
   └─ createEvent() controller is NEVER called

④ RESPONSE TO FRONTEND
   ├─ Status: 403 Forbidden
   ├─ Body: { error: "Insufficient permissions", ... }
   └─ Frontend MUST handle this error

⑤ FRONTEND ERROR HANDLING
   ├─ Check response status
   ├─ If 403: Show "You don't have permission to create events"
   ├─ Suggest: "NGO accounts can create events"
   └─ User informed: Cannot create event


┌─────────────────────────────────────────────────────────────────────────────┐
│                        FILE DEPENDENCY GRAPH                                 │
└─────────────────────────────────────────────────────────────────────────────┘

HTML Pages (depend on JS)
│
├─ dashboard-volunteer.html
│  └─ depends on: js/common.js → protectDashboard('volunteer')
│                dashboard-volunteer.js → renderEvents(), etc.
│
├─ dashboard-ngo.html
│  └─ depends on: js/common.js → protectDashboard('ngo')
│                dashboard-ngo.js → renderForm(), renderEvents(), etc.
│
├─ admin.html
│  └─ depends on: js/common.js → protectDashboard('admin')
│                admin.js → renderUsers(), renderEvents(), etc.
│
└─ events.html
   └─ depends on: js/common.js → renderNavbar()
                 events.js → renderEventsList()


Backend API Routes (depend on middleware)
│
├─ eventRoutes.js
│  ├─ GET /events                    (public - no middleware)
│  ├─ GET /events/ngo/my-events      (depends on: requireRoles('ngo'))
│  ├─ POST /events                   (depends on: requireRoles('ngo', 'admin'))
│  └─ PATCH /events/:id              (depends on: requireRoles('ngo', 'admin'))
│
├─ adminRoutes.js
│  ├─ GET /admin/users               (depends on: requireRoles('admin'))
│  ├─ GET /admin/events              (depends on: requireRoles('admin'))
│  └─ PATCH /admin/events/:id        (depends on: requireRoles('admin'))
│
└─ applicationRoutes.js
   ├─ POST /applications/:eventId    (depends on: requireRoles('volunteer'))
   └─ GET /applications/my           (depends on: requireRoles('volunteer'))


Middleware Stack:
│
├─ authMiddleware.js
│  ├─ requireRoles(roles...)         (used by all protected routes)
│  └─ verifyFirebaseToken()          (used in requireRoles)
│
└─ roleMiddleware.js
   ├─ checkRole(roles)               (factory function)
   ├─ isVolunteer                    (shorthand)
   ├─ isNGO                          (shorthand)
   ├─ isAdmin                        (shorthand)
   └─ isAuthenticated                (just token check, no role)


┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROLE MATRIX TABLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                   VOLUNTEER          NGO                ADMIN
────────────────────────────────────────────────────────────────────────────────
Dashboard Page:    volunteer-dash    ngo-dash           admin.html
Access Type:       protectDashboard  protectDashboard   protectDashboard

View all events:   ✅ YES            ✅ YES             ✅ YES
View own events:   N/A               ✅ YES             N/A
Create event:      ❌ 403            ✅ YES             ❌ NO
Approve events:    ❌ 403            ❌ 403             ✅ YES
Manage users:      ❌ 403            ❌ 403             ✅ YES
View applicants:   ❌ 403            ✅ Own only        ✅ All
Apply for event:   ✅ YES            ❌ NO              ❌ NO
Manage account:    ✅ Own only       ✅ Own only        ✅ All

API Endpoints:
GET /events:       ✅ 200            ✅ 200             ✅ 200
POST /events:      ❌ 403            ✅ 201             ✅ 201
GET /admin/*:      ❌ 403            ❌ 403             ✅ 200
POST /apply:       ✅ 201            ❌ 403             ❌ 403
GET /applications: ✅ Own only       ❌ 403             ✅ All
```

---

## 📌 Key Points

1. **Two-Layer Security**: Frontend UX protection + Backend API protection
2. **Database Validation**: Role always verified against MongoDB, not frontend
3. **Role Isolation**: Each role sees different data and has different permissions
4. **Token Verification**: Every API request requires valid Firebase JWT
5. **Frontend Fallback**: localStorage as backup, but backend is authoritative

---

For detailed implementation, see [ROLE_BASED_SYSTEM.md](ROLE_BASED_SYSTEM.md)
