# CALENDAR.md — Calendar System Deep-Dive

**Files involved:**
- `calendar.html` — page HTML, modals, sidebar
- `js/calendar.js` — all calendar logic (~1,300+ lines)
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

`specialDates` is the **rendering key** — calendar cells and time-grid views read from it. `rawEvents` holds the full event objects from the database so Edit/Delete can work without re-fetching.

---

## Event Types

| Type Code | Label | Color | Bell Schedule |
|-----------|-------|-------|---------------|
| `A` | A Day | Blue-tinted (#e4e6f8) | `A` periods |
| `B` | B Day | Green-tinted (#d9eed8) | `B` periods |
| `A_MIN` | A Min Day | Darker blue (#cdd0f0) | `A_MIN` periods |
| `B_MIN` | B Min Day | Darker green (#c3e3c2) | `B_MIN` periods |
| `C` | All Periods | Warm orange (#f5e6dc) | `C` periods |
| `S` | Summer School | Orange (#ffe8cc) | `summer` periods |
| `OFF` | No School | Yellow (#fef9d0) | none |
| `none` | Observance | No background | none |

The `TYPE_CONFIG` constant in `calendar.js` maps each code to its bg/text/border colors and display label.

### Event Type Priority

When multiple events exist on the same date, `mergeEventIntoSpecialDates()` picks the highest-priority type:

```
A=6 > B=5 > C=4 > A_MIN=3 > B_MIN=2 > S=2 > OFF=1 > none=0
```

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
   Used to populate the "SCHEDULE APPLIES" date pickers in the bell schedule modal.

3. **Fetch all calendar events:**
   ```js
   fetch('/api/events.php') → rawEvents Map + specialDates Map
   ```
   Each event is passed through `mergeEventIntoSpecialDates()`.

4. **Render the current view** (`renderCurrentView()`)

5. **Initialize appointments** (`initAppointments()` — wires up student/teacher appointment UI)

---

## The 4 Views

### 1. Monthly View (`view-monthly`)

`renderMonth()` builds a CSS grid with:
- 7 weekday header cells
- Empty spacer cells for the first partial week
- One cell per day of the month

Each day cell shows:
- Day number
- A colored type chip (A Day, B Day, Summer School, OFF, etc.)
- Event/observance text

Clicking a day cell calls `selectDay(dateStr)`, which switches to **Daily view** for that date.

### 2. Weekly View (`view-weekly`)

`renderWeekView()` (async) builds a Google Calendar-style time grid:
- Column per day (Sun–Sat of the selected week)
- "All day" row showing schedule-type chips
- Time grid from 7 AM to 6 PM (`GRID_START = 7`, `GRID_END = 18`, `HOUR_PX = 56` pixels per hour)
- Period blocks rendered as positioned `div.tg-event` elements
- Red "now" line for today

Bell schedule periods are fetched once and cached in `bellScheduleCache`. Which periods appear is resolved via `getBellScheduleKey()`.

### 3. Daily View (`view-daily`)

`renderDayView()` (async) renders a single-day time grid for `selectedDate`. Shows the bell schedule periods for that day and updates the sidebar with event details.

### 4. Events List View (`view-events`)

`renderEventsListView()` renders a chronological list of all events from `rawEvents`, grouped and formatted for easy scanning.

### Navigating Between Views

- **Prev/Next buttons:** `navigateCalendar(dir)` — advances by month / 7 days / 1 day depending on view
- **View radio buttons:** Set `currentView` and call `renderCurrentView()`
- **Clicking a month day:** Always jumps to Daily view for that date

View state is persisted to localStorage via `saveViewState()` on every navigation.

---

## Bell Schedule

### How it works

Each day's bell schedule is determined entirely by what the **calendar marks that day as**. There is no day-of-week logic.

```
Calendar type → bell_schedule.schedule_type looked up
─────────────────────────────────────────────────────
A      →  'A'        (A Day periods)
A_MIN  →  'A_MIN'    (A Minimum Day periods)
B      →  'B'        (B Day periods)
B_MIN  →  'B_MIN'    (B Minimum Day periods)
C      →  'C'        (All Periods / C Day)
S      →  'summer'   (Summer School periods)
OFF    →  null       (no schedule)
none   →  null       (no schedule)
weekend→  null       (no schedule)
```

### getBellScheduleKey(dateStr)

```js
function getBellScheduleKey(dateStr) {
    if (specialDates.get(dateStr)?.type === 'OFF') return null;
    const jsDay = new Date(dateStr + 'T00:00:00').getDay();
    if (jsDay === 0 || jsDay === 6) return null;        // weekend
    const calType = specialDates.get(dateStr)?.type;
    if (!calType || calType === 'none') return null;
    if (calType === 'S') return 'summer';               // summer school
    return calType;  // 'A', 'A_MIN', 'B', 'B_MIN', 'C'
}
```

The returned key is used to filter `bellScheduleCache`:
```js
const schedKey = getBellScheduleKey(dateStr);
const periods  = schedKey
    ? schedule.filter(r => r.schedule_type === schedKey)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];
```

### Bell Schedule Admin Modal

Opened via "Bell Schedule" button in the sidebar (teacher/admin only). Contains 6 tabs:

| Tab | `schedule_type` stored | When it shows |
|-----|------------------------|---------------|
| A Day | `A` | A Day calendar events |
| A Min Day | `A_MIN` | A Min Day calendar events |
| B Day | `B` | B Day calendar events |
| B Min Day | `B_MIN` | B Min Day calendar events |
| C Day | `C` | C Day calendar events |
| Summer | `summer` | S (Summer School) calendar events |

Each tab shows a list of period cards. Each card has:
- Period label (e.g., "A1", "B4", "Lunch")
- Course name (optional)
- Start time → End time

No day-of-week choices exist anywhere in the modal — the calendar event type alone controls which schedule loads.

### Saving a Bell Schedule

`saveBellSchedule()` collects all period cards for the active tab and POSTs to `/api/bell-schedule.php`:

```js
periods.push({
    schedule_type: activeBellSched,   // e.g. 'A'
    period_label:  'A1',
    course_name:   'Web Design',
    start_time:    '07:35',
    end_time:      '09:00',
});
// Sent as: { schedule_types: ['A'], periods: [...] }
```

The PHP handler deletes all existing rows for those `schedule_types` and re-inserts. **Saving one tab does not affect other tabs.**

The "SCHEDULE APPLIES" date pickers (From / to) save to `school_config` and control the date range shown in the modal UI — they do **not** affect which schedule loads (that is driven by the calendar type).

### DB Migration

On every request to `GET /api/bell-schedule.php`, the server runs:
```sql
DELETE FROM bell_schedule
WHERE schedule_type NOT IN ('A','A_MIN','B','B_MIN','C','summer')
```
This silently removes any legacy day-of-week rows (`Mon`, `Tue`, `SS_Mon`, etc.) or intermediate `regular`/`summer` rows from previous schema versions.

---

## CSV Import Flow

1. Teacher selects a `.csv` or `.tsv` file in the sidebar
2. Browser reads the file via `FileReader`
3. `parseCSV(text)` parses it into `specialDates` Map immediately (client-side preview)
4. `renderCurrentView()` is called — calendar updates instantly
5. Raw CSV text is POSTed to `/api/save-csv.php`:
   - Server deletes all existing `source='csv'` rows from `calendar_events`
   - Server re-inserts all valid rows with `source='csv'`
6. Status shown in `#csv-status`

**CSV format:**
```
Date,Type,Description
2025-09-01,OFF,Labor Day
2025-10-15,A,
2025-10-16,B,
2025-11-06,A_MIN,Minimum Day
2026-06-16,S,Summer School Day 1
```

**Valid type codes:** `A`, `B`, `A_MIN`, `B_MIN`, `C`, `S`, `OFF`, `none`

On full page refresh, events reload from DB via `GET /api/events.php`, which returns both `source='csv'` and `source='manual'` rows. CSV-imported events are never affected by the manual "Add Event" modal and vice versa.

### mergeEventIntoSpecialDates(ev)

When multiple events exist for the same date:
1. Takes the highest-priority type (see priority table above)
2. Concatenates descriptions with ` | ` separator
3. Avoids repeating type-label strings if there's no separate description

---

## School Year Configuration (`school_config` table)

Four key-value rows:

| Key | Meaning |
|-----|---------|
| `regular_start` | First day of regular school year |
| `regular_end` | Last day of regular school year |
| `summer_start` | First day of summer school |
| `summer_end` | Last day of summer school |

These dates are loaded into `schoolConfig` at init and are used **only** to pre-fill the "SCHEDULE APPLIES" date pickers in the bell schedule modal. They do **not** determine which bell schedule loads on the calendar — the calendar event type (`S`, `A`, etc.) does that.

---

## Appointment System

### Teacher setup
1. Teacher clicks "Set My Office Hours" in the sidebar
2. A form renders office-hour windows (day of week + start/end time + slot duration in minutes)
3. On save: `POST /api/appointments/office-hours.php` with array of windows
4. Multiple windows per day are supported (e.g., before school AND after school)

Teacher can also open the "Appointments & Hours" dashboard via `#btn-teacher-dashboard` to view, approve, or deny requests.

### Student booking
1. Student clicks "View Availability & Book"
2. Picks a date in the modal date picker
3. `GET /api/appointments/slots.php?date=YYYY-MM-DD` returns time slots
4. Slots show as Available or Booked based on existing non-denied appointments
5. Student clicks a slot, fills in reason, clicks "Request Appointment"
6. `POST /api/appointments/book.php` creates the appointment with status `pending`
7. Slot uniqueness enforced by DB UNIQUE KEY on `(date, time)`

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

## Role-Based UI Gating

`initAppointments()` reads `window.dacAuthData.isTeacher`:

```js
if (isTeacher) {
    // Show: Add Event, CSV import, Bell Schedule, Office Hours
} else {
    // Show: Book Appointment
}
```

The "Add Event", "CSV Upload", and "Bell Schedule" buttons are only rendered/functional for teacher and admin roles.
