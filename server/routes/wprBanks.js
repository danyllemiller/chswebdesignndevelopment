// server/routes/wprBanks.js
// Teacher question banks for WPR Practice Pro (wpr-practice/teacher.html).
// Teachers (anyone with the shared WPR_TEACHER_PASSCODE) upload their own
// questions -- a CSV saved from Excel/Sheets, or questions pasted as text --
// with answers when they have them. Banks are SAVED in the database (they hold
// only questions, never student information) so they can be reused in later
// tests. A question with no answer is kept but marked "needs an answer" and is
// left out of tests until a teacher picks the correct choice, since there is
// nothing to score it against.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { withConnection } = require('../db');

const MAX_PER_UPLOAD = 500;
const LETTERS = 'ABCDEF';

async function ensureTables(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS wpr_banks (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(120) NOT NULL,
            teacher     VARCHAR(60) NULL,
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS wpr_bank_questions (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            bank_id      INT NOT NULL,
            question     VARCHAR(700) NOT NULL,
            options_json TEXT NOT NULL,
            answer_idx   TINYINT NULL,
            qhash        CHAR(40) NOT NULL,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_q (bank_id, qhash),
            KEY idx_bank (bank_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

// Same passcode check as starting a session (server/routes/wprPractice.js).
const tries = new Map();
function passcodeOk(req) {
    const expected = process.env.WPR_TEACHER_PASSCODE || '';
    const ip = String(req.headers['cf-connecting-ip'] || req.ip || '');
    const now = Date.now();
    const list = (tries.get(ip) || []).filter(t => now - t < 15 * 60 * 1000);
    const given = String(req.get('x-wpr-passcode') || '').trim();
    if (expected.length < 6) return false;
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(expected).digest();
    const ok = crypto.timingSafeEqual(a, b);
    if (!ok) { list.push(now); tries.set(ip, list); }
    return ok && list.length < 10;
}
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// ---- Parsing --------------------------------------------------------------
function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') q = false;
            else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); cell = '';
            if (row.some(x => x.trim())) rows.push(row);
            row = [];
        } else cell += c;
    }
    row.push(cell); if (row.some(x => x.trim())) rows.push(row);
    return rows;
}

// "B", "b)", "the option text", "True" -> index into options, or null
function resolveAnswer(raw, options) {
    const a = clean(raw, 300);
    if (!a) return null;
    const letter = a.match(/^\(?([A-Fa-f])[).:]?$/);
    if (letter) { const i = LETTERS.indexOf(letter[1].toUpperCase()); return i < options.length ? i : null; }
    const low = a.toLowerCase().replace(/^answer:\s*/, '');
    const exact = options.findIndex(o => o.toLowerCase() === low);
    if (exact >= 0) return exact;
    if (/^(t|true)$/i.test(low)) return options.findIndex(o => /^true$/i.test(o));
    if (/^(f|false)$/i.test(low)) return options.findIndex(o => /^false$/i.test(o));
    return null;
}

function finishQuestion(question, options, answerRaw, starred) {
    question = clean(question.replace(/^\s*(\d+[.)]|q\d*[.:)]|question\s*\d*[.:)]?)\s*/i, ''), 700);
    options = options.map(o => clean(o, 300)).filter(Boolean).slice(0, 6);
    if (!options.length && (/^(t\/f|true or false)\b/i.test(question) || /^(t|f|true|false)$/i.test(clean(answerRaw, 10)))) {
        question = clean(question.replace(/^(t\/f|true or false)[:.\s-]*/i, ''), 700);
        options = ['True', 'False'];
    }
    if (!question || options.length < 2) return null;
    let answer = starred >= 0 ? starred : resolveAnswer(answerRaw, options);
    return { question, options, answer: answer >= 0 ? answer : null };
}

function parseCsvQuestions(text) {
    const rows = parseCsv(text);
    if (!rows.length) return [];
    const head = rows[0].map(h => h.trim().toLowerCase());
    const hasHeader = head.some(h => /question|prompt/.test(h));
    let qCol = 0, ansCol = -1, optCols = [];
    if (hasHeader) {
        qCol = head.findIndex(h => /question|prompt/.test(h));
        ansCol = head.findIndex(h => /answer|correct|key/.test(h));
        optCols = head.map((h, i) => (/^(option|choice|answer choice)?\s*[a-f1-6]$/.test(h) || /^(option|choice)\s*[a-f1-6]?/.test(h)) && i !== qCol && i !== ansCol ? i : -1).filter(i => i >= 0);
    } else {
        // Question, A, B, C, D, ..., Answer (answer = last column)
        const w = Math.max(...rows.map(r => r.length));
        ansCol = w - 1; optCols = Array.from({ length: Math.max(0, w - 2) }, (_, i) => i + 1);
    }
    return rows.slice(hasHeader ? 1 : 0).map(r => finishQuestion(r[qCol] || '', optCols.map(i => r[i] || ''), ansCol >= 0 ? r[ansCol] : '', -1)).filter(Boolean);
}

// Pasted text: questions separated by blank lines or by a new number.
//   1. What does a supervisor do?        A. ...  B. ...  Answer: B
//   (or mark the right choice with a * at the start of that line)
function parseTextQuestions(text) {
    const lines = String(text).split(/\r?\n/);
    const blocks = []; let cur = [];
    const push = () => { if (cur.some(l => l.trim())) blocks.push(cur); cur = []; };
    lines.forEach(l => {
        if (!l.trim()) { push(); return; }
        if (/^\s*(\d+[.)]|q\d+[.:)])\s+/i.test(l) && cur.length && cur.some(x => /^\s*\*?\s*\(?[A-Fa-f][).]\s/.test(x) || /^\s*(answer|correct)\s*[:=]/i.test(x))) push();
        cur.push(l);
    });
    push();
    return blocks.map(b => {
        let question = [], options = [], answerRaw = '', starred = -1;
        b.forEach(l => {
            const t = l.trim();
            const opt = t.match(/^(\*)?\s*\(?([A-Fa-f])[).]\s+(.*?)(\s*\*)?$/);
            const ans = t.match(/^(answer|correct answer|correct|key)\s*[:=-]\s*(.+)$/i);
            if (ans) answerRaw = ans[2];
            else if (opt && (options.length || question.length)) { if (opt[1] || opt[4]) starred = options.length; options.push(opt[3]); }
            else if (!options.length) question.push(t);
        });
        return finishQuestion(question.join(' '), options, answerRaw, starred);
    }).filter(Boolean);
}

// ---- Routes ----------------------------------------------------------------
router.get('/wpr/banks', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    try {
        const banks = await withConnection(async (c) => {
            await ensureTables(c);
            const [r] = await c.execute(`
                SELECT b.id, b.name, b.teacher, b.created_at,
                       SUM(q.answer_idx IS NOT NULL) AS ready, SUM(q.answer_idx IS NULL) AS needs_answer
                FROM wpr_banks b LEFT JOIN wpr_bank_questions q ON q.bank_id = b.id
                GROUP BY b.id ORDER BY b.created_at DESC`);
            return r.map(x => ({ ...x, ready: Number(x.ready || 0), needs_answer: Number(x.needs_answer || 0) }));
        });
        res.json({ banks });
    } catch (err) { console.error('[wpr-banks] list', err); res.status(500).json({ error: 'Could not load question banks.' }); }
});

// POST /wpr/bank/upload  { bank_id | bank_name, teacher, format: 'csv'|'text', content }
router.post('/wpr/bank/upload', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const body = req.body || {};
    const content = String(body.content || '');
    if (content.length > 600000) return res.status(413).json({ error: 'That file is too big. Split it into smaller uploads.' });
    const parsed = (body.format === 'csv' ? parseCsvQuestions(content) : parseTextQuestions(content)).slice(0, MAX_PER_UPLOAD);
    if (!parsed.length) return res.status(400).json({ error: 'No questions found. Check the format examples on this page.' });
    try {
        const out = await withConnection(async (c) => {
            await ensureTables(c);
            let bankId = Number(body.bank_id) || null;
            if (bankId) {
                const [[b]] = await c.execute('SELECT id FROM wpr_banks WHERE id = ?', [bankId]);
                if (!b) bankId = null;
            }
            if (!bankId) {
                const name = clean(body.bank_name, 120);
                if (!name) return { status: 400, body: { error: 'Give the question bank a name.' } };
                const [r] = await c.execute('INSERT INTO wpr_banks (name, teacher) VALUES (?, ?)', [name, clean(body.teacher, 60) || null]);
                bankId = r.insertId;
            }
            let added = 0, dupes = 0, needs = 0;
            for (const q of parsed) {
                const hash = crypto.createHash('sha1').update(q.question.toLowerCase()).digest('hex');
                const [r] = await c.execute(
                    'INSERT IGNORE INTO wpr_bank_questions (bank_id, question, options_json, answer_idx, qhash) VALUES (?, ?, ?, ?, ?)',
                    [bankId, q.question, JSON.stringify(q.options), q.answer, hash]);
                if (r.affectedRows) { added++; if (q.answer === null) needs++; } else dupes++;
            }
            return { status: 200, body: { success: true, bank_id: bankId, found: parsed.length, added, duplicates: dupes, needs_answer: needs } };
        });
        res.status(out.status).json(out.body);
    } catch (err) { console.error('[wpr-banks] upload', err); res.status(500).json({ error: 'Could not save the questions.' }); }
});

router.get('/wpr/bank/:id/questions', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    try {
        const rows = await withConnection(async (c) => {
            await ensureTables(c);
            const [r] = await c.execute('SELECT id, question, options_json, answer_idx FROM wpr_bank_questions WHERE bank_id = ? ORDER BY answer_idx IS NOT NULL, id', [Number(req.params.id)]);
            return r.map(x => ({ id: x.id, question: x.question, options: JSON.parse(x.options_json), answer: x.answer_idx }));
        });
        res.json({ questions: rows });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not load questions.' }); }
});

// POST /wpr/bank/question/:id  { answer: index } or { remove: true }
router.post('/wpr/bank/question/:id', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    const id = Number(req.params.id);
    try {
        await withConnection(async (c) => {
            await ensureTables(c);
            if (req.body?.remove) { await c.execute('DELETE FROM wpr_bank_questions WHERE id = ?', [id]); return; }
            const [[q]] = await c.execute('SELECT options_json FROM wpr_bank_questions WHERE id = ?', [id]);
            const n = Number(req.body?.answer);
            if (q && Number.isInteger(n) && n >= 0 && n < JSON.parse(q.options_json).length)
                await c.execute('UPDATE wpr_bank_questions SET answer_idx = ? WHERE id = ?', [n, id]);
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not save.' }); }
});

router.post('/wpr/bank/:id/delete', async (req, res) => {
    if (!passcodeOk(req)) return res.status(401).json({ error: 'That teacher passcode isn\'t right.' });
    try {
        await withConnection(async (c) => {
            await ensureTables(c);
            await c.execute('DELETE FROM wpr_bank_questions WHERE bank_id = ?', [Number(req.params.id)]);
            await c.execute('DELETE FROM wpr_banks WHERE id = ?', [Number(req.params.id)]);
        });
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Could not delete.' }); }
});

// Answered questions from the chosen banks, for a test session.
async function loadReadyQuestions(bankIds) {
    const ids = (Array.isArray(bankIds) ? bankIds : []).map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 50);
    if (!ids.length) return [];
    return withConnection(async (c) => {
        await ensureTables(c);
        const [r] = await c.execute(
            `SELECT question, options_json, answer_idx FROM wpr_bank_questions WHERE answer_idx IS NOT NULL AND bank_id IN (${ids.map(() => '?').join(',')})`, ids);
        return r.map(x => { const options = JSON.parse(x.options_json); return { q: x.question, options, answer: options[x.answer_idx] }; });
    });
}

module.exports = router;
module.exports.loadReadyQuestions = loadReadyQuestions;
module.exports._parse = { parseCsvQuestions, parseTextQuestions };
