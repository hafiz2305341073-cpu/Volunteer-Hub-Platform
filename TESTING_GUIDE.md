# Testing & Verification Guide - Role-Based Dashboard System

## 🎯 Testing Overview

This guide walks you through systematic testing of the Role-Based Access Control (RBAC) system. All tests can be performed in a browser console and with curl commands.

---

## 🧪 Test Setup

### Prerequisites
- Backend server running: `npm start` (port 5000)
- Frontend hosted: Open `index.html` in browser
- MongoDB populated with:
  - User: `vol@vh.com`, role: `volunteer`
  - User: `ngo@vh.com`, role: `ngo`
  - User: `admin@vh.com`, role: `admin`

### Test Tools
```javascript
// In browser console:
// Get current user
getCurrentUser()

// Get all events
getEvents()

// Get session token
localStorage.getItem('session')

// Check navbar (logged in)
renderNavbar('active-tab')
```

---

## 📋 Test Suite 1: Frontend Authentication & Navigation

### Test 1.1: Login as Volunteer
**Steps:**
1. Open `index.html`
2. Click "Login"
3. Enter: `vol@vh.com` / `123456`
4. Click "Login"

**Expected Results:**
```javascript
// After login:
getCurrentUser()
// {
//   id: "vol_user_id",
//   email: "vol@vh.com",
//   name: "John Volunteer",
//   role: "volunteer"        ← KEY: role must be 'volunteer'
// }

// Navbar shows:
// [Home] [Events] [My Dashboard] [Logout]
// (NOT "Create Event" button)

// Page redirects to: dashboard-volunteer.html

// URL changes to: /dashboard-volunteer.html
```

**Pass/Fail**: ✅ PASS if redirected to volunteer dashboard with correct navbar

---

### Test 1.2: Login as NGO
**Steps:**
1. Logout first
2. Open login page
3. Enter: `ngo@vh.com` / `123456`
4. Click "Login"

**Expected Results:**
```javascript
getCurrentUser()
// { role: "ngo" }  ← Different from volunteer

// Navbar shows:
// [Home] [Events] [Manage Events] [Organization Panel] [Logout]

// Page redirects to: dashboard-ngo.html
```

**Pass/Fail**: ✅ PASS if redirected to NGO dashboard with different navbar

---

### Test 1.3: Login as Admin
**Steps:**
1. Logout first
2. Login with: `admin@vh.com` / `123456`

**Expected Results:**
```javascript
getCurrentUser()
// { role: "admin" }

// Navbar shows:
// [Home] [Events] [Admin Panel] [All Events] [Logout]

// Page redirects to: admin.html

// Admin page shows:
// - List of users grouped by role (Volunteers, NGOs, Admins)
// - All events with Approve/Reject buttons for pending
```

**Pass/Fail**: ✅ PASS if redirected to admin.html with user management UI

---

### Test 1.4: Navbar Consistency After Navigation
**Prerequisites**: Logged in as volunteer

**Steps:**
1. Click "Events" in navbar
2. Click "My Dashboard" in navbar
3. Click home in navbar

**Expected Results:**
```javascript
// After each navigation:
// Navbar should still show volunteer-specific links
// renderNavbar() called on each page
// Should never show NGO/Admin-only links
```

**Pass/Fail**: ✅ PASS if navbar remains consistent across pages

---

## 📋 Test Suite 2: Frontend Access Control (protectDashboard)

### Test 2.1: Volunteer Accessing Volunteer Dashboard
**Prerequisites**: Logged in as volunteer

**Steps:**
1. Navigate to: `dashboard-volunteer.html` (via navbar or direct URL)

**Expected Results:**
```javascript
// Page loads successfully
// Events list renders
// "Apply for Event" buttons visible
// No "Create Event" form visible
```

**Pass/Fail**: ✅ PASS if page loads without errors

---

### Test 2.2: Volunteer Trying to Access NGO Dashboard
**Prerequisites**: Logged in as volunteer

**Steps:**
1. Manually type in URL: `dashboard-ngo.html`
2. Press Enter

**Expected Results:**
```javascript
// Alert appears: "NGO access required. Redirecting to your dashboard..."
// Browser redirects to: dashboard-volunteer.html
// Stays on volunteer page

// Console shows (from protectDashboard):
// User role 'volunteer' does not match required role 'ngo'
```

**Pass/Fail**: ✅ PASS if alert shown + redirect works

---

### Test 2.3: Volunteer Trying to Access Admin Panel
**Prerequisites**: Logged in as volunteer

**Steps:**
1. Type URL: `admin.html`

**Expected Results:**
```javascript
// Alert: "Admin access required. Redirecting to your dashboard..."
// Redirect to: dashboard-volunteer.html
```

**Pass/Fail**: ✅ PASS if protection works

---

### Test 2.4: NGO Trying to Access Admin Panel
**Prerequisites**: Logged in as NGO

**Steps:**
1. Navigate to: `admin.html`

**Expected Results:**
```javascript
// Alert: "Admin access required. Redirecting to your dashboard..."
// Redirect to: dashboard-ngo.html
// (NOT to volunteer dashboard)
```

**Pass/Fail**: ✅ PASS if redirects to correct NGO dashboard

---

### Test 2.5: Admin Accessing All Dashboards
**Prerequisites**: Logged in as admin

**Steps:**
1. Visit: `dashboard-volunteer.html`
2. Visit: `dashboard-ngo.html`
3. Visit: `admin.html`

**Expected Results:**
```javascript
// Admin can access admin.html normally
// But what about volunteer/ngo dashboards?
// Expected: Should still redirect to admin.html
// (Admin doesn't "play as" volunteer/ngo)
```

**Pass/Fail**: ⚠️ DEPENDS on business logic (are admins meant to see other dashboards?)

---

### Test 2.6: Logged Out User Access
**Prerequisites**: User must be logged out

**Steps:**
1. Clear localStorage: `localStorage.clear()`
2. Try to access: `dashboard-volunteer.html`

**Expected Results:**
```javascript
// Alert: "You must be logged in to access this page"
// Redirect to: login.html
// localStorage.getItem('session') → null
```

**Pass/Fail**: ✅ PASS if redirects to login

---

## 📋 Test Suite 3: Backend API Protection (requireRoles Middleware)

### Test 3.1: Volunteer Create Event (Should FAIL)
**Prerequisites**: Get volunteer token from login

**Steps:**
```bash
# Get token from browser console after login
TOKEN="volunteer_firebase_jwt_token"

# Try to create event
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Volunteer Event Test",
    "description": "Testing volunteer creation",
    "date": "2025-02-01",
    "location": {"city": "San Francisco"}
  }'
```

**Expected Results:**
```json
Status: 403 Forbidden

Response Body:
{
  "error": "Insufficient permissions",
  "required": "ngo, admin",
  "current": "volunteer"
}
```

**Pass/Fail**: ✅ PASS if receives 403 Forbidden (NOT 200 or 401)

---

### Test 3.2: NGO Create Event (Should SUCCEED)
**Prerequisites**: Get NGO token

**Steps:**
```bash
TOKEN="ngo_firebase_jwt_token"

curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "NGO Event Test",
    "description": "Beach cleanup event",
    "date": "2025-02-15",
    "location": {"city": "San Francisco"},
    "volunteerNeeded": 20
  }'
```

**Expected Results:**
```json
Status: 201 Created

Response Body:
{
  "_id": "event_id_12345",
  "title": "NGO Event Test",
  "createdBy": "ngo_user_id",      ← KEY: ownership set
  "status": "pending",              ← KEY: needs admin approval
  "applicants": []
}
```

**Pass/Fail**: ✅ PASS if event created (201) with correct ownership

---

### Test 3.3: NGO Try Update Other NGO's Event (Should FAIL)
**Prerequisites**: Two NGOs, NGO1 token

**Steps:**
```bash
# NGO2 created an event with _id = "event_ngo2_123"
# NGO1 tries to update it
TOKEN="ngo1_firebase_jwt_token"

curl -X PATCH http://localhost:5000/api/events/event_ngo2_123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hacked Title"
  }'
```

**Expected Results:**
```json
Status: 403 Forbidden  (or 401 Unauthorized)

Response Body:
{
  "error": "You can only update events you created"
}
```

**Pass/Fail**: ✅ PASS if ownership validation works

---

### Test 3.4: Admin Approve Event (Should SUCCEED)
**Prerequisites**: Admin token, pending event ID

**Steps:**
```bash
ADMIN_TOKEN="admin_firebase_jwt_token"
EVENT_ID="pending_event_id"

curl -X PATCH http://localhost:5000/api/admin/events/$EVENT_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

**Expected Results:**
```json
Status: 200 OK

Response Body:
{
  "_id": "event_id",
  "status": "approved",     ← KEY: status changed
  "approvedBy": "admin_id"
}
```

**Pass/Fail**: ✅ PASS if event approved

---

### Test 3.5: Volunteer Approve Event (Should FAIL)
**Prerequisites**: Volunteer token

**Steps:**
```bash
VOL_TOKEN="volunteer_firebase_jwt_token"

curl -X PATCH http://localhost:5000/api/admin/events/any_event_id/approve \
  -H "Authorization: Bearer $VOL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

**Expected Results:**
```json
Status: 403 Forbidden

Response Body:
{
  "error": "Insufficient permissions",
  "required": "admin",
  "current": "volunteer"
}
```

**Pass/Fail**: ✅ PASS if 403 returned

---

### Test 3.6: Invalid Token (Should FAIL)
**Steps:**
```bash
curl -X GET http://localhost:5000/api/admin/events \
  -H "Authorization: Bearer invalid_token_xyz"
```

**Expected Results:**
```json
Status: 401 Unauthorized

Response Body:
{
  "error": "Invalid or expired token"
}
```

**Pass/Fail**: ✅ PASS if 401 returned (NOT 403)

---

### Test 3.7: Missing Token (Should FAIL)
**Steps:**
```bash
curl -X GET http://localhost:5000/api/admin/events
# No Authorization header
```

**Expected Results:**
```json
Status: 401 Unauthorized

Response Body:
{
  "error": "Missing authorization token"
}
```

**Pass/Fail**: ✅ PASS if 401 returned

---

## 📋 Test Suite 4: End-to-End User Workflows

### Test 4.1: Volunteer Event Application Flow
**Steps:**
1. Login as volunteer
2. Navigate to Events page
3. Click "View Details" on an approved event
4. Click "Apply for Event"
5. Submit application form
6. Verify in "My Dashboard" → "My Applications" tab

**Expected Results:**
```javascript
// After applying:
// ✅ Application created in backend
// ✅ Event shows "Applied" status
// ✅ Application appears in volunteer dashboard
// ✅ Frontend shows confirmation message
```

**Pass/Fail**: ✅ PASS if application created successfully

---

### Test 4.2: NGO Event Management Flow
**Steps:**
1. Login as NGO
2. Click "Manage Events" in navbar
3. Click "Create New Event"
4. Fill form: title, date, location, description
5. Submit form
6. Verify event appears in "My Events" tab

**Expected Results:**
```javascript
// Event created:
// ✅ POST /api/events succeeds
// ✅ Event appears in NGO dashboard
// ✅ Status = "pending" (awaiting admin approval)
// ✅ NGO can see applicants tab (if approved)
```

**Pass/Fail**: ✅ PASS if event created and visible

---

### Test 4.3: Admin Event Approval Flow
**Steps:**
1. Login as admin
2. Navigate to Admin Panel
3. Find "Pending Approval" section
4. Click "Approve" on an event
5. Verify event moves to "Approved" section
6. Check that volunteers now see it as available

**Expected Results:**
```javascript
// Event approved:
// ✅ PATCH /api/admin/events/:id succeeds
// ✅ Event status changes to "approved"
// ✅ Event disappears from Pending section
// ✅ Event visible in Approved section
// ✅ Volunteers see it in Events list
```

**Pass/Fail**: ✅ PASS if approval works

---

### Test 4.4: Session Expiration Handling
**Steps:**
1. Login as any role
2. Open browser DevTools → Application/Storage
3. Delete localStorage item `session`
4. Try to access dashboard: `dashboard-volunteer.html`

**Expected Results:**
```javascript
// Page detects missing session:
// ✅ protectDashboard() finds no user
// ✅ Alert: "You must be logged in..."
// ✅ Redirect to: login.html
// ✅ User must re-login
```

**Pass/Fail**: ✅ PASS if properly redirected

---

### Test 4.5: Concurrent Role Switching
**Steps:**
1. Open browser in normal mode (volunteer logged in)
2. Open browser in private/incognito mode
3. Login as admin in private window
4. Return to normal window (still volunteer)
5. Verify volunteer window shows correct role/navbar

**Expected Results:**
```javascript
// Each browser window maintains separate session:
// ✅ Normal window: volunteer navbar/dashboard
// ✅ Private window: admin navbar/dashboard
// ✅ No cross-contamination
// ✅ Each has independent token/session
```

**Pass/Fail**: ✅ PASS if sessions are independent

---

## 📋 Test Suite 5: Role Data Isolation

### Test 5.1: Volunteer Only Sees Own Applications
**Prerequisites**: Logged in as volunteer

**Steps:**
```javascript
// In console:
getApplications()  // or similar function
```

**Expected Results:**
```javascript
// Returns only applications where:
// applicantId === currentUser.id

// Should NOT include:
// - Other volunteers' applications
// - NGO applications
// - Admin applications
```

**Pass/Fail**: ✅ PASS if data is filtered correctly

---

### Test 5.2: NGO Only Sees Own Created Events
**Prerequisites**: Logged in as NGO

**Steps:**
```bash
# Get NGO's events
curl -X GET http://localhost:5000/api/events/ngo/my-events \
  -H "Authorization: Bearer $NGO_TOKEN"
```

**Expected Results:**
```json
Status: 200 OK

Response Body:
{
  "count": 3,
  "events": [
    {
      "_id": "event1",
      "title": "...",
      "createdBy": "ngo_user_id"  ← Only this NGO's events
    },
    {
      "_id": "event2",
      "createdBy": "ngo_user_id"
    },
    {
      "_id": "event3",
      "createdBy": "ngo_user_id"
    }
  ]
}

// Should NOT include events from other NGOs
```

**Pass/Fail**: ✅ PASS if events are filtered by createdBy

---

### Test 5.3: Admin Sees All Events Globally
**Prerequisites**: Logged in as admin

**Steps:**
```bash
curl -X GET http://localhost:5000/api/admin/events \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
```json
Status: 200 OK

Response Body:
{
  "totalEvents": 15,
  "pending": [
    { "_id": "...", "createdBy": "ngo1_id", ... },
    { "_id": "...", "createdBy": "ngo2_id", ... },
    { "_id": "...", "createdBy": "ngo3_id", ... }
  ],
  "approved": [
    // All approved events from all NGOs
  ]
}

// Includes events from ALL NGOs
// Shows creation status and applicants
```

**Pass/Fail**: ✅ PASS if all events shown regardless of creator

---

### Test 5.4: Volunteer Cannot See Other Volunteers' Applications
**Prerequisites**: Two volunteers, logged in as volunteer1

**Steps:**
1. Get volunteer2 ID from admin panel (if admin account available)
2. Try API: `GET /api/applications?userId=volunteer2_id`
3. Check if results are filtered

**Expected Results:**
```javascript
// Option A: API rejects query parameter
// Status: 400 Bad Request
// Message: "Can only view your own applications"

// Option B: API ignores parameter, returns own
// Status: 200 OK
// Returns only volunteer1's applications
// Ignores userId parameter
```

**Pass/Fail**: ✅ PASS if either option (data isolation enforced)

---

## 📋 Test Suite 6: Error Handling

### Test 6.1: Frontend Handles 403 from API
**Prerequisites**: Logged in as volunteer, have valid event ID

**Steps:**
```javascript
// In console, volunteer tries to create event:
const eventData = {
  title: "Test",
  date: "2025-02-01",
  location: { city: "SF" }
};

fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.session.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(eventData)
})
.then(r => r.json())
.then(data => console.log(data))
```

**Expected Results:**
```json
{
  "error": "Insufficient permissions",
  "required": "ngo, admin",
  "current": "volunteer"
}

// Frontend should:
// ✅ Catch the error
// ✅ Show user-friendly message
// ✅ DON'T crash the page
// ✅ Suggest: "Only NGOs can create events"
```

**Pass/Fail**: ✅ PASS if error handled gracefully

---

### Test 6.2: Frontend Handles Wrong Role Alert
**Prerequisites**: Logged in as volunteer

**Steps:**
1. Type URL: `dashboard-ngo.html`
2. Watch for alert
3. Observe redirect

**Expected Results:**
```javascript
// Alert: "You don't have access to NGO Panel. Required role: ngo (Current: volunteer). Redirecting..."
// Click OK
// Auto-redirects to: dashboard-volunteer.html
```

**Pass/Fail**: ✅ PASS if alert appears and redirect works

---

### Test 6.3: Frontend Handles Missing Session
**Prerequisites**: Deleted localStorage

**Steps:**
1. Navigate to: `dashboard-ngo.html`

**Expected Results:**
```javascript
// Alert: "You must be logged in to access this page"
// Redirect to: login.html
// localStorage.session → null
```

**Pass/Fail**: ✅ PASS if redirected to login

---

## 🎯 Summary Table: Expected Test Results

```
Test ID    | Test Name                        | Expected | Pass/Fail
-----------|----------------------------------|----------|----------
1.1        | Volunteer Login Redirect         | volunteer-dash | ?
1.2        | NGO Login Redirect               | ngo-dash | ?
1.3        | Admin Login Redirect             | admin.html | ?
1.4        | Navbar Consistency               | Same navbar | ?
2.1        | Volunteer Access Dashboard       | 200 OK | ?
2.2        | Volunteer Access NGO Dashboard   | Redirect | ?
2.3        | Volunteer Access Admin Panel     | Redirect | ?
2.4        | NGO Access Admin Panel           | Redirect | ?
2.5        | Admin Access All Dashboards      | TBD | ?
2.6        | Logged Out Access Dashboard      | Redirect to login | ?
3.1        | Volunteer Create Event           | 403 Forbidden | ?
3.2        | NGO Create Event                 | 201 Created | ?
3.3        | NGO Update Other's Event         | 403 Forbidden | ?
3.4        | Admin Approve Event              | 200 OK | ?
3.5        | Volunteer Approve Event          | 403 Forbidden | ?
3.6        | Invalid Token                    | 401 Unauthorized | ?
3.7        | Missing Token                    | 401 Unauthorized | ?
4.1        | Volunteer Apply for Event        | Saved | ?
4.2        | NGO Create and Manage Event      | Visible | ?
4.3        | Admin Approve Event              | Status changed | ?
4.4        | Session Expiration               | Redirect | ?
4.5        | Concurrent Sessions              | Isolated | ?
5.1        | Volunteer Data Isolation         | Only own apps | ?
5.2        | NGO Data Isolation               | Only own events | ?
5.3        | Admin Global Visibility          | All data | ?
5.4        | Volunteer Cannot See Others      | Filtered | ?
6.1        | Handle 403 API Response          | Graceful error | ?
6.2        | Handle Wrong Role Alert          | Alert+redirect | ?
6.3        | Handle Missing Session           | Redirect | ?
```

---

## 🚀 Running Tests Efficiently

### Quick Smoke Test (5 minutes)
1. ✅ Test 1.1: Volunteer login
2. ✅ Test 1.2: NGO login  
3. ✅ Test 1.3: Admin login
4. ✅ Test 2.2: Volunteer access NGO dashboard (should fail)
5. ✅ Test 3.1: Volunteer create event API (should fail)

### Full Test Suite (30 minutes)
1. Run all Test Suite 1 (Navigation) → 5 tests
2. Run all Test Suite 2 (Access Control) → 6 tests
3. Run all Test Suite 3 (API Protection) → 7 tests
4. Run Test Suite 4 (Workflows) → Sample 2-3
5. Run Test Suite 5 (Data Isolation) → 4 tests
6. Run Test Suite 6 (Error Handling) → 3 tests

---

## 📝 Reporting Results

After running tests, fill out:

```markdown
## Test Results Report

**Date**: [YYYY-MM-DD]
**Tester**: [Name]
**System**: [Windows/Mac/Linux]

### Summary
- Total Tests: 30
- Passed: ??
- Failed: ??
- Blocked: ??

### Failed Tests
1. Test ID 2.5:
   - Expected: Admin optional access
   - Actual: Admin redirected to admin.html
   - Status: NOT A FAILURE (working as designed)

### Notes
- Overall system appears to be functioning correctly
- All critical access controls working
- Error messages clear and helpful

### Recommendations
1. ...
2. ...
```

---

For questions about test expectations, see [ROLE_BASED_SYSTEM.md](ROLE_BASED_SYSTEM.md) or [QUICKSTART_RBAC.md](QUICKSTART_RBAC.md)
