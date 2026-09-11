// /server/routes/survey.js
// Anonymous student feedback: two twice-a-term surveys (Agency 360 for
// WD1/WD2/AS, Comp Sci Course Review) and a weekly Pulse check-in.
// No login, no student_id, no timestamp is ever stored on a response row
// -- with classes as small as five students, submission order or a
// device/session identifier is enough to de-anonymize someone, so the
// storage itself has to enforce anonymity, not just the UI. Every read
// (results and export) uses ORDER BY RAND() and a response-count
// threshold, enforced here in the endpoint, not left to the admin page.
const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../db');

const RESULTS_THRESHOLD = 4;
const PULSE_THRESHOLD = 3;

// Item registries -- fixed content, not admin-editable, so these live as
// code (same pattern as BILLS/STORE_ITEMS in server/routes/budgetGame.js)
// rather than a database table. `type` drives both submit-time validation
// and how the admin results endpoint aggregates each item: 'scale' (1-4 +
// NA), 'choice' (a fixed option list), 'text' (open-ended, never averaged).
const SCALE_OPTIONS = ['1', '2', '3', '4', 'NA'];

const AGENCY360_ITEMS = {
    1: { part: 'A', type: 'scale' }, 2: { part: 'A', type: 'scale' }, 3: { part: 'A', type: 'scale' },
    4: { part: 'A', type: 'scale' }, 5: { part: 'A', type: 'scale' }, 6: { part: 'A', type: 'scale' },
    7: { part: 'B', type: 'scale' }, 8: { part: 'B', type: 'scale' }, 9: { part: 'B', type: 'scale' },
    10: { part: 'B', type: 'scale' }, 11: { part: 'B', type: 'scale' },
    12: { part: 'C', type: 'scale' }, 13: { part: 'C', type: 'scale' }, 14: { part: 'C', type: 'scale' },
    15: { part: 'D', type: 'scale' }, 16: { part: 'D', type: 'scale' }, 17: { part: 'D', type: 'scale' },
    18: { part: 'D', type: 'scale' }, 19: { part: 'D', type: 'scale' }, 20: { part: 'D', type: 'scale' },
    21: { part: 'D', type: 'choice', options: ['Too slow', 'A little slow', 'About right', 'A little fast', 'Too fast'] },
    22: { part: 'D', type: 'choice', options: ['Too easy', 'About right', 'Hard but doable', 'Too hard'] },
    23: { part: 'E', type: 'scale' },
    24: { part: 'E', type: 'choice', options: ['Yes', 'Maybe', 'No'] },
    25: { part: 'E', type: 'choice', options: ['Yes', 'No', 'Not sure', 'I graduate this year'] },
    26: { part: 'E', type: 'choice', options: ['Schedule conflict', 'I need another class to graduate', 'Not what I expected', 'Too hard', 'Not interested anymore', 'Other'] },
    27: { part: 'E', type: 'text' },
    28: { part: 'F', type: 'text' }, 29: { part: 'F', type: 'text' }, 30: { part: 'F', type: 'text' },
    31: { part: 'F', type: 'text' }, 32: { part: 'F', type: 'text' }
};

const CS_COURSE_REVIEW_ITEMS = {
    1: { part: 'A', type: 'scale' }, 2: { part: 'A', type: 'scale' }, 3: { part: 'A', type: 'scale' },
    4: { part: 'A', type: 'scale' }, 5: { part: 'A', type: 'scale' }, 6: { part: 'A', type: 'scale' },
    7: { part: 'B', type: 'scale' }, 8: { part: 'B', type: 'scale' }, 9: { part: 'B', type: 'scale' },
    10: { part: 'B', type: 'scale' }, 11: { part: 'B', type: 'scale' },
    12: { part: 'C', type: 'scale' }, 13: { part: 'C', type: 'scale' }, 14: { part: 'C', type: 'scale' },
    15: { part: 'D', type: 'scale' }, 16: { part: 'D', type: 'scale' }, 17: { part: 'D', type: 'scale' },
    18: { part: 'D', type: 'scale' }, 19: { part: 'D', type: 'scale' },
    20: { part: 'D', type: 'choice', options: ['Too slow', 'A little slow', 'About right', 'A little fast', 'Too fast'] },
    21: { part: 'D', type: 'choice', options: ['Too easy', 'About right', 'Hard but doable', 'Too hard'] },
    22: { part: 'D', type: 'choice', options: ['Alone', 'With a partner', 'In a group', 'Depends on the project'] },
    23: { part: 'E', type: 'scale' },
    24: { part: 'E', type: 'choice', options: ['Yes', 'Maybe', 'No'] },
    25: { part: 'E', type: 'scale' },
    26: { part: 'E', type: 'choice', options: ['Yes', 'Maybe', 'No', 'I graduate this year'] },
    27: { part: 'F', type: 'text' }, 28: { part: 'F', type: 'text' }, 29: { part: 'F', type: 'text' },
    30: { part: 'F', type: 'text' }, 31: { part: 'F', type: 'text' }
};

const FORMS = {
    agency360: { items: AGENCY360_ITEMS, terms: ['Fall', 'Spring'] },
    cs_course_review: { items: CS_COURSE_REVIEW_ITEMS, terms: ['Midpoint', 'End of term'] }
};

async function ensureTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS survey_responses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            form_key VARCHAR(30) NOT NULL,
            term VARCHAR(20) NOT NULL,
            period VARCHAR(10) NULL,
            answers_json LONGTEXT NOT NULL,
            INDEX idx_form_term (form_key, term)
        )
    `);
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS pulse_responses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            week VARCHAR(20) NOT NULL,
            section VARCHAR(20) NULL,
            feeling ENUM('Lost','Behind','Steady','Ahead') NOT NULL,
            unsure_text TEXT, need_text TEXT, other_text TEXT,
            INDEX idx_week (week)
        )
    `);
}

// --- STUDENT SUBMIT (public, no auth, no identifiers) ---

router.post('/survey/submit', async (req, res) => {
    const { form_key, term, period, answers } = req.body;
    const form = FORMS[form_key];
    if (!form) return res.status(400).json({ error: 'Unknown survey.' });
    if (!form.terms.includes(term)) return res.status(400).json({ error: 'Unknown term for this survey.' });
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Missing answers.' });

    // Nothing is required, but whatever IS answered has to be a real,
    // allowed value for that item -- this is a content/integrity check,
    // never an identity check.
    const cleaned = {};
    for (const [qNum, item] of Object.entries(form.items)) {
        const val = answers[qNum];
        if (val === undefined || val === null || val === '') continue;
        if (item.type === 'scale' && !SCALE_OPTIONS.includes(String(val))) continue;
        if (item.type === 'choice' && !item.options.includes(String(val))) continue;
        if (item.type === 'text') { cleaned[qNum] = String(val).slice(0, 5000); continue; }
        cleaned[qNum] = String(val);
    }

    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'INSERT INTO survey_responses (form_key, term, period, answers_json) VALUES (?, ?, ?, ?)',
            [form_key, term, (period ? String(period).slice(0, 10) : null), JSON.stringify(cleaned)]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save survey response.' }); }
});

router.post('/survey/pulse/submit', async (req, res) => {
    // Deliberately destructure only these five fields -- even though this
    // is called from inside the authenticated clock-out flow, no
    // student_id (or anything else identifying) is ever read off the
    // request body here, so none can reach the database no matter what a
    // caller sends.
    const { week, section, feeling, unsure_text, need_text, other_text } = req.body;
    if (!week) return res.status(400).json({ error: 'Missing week.' });
    if (!['Lost', 'Behind', 'Steady', 'Ahead'].includes(feeling)) return res.status(400).json({ error: 'Invalid response.' });

    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        await connection.execute(
            'INSERT INTO pulse_responses (week, section, feeling, unsure_text, need_text, other_text) VALUES (?, ?, ?, ?, ?, ?)',
            [String(week).slice(0, 20), section ? String(section).slice(0, 20) : null, feeling,
             unsure_text ? String(unsure_text).slice(0, 2000) : null,
             need_text ? String(need_text).slice(0, 2000) : null,
             other_text ? String(other_text).slice(0, 2000) : null]
        );
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to save your pulse response.' }); }
});

// --- ADMIN RESULTS (protected by server/api.js's /admin/* session gate) ---

function aggregate(items, rows) {
    const perItem = {};
    const perPart = {};
    Object.entries(items).forEach(([qNum, item]) => {
        const values = rows.map(r => JSON.parse(r.answers_json)[qNum]).filter(v => v !== undefined);
        if (item.type === 'scale') {
            const nums = values.filter(v => v !== 'NA').map(Number);
            const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
            perItem[qNum] = { type: 'scale', avg, n: nums.length, naCount: values.length - nums.length };
            if (avg !== null) {
                if (!perPart[item.part]) perPart[item.part] = { sum: 0, n: 0 };
                perPart[item.part].sum += avg; perPart[item.part].n += 1;
            }
        } else if (item.type === 'choice') {
            const dist = {};
            item.options.forEach(o => { dist[o] = 0; });
            values.forEach(v => { if (dist[v] !== undefined) dist[v]++; });
            perItem[qNum] = { type: 'choice', dist, n: values.length };
        } else {
            perItem[qNum] = { type: 'text', responses: values.filter(v => v && v.trim()) };
        }
    });
    // Randomize every open-text list independently so item-to-item order
    // can't be cross-referenced to reassemble one student's full response.
    Object.values(perItem).forEach(entry => {
        if (entry.type === 'text') entry.responses.sort(() => Math.random() - 0.5);
    });
    const partAverages = {};
    Object.entries(perPart).forEach(([part, { sum, n }]) => { partAverages[part] = n ? sum / n : null; });
    return { perItem, partAverages };
}

router.get('/admin/survey/results', async (req, res) => {
    const { form_key, term } = req.query;
    const form = FORMS[form_key];
    if (!form) return res.status(400).json({ error: 'Unknown survey.' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT answers_json FROM survey_responses WHERE form_key = ? AND term = ? ORDER BY RAND()',
            [form_key, term]
        );
        await connection.release();
        if (rows.length < RESULTS_THRESHOLD) {
            return res.json({ ready: false, count: rows.length, threshold: RESULTS_THRESHOLD });
        }
        const { perItem, partAverages } = aggregate(form.items, rows);
        res.json({ ready: true, count: rows.length, perItem, partAverages });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load survey results.' }); }
});

router.get('/admin/survey/export', async (req, res) => {
    const { form_key, term } = req.query;
    const form = FORMS[form_key];
    if (!form) return res.status(400).json({ error: 'Unknown survey.' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT answers_json, period FROM survey_responses WHERE form_key = ? AND term = ? ORDER BY RAND()',
            [form_key, term]
        );
        await connection.release();
        if (rows.length < RESULTS_THRESHOLD) {
            return res.json({ ready: false, count: rows.length, threshold: RESULTS_THRESHOLD });
        }
        const responses = rows.map(r => ({ ...JSON.parse(r.answers_json), period: r.period || '' }));
        res.json({ ready: true, count: responses.length, responses });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to export survey results.' }); }
});

router.get('/admin/survey/pulse-results', async (req, res) => {
    const { week } = req.query;
    if (!week) return res.status(400).json({ error: 'Missing week.' });
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute(
            'SELECT feeling, unsure_text, need_text, other_text FROM pulse_responses WHERE week = ? ORDER BY RAND()',
            [week]
        );
        // Trend line: every distinct week that individually meets the
        // threshold gets one point -- a week below threshold is omitted
        // entirely rather than shown with a suppressed/fuzzed count, so
        // the chart never implies a shape for data that isn't really there.
        const [weekRows] = await connection.execute(
            `SELECT week, feeling, COUNT(*) AS n FROM pulse_responses GROUP BY week, feeling ORDER BY week ASC`
        );
        await connection.release();

        const byWeek = {};
        weekRows.forEach(r => {
            if (!byWeek[r.week]) byWeek[r.week] = { Lost: 0, Behind: 0, Steady: 0, Ahead: 0, total: 0 };
            byWeek[r.week][r.feeling] = r.n; byWeek[r.week].total += r.n;
        });
        const trend = Object.entries(byWeek)
            .filter(([, counts]) => counts.total >= PULSE_THRESHOLD)
            .map(([wk, counts]) => ({ week: wk, ...counts }));

        if (rows.length < PULSE_THRESHOLD) {
            return res.json({ ready: false, count: rows.length, threshold: PULSE_THRESHOLD, trend });
        }
        const counts = { Lost: 0, Behind: 0, Steady: 0, Ahead: 0 };
        rows.forEach(r => { counts[r.feeling]++; });
        const textResponses = [];
        rows.forEach(r => {
            ['unsure_text', 'need_text', 'other_text'].forEach(field => {
                if (r[field] && r[field].trim()) textResponses.push({ field, text: r[field] });
            });
        });
        textResponses.sort(() => Math.random() - 0.5);
        res.json({ ready: true, count: rows.length, counts, textResponses, trend });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load pulse results.' }); }
});

router.get('/admin/survey/pulse-weeks', async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTables(connection);
        const [rows] = await connection.execute('SELECT DISTINCT week FROM pulse_responses ORDER BY week DESC');
        await connection.release();
        res.json({ weeks: rows.map(r => r.week) });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to load weeks.' }); }
});

router.delete('/admin/survey/clear', async (req, res) => {
    const { form_key, term } = req.query;
    const form = FORMS[form_key];
    if (!form) return res.status(400).json({ error: 'Unknown survey.' });
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM survey_responses WHERE form_key = ? AND term = ?', [form_key, term]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to clear survey data.' }); }
});

router.delete('/admin/survey/pulse-clear', async (req, res) => {
    const { week } = req.query;
    if (!week) return res.status(400).json({ error: 'Missing week.' });
    try {
        const connection = await getDbConnection();
        await connection.execute('DELETE FROM pulse_responses WHERE week = ?', [week]);
        await connection.release();
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to clear pulse data.' }); }
});

module.exports = router;
