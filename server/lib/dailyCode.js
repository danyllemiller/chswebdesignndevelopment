// server/lib/dailyCode.js
// The teacher's 6-digit code for the day: shown (unlabeled) in the corner of
// admin/daily-agenda.html, typed on a student's screen to clear an exam
// cooldown/attempt limit, unlock a unit prerequisite, or witness a peer review.
//
// Until 2026-10-23 the formula (today's date + a fixed salt) lived in the
// browser code of the exam pages AND in the public GitHub repo, so any student
// could compute it. It is now an HMAC of the date keyed with a server-only
// secret (DAILY_CODE_SECRET, falling back to SESSION_SECRET), and the code is
// only ever checked here, never in the browser.
const crypto = require('crypto');

function todayStr(d = new Date()) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const SECRET = process.env.DAILY_CODE_SECRET || process.env.SESSION_SECRET || '';
if (!SECRET) console.warn('[dailyCode] No DAILY_CODE_SECRET or SESSION_SECRET set; the daily code is not secret.');

function dailyOverrideCode(d = new Date()) {
    const h = crypto.createHmac('sha256', SECRET).update('daily-code:' + todayStr(d)).digest();
    return String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
}

// The old public formula, accepted on the switch-over day only so a code the
// teacher was already using that morning keeps working until midnight.
const LEGACY_LAST_DAY = '2026-10-23';
function legacyCode(d = new Date()) {
    const input = todayStr(d) + 'chs-guild-2026';
    let hash = 0;
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    return String(hash % 1000000).padStart(6, '0');
}

function isValidDailyCode(code) {
    const c = String(code || '').trim();
    if (!/^\d{6}$/.test(c)) return false;
    if (c === dailyOverrideCode()) return true;
    return todayStr() <= LEGACY_LAST_DAY && c === legacyCode();
}

module.exports = { dailyOverrideCode, isValidDailyCode };
