const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const fs = require('fs').promises;
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const UPLOADS_ROOT = path.join(REPO_ROOT, 'uploads');

// Mirrors js/modules/tardy-ladder.js -- duplicated here rather than shared
// via import because that module uses ES module syntax and this server runs
// CommonJS. Keep both in sync if the policy on discipline.html changes.
const TARDY_LADDER = [
    { count: 1, label: 'First Tardy', consequence: 'Brief private check-in. No further consequence.' },
    { count: 2, label: 'Second Tardy', consequence: 'Five-minute conference and a short written reflection identifying one specific change.' },
    { count: 3, label: 'Third Tardy', consequence: 'Parent/guardian contacted by phone or email, and a short support plan is built together. Missed class time is made up during lunch or before/after school.' },
    { count: 4, label: 'Fourth Tardy', consequence: "Scheduled restorative session, a revised plan, and the student's counselor is looped in. Parent/guardian is notified of the outcome." },
    { count: 5, label: 'Fifth Tardy & Beyond', consequence: 'Administrative referral, with a meeting requested including parent/guardian, counselor, and an administrator.' }
];
function getTardyStep(count) {
    if (!count || count < 1) return null;
    return TARDY_LADDER.find(s => s.count === count) || TARDY_LADDER[TARDY_LADDER.length - 1];
}

function dateOnly(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// A single morning digest: what was submitted/uploaded/retaken yesterday
// (or whatever date is asked for), plus a standing list of who still needs
// a tardy follow-up conversation -- so none of this has to be hunted down
// by hand across the gradebook, the uploads folder, and the tardy tracker.
router.get('/admin/daily-activity', async (req, res) => {
    const targetDate = req.query.date || dateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));

    try {
        const connection = await getDbConnection();

        const [roster] = await connection.execute(
            `SELECT student_id, first_name, last_name, section_id FROM students
             WHERE (archived IS NULL OR archived = 0)`
        );
        const rosterMap = new Map(roster.map(r => [r.student_id, r]));

        const [submissions] = await connection.execute(
            `SELECT t.student_id, t.title, t.category, t.chapter, t.timestamp,
                    s.first_name, s.last_name, s.section_id
             FROM turnins t
             JOIN students s ON s.student_id = t.student_id
             WHERE t.is_submitted = 1 AND DATE(t.timestamp) = ?
               AND (s.archived IS NULL OR s.archived = 0)
             ORDER BY s.section_id, t.timestamp DESC`,
            [targetDate]
        );

        const [examActivity] = await connection.execute(
            `SELECT r.student_id, r.exam_id, r.score, r.total_points, r.timestamp,
                    s.first_name, s.last_name, s.section_id
             FROM responses r
             JOIN students s ON s.student_id = r.student_id
             WHERE DATE(r.timestamp) = ?
               AND (s.archived IS NULL OR s.archived = 0)
             ORDER BY s.section_id, r.timestamp DESC`,
            [targetDate]
        );

        // Tardy follow-ups aren't scoped to the selected date -- it's a
        // standing "who still needs a conversation" list (there's no way to
        // mark one resolved yet), so it always reflects the full current
        // tally regardless of which date is being viewed above it.
        const [tardyRows] = await connection.execute(
            `SELECT tp.student_id, s.first_name, s.last_name
             FROM tardy_passes tp
             JOIN students s ON s.student_id = tp.student_id
             WHERE (s.archived IS NULL OR s.archived = 0)`
        );
        await connection.release();

        const tardyByStudent = new Map();
        tardyRows.forEach(r => {
            if (!tardyByStudent.has(r.student_id)) tardyByStudent.set(r.student_id, { ...r, count: 0 });
            tardyByStudent.get(r.student_id).count++;
        });
        const tardyFollowups = Array.from(tardyByStudent.values())
            .filter(s => s.count > 1)
            .map(s => ({ student_id: s.student_id, first_name: s.first_name, last_name: s.last_name, count: s.count, step: getTardyStep(s.count) }))
            .sort((a, b) => b.count - a.count);

        // Uploaded files have zero database tracking at all (upload.php is
        // pure filesystem), so there's genuinely no way to know from this
        // data whether a file has already been graded -- labeled as
        // "uploaded that day," not "ungraded," because that isn't knowable.
        let uploads = [];
        try {
            const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
            const studentDirs = entries.filter(e => e.isDirectory());
            for (const dir of studentDirs) {
                const studentId = dir.name;
                const info = rosterMap.get(studentId);
                if (!info) continue; // archived/unknown student -- skip rather than show a blank name
                const dirPath = path.join(UPLOADS_ROOT, studentId);
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                for (const file of files) {
                    if (!file.isFile()) continue;
                    const filePath = path.join(dirPath, file.name);
                    const stat = await fs.stat(filePath);
                    if (dateOnly(stat.mtime) === targetDate) {
                        uploads.push({
                            student_id: studentId,
                            first_name: info.first_name,
                            last_name: info.last_name,
                            section_id: info.section_id,
                            file_name: file.name,
                            modified_at: stat.mtime
                        });
                    }
                }
            }
            uploads.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
        } catch (e) {
            console.error('[daily-activity] upload scan failed:', e);
        }

        res.json({ date: targetDate, submissions, uploads, examActivity, tardyFollowups });
    } catch (err) {
        console.error('[daily-activity] failed:', err);
        res.status(500).json({ error: 'Failed to build daily activity report.' });
    }
});

module.exports = router;
