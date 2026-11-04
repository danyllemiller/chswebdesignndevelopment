// server/lib/wprCfaQuestions.js
// The baseline CFA's questions. They include the answers, so they live on the server only, never in this public
// repo: the final version (WPR_CFA_FILE) once the PLC team finishes its review (wpr-practice/cfa-review.html),
// and until then the draft (WPR_CFA_DRAFT), marked as a draft. Practice tests leave CFA questions out
// (wrsPool.js), so students see them for the first time on the CFA.
const fs = require('fs');

const FILES = [
    [process.env.WPR_CFA_FILE || '/var/lib/chs-site/wpr-cfa.json', false],
    [process.env.WPR_CFA_DRAFT || '/var/lib/chs-site/wpr-cfa-draft.json', true]
];
let cache = { file: '', mtime: 0, cfa: null };

// -> { title, draft, items: [{ key, indicator, kind, prompt, q, options, answer }] }, or null if there is none
function loadCfa() {
    for (const [file, draft] of FILES) {
        let mtime;
        try { mtime = fs.statSync(file).mtimeMs; } catch (e) { continue; }
        if (cache.file !== file || cache.mtime !== mtime) {
            try { cache = { file, mtime, cfa: Object.assign(JSON.parse(fs.readFileSync(file, 'utf8')), { draft }) }; }
            catch (e) { console.error('[wpr-cfa] could not read', file, e.message); continue; }
        }
        return cache.cfa;
    }
    return null;
}

// The pool questions on the CFA (their wprIndicators.json keys), for practice tests to skip
const cfaKeys = () => new Set((loadCfa() || { items: [] }).items.map(i => i.key));

module.exports = { loadCfa, cfaKeys };
