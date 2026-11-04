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
//
// A second list, /var/lib/chs-site/project-after-test.json (PROJECT_AFTER_TEST_FILE), the same
// shape, is for a student who may take each unit test before that unit's project is done but
// still owes the projects (teacher 2026-11-04). It lifts only the project half of the unit-test
// lock: the projects stay in the gradebook, and the CS Final still requires them.
const fs = require('fs');

function listFile(file) {
    const cache = { checkedAt: 0, mtime: 0, map: new Map() };
    return () => {
        const now = Date.now();
        if (now - cache.checkedAt < 30000) return cache.map;
        cache.checkedAt = now;
        try {
            const { mtimeMs } = fs.statSync(file);
            if (mtimeMs !== cache.mtime) {
                cache.map = new Map(Object.entries(JSON.parse(fs.readFileSync(file, 'utf8'))).map(([id, why]) => [String(id), String(why)]));
                cache.mtime = mtimeMs;
            }
        } catch (e) {
            if (e.code !== 'ENOENT') console.error('[project-exemptions]', file, e.message);
        }
        return cache.map;
    };
}
const exemptions = listFile(process.env.PROJECT_EXEMPTIONS_FILE || '/var/lib/chs-site/project-exemptions.json');
const afterTest = listFile(process.env.PROJECT_AFTER_TEST_FILE || '/var/lib/chs-site/project-after-test.json');

const isProjectExempt = studentId => exemptions().has(String(studentId || ''));
const isProjectAfterTest = studentId => afterTest().has(String(studentId || ''));

module.exports = { isProjectExempt, isProjectAfterTest, get PROJECT_EXEMPT_STUDENTS() { return exemptions(); } };
