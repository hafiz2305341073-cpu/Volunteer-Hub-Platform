### VOLUNTEER HUB - Complete Backend API Documentation

---

## 🔹 BASE URL
`http://localhost:5000/api`

---

## 🔹 ARCHITECTURE

### Folder Structure
```
backend/
├── src/
│   ├── models/
│   │   ├── User.js          # User schema (volunteer/ngo/admin)
│   │   ├── Event.js         # Event schema with matching requirements
│   │   ├── Application.js   # Application schema for event applications
│   │   └── Feedback.js      # Feedback schema for user reviews
│   ├── controllers/
│   │   ├── userController.js       # User CRUD + stats + badges
│   │   ├── eventController.js      # Event CRUD + matching logic
│   │   ├── applicationController.js # Apply + status updates + gamification
│   │   ├── adminController.js      # Event approval + dashboard stats
│   │   └── feedbackController.js   # Submit/review feedback
│   ├── routes/
│   │   ├── userRoutes.js           # User endpoints
│   │   ├── eventRoutes.js          # Event endpoints
│   │   ├── applicationRoutes.js    # Application endpoints
│   │   ├── adminRoutes.js          # Admin endpoints
│   │   └── feedbackRoutes.js       # Feedback endpoints
│   ├── middleware/
│   │   ├── authMiddleware.js       # Firebase token verification + RBAC
│   │   └── validationMiddleware.js # Field validation + object ID checks
│   └── config/
│       └── firebaseAdmin.js        # Firebase Admin SDK setup
├── server.js                        # Express app setup + route mounting
└── package.json                     # Dependencies

KEY FEATURES:
✅ MVC Architecture
✅ Firebase Authentication (Email/Password)
✅ Role-Based Access Control (RBAC)
✅ Matching Algorithm (skill +2, interest +1, availability +2)
✅ Gamification (points, badges: Beginner/Active/Hero)
✅ Feedback System with reviews
✅ Comprehensive validation & error handling
```

---

## 🔹 AUTHENTICATION ENDPOINTS

### 1️⃣ Register User
- **Endpoint:** `POST /users/register`
- **Auth:** Firebase token required
- **Body:**
  ```json
  {
    "fullName": "John Doe",
    "role": "volunteer",         // or "ngo"
    "phone": "1234567890",
    "bio": "Passionate volunteer",
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "USA"
    },
    "skills": ["Teaching", "Writing"],
    "interests": ["Education", "Environment"],
    "availability": {
      "daysPerWeek": 3,
      "weeklyHours": 10,
      "preferredTimeSlots": ["Weekends", "Evenings"]
    }
  }
  ```
- **Response:** User object with profile details

---

## 🔹 USER ENDPOINTS

### 2️⃣ Get My Profile
- **Endpoint:** `GET /users/profile`
- **Auth:** Firebase token required
- **Response:** Current user's profile

### 3️⃣ Update Profile
- **Endpoint:** `PUT /users/profile`
- **Auth:** Firebase token required
- **Body:** Any fields to update
- **Response:** Updated user object

### 4️⃣ Get User Stats
- **Endpoint:** `GET /users/stats`
- **Auth:** Firebase token required
- **Response:**
  ```json
  {
    "stats": {
      "points": 250,
      "contributedHours": 12,
      "badges": [
        {
          "name": "Beginner",
          "description": "Attended your first event",
          "earnedAt": "2026-04-14T10:00:00Z"
        }
      ],
      "eventsAttended": 3,
      "totalPointsEarned": 150,
      "badgeCount": 1
    }
  }
  ```

### 5️⃣ Get All Users (Admin)
- **Endpoint:** `GET /users`
- **Auth:** Admin token required
- **Query Params:** `?role=volunteer&city=NewYork`
- **Response:** Array of users

### 6️⃣ Get User By ID
- **Endpoint:** `GET /users/:userId`
- **Auth:** User token required
- **Response:** User details

### 7️⃣ Award Badge (Admin)
- **Endpoint:** `POST /users/:userId/badge`
- **Auth:** Admin token required
- **Body:**
  ```json
  {
    "badgeName": "Eco Warrior",
    "badgeDescription": "Completed 5 environmental events"
  }
  ```
- **Response:** Updated user with new badge

---

## 🔹 EVENT ENDPOINTS

### 8️⃣ Create Event
- **Endpoint:** `POST /events`
- **Auth:** NGO or Admin token required
- **Body:**
  ```json
  {
    "title": "Beach Cleanup Drive",
    "description": "Help us clean the local beach",
    "date": "2026-05-15",
    "startDate": "2026-05-15",
    "endDate": "2026-05-16",
    "location": {
      "city": "Los Angeles",
      "state": "CA",
      "country": "USA"
    },
    "category": "Environment",
    "capacity": 50,
    "requiredSkills": ["Physical work", "Team coordination"],
    "preferredInterests": ["Environment", "Community"]
  }
  ```
- **Response:** Created event (approvalStatus='pending' for NGO, 'approved' for Admin)

### 9️⃣ Get All Events
- **Endpoint:** `GET /events`
- **Auth:** None (Public)
- **Query Params:** `?location=NewYork&approvalStatus=approved&category=Environment`
- **Response:** Array of events

### 🔟 Get Event By ID
- **Endpoint:** `GET /events/:eventId`
- **Auth:** None (Public)
- **Response:** Single event details

### 1️⃣1️⃣ Update Event
- **Endpoint:** `PUT /events/:eventId`
- **Auth:** Event organizer (NGO) or Admin
- **Body:** Fields to update
- **Response:** Updated event

### 1️⃣2️⃣ Delete Event
- **Endpoint:** `DELETE /events/:eventId`
- **Auth:** Event organizer or Admin
- **Response:** Success message

### 1️⃣3️⃣ Get Best Matched Volunteers (MATCHING LOGIC)
- **Endpoint:** `GET /events/:eventId/matches`
- **Auth:** NGO or Admin token required
- **Query Params:** `?limit=10`
- **Response:**
  ```json
  {
    "eventId": "mongoid",
    "eventTitle": "Beach Cleanup",
    "matchCount": 8,
    "matches": [
      {
        "volunteerId": "mongoid",
        "name": "John Doe",
        "email": "john@example.com",
        "skills": ["Team work"],
        "interests": ["Environment"],
        "matchScore": 5,
        "badges": ["Beginner"],
        "points": 100
      }
    ]
  }
  ```
  **MATCHING ALGORITHM:**
  - Skill match → +2 points per matched skill
  - Interest match → +1 point per matched interest
  - Availability match → +2 points

---

## 🔹 APPLICATION ENDPOINTS

### 1️⃣4️⃣ Apply for Event
- **Endpoint:** `POST /applications/apply/:eventId`
- **Auth:** Volunteer token required
- **Body:**
  ```json
  {
    "message": "I'm very interested in this.",
    "volunteerNotes": "Available all day"
  }
  ```
- **Response:** Application with match score

### 1️⃣5️⃣ Get My Applications
- **Endpoint:** `GET /applications/my-applications`
- **Auth:** Volunteer token required
- **Response:** Array of volunteer's applications

### 1️⃣6️⃣ Get Applications for Event
- **Endpoint:** `GET /applications/event/:eventId`
- **Auth:** NGO organizer or Admin
- **Response:** Array of applications for that event

### 1️⃣7️⃣ Update Application Status
- **Endpoint:** `PUT /applications/:applicationId/status`
- **Auth:** NGO organizer or Admin
- **Body:**
  ```json
  {
    "status": "attended"  // approved, rejected, attended, etc.
  }
  ```
- **Response:** Updated application
- **GAMIFICATION:** If status='attended', volunteer is awarded 50 points + 2 hours contribution + badge check

### 1️⃣8️⃣ Withdraw Application
- **Endpoint:** `PUT /applications/:applicationId/withdraw`
- **Auth:** Volunteer token required
- **Response:** Updated application with status='withdrawn'

---

## 🔹 ADMIN ENDPOINTS

### 1️⃣9️⃣ Approve Event
- **Endpoint:** `PUT /admin/approve-event/:eventId`
- **Auth:** Admin token required
- **Response:** Updated event with approvalStatus='approved'

### 2️⃣0️⃣ Reject Event
- **Endpoint:** `PUT /admin/reject-event/:eventId`
- **Auth:** Admin token required
- **Body:**
  ```json
  {
    "reason": "Inappropriate event description"
  }
  ```
- **Response:** Updated event with approvalStatus='rejected'

### 2️⃣1️⃣ Get Pending Events
- **Endpoint:** `GET /admin/events/pending`
- **Auth:** Admin token required
- **Response:** Array of pending approval events

### 2️⃣2️⃣ Get Approved Events
- **Endpoint:** `GET /admin/events/approved`
- **Auth:** Admin token required
- **Response:** Array of approved events

### 2️⃣3️⃣ Dashboard Statistics
- **Endpoint:** `GET /admin/dashboard/stats`
- **Auth:** Admin token required
- **Response:**
  ```json
  {
    "users": {
      "total": 150,
      "volunteers": 100,
      "ngos": 40,
      "active": 120
    },
    "events": {
      "total": 25,
      "approved": 20,
      "pending": 3,
      "rejected": 2
    },
    "applications": {
      "total": 300,
      "approved": 250,
      "attended": 180
    },
    "totalHoursContributed": 450
  }
  ```

### 2️⃣4️⃣ Deactivate User
- **Endpoint:** `PUT /admin/users/:userId/deactivate`
- **Auth:** Admin token required
- **Response:** Updated user with isActive=false

### 2️⃣5️⃣ Reactivate User
- **Endpoint:** `PUT /admin/users/:userId/reactivate`
- **Auth:** Admin token required
- **Response:** Updated user with isActive=true

---

## 🔹 FEEDBACK ENDPOINTS

### 2️⃣6️⃣ Submit Feedback
- **Endpoint:** `POST /feedback`
- **Auth:** Any authenticated user
- **Body:**
  ```json
  {
    "givenToId": "mongoid",
    "eventId": "mongoid",
    "rating": 5,
    "comment": "Great volunteer, very helpful!",
    "categories": {
      "professionalism": 5,
      "reliability": 4,
      "teamwork": 5,
      "skillLevel": 4
    },
    "isAnonymous": false
  }
  ```
- **Response:** Created feedback object

### 2️⃣7️⃣ Get My Feedback
- **Endpoint:** `GET /feedback/my-feedback`
- **Auth:** User token required
- **Response:**
  ```json
  {
    "count": 3,
    "averageRating": 4.7,
    "feedback": [...]
  }
  ```

### 2️⃣8️⃣ Get All Feedback (Admin)
- **Endpoint:** `GET /feedback`
- **Auth:** Admin token required
- **Query Params:** `?status=pending`
- **Response:** Array of all feedback (can filter by status)

### 2️⃣9️⃣ Review Feedback (Admin)
- **Endpoint:** `PUT /feedback/:feedbackId/review`
- **Auth:** Admin token required
- **Body:**
  ```json
  {
    "status": "approved"  // or "rejected"
  }
  ```
- **Response:** Updated feedback

### 3️⃣0️⃣ Delete Feedback
- **Endpoint:** `DELETE /feedback/:feedbackId`
- **Auth:** Feedback author or Admin
- **Response:** Success message

---

## 🔹 GAMIFICATION FEATURES

### Points System
- Creating an event: 5 points
- Applying for event: 0 points (soft penalty for no-show)
- Event marked as "attended": **50 points**
- Rating received: 1 point per star

### Badges
- **Beginner:** Attended 1+ event
- **Active:** Attended 5+ events
- **Hero:** Attended 10+ events

### Contributed Hours
- Automatically tracked when application status = "attended"
- Default 2 hours per event (can be overridden)

---

## 🔹 KEY FEATURES SUMMARY

✅ **Advanced Matching:** Skill match (+2), Interest match (+1), Availability match (+2)
✅ **Gamification:** Points, badges, contribution tracking
✅ **Role-Based Access:** volunteer, ngo, admin
✅ **Admin Controls:** Event approval/rejection, user management, dashboard
✅ **Feedback System:** Rate volunteers, review comments, admin moderation
✅ **Comprehensive APIs:** 30+ endpoints covering all operations
✅ **Error Handling:** Validation, authorization, proper HTTP status codes
✅ **Database:** MongoDB with proper indexes for performance

---

## 🔹 TESTING NOTES

**Use Postman or Thunder Client to test:**

1. Create Firebase user account
2. Get Firebase ID token
3. Add header: `Authorization: Bearer {idToken}`
4. Test endpoints according to your role

**Initial Test Flow:**
1. POST /users/register (as Volunteer)
2. POST /events (as NGO)
3. PUT /admin/approve-event/:id (as Admin)
4. POST /applications/apply/:eventId (as Volunteer)
5. GET /events/:eventId/matches (as NGO)
6. PUT /applications/:id/status (as NGO, set to attended)
7. GET /users/stats (as Volunteer - check points/badges)

---

## 🔹 HTTP STATUS CODES

- 200: Success
- 201: Created
- 400: Bad Request
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate application)
- 500: Server Error

---

Generated: April 14, 2026
Backend Status: ✅ COMPLETE AND LIVE
