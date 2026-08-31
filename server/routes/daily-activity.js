const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { getCurrentSchoolYear } = require('../helpers');
const fs = require('fs').promises;
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const UPLOADS_ROOT = path.join(REPO_ROOT, 'uploads');

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

        // Retake clearances needed: CS unit-exam attempts where the most
        // recent attempt was under 80% and the required next step (notes
        // after the 1st fail, worksheets after the 2nd) hasn't been marked
        // cleared yet. See checkRetakeClearance in routes/gradebook.js for
        // the same logic applied server-side as the real enforcement gate.
        const [attemptRows] = await connection.execute(
            `SELECT ea.student_id, ea.exam_id, ea.score, ea.total_points,
                    s.first_name, s.last_name, s.section_id
             FROM exam_attempts ea
             JOIN students s ON s.student_id = ea.student_id
             WHERE ea.exam_id REGEXP '^Unit[0-9]+-Exam$' AND ${activeStudentFilter}
             ORDER BY ea.student_id, ea.exam_id, ea.attempt_number ASC`,
            [currentYear]
        );
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS retake_clearances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                exam_id VARCHAR(100) NOT NULL,
                requirement ENUM('notes','worksheets') NOT NULL,
                cleared_by VARCHAR(100),
                cleared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_clearance_lookup (student_id, exam_id, requirement)
            )
        `);
        const [clearanceRows] = await connection.execute(
            `SELECT student_id, exam_id, requirement FROM retake_clearances`
        );
        const clearanceSet = new Set(clearanceRows.map(c => `${c.student_id}|${c.exam_id}|${c.requirement}`));

        const attemptsByKey = new Map();
        attemptRows.forEach(r => {
            const key = `${r.student_id}|${r.exam_id}`;
            if (!attemptsByKey.has(key)) attemptsByKey.set(key, []);
            attemptsByKey.get(key).push(r);
        });
        const retakeClearancesNeeded = [];
        attemptsByKey.forEach((attempts) => {
            const last = attempts[attempts.length - 1];
            const pct = Number(last.total_points) > 0 ? (Number(last.score) / Number(last.total_points)) * 100 : 0;
            if (pct >= 80) return;
            const requirement = attempts.length === 1 ? 'notes' : (attempts.length === 2 ? 'worksheets' : null);
            if (!requirement) return;
            if (clearanceSet.has(`${last.student_id}|${last.exam_id}|${requirement}`)) return;
            retakeClearancesNeeded.push({
                student_id: last.student_id, first_name: last.first_name, last_name: last.last_name,
                section_id: last.section_id, exam_id: last.exam_id, attempt_number: attempts.length,
                pct: Math.round(pct), requirement
            });
        });

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

        res.json({ date: targetDate, submissions, uploads, incompleteAssessments, retakeClearancesNeeded });
    } catch (err) {
        console.error('[daily-activity] failed:', err);
        res.status(500).json({ error: 'Failed to build daily activity report.' });
    }
});

// Tardy follow-up resolution and staff-contacts endpoints moved to
// server/routes/tardy.js -- all tardy-related admin work (logging,
// consequence follow-ups, counselor contact info) now lives together there
// instead of being split between this file and a separate tardy tracker.

module.exports = router;
