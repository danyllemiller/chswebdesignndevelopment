// /js/calendar.js (The Controller)
import { getLoggedInUser } from '/js/modules/user-session.js';
import { getCalendarConfig } from '/js/modules/calendar-service.js';

async function initCalendarPage() {
    const user = getLoggedInUser();
    const config = await getCalendarConfig();
    
    // 1. Always load shared components (Google Calendar/Appointment availability)
    renderPublicCalendar(config);

    // 2. Conditional Admin Rendering
    if (user && user.role === 'admin') {
        renderAdminTools();
    } else {
        // Remove admin-only DOM nodes for security and UI cleanliness
        document.querySelectorAll('.admin-only').forEach(el => el.remove());
    }
}

function renderAdminTools() {
    // Inject the CSV form and Event form here
    // This way, the HTML is cleaner for students
}