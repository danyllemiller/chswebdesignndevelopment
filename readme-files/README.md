# CHS Web Design & Development — Project Overview

## What This Site Is

This is the teacher-owned classroom website for Ms. Danylle Miller's Web Design & Development and Computer Science courses at Carson High School (CHS). It is a full-stack web application that serves as:

- A **public-facing course information site** (syllabus, expectations, grading policy)
- A **teacher admin dashboard** (gradebook, roster management, payroll/timeclock, calendar)
- A **student portal** (grade viewer, digital notebooks, file manager, appointment booking)
- A **calendar system** with bell schedule, CSV import, office-hours, and appointment booking
- An **exam/quiz engine** for CS and Web Design review games

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web server | Nginx (reverse proxy) |
| Application server | Node.js / Express, PM2 process manager, port 3000 |
| PHP runtime | PHP 8.4-FPM (`/var/run/php/php8.4-fpm.sock`) |
| Database | MariaDB, database `chs_gradebook` |
| Frontend framework | Bootstrap 5.3.3 (CDN), jQuery (local vendor) |
| Fonts | Google Fonts — Edu NSW ACT Foundation, Gochi Hand |
| Icons | Font Awesome 6.4.0 (CDN) |

### Request Routing (Nginx)

```nginx
# PHP files → PHP-FPM
location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
}

# Everything else → Node.js
location / {
    proxy_pass http://localhost:3000;
}
```

This means there are **two API layers**:
- **PHP API** (`/api/*.php`, `/api/admin/*.php`, etc.) — handles calendar, bell schedule, gradebook CRUD, login, register, appointments
- **Node.js API** (`/api/login`, `/api/admin/roster`, `/api/student/grades`, etc.) — handles roster upload, review games, notebooks, rubrics, payroll timesheets, project workflow

Both layers connect to the same MariaDB `chs_gradebook` database.

---

## Server Connection Info

| Item | Value |
|------|-------|
| Server | VPS at `chswebdesignndevelopment.com` |
| SSH user | `administrator` |
| SSH password | `[ask server admin]` |
| Site root on server | `/srv/chswebdesignndevelopment` |
| DB host | `localhost` |
| DB user | `root` |
| DB password | `DB_PASSWORD_IN_DB_CONFIG` |
| DB name | `chs_gradebook` |
| PM2 process name | `guild-server` |

---

## How to Deploy Changes

### JavaScript or HTML changes (Node.js-served files)
```bash
ssh administrator@chswebdesignndevelopment.com
cd /srv/chswebdesignndevelopment
git pull
pm2 restart guild-server
```

### PHP file changes
PHP-FPM serves `.php` files directly. No restart needed — just `git pull`.

### Database schema changes
Run `setup-db.php` in a browser once (visit `/api/setup-db.php`), then delete the file.

---

## Authentication & Roles

There are two user roles stored in the `students` table:

| Role | Access |
|------|--------|
| `teacher` (or `admin`) | Full admin dashboard, calendar tools, gradebook, roster management |
| `student` | Student portal (grades, files, notebook, appointments) |

Students are further divided by course:
- **WD students** (`section_id` starting with `WD1`, `WD2`, or `AS`) → Web Design portal
- **CS students** (`section_id` starting with `CS`) → Computer Science portal

Login stores the user object in `localStorage` under the key `user`. The `auth-guard.js` module reads this on every page load to enforce access control.

**First-time student flow:**
1. Teacher adds student to roster (via admin/roster.html or CSV upload)
2. Student goes to `/register.html`, enters their name + student ID + chosen password
3. Password is bcrypt-hashed and stored; `section_id` remains as assigned by teacher

**Forced password change:** If `must_change_password = 1`, the login page redirects to a change-password flow before allowing access to any other page.

---

## Site Map

```
/                           → index.html (home, public)
/contact.html               → contact info (public)
/computerscience.html       → CS course overview (public)
/calendar.html              → Class calendar (auth required)
/admin.html                 → DB migration tool (teacher only)
/admin/gradebook.html       → Master gradebook (teacher only)
/admin/roster.html          → Roster management (teacher only)
/admin/payroll.html         → Payroll & timeclock dashboard (teacher only)
/admin/files.html           → Student file explorer (teacher only)
/admin/notebooks.html       → Student notebook viewer (teacher only)
/admin/rubrics.html         → Rubric manager (teacher only)

/api/*.php                  → PHP API endpoints
/api/admin/*.php            → PHP admin API endpoints
/api/appointments/*.php     → PHP appointment API endpoints
/api/student/*.php          → PHP student API endpoints
/api/* (no .php)            → Node.js API endpoints (server/api.js)
/api/login, /api/register   → Node.js auth endpoints (server/auth.js)

/js/auth-guard.js           → Authentication & navigation gating (runs on every page)
/js/loader.js               → Injects navbar, footer, global CSS
/js/calendar.js             → Full calendar system
/js/admin/gradebook.js      → Teacher gradebook UI
/js/admin/roster.js         → Roster management UI
/js/admin/payroll.js        → Payroll dashboard UI
/js/admin/rubrics.js        → Rubric manager UI
/js/admin/admin-notebooks.js → Notebook viewer UI
/js/student/timeclock.js    → Student clock-in/clock-out
/js/student/student-notes.js → Student notebook UI
/js/student/student-payroll.js → Student payroll/timeclock view
/js/student/student-files.js   → Student file manager
```

---

## Key Files at a Glance

| File | Purpose |
|------|---------|
| `server/server.js` | Express app entry point — mounts auth, API, static files |
| `server/auth.js` | Node.js login, register, change-password, reset-password routes |
| `server/api.js` | Node.js API routes (gradebook, roster, rubrics, payroll, notebooks, etc.) |
| `server/db.js` | mysql2/promise connection factory |
| `api/db_config.php` | PHP DB credentials + helper functions (`getDB`, `jsonInput`, `corsHeaders`) |
| `api/login.php` | PHP login endpoint (bcrypt + legacy MD5 fallback) |
| `js/auth-guard.js` | Client-side auth check, role detection, navigation filtering |
| `js/loader.js` | Injects navbar.html, footer.html, site-footer.html into placeholders |
| `js/calendar.js` | Full calendar — 4 views, bell schedule, CSV import, appointments |
| `css/dacStyleSheets.css` | Master stylesheet — CSS variables, all shared styles |
