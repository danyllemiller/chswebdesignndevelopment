const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { getCurrentSchoolYear } = require('../helpers');
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

// A student can have a saved in-progress pretest/exam (js/quizLogic.js,
// js/examLogicCS.js) that never actually finished -- the row sticks around
// under exam_progress until they resume and submit. Most of those turn out
// to already have a real score on file (the row is just leftover clutter
// from a completed earlier attempt); this only flags the ones that don't,
// by reconstructing the gradebook exam_id the same way the client-side
// engines build it and checking whether that key exists in responses.
// Best-effort: exam_id naming has drifted over time (e.g. the WD "Crash
// Review" pretest doesn't follow the Unit/Chapter-number pattern at all),
// so anything this can't confidently parse is still surfaced, just flagged
// as unverified rather than silently dropped.
const WD_SECTIONS = new Set(['A1', 'B2']);

function expectedGradebookExamId(examId, sectionId) {
    const isWD = WD_SECTIONS.has(sectionId);
    const unitMatch = examId.match(/Unit_?(\d+)/i);
    const chapterMatch = examId.match(/Chapter_?(\d+)/i);
    const num = unitMatch ? unitMatch[1] : (chapterMatch ? chapterMatch[1] : null);

    if (examId.startsWith('PreTest_') && num) {
        return isWD ? `Ch${num} Pre-Assessment [15 pts]` : `Unit${num}-Pre`;
    }
    if (examId.startsWith('Summative_') && num) {
        return `Unit${num}-Exam`;
    }
    return null; // unparseable -- flagged as unverified, not assumed missing
}

// A single morning digest: what was submitted/uploaded/retaken yesterday
// (or whatever date is asked for), plus a standing list of who still needs
// a tardy follow-up conversation -- so none of this has to be hunted down
// by hand across the gradebook, the uploads folder, and the tardy tracker.
router.get('/admin/daily-activity', async (req, res) => {
    const targetDate = req.query.date || dateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const currentYear = getCurrentSchoolYear();
    // Both checks matter: archived catches students explicitly pulled out
    // mid-year, school_year catches anyone from a prior year whose archived
    // flag hasn't been (or wasn't) set. Also excludes test/dummy accounts
    // (teststudent, testcsstudent, etc.), which are already archived in
    // this DB.
    const activeStudentFilter = '(s.archived IS NULL OR s.archived = 0) AND s.school_year = ?';

    try {
        const connection = await getDbConnection();

        const [roster] = await connection.execute(
            `SELECT student_id, first_name, last_name, section_id FROM students
             WHERE (archived IS NULL OR archived = 0) AND school_year = ?`,
            [currentYear]
        );
        const rosterMap = new Map(roster.map(r => [r.student_id, r]));

        const [submissions] = await connection.execute(
            `SELECT t.student_id, t.title, t.category, t.chapter, t.timestamp,
                    s.first_name, s.last_name, s.section_id
             FROM turnins t
             JOIN students s ON s.student_id = t.student_id
             WHERE t.is_submitted = 1 AND DATE(t.timestamp) = ? AND ${activeStudentFilter}
             ORDER BY s.section_id, t.timestamp DESC`,
            [targetDate, currentYear]
        );

        const [examActivity] = await connection.execute(
            `SELECT r.student_id, r.exam_id, r.score, r.total_points, r.timestamp,
                    s.first_name, s.last_name, s.section_id
             FROM responses r
             JOIN students s ON s.student_id = r.student_id
             WHERE DATE(r.timestamp) = ? AND ${activeStudentFilter}
             ORDER BY r.exam_id, s.last_name, s.first_name`,
            [targetDate, currentYear]
        );

        // Tardy follow-ups aren't scoped to the selected date -- it's a
        // standing "who still needs a conversation" list (there's no way to
        // mark one resolved yet), so it always reflects the full current
        // tally regardless of which date is being viewed above it.
        const [tardyRows] = await connection.execute(
            `SELECT tp.student_id, s.first_name, s.last_name
             FROM tardy_passes tp
             JOIN students s ON s.student_id = tp.student_id
             WHERE ${activeStudentFilter}`,
            [currentYear]
        );

        // Incomplete pretests/exams -- also a standing list, not date-scoped,
        // since "started but never finished" doesn't have a natural single day.
        const [progressRows] = await connection.execute(
            `SELECT ep.student_id, ep.exam_id, ep.updated_at, s.first_name, s.last_name, s.section_id
             FROM exam_progress ep
             JOIN students s ON s.student_id = ep.student_id
             WHERE ${activeStudentFilter}`,
            [currentYear]
        );
        const [allResponses] = await connection.execute(
            `SELECT r.student_id, r.exam_id FROM responses r
             JOIN students s ON s.student_id = r.student_id
             WHERE ${activeStudentFilter}`,
            [currentYear]
        );
        await connection.release();

        const scoredByStudent = new Map();
        allResponses.forEach(r => {
            if (!scoredByStudent.has(r.student_id)) scoredByStudent.set(r.student_id, new Set());
            scoredByStudent.get(r.student_id).add(r.exam_id);
        });
        const incompleteAssessments = progressRows
            .map(p => {
                const expected = expectedGradebookExamId(p.exam_id, p.section_id);
                const alreadyScored = expected && scoredByStudent.get(p.student_id)?.has(expected);
                return { ...p, expected_exam_id: expected, unverified: expected === null, alreadyScored };
            })
            .filter(p => !p.alreadyScored)
            .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

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

        res.json({ date: targetDate, submissions, uploads, examActivity, tardyFollowups, incompleteAssessments });
    } catch (err) {
        console.error('[daily-activity] failed:', err);
        res.status(500).json({ error: 'Failed to build daily activity report.' });
    }
});

module.exports = router;
