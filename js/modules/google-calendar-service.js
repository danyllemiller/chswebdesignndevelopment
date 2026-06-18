// /js/modules/google-calendar-service.js
const CLIENT_ID = ''; // Replace with your actual ID
const API_KEY = '';   // Replace with your actual Key
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

export async function initGoogleAuth(onStatusChange) {
    if (!window.gapi) {
        console.error('GAPI not loaded');
        return;
    }
    
    return new Promise((resolve) => {
        window.gapi.load('client:auth2', async () => {
            await window.gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: DISCOVERY_DOCS,
                scope: SCOPES,
            });
            const authInstance = window.gapi.auth2.getAuthInstance();
            authInstance.isSignedIn.listen(onStatusChange);
            onStatusChange(authInstance.isSignedIn.get());
            resolve(authInstance);
        });
    });
}

export async function listEvents() {
    return await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
    });
}