// server/routes/accommodations.js
// The teacher's Accommodations page (admin/accommodations.html): read a student's IEP or 504 At-A-Glance PDF
// (server/lib/planParser.js; the PDF itself is never kept), check what it says, and save it to the student.
// Staff only: every /admin/* route is checked in server/api.js. What the site does on its own with a plan
// (extra school days on assignments, more time and Read aloud on the WRS Sprint) is in
// server/lib/accommodations.js; students see only those effects, never the plan.
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { withConnection } = require('../db');
const { getCurrentSchoolYear } = require('../helpers');
const acc = require('../lib/accommodations');
const { readPlan } = require('../lib/planParser');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, n);
const ymd = s => (/^\d{4}-\d\d-\d\d$/.test(String(s || '')) ? String(s) : null);
const dateStr = d => (d ? (typeof d === 'string' ? d.slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`) : null);

async function roster(c) {
    const [rows] = await c.execute(
        `SELECT student_id, first_name, last_name, section_id FROM students
         WHERE (archived IS NULL OR archived = 0) AND school_year = ? AND section_id <> 'Teacher'
         ORDER BY last_name, first_name`, [getCurrentSchoolYear()]);
    return rows.map(r => ({ id: String(r.student_id), first: r.first_name || '', last: r.last_name || '', section: r.section_id || '' }));
}

// Who a plan is for: the student ID when it has one (IEPs do), else the closest names on the roster
const letters = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '');
function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
}
function matchStudents(students, plan) {
    if (plan.student.id) {
        const exact = students.find(s => s.id === plan.student.id);
        if (exact) return [{ ...exact, how: 'id' }];
    }
    const parts = String(plan.student.name || '').trim().split(/\s+/);
    if (!parts[0]) return [];
    const first = letters(parts[0]), last = letters(parts.slice(1).join(''));
    return students.map(s => {
        const sf = letters(s.first), sl = letters(s.last);
        const lastScore = last && sl === last ? 3 : last && (sl.includes(last) || last.includes(sl)) && sl.length > 2 ? 2 : last && editDistance(sl, last) <= 2 ? 1 : 0;
        const firstScore = sf === first ? 2 : sf.startsWith(first.slice(0, 3)) && editDistance(sf, first) <= 3 ? 1 : 0;
        return { ...s, how: 'name', score: lastScore * 2 + firstScore };
    }).filter(s => s.score >= 3).sort((a, b) => b.score - a.score).slice(0, 5);
}

// POST /admin/accommodations/read -- a plan PDF in; what it says and who it's for out. Nothing is saved.
router.post('/admin/accommodations/read', (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That file is too big. Plans are usually under 1 MB.' : 'Could not read that upload.' });
        if (!req.file || req.file.buffer.slice(0, 5).toString('latin1') !== '%PDF-') return res.status(400).json({ error: 'Choose the plan\'s PDF file.' });
        let plan;
        try { plan = await readPlan(req.file.buffer); }
        catch (e) { console.error('[accommodations] read', e.message); return res.status(400).json({ error: 'That PDF couldn\'t be read. You can type the plan in instead.' }); }
        try {
            const students = await withConnection(roster);
            res.set('Cache-Control', 'no-store');
            res.json({ plan, matches: matchStudents(students, plan) });
        } catch (e) { console.error('[accommodations] roster', e); res.status(500).json({ error: 'Could not load the roster.' }); }
    });
});

// GET /admin/accommodations -- every saved plan, plus the roster to pick from
router.get('/admin/accommodations', async (req, res) => {
    try {
        const out = await withConnection(async (c) => {
            await acc.ensureTable(c);
            const [rows] = await c.execute(
                `SELECT a.*, s.first_name, s.last_name, s.section_id FROM student_accommodations a
                 LEFT JOIN students s ON s.student_id = a.student_id ORDER BY s.last_name, s.first_name`);
            const plans = rows.map(r => {
                let items = [];
                try { items = JSON.parse(r.items_json || '[]'); } catch (e) { /* keep empty */ }
                return {
                    id: String(r.student_id), first: r.first_name || '', last: r.last_name || '', section: r.section_id || '',
                    planType: r.plan_type, start: dateStr(r.plan_start), end: dateStr(r.plan_end),
                    extraDays: Number(r.extra_days) || 0, testTimeX: Number(r.test_time_x) || 1, readAloud: !!r.read_aloud,
                    items, notes: r.notes || '', updatedAt: r.updated_at, updatedBy: r.updated_by || ''
                };
            });
            return { plans, students: await roster(c) };
        });
        res.set('Cache-Control', 'no-store');
        res.json(out);
    } catch (e) { console.error('[accommodations] list', e); res.status(500).json({ error: 'Could not load the plans.' }); }
});

// PUT /admin/accommodations/:studentId -- save a student's plan (one per student; saving again replaces it)
router.put('/admin/accommodations/:studentId', async (req, res) => {
    const id = clean(req.params.studentId, 50), b = req.body || {};
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 80).map(i => ({
        group: clean(i.group, 80), text: clean(i.text, 600), detail: clean(i.detail, 1000), when: clean(i.when, 200)
    })).filter(i => i.text);
    const planType = ['IEP', '504', 'Other'].includes(b.planType) ? b.planType : 'Other';
    const extraDays = Math.max(0, Math.min(10, Math.round(Number(b.extraDays) || 0)));
    const testTimeX = [1, 1.5, 2].includes(Number(b.testTimeX)) ? Number(b.testTimeX) : 1;
    try {
        const out = await withConnection(async (c) => {
            await acc.ensureTable(c);
            const [[s]] = await c.execute('SELECT student_id FROM students WHERE student_id = ? LIMIT 1', [id]);
            if (!s) return { status: 404, body: { error: 'That student isn\'t on the roster.' } };
            await c.execute(
                `INSERT INTO student_accommodations (student_id, plan_type, plan_start, plan_end, extra_days, test_time_x, read_aloud, items_json, notes, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE plan_type = VALUES(plan_type), plan_start = VALUES(plan_start), plan_end = VALUES(plan_end),
                   extra_days = VALUES(extra_days), test_time_x = VALUES(test_time_x), read_aloud = VALUES(read_aloud),
                   items_json = VALUES(items_json), notes = VALUES(notes), updated_by = VALUES(updated_by)`,
                [id, planType, ymd(b.start), ymd(b.end), extraDays, testTimeX, b.readAloud ? 1 : 0, JSON.stringify(items), clean(b.notes, 2000) || null,
                    clean(req.session?.user?.username || req.session?.user?.student_id, 100) || null]);
            acc.clearCache();
            return { status: 200, body: { success: true } };
        });
        res.status(out.status).json(out.body);
    } catch (e) { console.error('[accommodations] save', e); res.status(500).json({ error: 'Could not save the plan.' }); }
});

// DELETE /admin/accommodations/:studentId -- the plan is gone (the student no longer has one)
router.delete('/admin/accommodations/:studentId', async (req, res) => {
    try {
        await withConnection(async (c) => {
            await acc.ensureTable(c);
            await c.execute('DELETE FROM student_accommodations WHERE student_id = ?', [clean(req.params.studentId, 50)]);
        });
        acc.clearCache();
        res.json({ success: true });
    } catch (e) { console.error('[accommodations] delete', e); res.status(500).json({ error: 'Could not remove the plan.' }); }
});

module.exports = router;
module.exports.matchStudents = matchStudents;   // for the tests
