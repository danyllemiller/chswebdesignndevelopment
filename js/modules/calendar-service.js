// /js/modules/calendar-service.js
import { apiFetch } from './api-client.js';

/**
 * Loads calendar settings (term dates, bell times, exceptions)
 * Fetches from the server to ensure consistency.
 */
export async function getCalendarConfig() {
    try {
        return await apiFetch('/api/admin/calendar-settings');
    } catch (e) {
        console.error("Error fetching calendar config:", e);
        return null;
    }
}

/**
 * Shared math to calculate shift duration in minutes
 */
export function calculateExpectedDuration(dateStr, periodStr, config) {
    if (!periodStr || !config) return 90;
    
    // Check if date is within active term
    if (dateStr < config.termStart || dateStr > config.termEnd) return 90;

    const block = periodStr.includes('-') ? periodStr.split('-').pop() : periodStr;
    const blockNum = block.replace(/\D/g, ''); 
    
    let blockKey = "1_2";
    if (blockNum === "3" || blockNum === "4") blockKey = "3_4";
    else if (blockNum === "5" || blockNum === "6") blockKey = "5_6";
    else if (blockNum === "7" || blockNum === "8") blockKey = "7_8";
    
    // Determine day type
    let dayType = getDayType(dateStr, config);
    if (!dayType || dayType === "OFF") return 90;
    
    const isADay = dayType === "A" || dayType === "A_MIN";
    const isBDay = dayType === "B" || dayType === "B_MIN";
    
    if ((isADay && block.startsWith("B")) || (isBDay && block.startsWith("A"))) return 90; 
    
    const schedType = (dayType === "A_MIN" || dayType === "B_MIN") ? "MINIMUM" : "REGULAR";
    
    if (config.bellTimes[schedType] && config.bellTimes[schedType][blockKey]) {
        const sched = config.bellTimes[schedType][blockKey];
        const [sH, sM] = sched.start.split(':').map(Number);
        const [eH, eM] = sched.end.split(':').map(Number);
        return (eH * 60 + eM) - (sH * 60 + sM);
    }
    return 90;
}

function getDayType(dateStr, config) {
    const dateObj = new Date(dateStr + "T12:00:00");
    const dayOfWeek = dateObj.getDay().toString();

    if (config.exceptions.OFF.includes(dateStr)) return "OFF";
    if (config.exceptions.A.includes(dateStr)) return "A";
    if (config.exceptions.B.includes(dateStr)) return "B";
    if (config.exceptions.MIN.includes(dateStr)) {
        const routineType = config.weeklyRoutine[dayOfWeek];
        return (routineType === "A" || routineType === "A_MIN") ? "A_MIN" : "B_MIN";
    }
    return config.weeklyRoutine[dayOfWeek];
}