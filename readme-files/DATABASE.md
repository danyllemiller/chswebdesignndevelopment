# Database Reference — chs_gradebook

**Engine:** MariaDB · **Host:** localhost · **User:** root · **DB:** chs_gradebook  
Credentials are stored in `api/db_config.php` and `server/db.js` — do not commit those files.

Schema verified live on 2026-06-22 (29 tables).

---

## Table Index

| Table | Purpose |
|-------|---------|
| [appointments](#appointments) | Student-booked office-hour slots |
| [bell_schedule](#bell_schedule) | Period times per schedule type (A/B day, summer) |
| [calendar_events](#calendar_events) | School calendar dates (CSV-imported + manually added) |
| [calendar_settings](#calendar_settings) | Legacy single-row JSON config (mostly superseded by school_config) |
| [chapters](#chapters) | Course chapter list (WD + CS) |
| [class_sections](#class_sections) | Roster section definitions (A1, B2, etc.) |
| [clockins](#clockins) | Student clock-in/out answers (raw log) |
| [courses](#courses) | Course catalog |
| [cs_notebook](#cs_notebook) | CS student notebook entries |
| [cs_questions](#cs_questions) | CS review quiz questions |
| [daily_questions](#daily_questions) | Daily warm-up questions pool |
| [exam_progress](#exam_progress) | Saved mid-exam progress (JSON blob) |
| [exams](#exams) | Assignment/exam definitions |
| [grades](#grades) | Teacher-entered scores per student per exam |
| [notebook_entries](#notebook_entries) | WD student notebook entries |
| [office_hours](#office_hours) | Teacher availability windows |
| [pay_roles](#pay_roles) | Payroll role definitions with hourly rates |
| [questions](#questions) | WD exam multiple-choice questions |
| [responses](#responses) | Submitted exam score records |
| [review_questions](#review_questions) | Jeopardy-style review game questions |
| [school_config](#school_config) | School year + summer school date boundaries |
| [self_assessments](#self_assessments) | Student self-rating per chapter |
| [shared_files](#shared_files) | Teacher-shared files/folders per student |
| [student_responses](#student_responses) | Per-question student answers on exams |
| [students](#students) | All users (students, teacher, admin) |
| [teacher_daily_questions](#teacher_daily_questions) | Teacher-set daily question per date |
| [timeclock_log](#timeclock_log) | Raw clock-in/out punch log |
| [timesheets](#timesheets) | Summarised daily clock-in/out with score |
| [turnins](#turnins) | Student assignment turn-ins |

---

## appointments

Student office-hour appointment bookings.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | FK → students.student_id |
| date | date | NO | — | Appointment date |
| time | time | NO | — | Start time of slot |
| reason | text | YES | NULL | Student-entered reason |
| status | varchar(20) | NO | 'pending' | pending / approved / denied |
| teacher_note | text | YES | NULL | Teacher response note |
| created_at | datetime | NO | current_timestamp() | |

**Used by:** `api/appointments/book.php` (INSERT), `api/appointments/requests.php` (GET all), `api/appointments/update-status.php` (PUT status+note), `js/calendar.js` (appointment UI)

---

## bell_schedule

One row per period per schedule day type. Multiple rows share the same `section_id`/`period_label` across different `schedule_type` values.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| schedule_type | varchar(10) | NO | — | Mon/Tue/Wed/Thu/Fri (regular) or SS_Mon…SS_Fri (summer school) |
| period_label | varchar(50) | NO | — | e.g. "A1", "B3" |
| sort_order | int(11) | NO | 0 | Display order within a day |
| start_time | time | NO | — | Period start |
| end_time | time | NO | — | Period end |
| section_id | varchar(50) | YES | NULL | Links to class_sections.section_id |
| course_name | varchar(100) | YES | NULL | Human-readable course name |

**Used by:** `api/bell-schedule.php` (GET all, POST replace by schedule_types), `js/calendar.js` `getBellSchedule()` / `getBellDayKey()` / week+day view rendering

**Key logic:** `getBellDayKey()` in `calendar.js` checks `school_config` date boundaries and `specialDates` OFF-day flag before returning a key. It never shows schedule outside school year bounds or on OFF days.

---

## calendar_events

All calendar date entries. Two sources coexist in the same table distinguished by `source`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| event_date | date | NO | — | YYYY-MM-DD |
| title | varchar(255) | NO | — | Display title |
| type | varchar(20) | NO | 'none' | A / B / A_MIN / B_MIN / OFF / C / none |
| description | text | YES | NULL | Extra detail shown in sidebar |
| all_day | tinyint(1) | NO | 1 | 1 = all-day, 0 = timed |
| start_time | time | YES | NULL | Only when all_day=0 |
| end_time | time | YES | NULL | Only when all_day=0 |
| created_at | datetime | NO | current_timestamp() | |
| source | varchar(20) | NO | 'manual' | **'csv'** = bulk CSV import, **'manual'** = teacher-added via modal, **'due_date'** = auto-generated by Due Date Manager |

**source='csv' rows** are deleted and replaced every time a CSV is imported via `api/save-csv.php`.  
**source='manual' rows** (including summer school dates inserted directly via SQL) are never touched by CSV import.  
**source='due_date' rows** are deleted and rebuilt in full every time the teacher saves due dates via `admin/due-dates.html`. Each assignment with a due date generates one event titled `"{assignment title} Due"` (type `none`). Period-specific due dates generate additional events titled `"{title} Due – Period {id}"`.

**Used by:** `api/events.php` (GET all, POST insert, PUT update, DELETE by id), `api/save-csv.php` (DELETE csv + bulk INSERT csv), `api/admin/save-due-dates.php` (DELETE due_date + bulk INSERT due_date), `js/calendar.js` initCalendar() / saveSingleEvent() / deleteEvent()

---

## calendar_settings

Legacy single-row configuration stored as a JSON blob. Mostly superseded by `school_config`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) | NO | 1 | Always row id=1 |
| config_json | longtext | NO | — | JSON object |

**Note:** Not actively written by current JS code. Verify usage before dropping.

---

## chapters

Course chapter/unit definitions for the notebook system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| chapter_number | int(11) | NO | — | |
| chapter_name | varchar(100) | NO | — | |
| course_id | varchar(50) | NO | — | FK → courses.course_id |
| is_visible | tinyint(1) | YES | 1 | 0 = hidden from students |

**Used by:** Notebook entry forms; admin chapter management pages.

---

## class_sections

Roster section definitions — which class period/section exists.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| section_id | varchar(50) PK | NO | — | e.g. "A1", "B3", "CS2" |
| course_id | varchar(50) | YES | NULL | FK → courses.course_id |

**Used by:** `api/admin/master-gradebook-data.php`, `api/student/profile.php`, gradebook HTML, roster HTML

---

## clockins

Raw clock-in/clock-out answer log (one row per event).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | YES | NULL | |
| section_id | varchar(50) | YES | NULL | |
| type | varchar(50) | YES | NULL | "clockin" or "clockout" |
| answer | text | YES | NULL | Student's reflective answer |
| timestamp | datetime | YES | NULL | |

**Used by:** `api/clockin.php` (INSERT); payroll dashboard reads `timesheets` instead (which aggregates clockin pairs)

---

## courses

Course catalog.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| course_id | varchar(50) PK | NO | — | e.g. "WD", "CS" |
| course_name | varchar(100) | YES | NULL | |
| department | varchar(50) | YES | NULL | |

**Used by:** chapters, class_sections, exams, gradebook queries

---

## cs_notebook

CS course student notebook entries (separate from WD `notebook_entries`).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(100) | NO | — | |
| chapter | varchar(200) | YES | NULL | Chapter name/number string |
| title | varchar(300) | YES | NULL | Entry title |
| category | varchar(100) | YES | NULL | Notes / Do Now / Exit Ticket / Worksheet |
| content | mediumtext | YES | NULL | Entry body (HTML or plain text) |
| is_submitted | tinyint(1) | YES | 0 | 1 = submitted to teacher |
| timestamp | bigint(20) | YES | NULL | Unix ms timestamp |
| updated_at | timestamp | YES | current_timestamp() | Auto-updated |

**Used by:** CS notebook JS / PHP endpoints, `admin/notebooks.html`

---

## cs_questions

Multiple-choice questions for the CS review quiz engine.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| unit | varchar(10) | NO | — | Unit identifier |
| question | text | NO | — | Question text |
| options | text | NO | — | JSON array of answer choices |
| answer | varchar(500) | NO | — | Correct answer text |
| hint | text | YES | NULL | |
| course_id | varchar(50) | YES | 'CS' | |

**Used by:** `api/cs-exam-questions.php`, CS interactive quiz pages

---

## daily_questions

Pool of daily warm-up questions used by the clock-in system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| day_group | int(11) | YES | NULL | Groups questions for rotation |
| category | varchar(50) | YES | NULL | WD or CS |
| question_text | text | YES | NULL | |
| options | longtext | YES | NULL | JSON array |
| correct_answer | text | YES | NULL | |
| is_default | tinyint(1) | YES | 0 | 1 = shipped with system |
| study_hint | text | YES | NULL | |

**Used by:** `api/clockin.php`, falls back to this pool when no teacher override exists in `teacher_daily_questions` for that date

---

## exam_progress

Saves in-progress exam state so students can resume without losing work.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(100) | NO | — | |
| exam_id | varchar(200) | NO | — | |
| progress_json | mediumtext | YES | NULL | Full exam state as JSON |
| updated_at | timestamp | YES | current_timestamp() | Auto-updated |

**Used by:** `api/student/exam-progress.php` (GET/POST), exam HTML pages

---

## exams

Assignment and exam definitions created by the teacher.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| exam_id | varchar(50) PK | NO | — | Teacher-defined ID slug |
| title | varchar(100) | YES | NULL | Display name |
| total_points | int(11) | YES | NULL | Max score |
| course_id | varchar(50) | YES | NULL | FK → courses.course_id |
| due_date | date | YES | NULL | Default due date |
| instructions | text | YES | NULL | Assignment instructions |
| period_due_dates | text | YES | NULL | JSON map of section_id → due_date overrides |

**Known exam_id conventions:**
- CS pre-assessments: `Unit${n}-Pre` (n = 0–8)
- CS summative exams: `Unit${n}-Exam` (n = 0–8)
- CS Final Exam: `Unit9-Exam`
- CS chapter notes: `Unit${n}-Ch${ch}` (created by Due Date Manager for calendar purposes)
- WD pre-assessments: `WD-Ch${n}-Pre` (created by Due Date Manager; WD exam pages submit to `Unit${n}-Exam` via examLogicCS.js)
- WD chapter exams: `WD-Ch${n}-Exam` (Due Date Manager); actual gradebook key submitted by exams is `Unit${n}-Exam`

**Used by:** `api/admin/save-assignment.php` (INSERT/UPDATE), `api/admin/edit-assignment.php`, `api/admin/delete-assignment.php`, `api/admin/master-gradebook-data.php` (ORDER BY exam_id), `api/admin/get-due-dates.php` (read), `api/admin/save-due-dates.php` (upsert), `admin/gradebook.html`, `admin/due-dates.html`

---

## grades

Teacher-entered scores — one row per student per exam.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | |
| exam_id | varchar(250) | NO | — | |
| score | varchar(50) | YES | NULL | Stored as string to allow letter grades (E, M, A, B, etc.) |
| total_points | int(11) | YES | 100 | |
| timestamp | datetime | NO | current_timestamp() | |

**Used by:** `api/admin/save-grade.php` (UPSERT), `api/admin/batch-update-grades.php`, `api/student/grades.php` (student view), `admin/gradebook.html`

---

## notebook_entries

WD course student notebook entries.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | |
| chapter_id | int(11) | NO | — | FK → chapters.id |
| title | varchar(150) | NO | — | |
| category | enum('Notes','Do Now','Exit Ticket','Worksheet') | YES | 'Notes' | |
| content | longtext | NO | — | |
| created_at | timestamp | YES | current_timestamp() | |
| updated_at | timestamp | YES | current_timestamp() | |

**Used by:** Student notebook pages, `admin/notebooks.html`

---

## office_hours

Teacher's available appointment windows.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| day_of_week | tinyint(4) | NO | — | 0=Sun … 6=Sat |
| start_time | time | NO | — | Window start |
| end_time | time | NO | — | Window end |
| slot_duration | int(11) | NO | 15 | Minutes per bookable slot |

**Used by:** `api/appointments/office-hours.php` (GET/POST — replaces all rows on save), `api/appointments/slots.php` (generates available slots)

---

## pay_roles

Payroll role types with hourly rates for the timeclock/payroll system.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| title | varchar(50) | NO | — | Role name e.g. "Web Design TA" |
| hourly_rate | decimal(5,2) | NO | — | Pay rate |

**Used by:** `admin/payroll.html`, payroll calculation logic

---

## questions

WD exam multiple-choice questions (4-option A/B/C/D format).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| question_id | int(11) PK AUTO | NO | — | |
| exam_id | varchar(50) | YES | NULL | FK → exams.exam_id |
| chapter_number | varchar(10) | YES | NULL | |
| question_text | text | YES | NULL | |
| option_a | varchar(255) | YES | NULL | |
| option_b | varchar(255) | YES | NULL | |
| option_c | varchar(255) | YES | NULL | |
| option_d | varchar(255) | YES | NULL | |
| correct_answer | varchar(255) | YES | NULL | |
| study_hint | text | YES | NULL | |
| concept_tag | varchar(100) | YES | NULL | Topic tag for grouping |

**Used by:** WD exam/quiz pages, `api/submit-exam.php`

---

## responses

Top-level exam submission record (score summary, not per-question).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | YES | NULL | |
| exam_id | varchar(100) | YES | NULL | |
| score | varchar(10) | YES | NULL | |
| total_points | int(11) | YES | NULL | |
| timestamp | datetime | YES | NULL | |

**Used by:** `api/submit-exam.php`, grade-display logic. See also `student_responses` for per-question detail.

---

## review_questions

Jeopardy-style review game question bank.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| chapter | varchar(200) | YES | NULL | Chapter/unit reference |
| grade | varchar(100) | YES | NULL | Difficulty/grade level |
| cat | varchar(100) | YES | NULL | Jeopardy column name |
| val | int(11) | YES | NULL | Point value (100/200/300…) |
| q | text | NO | — | Question text |
| a | varchar(1000) | YES | NULL | Answer |
| d | longtext | YES | NULL | Detail/explanation |

**Used by:** Review game HTML pages, `api/` review question endpoints

---

## school_config

Key-value store for school year date boundaries. Controls when bell schedule appears on the calendar.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| config_key | varchar(50) PK | NO | — | One of four fixed keys (see below) |
| config_value | varchar(20) | NO | '' | YYYY-MM-DD date string |

**Four keys:**

| Key | Meaning |
|-----|---------|
| regular_start | First day of regular school year |
| regular_end | Last day of regular school year |
| summer_start | First day of summer school |
| summer_end | Last day of summer school |

**Set via:** Bell Schedule modal → "SCHEDULE APPLIES" date pickers → saved alongside bell periods via `api/school-config.php`.  
**Used by:** `api/school-config.php` (GET/POST with ON DUPLICATE KEY UPDATE), `js/calendar.js` `getBellDayKey()` — schedule blocks only render within the configured date range.

---

## self_assessments

Student self-rating (numeric scale) per chapter.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | |
| chapter_id | varchar(50) | NO | — | Chapter identifier string |
| level | float | NO | — | Self-rating value |
| updated_at | timestamp | YES | current_timestamp() | |

**Used by:** `api/student/save-self-assessment.php`, `api/student/self-assessments.php`, student grade pages

---

## shared_files

Files and folders the teacher shares with specific students.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| recipient_student_id | varchar(50) | NO | — | Target student |
| sender_name | varchar(100) | YES | NULL | Teacher display name |
| file_name | varchar(255) | YES | NULL | Display name |
| url | text | YES | NULL | Link to file |
| is_folder | tinyint(1) | YES | 0 | 1 = folder row (no direct file) |
| created_at | timestamp | YES | current_timestamp() | |

**Used by:** `admin/files.html`, student file explorer pages

---

## student_responses

Per-question answer record for each exam submission.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| response_id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | YES | NULL | |
| exam_id | varchar(50) | YES | NULL | |
| question_id | int(11) | YES | NULL | FK → questions.question_id |
| student_answer | varchar(255) | YES | NULL | The answer the student chose |
| is_correct | tinyint(1) | YES | NULL | 1/0 |
| submission_date | timestamp | YES | current_timestamp() | |

**Used by:** `api/submit-exam.php`, exam result review pages

---

## students

All site users — students, teacher, and admin. Role controls access.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| student_id | varchar(50) PK | NO | — | Unique ID (school ID or 'teacher') |
| first_name | varchar(50) | YES | NULL | |
| last_name | varchar(50) | YES | NULL | |
| section_id | varchar(50) | YES | NULL | FK → class_sections.section_id |
| email | varchar(100) | YES | NULL | |
| password_hash | varchar(255) | YES | NULL | bcrypt hash — used by PHP auth path |
| role | varchar(50) | YES | 'student' | 'student' / 'teacher' / 'admin' |
| username | varchar(50) | YES | NULL | Login username |
| password | varchar(255) | YES | NULL | Used by Node.js auth path (legacy) |
| role_id | int(11) | YES | 1 | Numeric role (legacy) |
| must_change_password | tinyint(1) | NO | 0 | Forces password change on next login |
| password_updated_at | datetime | YES | NULL | |

**Two auth paths exist:**
- PHP `api/login.php` → reads `password_hash` (bcrypt via `password_verify()`)
- Node.js `server/auth.js` → reads `password` column (legacy)

Both paths return the same session structure. See `AUTH.md` for full login flow.

**Used by:** `api/login.php`, `api/register.php`, `api/change-password.php`, virtually every protected API endpoint checks role here, `auth-guard.js` uses the returned `role` field

---

## teacher_daily_questions

Teacher overrides for the daily clock-in warm-up question, keyed by date.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| date | date PK | NO | — | The school day date |
| wd_question | text | YES | NULL | Question for WD students |
| cs_question | text | YES | NULL | Question for CS students |
| updated_at | timestamp | YES | current_timestamp() | |

**Used by:** Teacher daily-question editor; `api/clockin.php` checks this first before falling back to the `daily_questions` pool.

---

## timeclock_log

Raw punch log — one row per clock-in or clock-out event.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | |
| section_id | varchar(50) | YES | NULL | |
| type | varchar(20) | NO | — | 'clockin' or 'clockout' |
| answer | varchar(500) | YES | NULL | Warm-up question answer |
| timestamp | datetime | NO | current_timestamp() | |

**Used by:** `api/clockin.php` (INSERT), payroll dashboard aggregation

---

## timesheets

Summarised daily attendance — one row per student per day pairing a clock-in with a clock-out.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | YES | NULL | |
| date | date | YES | NULL | |
| clock_in | datetime | YES | NULL | |
| clock_out | datetime | YES | NULL | |
| in_answer | text | YES | NULL | Clock-in warm-up answer |
| out_answer | text | YES | NULL | Clock-out warm-up answer |
| score | int(11) | YES | 0 | Auto-scored answer quality |

**Used by:** `admin/payroll.html`, hourly pay calculation (clock_in/clock_out diff × pay_roles.hourly_rate)

---

## turnins

Student assignment turn-in records.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | int(11) PK AUTO | NO | — | |
| student_id | varchar(50) | NO | — | |
| assignment_name | varchar(100) | YES | NULL | |
| chapter | varchar(200) | YES | NULL | |
| title | varchar(300) | YES | NULL | |
| category | varchar(100) | YES | NULL | |
| content | mediumtext | YES | NULL | Submission content |
| note | text | YES | NULL | Student note to teacher |
| is_submitted | tinyint(1) | YES | 0 | 1 = formally submitted |
| timestamp | datetime | YES | current_timestamp() | |

**Used by:** Student turn-in pages, `admin/files.html` teacher view

---

## Relationship Diagram (text)

```
courses ──< chapters
courses ──< class_sections ──< students ──< grades
                                        ──< timeclock_log
                                        ──< timesheets
                                        ──< appointments
                                        ──< notebook_entries
                                        ──< cs_notebook
                                        ──< turnins
                                        ──< self_assessments
                                        ──< student_responses
                                        ──< exam_progress
                                        ──< responses

exams ──< grades
      ──< questions ──< student_responses
      ──< exam_progress

calendar_events  (source = 'csv' | 'manual' | 'due_date')
bell_schedule    (schedule_type = Mon…Fri | SS_Mon…SS_Fri)
school_config    (4 key-value rows: regular_start/end, summer_start/end)
office_hours     (teacher availability windows)
pay_roles        (hourly rates referenced by timesheets)
```
