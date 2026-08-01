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

// Returns null if pw satisfies the password rule, otherwise a specific
// message naming the first unmet requirement. Only for password *creation*
// (register, change-password, self-service reset) -- never call this from
// /login, since existing accounts predate this rule and must still be able
// to authenticate.
//
// Special characters are restricted to standard printable ASCII punctuation
// (no whitespace, no Unicode/emoji/accented letters/smart quotes) -- those
// can be invisible, look identical to their ASCII counterparts, or be
// impossible to retype consistently across a school Chromebook vs. a phone.
function validatePassword(pw) {
    const s = String(pw || '');
    if (s.length < 8) return 'Password must be at least 8 characters.';
    if (/\s/.test(s)) return 'Password cannot contain spaces.';
    if (!/^[\x21-\x7E]+$/.test(s)) return 'Password can only contain standard keyboard letters, numbers, and symbols.';
    if (!/[A-Z]/.test(s)) return 'Password needs at least one uppercase letter.';
    if (!/[a-z]/.test(s)) return 'Password needs at least one lowercase letter.';
    if (!/[0-9]/.test(s)) return 'Password needs at least one number.';
    if (!/[^A-Za-z0-9]/.test(s)) return 'Password needs at least one special character.';
    return null;
}

module.exports = { getCurrentSchoolYear, resolveCourseId, clampScore, validatePassword };
