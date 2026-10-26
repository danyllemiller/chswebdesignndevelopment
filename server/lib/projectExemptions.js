// server/lib/projectExemptions.js
// Students excused from ALL CS Unit Projects (usually a student who joins too late in the
// semester to finish them). A Unit Project normally has to be complete (self + peer review)
// before that unit's exam unlocks (see checkUnitPrerequisite in server/routes/gradebook.js and
// the matching gate in js/cs-interactive.js). Students listed here skip only that requirement,
// on every unit -- the Pre-Scale, Pre-Test and previous-exam score still apply -- and
// /student/project-aggregate reports their projects as excused so the workspace unlocks too.
//
// The list lives only on the server, never in this public repo: a JSON object of
// student_id -> reason in /var/lib/chs-site/project-exemptions.json (PROJECT_EXEMPTIONS_FILE
// overrides the path). It's re-read when the file changes, so adding a student needs no restart.
const fs = require('fs');

const FILE = process.env.PROJECT_EXEMPTIONS_FILE || '/var/lib/chs-site/project-exemptions.json';
let cache = { checkedAt: 0, mtime: 0, map: new Map() };
function exemptions() {
    const now = Date.now();
    if (now - cache.checkedAt < 30000) return cache.map;
    cache.checkedAt = now;
    try {
        const { mtimeMs } = fs.statSync(FILE);
        if (mtimeMs !== cache.mtime) {
            cache.map = new Map(Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf8'))).map(([id, why]) => [String(id), String(why)]));
            cache.mtime = mtimeMs;
        }
    } catch (e) {
        if (e.code !== 'ENOENT') console.error('[project-exemptions]', e.message);
    }
    return cache.map;
}

const isProjectExempt = studentId => exemptions().has(String(studentId || ''));

module.exports = { isProjectExempt, get PROJECT_EXEMPT_STUDENTS() { return exemptions(); } };
