# CHS Web Design & Development — Project Overview

**Last verified accurate: 2026-09-22.** See the note at the bottom of `SERVER.md` before trusting infrastructure claims in any of these docs on faith — verify against the live server/code first, the way this rewrite did. The previous version of this file described a PHP+Node dual-stack on a generic VPS; neither was true anymore by the time anyone checked.

## What This Site Is

This is the teacher-owned classroom website for Ms. Danylle Miller's Web Design & Development and Computer Science courses at Carson High School (CHS). It is a full-stack web application that serves as:

- A **public-facing course information site** (syllabus, expectations, grading policy)
- A **teacher admin dashboard** (gradebook, roster management, payroll/timeclock, calendar, curriculum documentation)
- A **student portal** (grade viewer, digital notebooks, file manager, appointment booking, payroll/timeclock)
- A **calendar system** with bell schedule, CSV import, office-hours, and appointment booking
- An **exam/quiz engine** for CS and Web Design, plus review games
- A **CS Interactive Workspace** with unit/chapter navigation, pre-assessment diagnostics, unit projects, summative exam launcher, and CS Final Exam
- A **Due Date Manager** for bulk-setting assignment due dates that auto-sync to the school calendar

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web server | Nginx (reverse proxy) |
| Application server | Node.js / Express, PM2 process manager, port 3000 |
| Database | MariaDB/MySQL, database `chs_gradebook`, accessed via `mysql2`'s connection **pool** |
| Sessions | `express-session` backed by `express-mysql-session` (MySQL-stored, survives restarts) |
| Frontend framework | Bootstrap 5 (CDN), jQuery (local vendor), vanilla JS (no build step, no bundler) |
| Fonts | Google Fonts — Edu NSW ACT Foundation, Gochi Hand |
| Icons | Font Awesome (CDN) |

**There is no PHP.** The site fully migrated off an earlier PHP+Node dual-stack to Node.js/Express only. Confirmed live: zero `.php` files anywhere in the repo. Nginx's config still has a leftover, inert `location ~ \.php$` block pointing at PHP-FPM — nothing left to match it. A single Node API (`server/api.js` aggregating `server/routes/*.js`, plus `server/auth.js` for login/register/logout) handles everything.

Full infrastructure details (hosting, SSH, deploy, the connection pool, session store, a real recurring upload-permissions gotcha) live in **`SERVER.md`** — this file stays high-level.

---

## Authentication & Roles

Two roles, stored in the `students` table:

| Role | Access |
|------|--------|
| `teacher` (or `admin`, or `section_id = 'Teacher'`) | Full admin dashboard, calendar tools, gradebook, roster management |
| `student` (default) | Student portal (grades, files, notebook, appointments, payroll) |

`server/helpers.js`'s `isStaffSession(req)` is the canonical server-side check — `role === 'admin' || role === 'teacher' || section_id === 'Teacher'`. Use it (or the `requireStaff` / `requireSelfOrStaff` / `requireLogin` middleware built on top of it) rather than re-deriving staff status by hand in a new route.

**Course detection is not a `section_id` prefix check.** A student's real `section_id` is a bare period code — `A1`, `A3`, `A5`, `B2`, `B4`, `B6`, `B8`, `INTV`, `AS-B2`, etc. — never a literal string like `"WD1"` or `"CS"`. The canonical way to resolve which course a section belongs to is `resolveCourseId(connection, sectionId)` in `server/helpers.js`, which looks up `class_sections.course_id` (falling back to a legacy prefix guess only for rows with no `class_sections` match). Real `course_id` values:

| Course | `course_id` |
|--------|-------------|
| Web Design I | `05254G1S` |
| Web Design II | `05254G2S` |
| Computer Science | `10003GS` |
| AS (aide) | `05254EF-201` |
| Intervention | `34009GF-8` |

Client-side, `js/auth-guard.js`'s `getCourseGroup()` does the same job in the browser — it prefers `course_name` from the student's own profile (fetched server-side) and only falls back to a `section_id` prefix guess for legacy accounts. A student can be dual-enrolled (e.g. WD + INTV), which is why several routes build a *set* of enrolled courses rather than assuming one.

Login stores the logged-in user object in `localStorage` under the key `user`, refreshed from the server on every protected page load (`auth-guard.js`) so a mid-day section change doesn't leave a stale cached copy. Session auth (the thing that actually gates API calls) is a separate, server-side, MySQL-backed session — see `SERVER.md`.

**First-time student flow:**
1. Teacher adds the student to the roster (`admin/roster.html` or CSV upload)
2. Student goes to `/register.html`, enters their name + student ID + chosen password
3. Password is bcrypt-hashed and stored; `section_id` stays as assigned by the teacher

**Forced password change:** if `must_change_password = 1`, login redirects to a change-password flow before anything else is reachable.

---

## Site Map (selected)

```
/                              → index.html (home, public)
/contact.html                  → contact info (public)
/computerscience.html          → CS course landing page (public)
/calendar.html                 → Class calendar (auth required)
/admin/gradebook.html          → Master gradebook (staff only)
/admin/roster.html             → Roster management (staff only)
/admin/payroll.html            → Payroll & timeclock dashboard (staff only)
/admin/files.html               → Student file explorer (staff only)
/admin/rubrics.html            → Rubric manager (staff only)
/admin/due-dates.html          → Due Date Manager (staff only)
/admin/daily-agenda.html       → Daily agenda slides, editable in place (staff only)
/admin/tools/curriculum-documentation.html → Shareable, no-login curriculum documentation page
                                  (see below — this one is deliberately public)

/cs-interactive.html           → CS Interactive Workspace (CS students — auth required)
/compsci/unitN-project.html    → CS unit capstone project pages (self/peer grading, turn-in dropbox)
/exams/cs-unit-N-exam.html     → CS unit summative exams
/exams/cs-final-exam.html      → CS Final Exam
/pre-assessments/cs-unit-N.html → CS pre-assessment diagnostics
/year1/, /year2/                → WD chapter content pages
/exams/the-*.html               → WD chapter summative exams
/proficiencyScales/*.html       → Self-assessment proficiency scale pages

/api/*                          → Node.js API (server/routes/*.js via server/api.js)
/api/login, /api/register, /api/logout → Node.js auth endpoints (server/auth.js)
```

**A few pages are deliberately public (no login required)** — listed explicitly in `js/auth-guard.js`'s `publicPages` array. This includes the usual marketing/info pages, plus (as of 2026-09) the Curriculum Documentation page, `/admin/lesson-plan-binder.html`, and everything under `/proficiencyScales/`, specifically so they can be shared with people outside the school's accounts (a principal, department colleagues). Their data comes from a separate, non-admin-gated API (`/api/public/curriculum-analytics`) that only ever returns aggregate numbers — no student names or IDs, and any figure backed by fewer than 5 students is withheld. Read that route's comments in `server/routes/gradebook.js` before extending what a public page can see.

---

## Key Files at a Glance

| File | Purpose |
|------|---------|
| `server/server.js` | Express app entry point — session middleware, mounts auth/API/static |
| `server/auth.js` | Login, register, change-password, reset-password, logout |
| `server/api.js` | Aggregates every `server/routes/*.js` file; also the blanket `/admin/*` staff gate |
| `server/routes/*.js` | One file per domain — gradebook, roster, payroll, timeclock, projects, uploads, agenda, calendar, etc. |
| `server/db.js` | `mysql2` connection pool (committed to git — no secrets in it; the password comes from `.env`) |
| `server/helpers.js` | Shared auth checks (`isStaffSession`, `requireSelfOrStaff`, etc.) and `resolveCourseId` |
| `js/auth-guard.js` | Client-side auth check, role/course detection, navigation filtering, `publicPages` allowlist |
| `js/loader.js` | Injects `navbar.html`/`footer.html`, and the site-wide timeclock widget, into placeholders |
| `js/calendar.js` | Full calendar — 4 views, bell schedule, CSV import, appointments |
| `js/cs-interactive.js` | CS workspace controller — unit/chapter tabs, unit projects, pre-assessment gating, exam launch |
| `js/student/timeclock.js` | Student clock-in/clock-out widget (site-wide, injected by `loader.js`) |
| `js/assignment-uploader.js` | Universal assignment dropbox — posts to `/api/upload` |
| `compsci/scope&sequence.txt` | Real Nevada CS standards text, per-chapter indicator codes |
| `curriculum/Web Design and Development - Two-Year Curriculum Map (FOR APPROVAL).docx` | Real Nevada WD standards mapped to chapters, incl. real lesson-page paths |

For anything about hosting, deployment, the database connection, sessions, or the recurring upload-folder-permissions issue, see **`SERVER.md`** — this file intentionally doesn't duplicate it.
