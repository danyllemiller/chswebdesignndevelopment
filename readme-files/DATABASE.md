# DATABASE.md — CHS Gradebook Database Reference

**Database:** `chs_gradebook`  
**Engine:** MariaDB  
**Credentials:** host=localhost, user=root, password=DB_PASSWORD_IN_DB_CONFIG  
**Charset:** utf8mb4

The schema is defined across two places:
- `api/setup-db.php` — the one-time setup script (canonical definitions for core tables)
- `server/api.js` — Node.js inline DDL for tables created on demand (rubrics, review_questions, teacher_daily_questions, shared_files, exam_progress)

---

## Tables

### `students`
The central user table for all accounts (teacher and students).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | Internal row ID |
| `student_id` | VARCHAR(50) UNIQUE | School-issued ID (e.g., `"123456"`), used as login key |
| `username` | VARCHAR(100) UNIQUE | Chosen login name (lowercase) |
| `password_hash` | VARCHAR(255) | bcrypt hash. Also stored in `password` column in Node.js auth path |
| `first_name` | VARCHAR(100) | |
| `last_name` | VARCHAR(100) | |
| `section_id` | VARCHAR(50) | Period/course (e.g., `WD1-A1`, `CS-B6`, `Teacher`, `Unassigned`) |
| `role` | VARCHAR(20) | `student` or `teacher` (or `admin`) |
| `must_change_password` | TINYINT(1) | 1 = force password change at next login |
| `created_at` | DATETIME | Auto-set on insert |
| `role_id` | INT | (Added by payroll system) Links to `pay_roles.id` |
| `help_requested` | TINYINT(1) | Added dynamically; 1 = student clicked help button |
| `password_updated_at` | DATETIME | Set when password changes |

**Read by:** `api/login.php`, `server/auth.js`, `api/register.php`, `api/admin/master-gradebook-data.php`, `server/api.js` (all roster endpoints)  
**Written by:** `api/register.php`, `server/auth.js` (register, reset-password), `server/api.js` (save-student, upload-roster, delete-student, etc.)

---

### `exams`
Assignment and exam definitions — one row per assignment column in the gradebook.

| Column | Type | Notes |
|--------|------|-------|
| `exam_id` | VARCHAR(250) PK | Unique string ID (e.g., `"Ch1 Project [100 pts]"`, `"TC-In 9/15 [1 pts]"`) |
| `title` | VARCHAR(250) | Display name |
| `total_points` | INT | Max possible points |
| `due_date` | DATE | Optional |
| `instructions` | TEXT | Optional instructions shown to students |
| `course_id` | VARCHAR(50) | Which course this belongs to (`All`, `WD1`, `CS`, course codes like `10003GS`) |
| `period_due_dates` | TEXT | JSON string of per-period due dates |
| `created_at` | DATETIME | Auto-set on insert |

**Read by:** `api/admin/master-gradebook-data.php`, `api/student/course-gradebook.php`, `server/api.js`  
**Written by:** `api/admin/save-assignment.php`, `api/admin/edit-assignment.php`, `api/admin/delete-assignment.php`, `api/clockin.php` (auto-creates TC attendance rows), `api/admin/clear-all-assignments.php`

---

### `grades`
One row per (student, assignment) pair — the actual grade entries.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR(50) | FK → students.student_id |
| `exam_id` | VARCHAR(250) | FK → exams.exam_id |
| `score` | VARCHAR(50) | Stored as string to allow `"EX"`, `"INC"`, numeric values |
| `total_points` | INT | Snapshot of max points at time of grading |
| `timestamp` | DATETIME | Auto-updated on each change |

**Unique key:** `(student_id, exam_id)` — prevents duplicate grades  
**Read by:** `api/admin/master-gradebook-data.php`, `api/student/grades.php`, `api/student/course-gradebook.php`  
**Written by:** `api/admin/save-grade.php`, `api/admin/batch-update-grades.php`, `api/admin/clear-all-assignments.php`, `api/clockin.php`  
**Note:** Node.js uses a parallel `responses` table via `server/api.js` that mirrors this schema.

---

### `responses` (Node.js side)
Mirror of `grades`, used exclusively by Node.js API endpoints.

| Column | Type | Notes |
|--------|------|-------|
| `student_id` | VARCHAR | FK → students |
| `exam_id` | VARCHAR | FK → exams |
| `score` | NUMERIC | |
| `total_points` | INT | |
| `timestamp` | DATETIME | |

**Note:** The PHP side uses `grades` and the Node.js side uses `responses`. Both ultimately write to the same MariaDB database but different table names. This is a migration artifact.

---

### `exam_progress`
Saves in-progress exam answers so students can resume if they close the browser.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR(50) | |
| `exam_id` | VARCHAR(250) | |
| `answers` | TEXT | JSON array of selected answers (PHP side) |
| `progress_json` | MEDIUMTEXT | Full progress blob (Node.js side) |
| `current_index` | INT | Last question index reached (PHP side) |
| `updated_at` | DATETIME | Auto-updated |

**Unique key:** `(student_id, exam_id)`  
**Read/Written by:** `api/student/exam-progress.php`, `server/api.js` (GET/POST/DELETE `/api/student/exam-progress`)

---

### `timeclock_log`
Raw timeclock events (every clock-in and clock-out punch).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR(50) | |
| `section_id` | VARCHAR(50) | Student's class period at time of punch |
| `type` | VARCHAR(20) | `Regular`, `Overtime`, `Out`, etc. |
| `answer` | VARCHAR(500) | Student's answer to the exit ticket question |
| `timestamp` | DATETIME | Auto-set |

**Written by:** `api/clockin.php`  
**Read by:** Payroll dashboard (via `server/api.js` `/admin/payroll/timesheets-daily` and `timesheets-period`)

---

### `timesheets` (Node.js side)
Structured timesheet rows used by the payroll dashboard. One row per student per day.

| Column | Type | Notes |
|--------|------|-------|
| `student_id` | VARCHAR | |
| `date` | DATE | |
| `clock_in` | TIME | |
| `clock_out` | TIME | |
| `in_answer` | TEXT | Knowledge check answer |
| `out_answer` | TEXT | Reflection/exit ticket answer |

**Read by:** `server/api.js` `/admin/payroll/timesheets-daily`, `/admin/payroll/timesheets-period`  
**Written by:** `server/api.js` `/admin/inject-timesheets` (testing), timeclock student flow

---

### `self_assessments`
Student self-ratings per chapter (pre and post).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR(50) | |
| `chapter_id` | INT | Chapter number |
| `level` | FLOAT | Proficiency level (0.0–4.0) |
| `mode` | VARCHAR(10) | `pre` or `post` |
| `updated_at` | DATETIME | Auto-updated |

**Unique key:** `(student_id, chapter_id, mode)`  
**Read by:** `api/student/self-assessments.php`, `server/api.js`  
**Written by:** `api/student/save-self-assessment.php`, `server/api.js`

---

### `calendar_events`
All calendar events — both CSV-imported school calendar data and manually added events.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `event_date` | DATE | |
| `title` | VARCHAR(255) | Event name / description |
| `type` | VARCHAR(20) | `A`, `B`, `A_MIN`, `B_MIN`, `OFF`, `C`, `none` |
| `description` | TEXT | Optional longer description |
| `all_day` | TINYINT(1) | 1 = all-day, 0 = has specific times |
| `start_time` | TIME | Null if all-day |
| `end_time` | TIME | Null if all-day |
| `source` | VARCHAR(20) | `csv` = imported via CSV upload; `manual` = teacher-added one at a time |
| `created_at` | DATETIME | |

**Read by:** `api/events.php` (GET — loads all events for calendar)  
**Written by:** `api/events.php` (POST = add, PUT = edit, DELETE = remove), `api/save-csv.php` (bulk import, deletes all `source='csv'` rows first)  
**Auto-created by:** `api/events.php` on first request (`CREATE TABLE IF NOT EXISTS`)

---

### `bell_schedule`
Period times for each schedule type. Each row is one period/section on one type of day.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `schedule_type` | VARCHAR(10) | Day type: `Mon`, `Tue`, `Wed`, `Thu`, `Fri` for regular; `SS_Mon`…`SS_Fri` for summer school |
| `period_label` | VARCHAR(50) | E.g., `A1`, `B2`, `Lunch` |
| `sort_order` | INT | Display order within the day |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `section_id` | VARCHAR(50) | Optional — which class section this period maps to |
| `course_name` | VARCHAR(100) | Optional — display name for the course |

**Read by:** `api/bell-schedule.php` (GET), `js/calendar.js` (`getBellSchedule()` → GET /api/bell-schedule.php)  
**Written by:** `api/bell-schedule.php` (POST — replaces rows for given schedule types)

---

### `school_config`
Four key-value pairs controlling the school year date boundaries.

| config_key | Meaning |
|-----------|---------|
| `regular_start` | First day of regular school year (YYYY-MM-DD) |
| `regular_end` | Last day of regular school year (YYYY-MM-DD) |
| `summer_start` | First day of summer school (YYYY-MM-DD) |
| `summer_end` | Last day of summer school (YYYY-MM-DD) |

**Read by:** `api/school-config.php` (GET), `js/calendar.js` (loaded on init into `schoolConfig` object)  
**Written by:** `api/school-config.php` (POST), calendar sidebar bell schedule modal

---

### `office_hours`
Teacher's weekly office hour windows. Multiple windows per day are allowed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `day_of_week` | TINYINT | 0=Sunday, 1=Monday…6=Saturday |
| `start_time` | TIME | |
| `end_time` | TIME | |
| `slot_duration` | INT | Minutes per appointment slot (default 15) |

**Read by:** `api/appointments/office-hours.php` (GET), `api/appointments/slots.php`  
**Written by:** `api/appointments/office-hours.php` (POST — full replace, deletes all rows first)

---

### `appointments`
Student appointment requests and their approval status.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR(50) | FK → students |
| `date` | DATE | |
| `time` | TIME | |
| `reason` | TEXT | Student-provided reason for the meeting |
| `status` | VARCHAR(20) | `pending`, `approved`, `denied` |
| `teacher_note` | TEXT | Optional teacher note shown to student |
| `created_at` | DATETIME | |

**Unique key:** `(date, time)` — prevents double-booking the same slot  
**Read by:** `api/appointments/requests.php`, `api/appointments/slots.php`  
**Written by:** `api/appointments/book.php` (student creates), `api/appointments/update-status.php` (teacher approves/denies)

---

### `rubrics`
Assignment grading rubrics managed from admin/rubrics.html.

| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR(100) PK | UUID-style string ID |
| `title` | VARCHAR(255) | |
| `course` | VARCHAR(100) | Course level (Web Design 1, Web Design 2, Computer Science) |
| `enable_self_grade` | TINYINT(1) | |
| `enable_peer_grade` | TINYINT(1) | |
| `criteria_json` | TEXT | JSON array of criterion objects |
| `total_points` | INT | |
| `last_updated` | BIGINT | Unix timestamp (ms) |

**Read/Written by:** `server/api.js` (GET/POST `/api/admin/rubrics`, DELETE `/api/admin/rubrics/:id`)  
**Used by:** `admin/rubrics.html`, `admin/files.html` (auto-grader selects rubric)

---

### `review_questions`
All review game questions for Web Design (seeded from JS data files via admin.html).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `chapter` | VARCHAR(200) | Chapter name (e.g., `"Chapter 5: Sights & Sounds"`) |
| `grade` | VARCHAR(100) | Course level (`"Web Design 1"`, `"Web Design 2"`) |
| `cat` | VARCHAR(100) | Category within the game |
| `val` | INT | Point value |
| `q` | TEXT | Question text |
| `a` | VARCHAR(1000) | Answer text |
| `d` | JSON | Array of distractors / multiple-choice options |

**Read by:** `server/api.js` GET `/api/review-questions`  
**Written by:** `server/api.js` POST `/api/admin/review-questions/seed` (called from admin.html migration tool)

---

### `questions`
CS exam questions (separate from WD review questions). Seeded by import scripts.

| Column | Type | Notes |
|--------|------|-------|
| `question_id` | INT PK | |
| `exam_id` | VARCHAR | Maps to CS unit (e.g., `cs-unit-1`, `cs-u1-exam`) |
| `question_text` | TEXT | |
| `option_a` through `option_d` | VARCHAR | Answer choices |
| `correct_answer` | VARCHAR | |
| `study_hint` | TEXT | |
| `chapter_number` | INT | Numeric chapter |

**Read by:** `server/api.js` GET `/api/cs-exam-questions`

---

### `notebook_entries`
Student digital notebook entries (Web Design students).

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `student_id` | VARCHAR | |
| `chapter_id` | INT | Chapter number |
| `title` | VARCHAR(255) | |
| `category` | VARCHAR(100) | E.g., `Notes`, `Reflection` |
| `content` | TEXT | Note body (may contain HTML) |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

**Read by:** `server/api.js` GET `/api/student/notebook`, `/api/admin/notebooks/entries`  
**Written by:** `server/api.js` POST `/api/student/notebook/save`, `/api/student/notebook/delete`

---

### `turnins`
CS student notebook entries (used differently from notebook_entries — CS-specific).

| Column | Type | Notes |
|--------|------|-------|
| `student_id` | VARCHAR | |
| `chapter` | VARCHAR | Chapter reference |
| `title` | VARCHAR | |
| `category` | VARCHAR | |
| `content` | TEXT | |
| `is_submitted` | TINYINT | |
| `timestamp` | DATETIME | |

**Read/Written by:** `server/api.js` GET/POST `/api/student/cs-notebook`

---

### `teacher_daily_questions`
Per-date clock-out prompts (exit tickets) set by the teacher.

| Column | Type | Notes |
|--------|------|-------|
| `date` | DATE PK | |
| `wd_question` | TEXT | Question shown to Web Design students at clock-out |
| `cs_question` | TEXT | Question shown to CS students at clock-out |
| `updated_at` | TIMESTAMP | |

**Read by:** `server/api.js` GET `/api/admin/daily-questions`  
**Written by:** `server/api.js` POST `/api/admin/daily-questions` (from admin/payroll.html "Set Prompts" button)

---

### `pay_roles`
Pay rate definitions for the classroom payroll simulation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK | |
| `title` | VARCHAR | Job title (e.g., `Web Developer`) |
| `hourly_rate` | DECIMAL | Simulated hourly rate |

**Read by:** `server/api.js` payroll roster queries (JOINed to `students.role_id`)

---

### `cs_questions`
Legacy CS question table (may be superseded by `questions` table).

| Column | Type |
|--------|------|
| `id` | INT AUTO_INCREMENT PK |
| `unit` | VARCHAR(10) |
| `question` | TEXT |
| `options` | TEXT (JSON) |
| `answer` | VARCHAR(500) |
| `hint` | TEXT |
| `course_id` | VARCHAR(50) |

**Created by:** `api/setup-db.php`

---

### `class_sections`
Catalog of valid section IDs (used to validate roster uploads).

| Column | Type |
|--------|------|
| `section_id` | VARCHAR PK |
| `course_id` | VARCHAR |

**Read by:** `server/api.js` (validates `section_id` on roster upload and student save)

---

### Additional tables (project workflow, created via Node.js DDL)
- `chapter_projects` — project spec definitions per chapter
- `project_submissions` — student file submission metadata
- `project_evaluations` — self/peer/auto rubric scores
- `project_grade_aggregates` — computed aggregate scores
- `calendar_settings` — JSON blob for calendar config (Node.js-only)
- `shared_files` — peer file sharing inbox

---

## Database Initialization

Run `/api/setup-db.php` once after deployment to create all core tables. Delete the file afterward. Node.js tables are created automatically on first API call via inline `CREATE TABLE IF NOT EXISTS` statements.
