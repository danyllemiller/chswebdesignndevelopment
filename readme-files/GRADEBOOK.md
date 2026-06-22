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
