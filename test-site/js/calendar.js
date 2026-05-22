import { collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { db, appId } from "/js/firebase-init.js";

const CLIENT_ID = '';
const API_KEY = '';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';
const STORAGE_KEY = 'dac-calendar-events';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const teacherBlocks = {
  A: ['A1', 'A3', 'A7'],
  B: ['B2', 'B4', 'B6', 'B8']
};

const defaultCalendarConfig = {
  termStart: '2025-08-01',
  termEnd: '2026-06-15',
  weeklyRoutine: {
    '1': 'A',
    '2': 'B',
    '3': 'A',
    '4': 'B',
    '5': 'A'
  },
  exceptions: {
    A: [],
    B: [],
    A_MIN: [],
    B_MIN: [],
    OFF: []
  },
  bellTimes: {
    REGULAR: {
      '1_2': { start: '07:35', end: '09:00' },
      '3_4': { start: '09:10', end: '10:35' },
      '5_6': { start: '11:10', end: '12:35' },
      '7_8': { start: '12:42', end: '14:07' }
    },
    MINIMUM: {
      '1_2': { start: '07:35', end: '08:27' },
      '3_4': { start: '08:33', end: '09:25' },
      '5_6': { start: '09:50', end: '10:42' },
      '7_8': { start: '10:48', end: '11:40' }
    }
  }
};

let currentYear;
let currentMonth;
let selectedDate;
let currentView = 'monthly'; // 'monthly', 'weekly', 'daily', 'events'
let events = [];
let isTeacher = false;
let calendarConfig = null;

function loadEvents() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      events = JSON.parse(stored);
    } catch (error) {
      events = [];
    }
  }

  if (!events || !events.length) {
    events = [
      { id: 'sample-1', title: 'Intro to Web Calendar', date: formatDate(new Date()), time: '10:00', description: 'Review calendar behavior and page layout.' },
      { id: 'sample-2', title: 'Project planning', date: formatDate(new Date(new Date().setDate(new Date().getDate() + 2))), time: '13:20', description: 'Schedule classroom activity and event sync demo.' }
    ];
    saveEvents();
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(date) {
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${monthNames[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
}

function loadCalendarConfig() {
  return getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings'))
    .then((snap) => {
      if (snap.exists()) {
        calendarConfig = migrateCalendarConfig(snap.data());
      } else {
        calendarConfig = { ...defaultCalendarConfig };
      }
    })
    .catch((error) => {
      console.error('Failed to load calendar configuration:', error);
      calendarConfig = { ...defaultCalendarConfig };
    });
}

function migrateCalendarConfig(config) {
  if (!config || !config.exceptions) return { ...defaultCalendarConfig };
  const exceptions = {
    A: config.exceptions.A || [],
    B: config.exceptions.B || [],
    A_MIN: config.exceptions.A_MIN || [],
    B_MIN: config.exceptions.B_MIN || [],
    OFF: config.exceptions.OFF || []
  };
  if (config.exceptions.MIN && Array.isArray(config.exceptions.MIN)) {
    exceptions.A_MIN = [...exceptions.A_MIN, ...config.exceptions.MIN];
    exceptions.B_MIN = [...exceptions.B_MIN, ...config.exceptions.MIN];
  }
  return {
    ...defaultCalendarConfig,
    ...config,
    exceptions
  };
}

function getCalendarConfig() {
  return calendarConfig || defaultCalendarConfig;
}

function getDayType(dateStr) {
  const config = getCalendarConfig();
  
  let activeTermEnd = config.termEnd;

  // FIX: Dynamically find the absolute last day from the uploaded exceptions
  // to prevent the calendar from auto-generating A/B days into summer vacation.
  if (config.exceptions) {
    let allDates = [];
    Object.values(config.exceptions).forEach(arr => {
      if (Array.isArray(arr)) {
         allDates.push(...arr);
      }
    });
    
    if (allDates.length > 0) {
      allDates.sort();
      // Force the term to end perfectly on the last explicitly uploaded date
      activeTermEnd = allDates[allDates.length - 1];
    }
  }

  // Check if date is within school term
  const dateObj = new Date(dateStr + 'T12:00:00');
  const termStart = new Date(config.termStart + 'T00:00:00');
  const termEnd = new Date(activeTermEnd + 'T23:59:59');

  // If date is outside school term, no schedule (Summer Vacation)
  if (dateObj < termStart || dateObj > termEnd) {
    return 'NO_SCHEDULE';
  }

  // Check for explicit exceptions first
  if (config.exceptions.OFF && config.exceptions.OFF.includes(dateStr)) return 'OFF';
  if (config.exceptions.A && config.exceptions.A.includes(dateStr)) return 'A';
  if (config.exceptions.B && config.exceptions.B.includes(dateStr)) return 'B';
  if (config.exceptions.A_MIN && config.exceptions.A_MIN.includes(dateStr)) return 'A_MIN';
  if (config.exceptions.B_MIN && config.exceptions.B_MIN.includes(dateStr)) return 'B_MIN';

  // Check if it's a weekend (Saturday=6, Sunday=0)
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'NO_SCHEDULE';
  }

  // Get regular weekday schedule
  const dayOfWeekStr = dayOfWeek.toString();
  const dayType = config.weeklyRoutine[dayOfWeekStr];
  return dayType || 'OFF';
}

function getBlockKey(block) {
  const blockNum = block.replace(/\D/g, '');
  if (blockNum === '3' || blockNum === '4') return '3_4';
  if (blockNum === '5' || blockNum === '6') return '5_6';
  if (blockNum === '7' || blockNum === '8') return '7_8';
  return '1_2';
}

function getBlockTime(block, schedType) {
  const config = getCalendarConfig();
  const key = getBlockKey(block);
  const entry = config.bellTimes[schedType] && config.bellTimes[schedType][key];
  return entry ? `${entry.start} - ${entry.end}` : 'TBD';
}

function getDayInfo(dateStr) {
  const dayType = getDayType(dateStr);
  const isMin = dayType.endsWith('_MIN');
  const baseType = dayType.startsWith('B') ? 'B' : 'A';
  const labelMap = {
    A: 'A Day',
    B: 'B Day',
    A_MIN: 'A Minimum',
    B_MIN: 'B Minimum',
    OFF: 'No School',
    NO_SCHEDULE: 'No Schedule'
  };
  const colorMap = {
    A: 'day-a',
    B: 'day-b',
    A_MIN: 'day-a-min',
    B_MIN: 'day-b-min',
    OFF: 'day-off',
    NO_SCHEDULE: '' // No special coloring
  };
  const iconMap = {
    A: 'fa-calendar-check',
    B: 'fa-calendar-week',
    A_MIN: 'fa-stopwatch',
    B_MIN: 'fa-stopwatch',
    OFF: 'fa-ban',
    NO_SCHEDULE: 'fa-calendar-day' // Regular calendar day icon
  };
  const schedType = isMin ? 'MINIMUM' : 'REGULAR';
  const blocks = (dayType === 'OFF' || dayType === 'NO_SCHEDULE') ? [] : teacherBlocks[baseType].map((block) => ({
    block,
    time: getBlockTime(block, schedType),
    active: true
  }));

  return {
    dayType,
    label: labelMap[dayType] || 'No Schedule',
    cssClass: colorMap[dayType] || '',
    icon: iconMap[dayType] || 'fa-calendar-day',
    blocks,
    available: (dayType === 'OFF' || dayType === 'NO_SCHEDULE') ? false : true
  };
}

function renderDaySchedule(dateStr, container) {
  const dayInfo = getDayInfo(dateStr);
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'day-schedule-header mb-3';
  let description = 'Teacher schedule and availability for the day.';
  if (dayInfo.dayType === 'OFF') {
    description = 'No school or holiday.';
  } else if (dayInfo.dayType === 'NO_SCHEDULE') {
    description = 'No school schedule for this day.';
  }
  header.innerHTML = `<div class="fw-bold">${dayInfo.label}</div><div class="text-muted small">${description}</div>`;
  container.appendChild(header);

  if (dayInfo.blocks.length === 0) {
    const note = document.createElement('div');
    note.className = 'text-center text-muted py-3';
    note.textContent = 'No blocks scheduled today.';
    container.appendChild(note);
    return;
  }

  dayInfo.blocks.forEach((block) => {
    const row = document.createElement('div');
    row.className = 'day-schedule-row d-flex justify-content-between align-items-center py-2 border-bottom';
    row.innerHTML = `<div><strong>${block.block}</strong></div><div class="text-end"><span class="badge bg-secondary">${block.time}</span></div>`;
    container.appendChild(row);
  });
}

function createDayTypeBadge(dayInfo) {
  const badge = document.createElement('div');
  badge.className = `day-type-badge small text-uppercase fw-bold ${dayInfo.cssClass}`;
  badge.innerHTML = `<i class="fas ${dayInfo.icon} me-1"></i><span class="badge-text">${dayInfo.label}</span>`;
  return badge;
}

function getAvailabilityLabel(dayType) {
  if (dayType === 'OFF') return 'Unavailable — No School';
  if (dayType === 'NO_SCHEDULE') return 'No school schedule';
  return dayType.includes('_MIN') ? 'Available around minimum schedule' : 'Available around regular schedule';
}

function formatDayCell(date, dayInfo) {
  const wrapper = document.createElement('div');
  wrapper.className = 'calendar-day';
  if (isSameDate(date, new Date())) wrapper.classList.add('today');
  if (isSameDate(date, selectedDate)) wrapper.classList.add('selected');
  if (dayInfo.cssClass) wrapper.classList.add(dayInfo.cssClass);

  const number = document.createElement('div');
  number.className = 'day-number';
  number.textContent = date.getDate();

  // Only show badge for days with schedules or holidays
  if (dayInfo.dayType !== 'NO_SCHEDULE') {
    const badge = createDayTypeBadge(dayInfo);
    badge.classList.add('mb-2');
    wrapper.appendChild(badge);
  }

  const info = document.createElement('div');
  info.className = 'day-info text-muted small';
  info.innerHTML = dayInfo.blocks.length ? `<span class="info-text">${dayInfo.blocks.length} blocks</span>` : (dayInfo.dayType === 'NO_SCHEDULE' ? '' : `<span class="info-text">No school</span>`);

  wrapper.appendChild(number);
  if (dayInfo.dayType !== 'NO_SCHEDULE') {
    wrapper.appendChild(info);
  }
  wrapper.addEventListener('click', () => selectDate(date));
  return wrapper;
}

function renderCalendar(year, month) {
  const calendar = document.getElementById('calendar');
  const monthLabel = document.getElementById('month-label');
  const eventsListView = document.getElementById('events-list-view');

  // Hide all views first
  calendar.style.display = 'none';
  if (eventsListView) eventsListView.classList.remove('show');

  monthLabel.textContent = `${monthNames[month]} ${year}`;

  if (currentView === 'monthly') {
    renderMonthlyView(year, month);
  } else if (currentView === 'weekly') {
    renderWeeklyView(year, month);
  } else if (currentView === 'daily') {
    renderDailyView(year, month);
  } else if (currentView === 'events') {
    renderEventsView();
  }
}

function renderMonthlyView(year, month) {
  const calendar = document.getElementById('calendar');
  calendar.style.display = 'grid';
  calendar.className = 'calendar-grid calendar-view-monthly';

  calendar.innerHTML = '';

  weekdayNames.forEach((day) => {
    const header = document.createElement('div');
    header.className = 'calendar-weekday';
    header.textContent = day;
    calendar.appendChild(header);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const empty = document.createElement('div');
    empty.className = 'calendar-day calendar-empty';
    empty.style.visibility = 'hidden';
    calendar.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateString = formatDate(date);
    const dayInfo = getDayInfo(dateString);

    const wrapper = formatDayCell(date, dayInfo);
    calendar.appendChild(wrapper);
  }
}

function renderWeeklyView(year, month) {
  const calendar = document.getElementById('calendar');
  calendar.style.display = 'grid';
  calendar.className = 'calendar-grid calendar-view-weekly';

  calendar.innerHTML = '';

  weekdayNames.forEach((day) => {
    const header = document.createElement('div');
    header.className = 'calendar-weekday';
    header.textContent = day;
    calendar.appendChild(header);
  });

  // Find the start of the week containing the selected date or current date
  const startDate = selectedDate || new Date();
  const startOfWeek = new Date(startDate);
  startOfWeek.setDate(startDate.getDate() - startDate.getDay());

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateString = formatDate(date);
    const dayInfo = getDayInfo(dateString);

    const wrapper = formatDayCell(date, dayInfo);
    calendar.appendChild(wrapper);
  }
}

function renderDailyView(year, month) {
  const calendar = document.getElementById('calendar');
  calendar.style.display = 'grid';
  calendar.className = 'calendar-grid calendar-view-daily';

  calendar.innerHTML = '';

  const date = selectedDate || new Date();
  const dateString = formatDate(date);
  const dayInfo = getDayInfo(dateString);
  const dayEvents = events.filter((event) => event.date === dateString);

  const dailyHeader = document.createElement('div');
  dailyHeader.className = 'daily-view-header';
  dailyHeader.innerHTML = `
    <h3 class="h5 mb-0">${formatDisplayDate(date)} — ${dayInfo.label}</h3>
    <p class="mb-0 text-muted">${getAvailabilityLabel(dayInfo.dayType)}</p>
  `;
  calendar.appendChild(dailyHeader);

  const scheduleContainer = document.createElement('div');
  scheduleContainer.className = 'daily-events-list mb-3';
  renderDaySchedule(dateString, scheduleContainer);
  calendar.appendChild(scheduleContainer);

  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'daily-events-list';

  if (dayEvents.length === 0) {
    const noEvents = document.createElement('div');
    noEvents.className = 'text-center text-muted py-4';
    noEvents.textContent = 'No events scheduled for this day.';
    eventsContainer.appendChild(noEvents);
  } else {
    dayEvents.forEach((event) => {
      const eventItem = document.createElement('div');
      eventItem.className = 'events-list-item';
      eventItem.innerHTML = `
        <div class="event-title">${event.title}</div>
        <div class="event-time">${event.time ? `Time: ${event.time}` : 'All day'}</div>
        <div class="event-description">${event.description || 'No additional notes.'}</div>
      `;
      eventsContainer.appendChild(eventItem);
    });
  }

  calendar.appendChild(eventsContainer);
}

function renderEventsView() {
  const calendar = document.getElementById('calendar');
  const eventsListView = document.getElementById('events-list-view');

  // Hide the calendar grid and show events list
  calendar.style.display = 'none';
  eventsListView.classList.add('show');

  eventsListView.innerHTML = '';

  const sortedEvents = events
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00')))
    .slice(0, 50); // Limit to 50 upcoming events

  if (sortedEvents.length === 0) {
    const noEvents = document.createElement('div');
    noEvents.className = 'text-center text-muted py-4';
    noEvents.textContent = 'No upcoming events scheduled.';
    eventsListView.appendChild(noEvents);
  } else {
    sortedEvents.forEach((event) => {
      const eventItem = document.createElement('div');
      eventItem.className = 'events-list-item';
      eventItem.innerHTML = `
        <div class="event-date">${formatDisplayDate(event.date)}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-time">${event.time ? `Time: ${event.time}` : 'All day'}</div>
        <div class="event-description">${event.description || 'No additional notes.'}</div>
      `;
      eventsListView.appendChild(eventItem);
    });
  }
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function selectDate(date) {
  selectedDate = date;
  renderCalendar(currentYear, currentMonth);
  if (currentView !== 'events') {
    renderDayEvents(date);
  }
  // Update the form date when selecting a date
  if (isTeacher) {
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
      dateInput.value = formatDate(date);
    }
  }
}

function renderDayEvents(date) {
  const dateString = formatDate(date);
  const selectedDateLabel = document.getElementById('selected-date-label');
  const eventList = document.getElementById('day-events');

  if (currentView === 'events') {
    // Hide the day events section for events view
    if (selectedDateLabel && eventList) {
      selectedDateLabel.closest('.mb-4').style.display = 'none';
    }
    return;
  }

  // Show the day events section for other views
  if (selectedDateLabel && eventList) {
    selectedDateLabel.closest('.mb-4').style.display = 'block';
  }

  if (selectedDateLabel) {
    selectedDateLabel.textContent = formatDisplayDate(dateString);
  }

  if (eventList) {
    eventList.innerHTML = '';

    const dayEvents = events
      .filter((event) => event.date === dateString)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    if (!dayEvents.length) {
      const item = document.createElement('li');
      item.className = 'text-muted';
      item.textContent = 'No events scheduled for this date yet.';
      eventList.appendChild(item);
      return;
    }

    dayEvents.forEach((event) => {
      const item = document.createElement('li');
      const title = document.createElement('div');
      title.className = 'event-title fw-bold text-primary';
      title.textContent = event.title;

      const time = document.createElement('div');
      time.className = 'event-time text-secondary small mb-1';
      time.textContent = event.time ? `Time: ${event.time}` : 'All day';

      const description = document.createElement('div');
      description.className = 'text-muted small';
      description.textContent = event.description || 'No additional notes.';

      item.appendChild(title);
      item.appendChild(time);
      item.appendChild(description);
      eventList.appendChild(item);
    });
  }
}

function initForm() {
  const form = document.getElementById('event-form');
  if (!form) {
    console.warn('Calendar form not found; skipping event form initialization.');
    return;
  }

  const formCard = form.closest('.calendar-form-card');
  const dateInput = document.getElementById('event-date');

  if (!formCard) {
    console.warn('Calendar form container not found; skipping event form initialization.');
    return;
  }

  if (!isTeacher) {
    formCard.innerHTML = '<div class="alert alert-info mb-0">Only instructors can create events. You can view all scheduled events on the calendar.</div>';
    return;
  }

  // Update form visibility based on current view
  if (currentView === 'events') {
    formCard.style.display = 'none';
  } else {
    formCard.style.display = 'block';
    dateInput.value = formatDate(selectedDate);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const description = document.getElementById('event-description').value.trim();

    if (!title || !date) {
      window.alert('Please provide an event title and date.');
      return;
    }

    events.push({
      id: `evt-${Date.now()}`,
      title,
      date,
      time,
      description
    });

    saveEvents();
    if (formatDate(selectedDate) === date) {
      renderDayEvents(selectedDate);
    }
    if (new Date(date).getMonth() === currentMonth && new Date(date).getFullYear() === currentYear) {
      renderCalendar(currentYear, currentMonth);
    }
    form.reset();
    dateInput.value = formatDate(selectedDate);
  });
}

function setGoogleStatus(message) {
  const status = document.getElementById('google-status');
  status.textContent = message;
}

function loadGoogleCalendar() {
  if (!CLIENT_ID || !API_KEY) {
    setGoogleStatus('Google Calendar is ready to connect. Add your CLIENT_ID and API_KEY in /js/calendar.js.');
    return;
  }

  if (!window.gapi) {
    setGoogleStatus('Google API library failed to load. Try refreshing the page.');
    return;
  }

  window.gapi.load('client:auth2', initGoogleClient);
}

function initGoogleClient() {
  window.gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    })
    .then(() => {
      const authInstance = window.gapi.auth2.getAuthInstance();
      authInstance.isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(authInstance.isSignedIn.get());
      document.getElementById('btn-google-connect').addEventListener('click', () => authInstance.signIn());
    })
    .catch((error) => {
      console.error(error);
      setGoogleStatus('Google Calendar initialization failed. Check the browser console for details.');
    });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    setGoogleStatus('Connected to Google Calendar. Loading events...');
    listGoogleEvents();
  } else {
    setGoogleStatus('Not signed in. Click the button to authorize Google Calendar access.');
  }
}

function listGoogleEvents() {
  window.gapi.client.calendar.events
    .list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    })
    .then((response) => {
      const eventsList = response.result.items;
      const container = document.getElementById('google-events');
      container.innerHTML = '';

      if (!eventsList || eventsList.length === 0) {
        container.textContent = 'No upcoming Google Calendar events found.';
        return;
      }

      eventsList.forEach((event) => {
        const eventCard = document.createElement('div');
        eventCard.className = 'google-event';

        const title = document.createElement('div');
        title.className = 'google-event-title';
        title.textContent = event.summary || 'Untitled event';

        const details = document.createElement('div');
        details.className = 'text-muted small';
        const start = event.start?.dateTime || event.start?.date || 'TBD';
        details.textContent = `Starts: ${new Date(start).toLocaleString()}`;

        eventCard.appendChild(title);
        eventCard.appendChild(details);
        container.appendChild(eventCard);
      });
    });
}

async function initCalendar() {
  checkTeacherRole();
  await loadCalendarConfig();
  loadEvents();
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  selectedDate = today;

  renderCalendar(currentYear, currentMonth);
  renderDayEvents(selectedDate);
  initForm();

  // View switching buttons
  document.querySelectorAll('input[name="calendar-view"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentView = e.target.id.replace('view-', '');
      renderCalendar(currentYear, currentMonth);
      updateNavigationButtons();
      initForm(); // Re-initialize form for new view
    });
  });

  // Navigation buttons
  document.getElementById('prev-month').addEventListener('click', () => {
    navigateCalendar(-1);
  });

  document.getElementById('next-month').addEventListener('click', () => {
    navigateCalendar(1);
  });

  updateNavigationButtons();

  document.getElementById('btn-google-connect').addEventListener('click', () => {
    if (!CLIENT_ID || !API_KEY) {
      setGoogleStatus('Google Calendar is not configured yet. Add CLIENT_ID and API_KEY in /js/calendar.js.');
      return;
    }
    if (window.gapi && window.gapi.auth2) {
      window.gapi.auth2.getAuthInstance().signIn();
    } else {
      loadGoogleCalendar();
    }
  });

  if (window.gapi && CLIENT_ID && API_KEY) {
    loadGoogleCalendar();
  } else if (!CLIENT_ID || !API_KEY) {
    setGoogleStatus('Google Calendar sync is ready. Set CLIENT_ID and API_KEY in /js/calendar.js to connect.');
  }

  // CSV Bulk Import Handler
  const csvFileInput = document.getElementById('csv-file');
  const csvImportBtn = document.getElementById('btn-import-csv');
  
  if (csvImportBtn) {
    csvImportBtn.addEventListener('click', () => {
      if (csvFileInput && csvFileInput.files.length > 0) {
        handleCSVImport(csvFileInput.files[0]);
      } else {
        showCSVStatus('Please select a CSV file.', 'warning');
      }
    });
  }

  // Initialize Single Event Modal
  initSingleEventModal();

  // Initialize Appointment Booking
  initAppointmentBooking();
  initTeacherAppointmentDashboard();
}

function navigateCalendar(direction) {
  if (currentView === 'monthly') {
    currentMonth += direction;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    } else if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    }
  } else if (currentView === 'weekly') {
    const currentDate = selectedDate || new Date(currentYear, currentMonth, 1);
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    currentYear = currentDate.getFullYear();
    currentMonth = currentDate.getMonth();
    selectedDate = currentDate;
  } else if (currentView === 'daily') {
    const currentDate = selectedDate || new Date(currentYear, currentMonth, 1);
    currentDate.setDate(currentDate.getDate() + direction);
    currentYear = currentDate.getFullYear();
    currentMonth = currentDate.getMonth();
    selectedDate = currentDate;
  } else if (currentView === 'events') {
    // For events view, navigation doesn't change the view
    return;
  }

  renderCalendar(currentYear, currentMonth);
  if (currentView !== 'events') {
    renderDayEvents(selectedDate);
  }
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');

  if (currentView === 'events') {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    prevBtn.textContent = 'Previous';
    nextBtn.textContent = 'Next';
  } else {
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    if (currentView === 'monthly') {
      prevBtn.textContent = 'Previous Month';
      nextBtn.textContent = 'Next Month';
    } else if (currentView === 'weekly') {
      prevBtn.textContent = 'Previous Week';
      nextBtn.textContent = 'Next Week';
    } else if (currentView === 'daily') {
      prevBtn.textContent = 'Previous Day';
      nextBtn.textContent = 'Next Day';
    }
  }
}

function checkTeacherRole() {
  const userRole = localStorage.getItem('user-role') || sessionStorage.getItem('user-role');
  const authData = window.dacAuthData || {};

  isTeacher = !!authData.isTeacher || userRole === 'teacher' || userRole === 'admin' || userRole === 'instructor';

  if (!isTeacher && window.location.pathname.includes('admin')) {
    isTeacher = true;
  }
}

window.onGapiLoad = () => {
  if (CLIENT_ID && API_KEY) {
    loadGoogleCalendar();
  } else {
    setGoogleStatus('Google Calendar sync is ready. Set CLIENT_ID and API_KEY in /js/calendar.js to connect.');
  }
};

// ========================================
// CSV BULK IMPORT FUNCTIONS
// ========================================
async function handleCSVImport(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const csv = e.target.result;
      const rows = csv.split('\n').map(row => row.trim()).filter(row => row);
      
      if (rows.length < 2) {
        showCSVStatus('CSV file is empty or invalid.', 'danger');
        return;
      }

      const header = rows[0].toLowerCase();
      if (!header.includes('date') || !header.includes('type')) {
        showCSVStatus('CSV must have "Date" and "Type" columns.', 'danger');
        return;
      }

      const dateIdx = header.split(',').findIndex(h => h.includes('date'));
      const typeIdx = header.split(',').findIndex(h => h.includes('type'));
      const descIdx = header.split(',').findIndex(h => h.includes('description') || h.includes('desc'));

      const updates = {
        A: [...(calendarConfig.exceptions?.A || [])],
        B: [...(calendarConfig.exceptions?.B || [])],
        A_MIN: [...(calendarConfig.exceptions?.A_MIN || [])],
        B_MIN: [...(calendarConfig.exceptions?.B_MIN || [])],
        OFF: [...(calendarConfig.exceptions?.OFF || [])]
      };

      let processedCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const parts = rows[i].split(',').map(p => p.trim());
        
        if (parts.length < 2) continue;

        const dateStr = parts[dateIdx]?.trim();
        const typeStr = parts[typeIdx]?.toUpperCase()?.trim();
        const descStr = descIdx >= 0 ? parts[descIdx]?.trim() : '';

        // Validate date format (YYYY-MM-DD)
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          skippedCount++;
          continue;
        }

        // Validate type
        const validTypes = ['A', 'B', 'A_MIN', 'B_MIN', 'OFF'];
        if (!validTypes.includes(typeStr)) {
          skippedCount++;
          continue;
        }

        // Add to appropriate array if not already present
        if (!updates[typeStr].includes(dateStr)) {
          updates[typeStr].push(dateStr);
          processedCount++;
        }
      }

      // Sort dates for consistency
      Object.keys(updates).forEach(key => {
        updates[key].sort();
      });

      // Update the local calendar config
      calendarConfig.exceptions = updates;

      // Save to Firebase if user is a teacher
      if (isTeacher) {
        try {
          const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
          const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings');
          await setDoc(configRef, calendarConfig, { merge: true });
          showCSVStatus(`✅ Success! Imported ${processedCount} dates. ${skippedCount} were skipped.`, 'success');
        } catch (err) {
          console.error('Firebase update error:', err);
          showCSVStatus(`Imported ${processedCount} dates locally, but could not save to server.`, 'warning');
        }
      } else {
        showCSVStatus(`✅ Imported ${processedCount} dates (local only - you must be a teacher to save).`, 'info');
      }

      // Refresh the calendar display
      renderCalendar(currentYear, currentMonth);
      renderDayEvents(selectedDate);
      
      // Clear file input
      const csvFileInput = document.getElementById('csv-file');
      if (csvFileInput) csvFileInput.value = '';

    } catch (err) {
      console.error('CSV import error:', err);
      showCSVStatus('Error parsing CSV: ' + err.message, 'danger');
    }
  };

  reader.readAsText(file);
}

function showCSVStatus(message, type = 'info') {
  const statusEl = document.getElementById('csv-status');
  if (!statusEl) return;
  
  const bgClass = {
    'success': 'bg-success',
    'danger': 'bg-danger',
    'warning': 'bg-warning',
    'info': 'bg-info'
  }[type] || 'bg-info';

  const textClass = type === 'warning' ? 'text-dark' : 'text-white';
  
  statusEl.innerHTML = `<div class="alert alert-${type} ${textClass} mb-0">${message}</div>`;
}

// ========================================
// SINGLE EVENT FUNCTIONS
// ========================================
function initSingleEventModal() {
  const allDayCheckbox = document.getElementById('se-all-day');
  const timeSection = document.getElementById('se-time-section');
  const addEventBtn = document.getElementById('btn-add-single-event');
  const saveEventBtn = document.getElementById('btn-save-single-event');
  const modalElement = document.getElementById('modalSingleEvent');
  const modal = modalElement ? new bootstrap.Modal(modalElement) : null;

  if (allDayCheckbox) {
    allDayCheckbox.addEventListener('change', (e) => {
      timeSection.style.display = e.target.checked ? 'none' : 'block';
    });
  }

  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('se-date').value = today;
      document.getElementById('se-title').value = '';
      document.getElementById('se-type').value = '';
      document.getElementById('se-start-time').value = '';
      document.getElementById('se-end-time').value = '';
      document.getElementById('se-description').value = '';
      document.getElementById('se-all-day').checked = true;
      timeSection.style.display = 'none';
      if (modal) modal.show();
    });
  }

  if (saveEventBtn) {
    saveEventBtn.addEventListener('click', handleSingleEventSubmit);
  }
}

async function handleSingleEventSubmit() {
  const title = document.getElementById('se-title').value.trim();
  const date = document.getElementById('se-date').value;
  const type = document.getElementById('se-type').value;
  const description = document.getElementById('se-description').value.trim();
  const allDay = document.getElementById('se-all-day').checked;
  const startTime = document.getElementById('se-start-time').value;
  const endTime = document.getElementById('se-end-time').value;

  if (!title || !date || !type) {
    alert('Please fill in title, date, and type.');
    return;
  }

  try {
    const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    // Create event object with title and optional time info
    const eventObj = {
      title,
      date,
      type,
      description,
      allDay,
      startTime: !allDay ? startTime : null,
      endTime: !allDay ? endTime : null,
      createdAt: new Date().toISOString()
    };

    // Store in a new "singleEvents" collection or add to exceptions with metadata
    // Remove special characters from title to avoid Firebase path issues
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    const eventId = `${date}_${sanitizedTitle}`;
    const eventRef = doc(db, 'artifacts', appId, 'public', 'data', 'singleEvents', eventId);
    await setDoc(eventRef, eventObj);

    // Also add to calendar exceptions for visibility
    if (!calendarConfig.exceptions) calendarConfig.exceptions = { A: [], B: [], A_MIN: [], B_MIN: [], OFF: [] };
    if (!calendarConfig.exceptions[type]) calendarConfig.exceptions[type] = [];
    if (!calendarConfig.exceptions[type].includes(date)) {
      calendarConfig.exceptions[type].push(date);
      calendarConfig.exceptions[type].sort();
    }

    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'calendarConfig', 'settings');
    await setDoc(configRef, calendarConfig, { merge: true });

    alert(`✅ Event "${title}" added for ${date}!`);
    
    // Close modal and refresh
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalSingleEvent'));
    if (modal) modal.hide();
    
    renderCalendar(currentYear, currentMonth);
    renderDayEvents(selectedDate);

  } catch (err) {
    console.error('Error saving single event:', err);
    alert('Error saving event: ' + err.message);
  }
}

// ========================================
// APPOINTMENT BOOKING FUNCTIONS
// ========================================
async function initAppointmentBooking() {
  const bookBtn = document.getElementById('btn-book-appointment');
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js');
  const { auth } = await import('/js/firebase-init.js');

  if (bookBtn) {
    bookBtn.addEventListener('click', async () => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          showAppointmentBooking(user.uid);
        } else {
          alert('Please log in to book an appointment.');
        }
      });
    });
  }
}

function showAppointmentBooking(studentId) {
  const modal = new bootstrap.Modal(document.getElementById('modalBookAppointment'));
  const dateInput = document.getElementById('ap-date');
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  
  dateInput.min = minDate;
  dateInput.value = minDate;
  dateInput.addEventListener('change', () => loadAppointmentSlots(studentId));
  
  modal.show();
  loadAppointmentSlots(studentId);
}

async function loadAppointmentSlots(studentId) {
  const selectedDate = document.getElementById('ap-date').value;
  if (!selectedDate) return;

  const slotsContainer = document.getElementById('appointment-slots');
  slotsContainer.innerHTML = '<p class="small text-muted">Loading available slots...</p>';

  try {
    // Load teacher's office hours from Firestore
    const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    // Load saved office hours
    const officeHoursRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacherSettings', 'officeHours');
    const officeHoursSnap = await getDoc(officeHoursRef);
    
    let officeHours = {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': []
    };

    if (officeHoursSnap.exists()) {
      officeHours = officeHoursSnap.data().hours || officeHours;
    }

    const dateObj = new Date(selectedDate);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
    const hoursForDay = officeHours[dayName] || [];

    if (hoursForDay.length === 0) {
      slotsContainer.innerHTML = '<p class="small text-warning">No office hours available on this day.</p>';
      return;
    }

    // Generate 15-minute slots
    const slots = [];
    hoursForDay.forEach(block => {
      const [startH, startM] = block.start.split(':').map(Number);
      const [endH, endM] = block.end.split(':').map(Number);
      
      let currentTime = new Date();
      currentTime.setHours(startH, startM, 0);
      const endTime = new Date();
      endTime.setHours(endH, endM, 0);

      while (currentTime < endTime) {
        const timeStr = currentTime.toTimeString().slice(0, 5);
        slots.push({
          time: timeStr,
          fullDateTime: `${selectedDate}T${timeStr}`
        });
        currentTime.setMinutes(currentTime.getMinutes() + 15);
      }
    });

    if (slots.length === 0) {
      slotsContainer.innerHTML = '<p class="small text-warning">No available slots.</p>';
      return;
    }

    // Render slot buttons
    let html = '<div class="appointment-slot-grid d-flex flex-wrap gap-2 mb-3">';
    slots.forEach(slot => {
      html += `<button type="button" class="btn btn-outline-info btn-sm appointment-slot-btn" data-time="${slot.time}">
        ${slot.time}
      </button>`;
    });
    html += '</div>';

    slotsContainer.innerHTML = html;

    // Add click handlers to slot buttons
    document.querySelectorAll('.appointment-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => selectAppointmentSlot(btn, selectedDate, studentId));
    });

  } catch (err) {
    console.error('Error loading slots:', err);
    slotsContainer.innerHTML = '<p class="small text-danger">Error loading available times.</p>';
  }
}

function selectAppointmentSlot(btn, date, studentId) {
  // Deselect other buttons
  document.querySelectorAll('.appointment-slot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const time = btn.dataset.time;
  document.getElementById('ap-selected-slot').textContent = `${date} at ${time}`;
  document.getElementById('appointment-request-form').style.display = 'block';
  document.getElementById('btn-request-appointment').style.display = 'block';

  // Wire up the request button
  document.getElementById('btn-request-appointment').onclick = () => {
    handleAppointmentRequest(date, time, studentId);
  };
}

async function handleAppointmentRequest(date, time, studentId) {
  const reason = document.getElementById('ap-reason').value.trim();
  
  if (!reason) {
    alert('Please explain the purpose of your meeting.');
    return;
  }

  try {
    const { setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    const { auth } = await import('/js/firebase-init.js');

    const appointmentId = `${date}_${time}_${studentId}`.replace(/[^\w]/g, '_');
    const appointmentRef = doc(db, 'artifacts', appId, 'public', 'data', 'appointments', appointmentId);

    await setDoc(appointmentRef, {
      studentId,
      date,
      time,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejection_reason: null
    });

    alert('✅ Appointment request submitted! Your teacher will respond soon.');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalBookAppointment'));
    if (modal) modal.hide();

  } catch (err) {
    console.error('Error requesting appointment:', err);
    alert('Error: ' + err.message);
  }
}

// ========================================
// TEACHER APPOINTMENT DASHBOARD
// ========================================
function initTeacherAppointmentDashboard() {
  const dashboardBtn = document.getElementById('btn-teacher-dashboard');
  
  // Wait for auth-guard.js to set dacAuthData
  function checkTeacherStatus() {
    if (window.dacAuthData) {
      if (window.dacAuthData.isTeacher && dashboardBtn) {
        dashboardBtn.style.display = 'block';
        console.log('✅ Teacher dashboard button shown for teacher user');
      }
    } else {
      // Retry after a short delay if dacAuthData isn't ready yet
      setTimeout(checkTeacherStatus, 100);
    }
  }
  
  // Listen for auth completion event from auth-guard.js
  document.addEventListener('authComplete', checkTeacherStatus);
  
  // Also check immediately in case auth already completed
  checkTeacherStatus();

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', showAppointmentDashboard);
  }
}

async function showAppointmentDashboard() {
  const modal = new bootstrap.Modal(document.getElementById('modalAppointmentDashboard'));
  modal.show();
  await loadPendingRequests();
  await loadApprovedAppointments();
  await renderOfficeHoursForm();
}

async function loadPendingRequests() {
  try {
    const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    const appointmentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const q = query(appointmentsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);

    const container = document.getElementById('pending-requests');
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-muted small">No pending requests.</p>';
      return;
    }

    let html = '<div class="pending-list">';
    snapshot.forEach(docSnap => {
      const apt = docSnap.data();
      html += `
        <div class="card mb-2 p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <p class="mb-1"><strong>Student:</strong> ${apt.studentId}</p>
              <p class="mb-1"><strong>Date/Time:</strong> ${apt.date} at ${apt.time}</p>
              <p class="mb-1"><strong>Purpose:</strong> ${apt.reason}</p>
              <small class="text-muted">Requested: ${new Date(apt.createdAt).toLocaleString()}</small>
            </div>
            <div class="btn-group-vertical btn-group-sm">
              <button class="btn btn-success" onclick="approveAppointment('${docSnap.id}')">Approve</button>
              <button class="btn btn-danger" onclick="showRejectForm('${docSnap.id}')">Reject</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
}

async function loadApprovedAppointments() {
  try {
    const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    const appointmentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'appointments');
    const q = query(appointmentsRef, where('status', '==', 'approved'));
    const snapshot = await getDocs(q);

    const container = document.getElementById('approved-appointments');
    if (snapshot.empty) {
      container.innerHTML = '<p class="text-muted small">No approved appointments.</p>';
      return;
    }

    let html = '<div class="approved-list">';
    snapshot.forEach(docSnap => {
      const apt = docSnap.data();
      html += `
        <div class="card mb-2 p-3 bg-success-subtle">
          <p class="mb-1"><strong>Student:</strong> ${apt.studentId}</p>
          <p class="mb-1"><strong>Date/Time:</strong> ${apt.date} at ${apt.time}</p>
          <p class="mb-1"><strong>Purpose:</strong> ${apt.reason}</p>
          <small class="text-muted">Approved: ${new Date(apt.approvedAt).toLocaleString()}</small>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

  } catch (err) {
    console.error('Error loading approved appointments:', err);
  }
}

async function approveAppointment(appointmentId) {
  try {
    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    const aptRef = doc(db, 'artifacts', appId, 'public', 'data', 'appointments', appointmentId);
    await setDoc(aptRef, { status: 'approved', approvedAt: new Date().toISOString() }, { merge: true });
    alert('✅ Appointment approved!');
    loadPendingRequests();
    loadApprovedAppointments();
  } catch (err) {
    console.error('Error approving:', err);
    alert('Error: ' + err.message);
  }
}

function showRejectForm(appointmentId) {
  const reason = prompt('Enter rejection reason (optional):');
  if (reason !== null) {
    rejectAppointment(appointmentId, reason);
  }
}

async function rejectAppointment(appointmentId, reason = '') {
  try {
    const { setDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    const aptRef = doc(db, 'artifacts', appId, 'public', 'data', 'appointments', appointmentId);
    await setDoc(aptRef, { status: 'rejected', rejection_reason: reason }, { merge: true });
    alert('✅ Appointment rejected.');
    loadPendingRequests();
  } catch (err) {
    console.error('Error rejecting:', err);
    alert('Error: ' + err.message);
  }
}

async function renderOfficeHoursForm() {
  const container = document.getElementById('office-hours-schedule');
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  // Load existing office hours
  try {
    const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    const officeHoursRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacherSettings', 'officeHours');
    const snap = await getDoc(officeHoursRef);
    
    let savedHours = {};
    if (snap.exists()) {
      savedHours = snap.data().hours || {};
    }
    
    let html = '<div class="office-hours-grid">';
    days.forEach(day => {
      const dayHours = savedHours[day] || [];
      html += `
        <div class="mb-3 p-3 border rounded bg-light">
          <label class="form-label fw-bold">${day}</label>
          <div id="blocks-${day}" class="mb-2">
      `;
      
      dayHours.forEach((block, idx) => {
        html += `
          <div class="d-flex gap-2 mb-2 align-items-center">
            <input type="time" class="form-control form-control-sm" value="${block.start}" data-day="${day}" data-idx="${idx}" data-type="start" />
            <span class="small fw-bold">to</span>
            <input type="time" class="form-control form-control-sm" value="${block.end}" data-day="${day}" data-idx="${idx}" data-type="end" />
            <button type="button" class="btn btn-sm btn-danger btn-remove-block" data-day="${day}" data-idx="${idx}">✕</button>
          </div>
        `;
      });
      
      html += `
          </div>
          <div id="form-${day}" class="time-block-form" style="display: none;">
            <input type="time" id="start-${day}" class="form-control form-control-sm time-input" placeholder="Start" />
            <span class="separator">to</span>
            <input type="time" id="end-${day}" class="form-control form-control-sm time-input" placeholder="End" />
            <button type="button" class="btn btn-sm btn-success btn-save-block" data-day="${day}">Save</button>
            <button type="button" class="btn btn-sm btn-outline-secondary btn-cancel-block" data-day="${day}">Cancel</button>
          </div>
          <button type="button" class="btn btn-sm btn-secondary btn-add-time-block" data-day="${day}">+ Add Time Block</button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    // Attach event listeners after rendering
    attachOfficeHourListeners();
    
  } catch (err) {
    console.error('Error loading office hours:', err);
  }
}

function attachOfficeHourListeners() {
  // Add Time Block button clicked
  document.querySelectorAll('.btn-add-time-block').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const form = document.getElementById(`form-${day}`);
      const addBtn = e.target;
      if (form) {
        form.style.display = 'flex';
        addBtn.style.display = 'none';
        document.getElementById(`start-${day}`).focus();
      }
    });
  });
  
  // Cancel button clicked
  document.querySelectorAll('.btn-cancel-block').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const form = document.getElementById(`form-${day}`);
      const addBtn = document.querySelector(`.btn-add-time-block[data-day="${day}"]`);
      if (form) {
        form.style.display = 'none';
        addBtn.style.display = 'block';
        document.getElementById(`start-${day}`).value = '';
        document.getElementById(`end-${day}`).value = '';
      }
    });
  });
  
  // Save button clicked
  document.querySelectorAll('.btn-save-block').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const startTime = document.getElementById(`start-${day}`).value;
      const endTime = document.getElementById(`end-${day}`).value;
      
      if (!startTime || !endTime) {
        alert('Please enter both start and end times');
        return;
      }
      
      if (startTime >= endTime) {
        alert('End time must be after start time');
        return;
      }
      
      saveOfficeHourBlock(day);
    });
  });
  
  // Remove block button clicked
  document.querySelectorAll('.btn-remove-block').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const idx = parseInt(e.target.dataset.idx);
      removeOfficeHourBlock(day, idx);
    });
  });
}

async function saveOfficeHourBlock(day) {
  const startTime = document.getElementById(`start-${day}`).value;
  const endTime = document.getElementById(`end-${day}`).value;
  
  if (!startTime || !endTime) {
    alert('Please enter both start and end times');
    return;
  }
  
  if (startTime >= endTime) {
    alert('End time must be after start time');
    return;
  }

  try {
    const { getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    // Get existing office hours
    const officeHoursRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacherSettings', 'officeHours');
    const snap = await getDoc(officeHoursRef);
    
    let hours = snap.exists() ? snap.data().hours : {
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': []
    };

    // Add new time block
    if (!hours[day]) hours[day] = [];
    hours[day].push({ start: startTime, end: endTime });
    hours[day].sort((a, b) => a.start.localeCompare(b.start));

    // Save to Firestore
    await setDoc(officeHoursRef, { hours }, { merge: true });
    
    renderOfficeHoursForm();
    
  } catch (err) {
    console.error('Error saving office hours:', err);
    alert('Error: ' + err.message);
  }
}

async function removeOfficeHourBlock(day, idx) {
  if (!confirm(`Remove this time block from ${day}?`)) return;

  try {
    const { getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    
    const officeHoursRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacherSettings', 'officeHours');
    const snap = await getDoc(officeHoursRef);
    
    if (snap.exists()) {
      let hours = snap.data().hours;
      if (hours[day]) {
        hours[day].splice(idx, 1);
        await setDoc(officeHoursRef, { hours }, { merge: true });
        renderOfficeHoursForm();
      }
    }
    
  } catch (err) {
    console.error('Error removing block:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalendar);
} else {
  initCalendar();
}