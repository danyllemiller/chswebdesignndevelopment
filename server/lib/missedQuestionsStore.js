// Shared by server/routes/missed-questions.js (PDF backfill) and the
// /submit-exam handler (server/routes/gradebook.js, live capture going
// forward) so both paths enrich and store a missed question the same way --
// one INSERT shape, one matching strategy, checked in one place.

function normalize(s) {
    return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function ensureTable(connection) {
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS missed_question_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id VARCHAR(50),
            student_name VARCHAR(100),
            chapter_title VARCHAR(150),
            report_type VARCHAR(50),
            question_text TEXT NOT NULL,
            student_choice TEXT,
            correct_choice TEXT,
            is_correct TINYINT(1),
            matched_table VARCHAR(30),
            matched_question_id INT,
            study_hint TEXT,
            concept_tag VARCHAR(100),
            source_file VARCHAR(255),
            imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// question_text is the only thing every bank shares in common with what a
// PDF report prints (or what a static pretest pool, which has no DB row of
// its own, can offer) -- used only as a fallback when the caller doesn't
// already know exactly which table/row a question came from.
async function loadQuestionBankIndex(connection) {
    const index = new Map();
    const [csRows] = await connection.execute(
        'SELECT question_id, question_text, correct_answer, study_hint, concept_tag FROM questions'
    );
    csRows.forEach(r => index.set(normalize(r.question_text), {
        table: 'questions', id: r.question_id, correctAnswer: r.correct_answer,
        studyHint: r.study_hint, conceptTag: r.concept_tag
    }));
    const [wdRows] = await connection.execute(
        'SELECT question_id, question_text, correct_answer FROM wd_questions'
    );
    wdRows.forEach(r => { if (!index.has(normalize(r.question_text))) index.set(normalize(r.question_text), {
        table: 'wd_questions', id: r.question_id, correctAnswer: r.correct_answer, studyHint: null, conceptTag: null
    }); });
    const [dailyRows] = await connection.execute(
        'SELECT id, question_text, correct_answer, study_hint FROM daily_questions WHERE question_text IS NOT NULL'
    );
    dailyRows.forEach(r => { if (!index.has(normalize(r.question_text))) index.set(normalize(r.question_text), {
        table: 'daily_questions', id: r.id, correctAnswer: r.correct_answer, studyHint: r.study_hint, conceptTag: null
    }); });
    return index;
}

// Matching/image-labeling questions don't have a single "correct answer"
// string (they're pairs), so those short-circuit with no enrichment --
// matched_table/matched_question_id are still recorded for reference.
async function resolveMatch(connection, getBankIndex, detail) {
    const { question_id, matched_table, question_text } = detail;
    if (question_id && matched_table === 'questions') {
        const [rows] = await connection.execute(
            'SELECT correct_answer, study_hint, concept_tag FROM questions WHERE question_id = ?', [question_id]
        );
        if (rows.length) return {
            matchedTable: 'questions', matchedId: question_id,
            correctChoice: rows[0].correct_answer, studyHint: rows[0].study_hint, conceptTag: rows[0].concept_tag
        };
    } else if (question_id && matched_table === 'wd_questions') {
        const [rows] = await connection.execute(
            'SELECT correct_answer FROM wd_questions WHERE question_id = ?', [question_id]
        );
        if (rows.length) return {
            matchedTable: 'wd_questions', matchedId: question_id,
            correctChoice: rows[0].correct_answer, studyHint: null, conceptTag: null
        };
    } else if (matched_table === 'wd_matching_questions' || matched_table === 'wd_image_labeling_questions') {
        return { matchedTable: matched_table, matchedId: question_id || null, correctChoice: null, studyHint: null, conceptTag: null };
    }

    const bankIndex = await getBankIndex();
    const bank = bankIndex.get(normalize(question_text));
    if (bank) return { matchedTable: bank.table, matchedId: bank.id, correctChoice: bank.correctAnswer, studyHint: bank.studyHint, conceptTag: bank.conceptTag };
    return { matchedTable: null, matchedId: null, correctChoice: null, studyHint: null, conceptTag: null };
}

// meta: { studentId, studentName, chapterTitle, reportType, sourceFile }
// details: [{ question_id?, matched_table?, question_text, student_choice, is_correct }]
// Returns how many of the given details resolved to a real bank row, so a
// caller (the PDF importer) can report import coverage back to the user.
async function insertQuestionDetails(connection, meta, details) {
    if (!details || details.length === 0) return 0;
    await ensureTable(connection);

    let bankIndexCache = null;
    const getBankIndex = async () => {
        if (!bankIndexCache) bankIndexCache = await loadQuestionBankIndex(connection);
        return bankIndexCache;
    };

    let matched = 0;
    for (const detail of details) {
        const match = await resolveMatch(connection, getBankIndex, detail);
        if (match.matchedTable) matched++;
        await connection.execute(
            `INSERT INTO missed_question_reports
             (student_id, student_name, chapter_title, report_type, question_text, student_choice,
              correct_choice, is_correct, matched_table, matched_question_id, study_hint, concept_tag, source_file)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [meta.studentId, meta.studentName || null, meta.chapterTitle || null, meta.reportType || null,
             detail.question_text, detail.student_choice, match.correctChoice, detail.is_correct,
             match.matchedTable, match.matchedId, match.studyHint, match.conceptTag, meta.sourceFile || null]
        );
    }
    return matched;
}

module.exports = { ensureTable, loadQuestionBankIndex, insertQuestionDetails, normalize };
