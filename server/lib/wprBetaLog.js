// server/lib/wprBetaLog.js
// The WPR Practice Pro pilot-test recording (teacher 2026-11-05: a full class live-tests the Baseline CFA
// and "record everything", so the interface and the server can be tuned). It only records while a window
// is set on the server, in /var/lib/chs-site/wpr-record.json (WPR_RECORD_FILE):
//   { "from": "2026-11-06T07:15", "until": "2026-11-06T09:30" }        (server local time)
// With no file, or outside the window, nothing is written. Inside it, every WPR session event, API call
// (with how long it took), browser-side event and error, and a server health sample every 15 seconds go
// to /var/lib/chs-site/wpr-beta/<date>.jsonl (WPR_RECORD_DIR), one JSON object per line.
// A student is only a number within their session (s1, s2, ...): never a name, initials or student ID,
// and never which answer they picked. The files are server-only and deleted once the pilot is reviewed.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { monitorEventLoopDelay } = require('perf_hooks');

const FILE = process.env.WPR_RECORD_FILE || '/var/lib/chs-site/wpr-record.json';
const DIR = process.env.WPR_RECORD_DIR || '/var/lib/chs-site/wpr-beta';
const MAX_LINE = 4000;

let win = { checkedAt: 0, mtime: 0, from: 0, until: 0 };
function windowNow() {
    const now = Date.now();
    if (now - win.checkedAt < 15000) return win;
    win.checkedAt = now;
    try {
        const { mtimeMs } = fs.statSync(FILE);
        if (mtimeMs !== win.mtime) {
            const w = JSON.parse(fs.readFileSync(FILE, 'utf8'));
            win = { checkedAt: now, mtime: mtimeMs, from: new Date(w.from).getTime() || 0, until: new Date(w.until).getTime() || 0 };
        }
    } catch (e) {
        if (e.code !== 'ENOENT') console.error('[wpr-record]', e.message);
        win = { checkedAt: now, mtime: 0, from: 0, until: 0 };
    }
    return win;
}
const recording = () => { const w = windowNow(), now = Date.now(); return now >= w.from && now <= w.until; };

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// One line in today's file. Never throws: a full disk or a bad value must not break a test.
function record(obj) {
    if (!recording()) return;
    try {
        const now = new Date();
        let line = JSON.stringify({ t: now.toISOString(), ...obj });
        if (line.length > MAX_LINE) line = JSON.stringify({ t: now.toISOString(), ev: obj.ev, truncated: true, size: line.length });
        fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
        fs.appendFileSync(path.join(DIR, `${ymd(now)}.jsonl`), line + '\n', { mode: 0o600 });
    } catch (e) { /* best effort */ }
}

// Server health every 15 seconds while recording: memory, CPU load, and how long the event loop stalls
// (a stall is what makes every student's test feel frozen). counts() adds the live session numbers.
let lag = null;
function startHealth(counts) {
    setInterval(() => {
        if (!recording()) { if (lag) { lag.disable(); lag = null; } return; }
        if (!lag) { lag = monitorEventLoopDelay({ resolution: 20 }); lag.enable(); return; }
        const m = process.memoryUsage();
        record({ ev: 'health', rssMb: Math.round(m.rss / 1048576), heapMb: Math.round(m.heapUsed / 1048576), load1: Number(os.loadavg()[0].toFixed(2)),
                 lagP99ms: Math.round(lag.percentile(99) / 1e6), lagMaxMs: Math.round(lag.max / 1e6), ...counts() });
        lag.reset();
    }, 15000).unref();
}

module.exports = { recording, record, startHealth };
