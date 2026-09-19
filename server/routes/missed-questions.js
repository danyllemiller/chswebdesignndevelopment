const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { getDbConnection } = require('../db');
const { requireStaff } = require('../helpers');
const { ensureTable, insertQuestionDetails } = require('../lib/missedQuestionsStore');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf')
});

const REPORT_TITLES = ['CHAPTER EXAM REPORT', 'SUMMATIVE ASSESSMENT REPORT', 'DIAGNOSTIC ASSESSMENT REPORT'];

// The report is jsPDF text printed at fixed y-offsets (js/examLogicWD.js,
// js/examLogicCS.js, js/quizLogic.js -- downloadPDFReport()), so pdf-parse's
// line extraction lines up one PDF line per doc.text() call. Long question/
// answer text wraps across several lines (doc.splitTextToSize) with no
// marker of its own, so a block is only bounded by the NEXT known label
// ("Result:", "Your Choice:", "Study Hint:", or the next "Question N:") --
// everything between two labels belongs to the label above it.
//
// This is the fallback path for a test that predates live capture (see
// server/routes/gradebook.js's /submit-exam, which now records this same
// data directly on every new submission) -- kept around for exactly that:
// backfilling anything a teacher collects from students the old way.
function parseReportText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let studentName = null, studentId = null, chapterTitle = null, reportType = null;
    for (let i = 0; i < lines.length; i++) {
        if (REPORT_TITLES.includes(lines[i].toUpperCase())) {
            reportType = lines[i];
            chapterTitle = lines[i + 1] || null;
            break;
        }
    }

    const studentMatch = text.match(/STUDENT:\s*([^,]+),\s*([^(]+)\(ID:\s*([^)]+)\)/i);
    if (studentMatch) {
        studentName = `${studentMatch[2].trim()} ${studentMatch[1].trim()}`;
        studentId = studentMatch[3].trim();
    }

    const questions = [];
    let idx = 0;
    while (idx < lines.length) {
        const qMatch = lines[idx].match(/^Question\s+\d+:\s*(.*)$/i);
        if (!qMatch) { idx++; continue; }

        let qText = qMatch[1];
        idx++;
        while (idx < lines.length && !/^Result:/i.test(lines[idx])) {
            qText += ' ' + lines[idx];
            idx++;
        }

        const resultLine = lines[idx] || '';
        idx++;

        let choiceText = '';
        if (idx < lines.length && /^Your Choice:/i.test(lines[idx])) {
            choiceText = lines[idx].replace(/^Your Choice:\s*/i, '');
            idx++;
            while (idx < lines.length && !/^Study Hint:/i.test(lines[idx]) && !/^Question\s+\d+:/i.test(lines[idx])) {
                choiceText += ' ' + lines[idx];
                idx++;
            }
        }

        questions.push({
            question_text: qText.trim().replace(/\s+/g, ' '),
            student_choice: choiceText.trim().replace(/\s+/g, ' '),
            // The PDF's own CORRECT/INCORRECT label is trusted as-is here --
            // examLogicWD.js/examLogicCS.js/quizLogic.js all derive it by
            // comparing the actual selected answer to the actual correct
            // answer (fixed after an earlier bug where it was inferred from
            // "does a hint exist," which silently marked unanswered/
            // unhinted questions CORRECT). That fix also makes this the only
            // way to grade matching/image_label questions, whose "Your
            // Choice" is a summary sentence ("3 of 5 matched correctly"),
            // not literal answer text comparable to a question bank row.
            is_correct: /^Result:\s*INCORRECT/i.test(resultLine) ? 0 : (/^Result:\s*CORRECT/i.test(resultLine) ? 1 : null)
        });
    }

    return { studentName, studentId, chapterTitle, reportType, questions };
}

router.post('/admin/missed-questions/import', requireStaff, upload.array('pdfs', 50), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No PDF files received.' });

    try {
        const connection = await getDbConnection();
        await ensureTable(connection);

        const results = [];
        for (const file of req.files) {
            try {
                const { text } = await pdfParse(file.buffer);
                const parsed = parseReportText(text);

                const matched = await insertQuestionDetails(connection, {
                    studentId: parsed.studentId, studentName: parsed.studentName,
                    chapterTitle: parsed.chapterTitle, reportType: parsed.reportType, sourceFile: file.originalname
                }, parsed.questions);

                results.push({
                    file: file.originalname, studentName: parsed.studentName, studentId: parsed.studentId,
                    chapterTitle: parsed.chapterTitle, totalQuestions: parsed.questions.length,
                    matched, unmatched: parsed.questions.length - matched,
                    error: parsed.questions.length === 0 ? 'No questions could be parsed from this file -- is it a real exam report PDF?' : null
                });
            } catch (fileErr) {
                console.error('[missed-questions] failed to parse', file.originalname, fileErr);
                results.push({ file: file.originalname, error: 'Could not read this PDF.' });
            }
        }

        await connection.release();
        res.json({ results });
    } catch (err) {
        console.error('[missed-questions] import failed', err);
        res.status(500).json({ error: 'Import failed.' });
    }
});

router.get('/admin/missed-questions/summary', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTable(connection);
        const [rows] = await connection.execute(`
            SELECT question_text, chapter_title, correct_choice, study_hint, concept_tag,
                   COUNT(*) AS times_seen,
                   SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS times_missed
            FROM missed_question_reports
            GROUP BY question_text, chapter_title, correct_choice, study_hint, concept_tag
            HAVING times_missed > 0
            ORDER BY times_missed DESC, times_seen DESC
        `);
        const [unmatchedCount] = await connection.execute(
            `SELECT COUNT(*) AS n FROM missed_question_reports WHERE matched_table IS NULL`
        );
        const [totals] = await connection.execute(
            `SELECT COUNT(DISTINCT student_id) AS students, COUNT(DISTINCT source_file) AS files, COUNT(*) AS questionRows
             FROM missed_question_reports`
        );
        await connection.release();
        res.json({ questions: rows, unmatchedCount: unmatchedCount[0].n, totals: totals[0] });
    } catch (err) {
        console.error('[missed-questions] summary failed', err);
        res.status(500).json({ error: 'Failed to load summary.' });
    }
});

router.get('/admin/missed-questions/unmatched', requireStaff, async (req, res) => {
    try {
        const connection = await getDbConnection();
        await ensureTable(connection);
        const [rows] = await connection.execute(
            `SELECT DISTINCT question_text, chapter_title, source_file FROM missed_question_reports
             WHERE matched_table IS NULL ORDER BY imported_at DESC LIMIT 200`
        );
        await connection.release();
        res.json({ rows });
    } catch (err) {
        console.error('[missed-questions] unmatched failed', err);
        res.status(500).json({ error: 'Failed to load unmatched questions.' });
    }
});

module.exports = router;
