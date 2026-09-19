const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getDbConnection } = require('../db');

// Monique's site-maintenance practicum: a handful of real, one-time fixes
// on the live site, each auto-verified against the actual filesystem/HTML
// before it's scored -- a checked box in the browser proves nothing on its
// own, so every completion claim is re-checked server-side against the real
// site state before any score is written.
const SITE_ROOT = path.join(__dirname, '..', '..');
const MONIQUE_STUDENT_ID = '8009627';
const PRACTICUM_COURSE_ID = '05254EF-201';

function readSite(relPath) {
    try { return fs.readFileSync(path.join(SITE_ROOT, relPath), 'utf8'); }
    catch (e) { return null; }
}
function siteFileExists(relPath) {
    try {
        const stat = fs.statSync(path.join(SITE_ROOT, relPath));
        return stat.isFile() && stat.size > 1024; // rule out an empty/placeholder file
    } catch (e) { return false; }
}
function siteFileUnderSize(relPath, maxBytes) {
    try {
        const stat = fs.statSync(path.join(SITE_ROOT, relPath));
        return stat.isFile() && stat.size > 1024 && stat.size <= maxBytes; // still real, but actually compressed
    } catch (e) { return false; }
}

const TASKS = {
    'ch4-broken': {
        examId: 'AS-Task-ch4-broken',
        title: 'Fix 3 broken images on Chapter 4',
        points: 10,
        verify() {
            return ['elementsofart.png', 'principlesofdesign.png', 'useability.png']
                .every(f => siteFileExists(`images/the-why-intro-to-uiux/${f}`));
        }
    },
    'sort-orphans': {
        examId: 'AS-Task-sort-orphans',
        title: 'Move the 7 misplaced images to their real chapter folders',
        points: 10,
        verify() {
            const wrongFiles = ['google-lighthouse.png', 'server-farm.png', 'video-game-mockop.png',
                'wordpress-coffehouse.png', 'wordpress-dashboard.png', 'wordpress-mockup.png', 'wpforms.png'];
            const stillInWrongFolder = wrongFiles.some(f => siteFileExists(`images/the-why-intro-to-uiux/${f}`));
            if (stillInWrongFolder) return false;
            const candidateChapters = [
                'year2/the-manager-cms-platforms.html',
                'year2/the-cloud-collaboration-hosting.html',
                'year2/the-final-boss-going-live.html',
                'year2/the-game-dev-advanced-js-game-logic.html'
            ];
            return candidateChapters.some(f => {
                const content = readSite(f);
                return content && wrongFiles.some(img => content.includes(img));
            });
        }
    },
    'compress-bones-figures': {
        examId: 'AS-Task-compress-bones-figures',
        title: 'Compress 7 oversized figures on Chapter 2 ("The Bones: Intro to HTML")',
        points: 10,
        verify() {
            const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB -- originals are 5-6MB each
            return ['figure-01.png', 'figure-02.png', 'figure-03.png', 'figure-10.png',
                'figure-15.png', 'figure-27.png', 'figure-32.png']
                .every(f => siteFileUnderSize(`images/the-bones-intro-to-html/${f}`, MAX_BYTES));
        }
    },
    'favicons': {
        examId: 'AS-Task-favicons',
        title: 'Fix 3 broken favicon references',
        points: 10,
        verify() {
            const fixed = (htmlFile, badRefs) => {
                const content = readSite(htmlFile);
                if (content === null) return false;
                return badRefs.every(ref => !content.includes(ref) || siteFileExists(`images/favicon/${ref}`));
            };
            const noticesOk = fixed('notices.html', ['favicon-16x16.png', 'favicon-32x32.png']);
            const wrsFiles = [
                'pre-assessments/workplace-readiness-skills.html',
                'pre-assessments/workplace-readiness-skills-b.html',
                'pre-assessments/workplace-readiness-skills-c.html',
                'pre-assessments/workplace-readiness-skills-d.html',
                'pre-assessments/wsd-unit-1.html'
            ];
            return noticesOk && wrsFiles.every(f => fixed(f, ['favicon-512x512.png']));
        }
    }
};

function isAuthorized(req) {
    const u = req.session && req.session.user;
    if (!u) return false;
    return u.student_id === MONIQUE_STUDENT_ID || u.role === 'admin' || u.section_id === 'Teacher';
}

router.get('/practicum/status', async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'Not authorized.' });
    try {
        const connection = await getDbConnection();
        const examIds = Object.values(TASKS).map(t => t.examId);
        const placeholders = examIds.map(() => '?').join(', ');
        const [rows] = await connection.execute(
            `SELECT exam_id, score, total_points FROM responses WHERE student_id = ? AND exam_id IN (${placeholders})`,
            [MONIQUE_STUDENT_ID, ...examIds]
        );
        await connection.release();
        const doneByExamId = new Set(rows.filter(r => Number(r.score) > 0).map(r => r.exam_id));
        const status = {};
        Object.entries(TASKS).forEach(([taskId, t]) => {
            status[taskId] = doneByExamId.has(t.examId);
        });
        res.json({ status });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load status' }); }
});

router.post('/practicum/complete-task', async (req, res) => {
    if (!isAuthorized(req)) return res.status(401).json({ error: 'Not authorized.' });
    const { task_id } = req.body;
    const task = TASKS[task_id];
    if (!task) return res.status(400).json({ error: 'Unknown task.' });

    let verified = false;
    try { verified = !!task.verify(); }
    catch (err) { console.error('[practicum] verify failed', task_id, err); }

    if (!verified) return res.json({ success: false, verified: false });

    try {
        const connection = await getDbConnection();
        // A responses row alone never shows up in either gradebook -- both
        // the admin and student gradebook views build their assignment
        // columns from the exams catalog, then join responses onto it. A
        // task without a matching exams row is graded but invisible to
        // everyone. Mirrors the same INSERT IGNORE admin/save-grade already
        // does when a teacher grades something not yet in the catalog.
        await connection.execute(
            `INSERT IGNORE INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?)`,
            [task.examId, task.title, task.points, PRACTICUM_COURSE_ID]
        );
        await connection.execute(
            `INSERT INTO responses (student_id, exam_id, score, total_points, timestamp) VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE score = VALUES(score), total_points = VALUES(total_points), timestamp = NOW()`,
            [MONIQUE_STUDENT_ID, task.examId, task.points, task.points]
        );
        await connection.release();
        res.json({ success: true, verified: true, points: task.points });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to record score' }); }
});

module.exports = router;
