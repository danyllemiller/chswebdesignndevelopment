// server/lib/dailyCode.js
// The teacher's deterministic per-day code: the same formula as
// admin/daily-agenda.html's corner stamp and examLogicCS.js/examLogicWD.js's
// cooldown override. The teacher reads it off the agenda page and types it
// on a student's screen; no admin session needed on that device.
function dailyOverrideCode() {
    const d = new Date();
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const input = dateStr + 'chs-guild-2026';
    let hash = 0;
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    return String(hash % 1000000).padStart(6, '0');
}

module.exports = { dailyOverrideCode };
