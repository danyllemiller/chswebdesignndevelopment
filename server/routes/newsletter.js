const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');
const { unitForCsChapter } = require('../gradeCalc');

// Public, course-wide status page for parents -- no student-specific data,
// safe to link publicly. "Current chapter" uses the same lowest-numbered-
// chapter-whose-due-date-hasn't-passed-yet definition server/routes/
// timeclock.js already uses for the identical purpose, so this page and
// the auto-clockout chapter logic never disagree with each other.

function formatDbDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0].split(' ')[0];
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getLocalDateStr(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const COURSE_INFO = {
    wd1: { courseId: '05254G1S', label: 'Web Design Level 1', hasUnits: false },
    wd2: { courseId: '05254G2S', label: 'Web Design Level 2', hasUnits: false },
    cs:  { courseId: '10003GS',  label: 'Computer Science',   hasUnits: true }
};

const CS_CHAPTER_TITLES = {
    1: 'Essential Computer Skills', 2: 'Ethics, Privacy & Law', 3: 'How Computers Work',
    4: 'Intro to Office Software', 5: 'The Language of Computers', 6: 'Storing Data',
    7: 'Mastering Spreadsheets', 8: 'Computational Modeling', 9: 'Problem Solving & Algorithms',
    10: 'Control Structures & Events', 11: 'Culture, Equity & Bias', 12: 'Ethics & Societal Impact',
    13: 'AI & Cross-Disciplinary Tech', 14: 'Advanced Data Structures', 15: 'Modularity & Procedures',
    16: 'The Software Development Lifecycle', 17: 'How the Internet Works', 18: 'Cybersecurity Threats',
    19: 'Defending Systems'
};

const WD_CHAPTER_TITLES = {
    1: "The Developer's World", 2: 'The Rules (How Not to Get Sued)', 3: 'The Blueprint',
    4: 'The Why (Intro to UI/UX)', 5: 'The "Bones" (Intro to HTML)', 6: 'The "Clothes" (Intro to CSS)',
    7: 'The Style (Advanced CSS Layout)', 8: 'Sights & Sounds (Media & Tables)',
    9: 'The "Brains" (Intro to JavaScript)', 10: 'The Game Dev (Advanced JS Game Logic)',
    11: 'The "Cloud" (Collaboration & Hosting)', 12: 'The "Manager" (CMS Platforms)',
    13: 'The Network (Intro to APIs)', 14: 'The "Brain" (Databases)',
    15: 'The "Future" (The Game Never Ends)', 16: 'The "Final Boss" (Going Live)'
};

const CS_UNIT_TITLES = {
    1: 'Unit 1: Digital Citizenship', 2: 'Unit 2: Computing Systems', 3: 'Unit 3: Data & Analysis',
    4: 'Unit 4: Beg. Algorithm & Programming', 5: 'Unit 5: Impacts of Computing',
    6: 'Unit 6: Intermediate A&P', 7: 'Unit 7: Networks and the Internet'
};

// Rows that aren't real, parent-relevant assignments -- timeclock check-ins,
// the redundant "-Score" mirror rows, and internal question-bank buckets.
const NOISE_EXAM_ID = /(^TC-|-Score$|^cs-unit-\d+$|^cs-parked$)/i;

async function ensureNotesTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS newsletter_notes (
            course_id VARCHAR(10) PRIMARY KEY,
            notes TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);
}

router.get('/newsletter', async (req, res) => {
    const course = String(req.query.course || '').toLowerCase();
    const info = COURSE_INFO[course];
    if (!info) return res.status(400).json({ error: 'course must be wd1, wd2, or cs' });

    try {
        const connection = await getDbConnection();
        const today = getLocalDateStr();

        // Current chapter: lowest-numbered chapter whose lab exam_id has the
        // earliest due date that hasn't passed yet.
        const examIdRegex = course === 'cs' ? '^cs_ch[0-9]+_' : '^ch[0-9]+_';
        const chapterRegex = course === 'cs' ? /^cs_ch(\d+)_/ : /^ch(\d+)_/;
        const [chapterRows] = await connection.execute(
            `SELECT exam_id, due_date FROM exams WHERE course_id = ? AND exam_id REGEXP ? AND due_date IS NOT NULL ORDER BY due_date ASC`,
            [info.courseId, examIdRegex]
        );
        const parsedChapters = chapterRows
            .map(r => {
                const m = r.exam_id.match(chapterRegex);
                return m ? { chapter: parseInt(m[1], 10), dueDate: formatDbDate(r.due_date) } : null;
            })
            .filter(Boolean)
            .sort((a, b) => a.chapter - b.chapter);
        const upcomingChapter = parsedChapters.find(r => r.dueDate >= today);
        const currentChapterNum = upcomingChapter
            ? upcomingChapter.chapter
            : (parsedChapters.length ? parsedChapters[parsedChapters.length - 1].chapter : 1);

        const chapterTitles = course === 'cs' ? CS_CHAPTER_TITLES : WD_CHAPTER_TITLES;
        const currentChapter = { number: currentChapterNum, title: chapterTitles[currentChapterNum] || '' };

        let currentUnit = null;
        if (info.hasUnits) {
            const unitNum = unitForCsChapter(currentChapterNum);
            if (unitNum) currentUnit = { number: unitNum, title: CS_UNIT_TITLES[unitNum] || `Unit ${unitNum}` };
        }

        // Due next / now late -- every real assignment for this course, split
        // around today. "Now late" keeps only the most recent 8 so it reads as
        // "what's freshly overdue," not the entire semester's backlog.
        const [rows] = await connection.execute(
            `SELECT exam_id, title, total_points, due_date FROM exams
             WHERE course_id = ? AND due_date IS NOT NULL
             ORDER BY due_date ASC`,
            [info.courseId]
        );
        const items = rows
            .filter(r => !NOISE_EXAM_ID.test(r.exam_id))
            .map(r => ({ examId: r.exam_id, title: r.title, points: r.total_points, dueDate: formatDbDate(r.due_date) }));

        const dueNext = items.filter(it => it.dueDate >= today).slice(0, 8);
        const nowLate = items.filter(it => it.dueDate < today).slice(-8);

        await ensureNotesTable(connection);
        const [noteRows] = await connection.execute('SELECT notes, updated_at FROM newsletter_notes WHERE course_id = ?', [course]);
        const notes = noteRows.length ? (noteRows[0].notes || '') : '';
        const notesUpdatedAt = noteRows.length ? noteRows[0].updated_at : null;

        await connection.release();
        res.json({
            course, courseName: info.label,
            currentChapter, currentUnit,
            dueNext, nowLate,
            notes, notesUpdatedAt,
            generatedAt: new Date().toISOString()
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to build newsletter' }); }
});

router.post('/admin/newsletter-notes', async (req, res) => {
    const { course, notes } = req.body || {};
    if (!COURSE_INFO[course]) return res.status(400).json({ error: 'course must be wd1, wd2, or cs' });
    try {
        const connection = await getDbConnection();
        await ensureNotesTable(connection);
        await connection.execute(
            `INSERT INTO newsletter_notes (course_id, notes) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE notes = VALUES(notes)`,
            [course, notes || '']
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save notes' }); }
});

module.exports = router;
