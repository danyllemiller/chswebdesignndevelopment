# AUTH.md — Authentication System

## Overview

Authentication uses a **client-side localStorage pattern** rather than traditional server-side sessions for page access control. The server does maintain PHP sessions (for PHP API endpoints) and Express sessions (for Node.js API endpoints), but the primary access gate for HTML pages is the `auth-guard.js` module running in the browser.

---

## Login Flow

### Step 1 — User submits login form (`/login.html`)
Login form POSTs to one of two endpoints depending on code path:
- **PHP path:** `POST /api/login.php` — used by most pages
- **Node.js path:** `POST /api/login` — used by newer code

Both check credentials against the `students` table.

**PHP login (`api/login.php`) password check logic:**
```php
$valid = password_verify($password, $user['password_hash'])  // bcrypt
      || $password === $user['password_hash']                // plain-text legacy
      || md5($password) === $user['password_hash'];          // MD5 legacy
```

**Node.js login (`server/auth.js`) password check:**
```js
const match = await bcrypt.compare(password, dbPassword); // bcrypt only
```

### Step 2 — Successful login response
PHP returns:
```json
{
  "user": {
    "student_id": "123456",
    "username": "jdoe",
    "first_name": "Jane",
    "last_name": "Doe",
    "section_id": "WD1-A1",
    "role": "student",
    "must_change_password": 0
  },
  "shift": { "isRegular": true }
}
```

### Step 3 — localStorage storage
The login JS stores the user object:
```js
localStorage.setItem('user', JSON.stringify(user));
```

### Step 4 — Forced password change
If `must_change_password === 1`, the login page redirects to the change-password flow before allowing access to any other page. After successful change, `must_change_password` is set to `0` in the database.

---

## auth-guard.js — The Page Shield

**File:** `js/auth-guard.js`  
**Loaded as:** `<script type="module" src="/js/auth-guard.js">` on every HTML page

### How it works

1. **Immediately** injects a CSS rule that hides the entire page body (`visibility: hidden`) — prevents content flash before auth check completes
2. Reads `localStorage.getItem('user')` and parses the JSON
3. If no user and page is not public → redirect to `/login.html?redirect={currentPath}`
4. If user found → determines role and course, sets `window.dacAuthData`, dispatches `authComplete` event, removes the shield

### Public pages (no auth required)
```js
const publicPages = [
    'index.html', 'contact.html', 'sitemap.html', 'notices.html',
    'discipline.html', 'expectations.html', 'grading.html',
    'login.html', 'forgot-password.html', 'level1.html',
    'level2andup.html', 'computerscience.html', 'compscifinal.html'
];
```

### Role detection
```js
const isTeacher = user.role === 'admin'
               || user.section_id === 'Teacher'
               || user.username?.includes('damiller');
```

### Course detection
```js
function getCourseGroup(sectionId) {
    if (sectionId.startsWith('CS') || sectionId.includes('COMP')) return 'CS';
    if (sectionId.startsWith('WD1') || sectionId.startsWith('WD2') || sectionId.startsWith('AS')) return 'WD';
    return null;
}
```

### Cross-course access control
- CS students trying to access WD pages → redirected to `/cs-interactive.html`
- WD students trying to access CS pages → redirected to `/student/notes.html`
- Shared paths (admin/, calendar, grades, files, etc.) are accessible to all authenticated users
- Pages in `/exams/` subdirectory bypass redirects (atomic bypass)

### window.dacAuthData
After auth completes, other scripts read from `window.dacAuthData`:
```js
window.dacAuthData = {
    isAuthenticated: true,
    isTeacher: false,           // true for teacher/admin
    isCSStudent: false,         // true for CS-track students
    course: 'WD',               // 'WD', 'CS', 'ADMIN', or 'Student'
    studentClass: 'WD1-A1',    // normalized section_id
    section_id: 'WD1-A1',
    user: { ...full user object }
}
```

### authComplete event
```js
document.dispatchEvent(new Event('authComplete'));
```
`loader.js` listens for this to know when to run `filterNavigation()`.

### Last page tracking
auth-guard saves the current URL to localStorage on every non-public page load:
```js
localStorage.setItem('lastPage', JSON.stringify({ path, timestamp, title }));
```
Expires after 24 hours. Used to return user to their last page after a session timeout and re-login.

---

## loader.js — Navigation Filtering

**File:** `js/loader.js`  
**Loaded as:** `<script src="/js/loader.js">` on pages that need navigation

`loader.js` fetches navbar HTML from `/includes/navbar.html` and injects it into `#nav-placeholder`. Then it calls `filterNavigation(window.dacAuthData)` which shows/hides navigation items:

| Auth state | Nav items shown |
|-----------|----------------|
| Not authenticated | Login link, public course nav |
| Teacher | Admin menu, full course nav |
| WD student | WD student menu (`#student-menu-wd`), WD course nav, Computer Science nav hidden |
| CS student | CS student menu (`#student-menu-cs`), CS course nav, Web Design nav hidden |

The defensive check (runs after 50ms) re-verifies and re-applies styles in case other scripts override them.

---

## Registration Flow

### New student self-registration (`/register.html`)
1. Student opens registration page
2. Enters: First Name, Last Name, Student ID, chosen username, chosen password
3. JS posts to `POST /api/register.php`
4. PHP checks that `student_id` matches an existing roster row (teacher must add students first)
5. PHP sets `username`, `password_hash` on the existing student record
6. Student is redirected to login

### Teacher roster add (pre-populates the account)
Via `admin/roster.html` → Single Student tab:
- Teacher enters name, student ID, period
- Calls `POST /api/admin/upload-roster` (Node.js) — creates/updates the row
- Student ID acts as a temporary password until the student self-registers

---

## Password Reset Flows

### Teacher resets a student's password (admin/roster.html)
1. Opens Edit modal → "Reset Password to Student ID" button
2. Calls `POST /api/admin/reset-password-default` (Node.js)
3. Sets bcrypt hash of `student_id` as password, sets `must_change_password = 1`
4. Next student login is forced to change password

### Student self-resets via forgot-password form
1. Student fills in First Name, Last Name, Student ID, Username
2. Calls `POST /api/reset-password` (Node.js)
3. Server verifies all four fields match a DB row
4. Sets temp password = student ID, sets `must_change_password = 1`

---

## PHP Session vs. localStorage

The PHP session (set by `api/login.php` via `$_SESSION`) is used by:
- `api/change-password.php` — reads `$_SESSION['student_id']` to identify the user

The Express session (set by `server/auth.js` login) is used by:
- `server/auth.js` change-password route — reads `req.session.user.student_id`

Neither PHP sessions nor Express sessions are used for page-level access control — that is entirely handled by `auth-guard.js` reading `localStorage`.

**This means:** If a user manually clears their localStorage, they are effectively logged out even if a server session is still alive.

---

## Security Notes

- Passwords are bcrypt-hashed (cost factor 10)
- The PHP layer has a legacy fallback for plain-text and MD5 passwords (old data migration artifact)
- CORS headers are set permissively (`Access-Control-Allow-Origin: *`) in all PHP endpoints — fine for a school intranet
- The Express session secret is hardcoded as `'secure-session-key-12345'` in `server/server.js` — should be moved to an environment variable for production hardening
- The DB password (`DB_PASSWORD_IN_DB_CONFIG`) is hardcoded in `api/db_config.php` and `server/db.js`
