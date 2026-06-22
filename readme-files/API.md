# API.md — All API Endpoints

This project has **two API layers** that both live under the `/api/` path:

- **PHP API** — files ending in `.php` (handled by PHP-FPM via Nginx)
- **Node.js API** — paths without `.php` extension (proxied by Nginx to Node:3000 → `server/api.js` and `server/auth.js`)

Both layers share the same MariaDB database (`chs_gradebook`), but use different table names in a few cases (e.g., PHP uses `grades`, Node.js uses `responses`).

---

## PHP API Endpoints

### Auth & User

#### `POST /api/login.php`
**File:** `api/login.php`  
**Request body:** `{ username: string, password: string }`  
**Response:** `{ user: { student_id, username, first_name, last_name, section_id, role, must_change_password }, shift: { isRegular: bool } }`  
**Notes:** Supports bcrypt, plain-text legacy, and MD5 legacy passwords. Sets PHP session. `isRegular` = Mon–Fri 7am–4pm Pacific.  
**Called by:** `js/login-logic.js` (login form)

#### `POST /api/register.php`
**File:** `api/register.php`  
**Request body:** `{ first_name, last_name, student_id, username, password }`  
**Response:** `{ result: "success", message: string }`  
**Notes:** Creates a new student account. Rejects if `student_id` or `username` already exists. Password is bcrypt-hashed. New accounts start with `section_id = "Unassigned"`.  
**Called by:** Registration form

#### `POST /api/change-password.php`
**File:** `api/change-password.php`  
**Request body:** `{ current_password: string, new_password: string }`  
**Response:** `{ result: "success" }`  
**Notes:** Uses PHP session `$_SESSION['student_id']` if present; otherwise treats `current_password` as the student ID (for temp-password flow). Clears `must_change_password` flag on success.  
**Called by:** Password change form

---

### Calendar Events

#### `GET /api/events.php`
**File:** `api/events.php`  
**Response:** `{ events: [{ id, event_date, title, type, description, all_day, start_time, end_time }] }`  
**Notes:** Returns all events sorted by date. Auto-creates `calendar_events` table if missing.  
**Called by:** `js/calendar.js` on `initCalendar()`

#### `POST /api/events.php`
**Request body:** `{ event_date, title, type, description?, all_day?, start_time?, end_time? }`  
**Response:** `{ success: true, id: number }`  
**Called by:** `js/calendar.js` (Add Single Event modal save button)

#### `PUT /api/events.php`
**Request body:** `{ id, event_date, title, type, description?, all_day?, start_time?, end_time? }`  
**Response:** `{ success: true }`  
**Called by:** `js/calendar.js` (Edit Event modal save button)

#### `DELETE /api/events.php?id={id}`
**Response:** `{ success: true }`  
**Called by:** `js/calendar.js` (Del button in day sidebar)

#### `POST /api/save-csv.php`
**File:** `api/save-csv.php`  
**Request body:** Plain text CSV content (`Content-Type: text/plain`)  
**CSV format:** `YYYY-MM-DD, TYPE, Description` (comma or tab delimited, header row optional)  
**Valid types:** `A`, `B`, `A_MIN`, `B_MIN`, `C`, `S`, `OFF`, `none`  (`S` = Summer School day — maps to the `summer` bell schedule)  
**Response:** `{ success: true, count: number }`  
**Notes:** Deletes all existing rows where `source = 'csv'`, then re-inserts. Also ensures `source` column exists (ALTER TABLE ADD COLUMN IF NOT EXISTS).  
**Called by:** `js/calendar.js` CSV import button

---

### Bell Schedule

#### `GET /api/bell-schedule.php`
**File:** `api/bell-schedule.php`  
**Query params:** `?type=A` (optional — filter by one schedule type)  
**Valid `schedule_type` values:** `A`, `A_MIN`, `B`, `B_MIN`, `C`, `summer`  
**Response:** `{ schedule: [{ id, schedule_type, period_label, sort_order, start_time, end_time, section_id, course_name }] }`  
**Notes:** On every GET, automatically deletes any rows whose `schedule_type` is not in the valid set (removes legacy day-of-week rows).  
**Called by:** `js/calendar.js` `getBellSchedule()`

#### `POST /api/bell-schedule.php`
**Request body:**
```json
{
  "teacher_id": "string (optional, validates role)",
  "schedule_types": ["A"],
  "periods": [{ "schedule_type": "A", "period_label": "A1", "start_time": "07:35", "end_time": "09:00", "section_id": "A1", "course_name": "Web Design" }]
}
```
**Response:** `{ success: true }`  
**Notes:** Deletes all rows for the listed `schedule_types`, then re-inserts the provided periods. Saving one tab (e.g., `A`) does not affect other tabs. If `all: true` is sent, truncates the entire table.  
**Called by:** `js/calendar.js` bell schedule modal save button

---

### School Config

#### `GET /api/school-config.php`
**File:** `api/school-config.php`  
**Response:** `{ regular_start, regular_end, summer_start, summer_end }` (YYYY-MM-DD strings)  
**Called by:** `js/calendar.js` on `initCalendar()`

#### `POST /api/school-config.php`
**Request body:** `{ regular_start?, regular_end?, summer_start?, summer_end? }`  
**Response:** `{ success: true }`  
**Called by:** `js/calendar.js` school year date pickers in bell schedule modal

---

### Timeclock

#### `POST /api/clockin.php`
**File:** `api/clockin.php`  
**Request body:** `{ student_id, section_id?, type, answer? }`  
**`type` values:** `Regular`, `Overtime`, `Out`  
**Response:** `{ result: "success" }`  
**Notes:** Logs to `timeclock_log`. For non-overtime punches, also auto-creates a `TC-In` or `TC-Out` exam in `exams` and records a score of 1 in `grades` for that student.  
**Called by:** `js/student/timeclock.js`, `js/timeclock.js`

---

### Admin Gradebook

#### `GET /api/admin/master-gradebook-data.php`
**File:** `api/admin/master-gradebook-data.php`  
**Response:**
```json
{
  "students": [{ student_id, username, first_name, last_name, section_id, role }],
  "assignments": [{ exam_id, title, total_points, due_date, instructions, course_id, period_due_dates }],
  "grades": [{ student_id, exam_id, score, total_points, timestamp }]
}
```
**Notes:** Excludes admin-role accounts from students list.  
**Called by:** `js/admin/gradebook.js`

#### `POST /api/admin/save-assignment.php`
**File:** `api/admin/save-assignment.php`  
**Request body:** `{ exam_id, title?, total_points?, due_date?, instructions?, course_id?, period_due_dates? }`  
**Response:** `{ result: "success" }`  
**Notes:** Uses `INSERT ... ON DUPLICATE KEY UPDATE` — safe to call for create or update.  
**Called by:** `js/admin/gradebook.js`

#### `POST /api/admin/edit-assignment.php`
**File:** `api/admin/edit-assignment.php`  
**Request body:** `{ old_exam_id, exam_id, title?, total_points?, due_date?, instructions?, course_id?, period_due_dates? }`  
**Response:** `{ result: "success" }`  
**Notes:** If `exam_id !== old_exam_id`, runs a transaction to insert new exam, remap all grades, delete old exam.  
**Called by:** `js/admin/gradebook.js`

#### `POST /api/admin/delete-assignment.php`
**File:** `api/admin/delete-assignment.php`  
**Request body:** `{ exam_id }`  
**Response:** `{ result: "success" }`  
**Notes:** Transactionally deletes from `grades` then `exams`.  
**Called by:** `js/admin/gradebook.js`

#### `POST /api/admin/save-grade.php`
**File:** `api/admin/save-grade.php`  
**Request body:** `{ student_id, exam_id, score, total_points? }`  
**Response:** `{ result: "success" }`  
**Notes:** Upserts the grade. Also ensures the exam row exists (INSERT IGNORE).  
**Called by:** `js/admin/gradebook.js` (clicking on a cell in the gradebook)

#### `POST /api/admin/batch-update-grades.php`
**File:** `api/admin/batch-update-grades.php`  
**Request body:** `{ batch: [{ studentId, updates: { examId: { score, max } } }] }`  
**Response:** `{ result: "success", saved: number }`  
**Notes:** Wraps all upserts in a single transaction.  
**Called by:** `js/admin/gradebook.js` (bulk save on page unload / save button)

#### `POST /api/admin/clear-all-assignments.php`
**File:** `api/admin/clear-all-assignments.php`  
**Request body:** (none)  
**Response:** `{ result: "success" }`  
**Notes:** Deletes ALL rows from `grades` and `exams`. Irreversible without a DB backup.  
**Called by:** `js/admin/gradebook.js`

#### `GET /api/admin/get-due-dates.php`
**File:** `api/admin/get-due-dates.php`  
**Response:** `{ exams: { [exam_id]: { exam_id, title, total_points, course_id, due_date, period_due_dates } }, sections: ["A1","B2",...] }`  
**Notes:** Returns all rows from `exams` table keyed by `exam_id`, plus distinct `section_id` values from the `users` table (for the period-date dropdowns in the Due Date Manager).  
**Called by:** `admin/due-dates.html` on page load

#### `POST /api/admin/save-due-dates.php`
**File:** `api/admin/save-due-dates.php`  
**Request body:** `{ assignments: [{ exam_id, title, total_points, course_id, due_date, period_due_dates }], sync_calendar: bool }`  
**Response:** `{ success: true, exams_saved: number, calendar_synced: number }`  
**Notes:** Upserts all assignments to the `exams` table (`INSERT … ON DUPLICATE KEY UPDATE`). If `sync_calendar` is true: deletes all `calendar_events` rows with `source='due_date'`, then inserts fresh events for every assignment with a due date (type `none`, title `"{assignment} Due"`). Period-specific dates create additional events labeled `"{assignment} Due – Period {id}"`. Sending a null `due_date` for an existing assignment clears it in both the `exams` row and calendar.  
**Called by:** `admin/due-dates.html` Save buttons

---

### Appointments

#### `GET /api/appointments/office-hours.php`
**File:** `api/appointments/office-hours.php`  
**Response:** `{ hours: [{ id, day_of_week, start_time, end_time, slot_duration }] }`  
**Called by:** `js/calendar.js` (office hours collapse panel)

#### `POST /api/appointments/office-hours.php`
**Request body:** `{ teacher_id?: string, hours: [{ day_of_week, start_time, end_time, slot_duration }] }`  
**Response:** `{ success: true }`  
**Notes:** Replaces all rows. If `teacher_id` is provided, validates role is teacher/admin.  
**Called by:** `js/calendar.js` (Save Office Hours button)

#### `GET /api/appointments/slots.php?date=YYYY-MM-DD`
**File:** `api/appointments/slots.php`  
**Response:** `{ slots: [{ time: "HH:MM", available: bool }] }`  
**Notes:** Generates slots from office hours windows for the given day, then marks booked slots (any appointment status != 'denied') as unavailable.  
**Called by:** `js/calendar.js` (Book Appointment modal, when student picks a date)

#### `POST /api/appointments/book.php`
**File:** `api/appointments/book.php`  
**Request body:** `{ student_id, date, time, reason? }`  
**Response:** `{ success: true, appointment_id: number }` or 409 Conflict  
**Notes:** UNIQUE constraint on (date, time) prevents double-booking.  
**Called by:** `js/calendar.js` (Request Appointment button)

#### `GET /api/appointments/requests.php`
**File:** `api/appointments/requests.php`  
**Query params:** `?role=teacher&student_id=...` (teacher gets all; student gets own)  
**Response:** `{ appointments: [...] }`  
**Called by:** `js/calendar.js` (teacher dashboard modal)

#### `POST /api/appointments/update-status.php`
**File:** `api/appointments/update-status.php`  
**Request body:** `{ id, status: "approved"|"denied"|"pending", teacher_note?, teacher_id? }`  
**Response:** `{ success: bool }`  
**Called by:** `js/calendar.js` (teacher Approve/Deny buttons in dashboard)

---

### Student API (PHP)

#### `GET /api/student/grades.php?student_id={id}`
**File:** `api/student/grades.php`  
**Response:** `{ responses: [{ exam_id, score, total_points, timestamp }] }`  
**Called by:** Student grade-view pages

#### `GET /api/student/profile.php?username={username}`
**File:** `api/student/profile.php`  
**Response:** `{ student_id, username, first_name, last_name, section_id, role }`  
**Called by:** Auth flow, student dashboard

#### `GET /api/student/course-gradebook.php?student_id={id}`
**File:** `api/student/course-gradebook.php`  
**Response:** `{ section_id, assignments: [{ exam_id, title, total_points, due_date, instructions, course_id, period_due_dates, score, timestamp }] }`  
**Notes:** Merges all exam definitions with the student's grades. Includes orphaned grade-only rows.  
**Called by:** Student grade-view pages

#### `GET /api/student/exam-progress.php?student_id={id}&exam_id={id}`
**File:** `api/student/exam-progress.php`  
**Response:** `{ found: bool, answers: [...], current_index: number }` or `{ found: false }`  
**Called by:** Exam engine JS

#### `POST /api/student/exam-progress.php`
**Request body:** `{ student_id, exam_id, answers: [...], current_index: number }`  
**Response:** `{ result: "success" }`

#### `DELETE /api/student/exam-progress.php?student_id={id}&exam_id={id}`
**Response:** `{ result: "success" }`

#### `GET /api/student/self-assessments.php?student_id={id}`
**File:** `api/student/self-assessments.php`  
**Response:** `{ responses: [{ chapter_id, level, mode, updated_at }] }`

#### `POST /api/student/save-self-assessment.php`
**File:** `api/student/save-self-assessment.php`  
**Request body:** `{ student_id, chapter_id, level, mode? }`  
**Response:** `{ success: true }`

---

## Node.js API Endpoints (`server/auth.js` + `server/api.js`)

### Auth (server/auth.js)

#### `POST /api/login`
Bcrypt-only login. Regenerates session. Response: `{ success: true, user: {...}, must_change_password: 0|1 }`

#### `POST /api/register`
Creates account if student_id exists on roster. Updates `username` and hashed `password`.

#### `POST /api/change-password`
Requires active session. Validates current password, sets new bcrypt hash, clears `must_change_password`.

#### `POST /api/reset-password`
Self-service reset — verifies name + ID + username match, sets temp password = student_id, sets `must_change_password = 1`.

#### `POST /api/admin/reset-password-default`
Teacher resets a student's password to their student ID (or a provided default). Sets `must_change_password = 1`.

#### `POST /api/logout`
Destroys session, clears cookie.

---

### Roster (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/roster` | All students ordered by last name |
| GET | `/api/admin/student?student_id=` | Single student record |
| POST | `/api/admin/save-student` | Update student fields (name, username, section, role, password) |
| POST | `/api/admin/upload-roster` | Bulk upsert students from JSON array |
| DELETE | `/api/admin/delete-student` | Delete one student |
| POST | `/api/admin/delete-multiple-students` | Bulk delete by student_ids array |
| POST | `/api/admin/reset-student` | Wipe username + password (allow re-registration) |
| GET | `/api/admin/sections` | All valid class section IDs from catalog |

---

### Gradebook (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/master-gradebook-data` | All students, exams, grades for gradebook spreadsheet |
| POST | `/api/admin/save-assignment` | Create/update exam definition |
| POST | `/api/admin/delete-assignment` | Delete exam + its responses |
| POST | `/api/admin/clear-all-assignments` | Wipe all exams and responses |
| GET | `/api/student/grades?student_id=` | Student's grades (from `responses` table) |
| GET | `/api/student/course-gradebook?student_id=` | Student's grades filtered by course code |
| GET | `/api/student/assignments-visible?student_id=` | Assignments visible to a student by course |
| POST | `/api/submit-exam` | Submit exam score (keeps highest score) |

---

### Payroll (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/payroll/roster` | Students with pay role info |
| GET | `/api/admin/payroll/timesheets-daily?date=` | All timesheets for a specific date |
| GET | `/api/admin/payroll/timesheets-period?from=&to=` | Timesheets for a date range |
| GET | `/api/admin/daily-questions?date=` | Clock-out prompts for a date |
| POST | `/api/admin/daily-questions` | Set clock-out prompts for a date |
| POST | `/api/admin/inject-timesheets` | Inject test timesheet data |
| POST | `/api/admin/update-student-role` | Set a student's pay_role_id |

---

### Notebooks (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/notebooks/roster` | Student list for notebook viewer |
| GET | `/api/admin/notebooks/entries?student_id=&chapter_id=` | Notebook entries for a student |
| GET | `/api/student/notebook?student_id=&chapter_id=` | Student's own notebook entries |
| POST | `/api/student/notebook/save` | Save/update a notebook entry |
| POST | `/api/student/notebook/delete` | Delete a notebook entry |
| GET | `/api/student/cs-notebook?student_id=` | CS student notes (from `turnins` table) |
| POST | `/api/student/cs-notebook` | Save CS notebook entry |

---

### Rubrics (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/rubrics` | All rubrics |
| POST | `/api/admin/rubrics/save` | Create/update rubric |
| DELETE | `/api/admin/rubrics/:id` | Delete rubric |

---

### Review Questions (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/review-questions?chapter=` | Get questions (all or filtered by chapter/grade) |
| POST | `/api/admin/review-questions/seed` | Bulk insert questions (admin.html migration tool) |
| DELETE | `/api/admin/review-questions` | Wipe all review questions |

---

### CS Exam Questions (server/api.js)

#### `GET /api/cs-exam-questions?unit={0-8|a}`
Returns questions for a CS unit. Tries multiple `exam_id` formats, falls back to `chapter_number`. Response: `{ unit, count, questions: [{ question, options, answer, hint, chapter }] }`

---

### Student Misc (server/api.js)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/student/profile?username=` | Student profile by username |
| GET | `/api/student/self-assessments?student_id=` | Self-assessment ratings |
| POST | `/api/student/save-self-assessment` | Save self-assessment |
| POST | `/api/student/submit-turnin` | Submit assignment turn-in |
| POST | `/api/student/help-request` | Toggle student help-requested flag |
| GET | `/api/student/shared-files?student_id=` | Peer-shared files inbox |
| POST | `/api/student/share-file` | Share a file with another student |
| DELETE | `/api/student/shared-file/:id?student_id=` | Delete a shared file |
| GET | `/api/student/exam-progress?student_id=&exam_id=` | Saved exam progress |
| POST | `/api/student/exam-progress` | Save exam progress |
| DELETE | `/api/student/exam-progress?student_id=&exam_id=` | Clear exam progress |
| GET | `/api/student/project-aggregate?...` | Get project grade aggregate |
| POST | `/api/student/project-evaluation` | Submit self/peer/auto rubric score |
| POST | `/api/student/project-submission` | Record file submission metadata |

---

### Calendar Settings (server/api.js, Node.js only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/calendar-settings` | Get calendar config JSON blob |
| POST | `/api/admin/calendar-settings` | Save calendar config JSON blob |

---

### Clockin (server/api.js, Node.js)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clockin` | Log clockin event to `clockins` table |
| GET | `/api/timeclock/status?student_id=` | Last clockin event for student |

---

## Error Response Format

All endpoints return JSON errors in the shape:
```json
{ "error": "Human readable message" }
```
with the appropriate HTTP status code (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 409 Conflict, 500 Internal Server Error).
