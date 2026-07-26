// Shared utilities used across multiple route modules

function getCurrentSchoolYear() {
    const now = new Date();
    const y = now.getFullYear();
    return (now.getMonth() + 1) >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function normalizeCourseCodeLegacy(sectionId = '') {
    const s = String(sectionId).toUpperCase();
    if (s.startsWith('WD1')) return '05254G1S';
    if (s.startsWith('WD2')) return '05254G2S';
    if (s.startsWith('AS'))  return '05254ES';
    if (s.startsWith('CS'))  return '10003GS';
    return null;
}

async function resolveCourseId(connection, sectionId) {
    const [rows] = await connection.execute(
        'SELECT course_id FROM class_sections WHERE section_id = ?',
        [sectionId]
    );
    if (rows.length && rows[0].course_id) return rows[0].course_id;
    return normalizeCourseCodeLegacy(sectionId);
}

function clampScore(score, max = 100) {
    const n = Number(score);
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > max) return max;
    return n;
}

module.exports = { getCurrentSchoolYear, resolveCourseId, clampScore };
