# CALENDAR.md — Calendar System Deep-Dive

**Files involved:**
- `calendar.html` — page HTML, modals, sidebar
- `js/calendar.js` — all calendar logic (~700+ lines)
- `css/calendar.css` — calendar-specific styles
- `api/events.php` — calendar events CRUD
- `api/save-csv.php` — CSV bulk import
- `api/bell-schedule.php` — bell schedule CRUD
- `api/school-config.php` — school year date boundaries
- `api/appointments/office-hours.php` — teacher office hours
- `api/appointments/slots.php` — available appointment slots
- `api/appointments/book.php` — student books an appointment
- `api/appointments/requests.php` — list appointments (teacher or student)
- `api/appointments/update-status.php` — approve/deny appointment

---

## Module-Level Data Structures

`calendar.js` maintains these module-scope variables:

```js
let specialDates = new Map(); // 'YYYY-MM-DD' → { type, description }
let rawEvents    = new Map(); // 'YYYY-MM-DD' → [{ id, title, type, description, all_day, start_time, end_time }]
let currentYear, currentMonth;
let selectedDate = null;
let currentView = 'view-monthly';  // 'view-monthly' | 'view-weekly' | 'view-daily' | 'view-events'
let bellScheduleCache = null;      // cached response from /api/bell-schedule.php
let schoolConfig = { regular_start:'', regular_end:'', summer_start:'', summer_end:'' };
```

`specialDates` is the **rendering key** — the calendar cells read from it. `rawEvents` holds the full event objects from the database so Edit/Delete can work.

### Event Types

| Type Code | Label | Color |
|-----------|-------|-------|
| `A` | A Day | Blue-tinted (#e4e6f8) |
| `B` | B Day | Green-tinted (#d9eed8) |
| `A_MIN` | A Min Day | Darker blue (#cdd0f0) |
| `B_MIN` | B Min Day | Darker green (#c3e3c2) |
| `OFF` | No School | Yellow (#fef9d0) |
| `C` | All Periods | Warm orange (#f5e6dc) |
| `none` | Observance | No background |

---

## Initialization Flow

When `calendar.html` loads, `js/calendar.js` runs `initCalendar()`:

1. **Restore view state from localStorage:**
   - `cal_view` → `currentView`
   - `cal_date` → `selectedDate`
   - `cal_year`, `cal_month` → navigation position

2. **Fetch school config:**
   ```js
   fetch('/api/school-config.php') → schoolConfig
   ```

3. **Fetch all calendar events:**
   ```js
   fetch('/api/events.php') → rawEvents Map + specialDates Map
   ```
   Each event is passed through `mergeEventIntoSpecialDates()`, which determines the highest-priority type for a date when multiple events exist.

4. **Render the current view** (calls `renderCurrentView()`)

5. **Initialize appointments** (calls `initAppointments()` — wires up student/teacher appointment UI based on `window.dacAuthData.isTeacher`)

---

## The 4 Views

### 1. Monthly View (`view-monthly`)

`renderMonth()` builds a CSS grid with:
- 7 weekday header cells
- Empty spacer cells for the first partial week
- One cell per day of the month

Each day cell shows:
- Day number
- A colored type chip (A Day, B Day, OFF, etc.)
- Event/observance text

Clicking a day cell calls `selectDay(dateStr)`, which switches to **Daily view** for that date.

### 2. Weekly View (`view-weekly`)

`renderWeekView()` (async — fetches bell schedule) builds a Google Calendar-style time grid:
- Column per day (Sun–Sat of the selected week)
- "All day" row showing schedule-type chips (A Day, B Day, etc.)
- Time grid from 7 AM to 6 PM (`GRID_START = 7`, `GRID_END = 18`, `HOUR_PX = 56` pixels per hour)
- Period blocks rendered as positioned `div.tg-event` elements
- Red "now" line for today

Bell schedule periods are fetched once and cached in `bellScheduleCache`. The day key is resolved via `getBellDayKey()`.

### 3. Daily View (`view-daily`)

`renderDayView()` (async) renders a single-day time grid for `selectedDate`. Shows the bell schedule periods for that day and updates the sidebar with event details.

### 4. Events List View (`view-events`)

`renderEventsListView()` renders a chronological list of all events from `rawEvents`, grouped and formatted for easy scanning.

### Navigating Between Views

- **Prev/Next buttons:** Call `navigateCalendar(dir)`. Direction depends on current view:
  - Monthly: advance by month
  - Weekly: advance by 7 days
  - Daily: advance by 1 day
- **View radio buttons:** Set `currentView` and call `renderCurrentView()`
- **Clicking a month day:** Always jumps to Daily view for that date

View state is persisted to localStorage via `saveViewState()` on every navigation.

---

## Bell Schedule Rendering

### getBellDayKey(dateStr, schedule)

This function resolves which bell schedule to show for a given date:

```js
function getBellDayKey(dateStr, schedule) {
    // 1. OFF days → null (no schedule)
    if (specialDates.get(dateStr)?.type === 'OFF') return null;
    // 2. Weekends → null
    if (jsDay === 0 || jsDay === 6) return null;

    const base = ['','Mon','Tue','Wed','Thu','Fri',''][jsDay]; // e.g., 'Mon'
    const ssKey = 'SS_' + base; // e.g., 'SS_Mon'

    // 3. Summer school: if SS_{day} rows exist AND date is in summer range → ssKey
    if (hasSS && date is in schoolConfig.summer range) return ssKey;

    // 4. Regular year: if regular rows exist AND date is in regular range → base key
    if (date is in schoolConfig.regular range) return base;

    return null; // out of any configured range
}
```

Schedule types in `bell_schedule` table:
- Regular: `Mon`, `Tue`, `Wed`, `Thu`, `Fri`
- Summer school: `SS_Mon`, `SS_Tue`, `SS_Wed`, `SS_Thu`, `SS_Fri`

If `schoolConfig` has no dates set, the fallback is month-based (June–August = summer school).

---

## CSV Import Flow

1. Teacher selects a `.csv` or `.tsv` file in the sidebar
2. Browser reads the file via `FileReader`
3. `parseCSV(text)` parses it into `specialDates` Map immediately (client-side preview)
4. `renderCurrentView()` is called — calendar updates instantly
5. The raw CSV text is POSTed to `/api/save-csv.php`:
   - Server deletes all existing `source='csv'` rows from `calendar_events`
   - Server re-inserts all valid rows with `source='csv'`
6. Status shown in `#csv-status` element

**CSV format required:**
```
Date,Type,Description
2025-09-01,OFF,Labor Day
2025-10-15,A,Regular A Day
2025-11-06,B_MIN,Minimum Day - B
```

On a full page refresh, events are re-loaded from the database via `GET /api/events.php`, which returns both `source='csv'` and `source='manual'` rows.

### mergeEventIntoSpecialDates(ev)

When multiple events exist for the same date, this function:
1. Takes the highest-priority type (priority order: `A`=6 > `B`=5 > `C`=4 > `A_MIN`=3 > `B_MIN`=2 > `OFF`=1 > `none`=0)
2. Concatenates descriptions with ` | ` separator
3. Avoids repeating type-label strings (e.g., "A Day") if there's no separate description

---

## School Year Configuration

Accessed from the Bell Schedule modal in the calendar sidebar. The teacher sets:
- `regular_start` / `regular_end` — the regular school year boundaries
- `summer_start` / `summer_end` — summer school boundaries

Stored in `school_config` table (4 rows, key–value). Loaded into `schoolConfig` object at calendar init.

These dates determine whether `getBellDayKey()` returns a regular or summer schedule type for any given date.

---

## Appointment System

### Teacher setup
1. Teacher clicks "Set My Office Hours" in the sidebar
2. A form renders office-hour windows (day of week + start/end time + slot duration in minutes)
3. On save: `POST /api/appointments/office-hours.php` with array of windows
4. Multiple windows per day are supported (e.g., before school AND after school)

Teacher can also open the full "Appointments & Hours" dashboard via `#btn-teacher-dashboard` to:
- View pending appointment requests
- Approve or deny with a teacher note
- Manage office hours from the modal

### Student booking
1. Student clicks "View Availability & Book"
2. Picks a date in the modal date picker
3. `GET /api/appointments/slots.php?date=YYYY-MM-DD` returns time slots
4. Slots show as Available or Booked based on existing non-denied appointments
5. Student clicks a slot, fills in reason, clicks "Request Appointment"
6. `POST /api/appointments/book.php` creates the appointment with status `pending`
7. Slot uniqueness is enforced by DB UNIQUE KEY on `(date, time)`

### Appointment statuses
| Status | Meaning |
|--------|---------|
| `pending` | Student requested, teacher hasn't acted |
| `approved` | Teacher confirmed |
| `denied` | Teacher rejected (slot becomes available again) |

---

## localStorage Persistence

| Key | Value | Purpose |
|-----|-------|---------|
| `cal_view` | `"view-monthly"` etc. | Restore last view mode on return |
| `cal_date` | `"YYYY-MM-DD"` | Restore selected date |
| `cal_year` | integer | Restore navigation year |
| `cal_month` | integer (0-based) | Restore navigation month |

---

## Role-Based UI Gating in calendar.html

`calendar.js` calls `initAppointments()` which reads `window.dacAuthData.isTeacher`:

```js
if (isTeacher) {
    document.querySelector('.sidebar-teacher-tools').style.display = '';
    document.getElementById('btn-teacher-dashboard').style.display = '';
} else {
    document.querySelector('.sidebar-student-tools').style.display = '';
}
```

Teacher tools shown:
- Add Single Event button
- Bulk CSV import form
- Bell Schedule button
- Office Hours panel

Student tools shown:
- Book Appointment button
- Google Calendar subscribe links
