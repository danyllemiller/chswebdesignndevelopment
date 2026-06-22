# GRADEBOOK.md — Gradebook System

## Overview

The gradebook system has two faces:
- **Teacher view** (`admin/gradebook.html`) — a spreadsheet-style master view of all students and all assignments
- **Student view** (student portal pages) — a read-only view of the logged-in student's own grades

---

## Teacher Gradebook

### Page: `admin/gradebook.html`
**Script:** `js/admin/gradebook.js`  
**CSS:** `css/teacher-gradebook.css` (separate from `dacStyleSheets.css`)  
**Auth:** Requires teacher role (enforced by `auth-guard.js`)

### Data Loading

On page load, `gradebook.js` calls:
```js
fetch('/api/admin/master-gradebook-data.php')
// Returns: { students, assignments, grades }
```

- `students` — all non-admin accounts, ordered by section then name
- `assignments` — all exam definitions from the `exams` table
- `grades` — all grade entries from the `grades` table

The JS builds an in-memory registry:
- `assignmentRegistry` — keyed by `exam_id`, holds `{ title, maxPoints, dueDate, targetCourse }`
- `gradeMap` — keyed by `${studentId}:${examId}`, holds score

### Spreadsheet Rendering

The gradebook renders as an HTML `<table>` with:
- **Row 0:** Empty header + one `<th>` per assignment (showing title + max points)
- **Rows 1–N:** One row per student, showing student name/section + one editable cell per assignment

Cells are rendered as `<input type="text">` elements. When a cell value changes, the change is queued in a `pendingChanges` object. Changes are batch-saved via:
```js
POST /api/admin/batch-update-grades.php
Body: { batch: [{ studentId, updates: { examId: { score, max } } }] }
```

### Period Filter

The `#periodFilter` dropdown is populated from the unique `section_id` values in the student data. Selecting a period filters the visible rows. The `#studentFilter` dropdown further narrows to one individual student.

### Assignment Management

The teacher can:
- **Add assignment:** Opens a modal, posts to `POST /api/admin/save-assignment.php`
- **Edit assignment:** Posts to `POST /api/admin/edit-assignment.php` (handles exam_id renames via transaction)
- **Delete assignment:** Posts to `POST /api/admin/delete-assignment.php` (also deletes all grades for that assignment)
- **Clear all:** Posts to `POST /api/admin/clear-all-assignments.php` (DESTRUCTIVE — wipes all exams and grades)

### Grade Entry

Individual cell editing sends:
```js
POST /api/admin/save-grade.php
Body: { student_id, exam_id, score, total_points }
```

Batch editing (e.g., paste, bulk fill) uses:
```js
POST /api/admin/batch-update-grades.php
Body: { batch: [{ studentId, updates: { examId: { score, max } } }] }
```

Both endpoints use `INSERT ... ON DUPLICATE KEY UPDATE` (upsert) so they are safe to call repeatedly.

---

## Timeclock → Gradebook Integration

When a student clocks in or out, `api/clockin.php` automatically:
1. Creates an exam row: `TC-In {date} [1 pts]` or `TC-Out {date} [1 pts]`
2. Records a grade of `1/1` for that student for that day

This means attendance appears as columns in the master gradebook. Overtime punches do NOT create attendance records.

---

## Roster Management

### Page: `admin/roster.html`
**Script:** `js/admin/roster.js`  
**CSS:** `css/admin-roster.css`

The roster page has three tabs:

**1. View Roster**
- Loads via `GET /api/admin/roster` (Node.js)
- Supports search by name, ID, or username
- Filters by period, course, and role
- Bulk selection with checkboxes → "Remove Selected" calls `POST /api/admin/delete-multiple-students`

**2. Add Student**
- Single form: First Name, Last Name, Student ID, Role/Period
- Calls `POST /api/admin/upload-roster` (Node.js) with a one-item array

**3. Bulk CSV Upload**
- CSV format: `First Name, Last Name, ID, Period`
- Calls `POST /api/admin/upload-roster` (Node.js) with the parsed array

**Edit Modal (per student):**
- Edits name, username, period, role
- Optional password field (leave blank = keep existing)
- "Reset Password to Student ID" → `POST /api/admin/reset-password-default`
- "Wipe & Allow Re-Registration" → `POST /api/admin/reset-student` (clears username + password)
- "Delete Student Entirely" → `DELETE /api/admin/delete-student`

---

## Student Grade View

### Flow

1. Student logs in → auth-guard stores user in `localStorage`
2. Student navigates to their grades page
3. Page calls `GET /api/student/course-gradebook.php?student_id={id}`
4. Response includes all assignment definitions merged with the student's scores
5. Assignments with `course_id = 'All'` or matching the student's course are shown
6. `score = null` = not yet graded / not yet submitted

### Alternative Node.js path

`GET /api/student/grades` (Node.js, reads from `responses` table) returns the same concept but from the Node.js data layer. This is used by some student-facing JS files.

---

## Payroll Dashboard

### Page: `admin/payroll.html`
**Script:** `js/admin/payroll.js`

The payroll system is a classroom simulation where students "earn" wages by clocking in. It is separate from the academic gradebook but uses the same timeclock data.

**Teacher view:**
- Daily mode: `GET /api/admin/payroll/timesheets-daily?date=` — shows all student clock-in/out records for one date
- Period mode: `GET /api/admin/payroll/timesheets-period?from=&to=` — shows a date range
- "Set Prompts" modal → `POST /api/admin/daily-questions` — sets the exit ticket question that appears at clock-out for WD and CS students separately
- "Inject Test Data" → `POST /api/admin/inject-timesheets` — fills fake timesheet entries (testing tool)
- "School Calendar Settings" modal → saves/loads calendar config via `POST/GET /api/admin/calendar-settings`

**Pay rate:**
- Students are linked to `pay_roles` via `students.role_id`
- Default role title: "Web Developer", default rate: $35.00/hr
- Estimated daily pay = `(clock_out - clock_in) * hourly_rate`

---

## Student Files

### Page: `admin/files.html`
**Script:** `js/admin-files.js` (note: not in `js/admin/` subdirectory)

The teacher can browse student files hosted on HostGator (the legacy file server). The auto-grader feature:
1. Teacher selects a student and a rubric from `GET /api/admin/rubrics`
2. The JS downloads the student's HTML/CSS files from HostGator
3. Checks the code against rubric criteria (auto-grade rules stored in `criteria_json`)
4. Displays per-criterion proficiency scores (1.0–4.0 scale)
5. Computes aggregate score
6. On save: `POST /api/admin/save-grade.php` with the final score

---

## Digital Notebooks

### Page: `admin/notebooks.html`
**Script:** `js/admin/admin-notebooks.js`

Teacher-side notebook viewer:
1. Loads student list via `GET /api/admin/notebooks/roster`
2. Teacher clicks a student → loads `GET /api/admin/notebooks/entries?student_id=`
3. Chapter tabs filter by `chapter_id`
4. Selected note content renders in an `<iframe>` preview
5. Shows a "sync warning" if the student has no entries (student hasn't logged in recently)

---

## Rubric Manager

### Page: `admin/rubrics.html`
**Script:** `js/admin/rubrics.js`

- Lists all rubrics via `GET /api/admin/rubrics`
- Create/edit via `POST /api/admin/rubrics/save`
- Delete via `DELETE /api/admin/rubrics/:id`
- Rubric criteria are stored as `criteria_json` — a JSON array of criterion objects with auto-grader rules
- Rubrics can enable/disable student self-reflection and peer review forms
- Used by `admin/files.html` auto-grader to select a rubric for code evaluation

---

## Due Date Manager

### Page: `admin/due-dates.html`
**APIs:** `api/admin/get-due-dates.php` (GET), `api/admin/save-due-dates.php` (POST)  
**Auth:** Requires teacher role

Allows the teacher to set due dates for all CS and WD assignments in bulk, then sync them to the school calendar.

### Course Maps (inline in admin/due-dates.html)

**CS assignments per unit (Units 0–8):**
- `Unit${n}-Pre` — Pre-Assessment Diagnostic (15 pts)
- `Unit${n}-Ch${ch}` — Chapter notes (10 pts, one per chapter in that unit)
- `Unit${n}-Exam` — Summative Exam (100 pts)
- `Unit9-Exam` — CS Final Exam (100 pts)

**WD assignments per chapter (Chapters 1–16):**
- `WD-Ch${n}-Pre` — Pre-Assessment (15 pts)
- `WD-Ch${n}-Exam` — Chapter Exam (100 pts)
- `WD-Final` — WD Final Capstone Project (100 pts)

> **Note:** WD chapter exam pages (the-*.html) submit grades as `Unit${n}-Exam` via `examLogicCS.js`. The `WD-Ch${n}-Exam` keys created by the Due Date Manager are used for due-date tracking only and do not currently conflict with gradebook entries.

### Workflow

1. Open Admin → Due Date Manager
2. Select CS or WD tab (state is preserved when switching)
3. Fill in date pickers — inputs turn green when a date is set
4. Click the group icon on any row to expand per-period date pickers (A1, A2, B1, B2, etc.)
5. Click **Save All & Sync to Calendar** — saves all dates to `exams` table and rebuilds `calendar_events` with `source='due_date'`

### School Year Shift

The shift panel at the top provides two ways to move all dates for a new school year:
- **±N days:** Enter a positive or negative integer, click "Apply Shift" — all filled-in date inputs shift by that many days
- **New year start:** Enter the old school year's first day and the new year's first day → days between is computed automatically → shift applied

After shifting, review dates and click Save.

### Export / Import CSV

- **Export:** Downloads a CSV of all currently set dates (`exam_id`, `title`, `course_id`, `due_date`, `type`)
- **Import:** Upload a CSV with those columns; matching `exam_id` inputs are updated in-page; teacher must still click Save to persist

### Calendar Integration

When the teacher saves with calendar sync enabled, `save-due-dates.php`:
1. Adds `source` column to `calendar_events` if missing
2. Deletes all rows with `source = 'due_date'`
3. Inserts one `type='none'` event per assignment with a due date, titled `"{title} Due"`
4. Inserts additional events for any period-specific dates, titled `"{title} Due – Period {id}"`

These appear as italic observance text on the school calendar (same styling as `type='none'` events).

---

## CS Interactive Workspace

### Page: `cs-interactive.html`
**Script:** `js/cs-interactive.js?v=25`  
**Auth:** Requires CS student or teacher role

The CS Interactive Workspace is the primary learning environment for CS students. It features a two-tier navigation system and manages the flow between curriculum reading, pre-assessment, and summative exams.

### Navigation Structure

**Tier 1 (unit tabs):** Unit 0–8 buttons + green "CS Final Exam" button  
**Tier 2 (chapter tabs):** Per-unit chapters + PRE (diagnostic), SCALE (self-assessment), and EXAM tabs

### Pre-Assessment (Diagnostic) Gating

When a student selects a unit and the PRE tab is active:
1. The system checks grades for a `Unit${n}-Pre` key matching the regex `/Unit\s*-?\s*${n}[\s-]*(Diagnostic|Pre-Assessment|Pre)/i`
2. **Already completed:** Shows a "Retake" button; clicking it opens the pre-assessment in a new window
3. **Not yet completed:** Auto-opens the pre-assessment in a new window **once per browser session** (guarded by `sessionStorage` key `pretest_opened_u${n}`)
4. **Locked (no grade):** Shows the pre-assessment inline instead

Pre-assessment pages (`pre-assessments/cs-unit-{0-8}.html`) load `preTestLogicCS.js` which in turn dynamically loads `quizLogic.js`. On completion, the quiz engine sends `window.opener.postMessage({ type: 'diagnostic_complete', score })` — this uses `window.opener` (not `window.parent`) because the pre-assessment runs in a new window.

### Unit Summative Exam

Each unit's EXAM tab directly calls `window.open('/exams/cs-unit-${n}-exam.html', '_blank')` — no overlay or second click required. The exam is gated by:
- `GLOBAL_BYPASS_CONFIG.requireWorksheets` — currently `false` (worksheets not required)
- Pre-assessment must be completed (grade check)
- Exam itself must not already be graded (if already submitted, a different message shows)

### CS Final Exam

The green **CS Final Exam** button (to the right of the Unit 8 tab) opens `/exams/cs-final-exam.html` directly in one click if Units 1–7 summative exams are all graded. Units 0 and 8 are extra credit and not required. If requirements are not met, clicking the button renders a "locked" overlay listing which unit exams are still missing.

Grade key: `Unit9-Exam` (submitted by `exams/cs-final-exam.html` via `initAdaptiveExam({ unit: 9 })`)

### Exam Engine (`js/examLogicCS.js`)

Used by all CS unit exams, the CS final exam, and all WD chapter exams. Key behaviors:
- `ENABLE_WORKSHEET = true` activates two-column layout: quiz (col-lg-5) + cs-notebook.html iframe (col-lg-7)
- `initAdaptiveExam` is an alias for `initExam`
- Grade keys: CS exams → `Unit${n}-Exam`; WD exams → `Unit${chapterNum}-Exam` (derived from `chapterTitle` match on `/(?:unit|chapter|ch)\s*(\d+)/i`)
- Scores are submitted to `api/submit-exam.php` and kept at highest score (no overwrite if lower)
