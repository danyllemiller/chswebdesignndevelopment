// server/lib/wrsPool.js
// The question pool for the Monday WRS Sprint (server/routes/wrsSprint.js):
// every true/false, multiple-choice, and matching question from WRS Practice
// Assessments A-D (pre-assessments/workplace-readiness-skills*.html) plus the
// multiple-choice clock-in bank (server/wprQuestionBank.js). The practice
// pages keep their questions as plain JS array literals (tfSection,
// matchSection, mcSection), so they're read straight out of those files and
// evaluated in an empty sandbox -- one source of truth, no copied bank to
// drift out of date. Picture-labeling questions are left out (they need the
// practice page's drawings).
//
// Each question also carries its Nevada CTE Employability Skills indicator
// (1.1.1-1.3.4) from wprIndicators.json, keyed by the first 12 hex digits of
// the SHA-1 of its normalized text, for the standards breakdowns in WPR
// Practice Pro reports (wpr-practice/assets/standards.js names them).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { WPR_MC_QUESTIONS } = require('../wprQuestionBank');
const { SAFETY_MC, SAFETY_TF } = require('./wrsSafetyQuestions');
const { WORKLIFE_MC, WORKLIFE_TF } = require('./wrsWorkLifeQuestions');

const PRACTICE_FILES = ['', '-b', '-c', '-d'].map(s =>
    path.join(__dirname, '..', '..', 'pre-assessments', `workplace-readiness-skills${s}.html`));

let cache = null;
const INDICATORS = require('./wprIndicators.json');
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const indicatorFor = q => INDICATORS[crypto.createHash('sha1').update(norm(q)).digest('hex').slice(0, 12)] || '';

function readSections(file) {
    const html = fs.readFileSync(file, 'utf8');
    const start = html.indexOf('var tfSection');
    const end = html.indexOf('var labelSection');
    if (start < 0 || end < 0) return { tf: [], match: [], mc: [] };
    const sandbox = {};
    vm.runInNewContext(html.slice(start, end) + '\n;this.out = { tf: tfSection, match: matchSection, mc: mcSection };', sandbox, { timeout: 1000 });
    return sandbox.out || { tf: [], match: [], mc: [] };
}

function loadPool() {
    if (cache) return cache;
    const seen = new Set();
    const tf = [], mc = [], sets = [];
    const sources = PRACTICE_FILES.filter(f => fs.existsSync(f)).map(readSections);

    sources.forEach(sec => {
        (sec.tf || []).forEach(x => {
            if (!x.q || !/^[TF]$/.test(x.a) || seen.has(norm(x.q))) return;
            seen.add(norm(x.q));
            tf.push({ q: x.q, answer: x.a, hint: x.hint || '' });
        });
        (sec.mc || []).forEach(x => {
            if (!x.q || !Array.isArray(x.options) || !x.options.includes(x.answer) || seen.has(norm(x.q))) return;
            seen.add(norm(x.q));
            mc.push({ q: x.q, options: x.options, answer: x.answer, hint: x.hint || '' });
        });
        (sec.match || []).forEach(set => {
            if (!set.title || !Array.isArray(set.choices) || !Array.isArray(set.items)) return;
            const items = set.items.filter(it => it.q && it.answer && !seen.has(norm(it.q)));
            items.forEach(it => seen.add(norm(it.q)));
            if (items.length >= 3) sets.push({ title: set.title, choices: set.choices, items });
        });
    });
    (WPR_MC_QUESTIONS || []).forEach(x => {
        if (!x.q || !Array.isArray(x.options) || !x.options.includes(x.answer) || seen.has(norm(x.q))) return;
        seen.add(norm(x.q));
        mc.push({ q: x.q, options: x.options, answer: x.answer, hint: x.hint || '' });
    });
    cache = { tf, mc, sets };
    return cache;
}

const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// "Match each situation to the most appropriate type of workplace
// communication." -> "Which type of workplace communication best fits this
// situation?" Matching sets become ordinary multiple-choice questions
// (students asked for multiple choice and true/false only).
function matchPrompt(title) {
    const m = String(title).match(/^Match each (.+?) to (?:the |its )?(?:most appropriate |correct |best )?(.+?)\.?$/i);
    if (!m) return String(title);
    // "...to the WRS skill it best demonstrates" -> "Which WRS skill does this situation best demonstrate?"
    const verb = m[2].match(/^(.+?) (?:it|they) best (\w+?)s?$/i);
    if (verb) return `Which ${verb[1]} does this ${m[1]} best ${verb[2]}?`;
    return `Which ${m[2]} best fits this ${m[1]}?`;
}
const stripLetter = c => String(c).replace(/^[A-Z]\.\s*/, '').trim();

function matchAsMc(set) {
    const choices = set.choices.map(stripLetter);
    const letters = set.choices.map(c => String(c).trim().charAt(0).toUpperCase());
    return set.items.map(it => {
        const idx = letters.indexOf(String(it.answer).trim().charAt(0).toUpperCase());
        if (idx < 0) return null;
        const answer = choices[idx];
        return { prompt: matchPrompt(set.title), q: it.q, options: [answer, ...shuffle(choices.filter(c => c !== answer)).slice(0, 3)], answer, hint: it.hint || '' };
    }).filter(Boolean);
}

const asTf = (x, topic) => ({ kind: 'tf', topic, prompt: 'True or false?', q: x.q, options: ['True', 'False'], correct: (x.answer || x.a) === 'T' ? 0 : 1, hint: x.hint || '', indicator: indicatorFor(x.q) });
const asMc = (x, topic) => { const options = shuffle(x.options); return { kind: 'mc', topic, prompt: x.prompt || '', q: x.q, options, correct: options.indexOf(x.answer), hint: x.hint || '', indicator: indicatorFor(x.q) }; };

// One student's 100-question test, answers included (kept server-side).
// All multiple choice and true/false, every question shuffled:
//   2-5 workplace safety / ergonomics questions (2-5%), 1-3 work vs.
//   personal life scenarios (wrsWorkLifeQuestions.js), about 30 true/false,
//   and the rest multiple choice (including the converted matching items).
// Each question: { kind, topic, prompt, q, options, correct, hint, indicator }.
function buildTest(total = 100) {
    const { tf, mc, sets } = loadPool();
    // Scales with test length: 2-5% safety (at least 1), about 30% true/false.
    const safetyCount = Math.max(1, Math.round(total * (0.02 + Math.random() * 0.03)));
    const safety = shuffle([...SAFETY_MC.map(x => asMc(x, 'safety')), ...SAFETY_TF.map(x => asTf(x, 'safety'))]).slice(0, safetyCount);
    const worklifeCount = Math.max(1, Math.round(total * (0.01 + Math.random() * 0.02)));
    const worklife = shuffle([...WORKLIFE_MC.map(x => asMc(x, 'worklife')), ...WORKLIFE_TF.map(x => asTf(x, 'worklife'))]).slice(0, worklifeCount);
    const tfPicks = shuffle(tf).slice(0, Math.min(tf.length, Math.round(total * 0.3))).map(x => asTf(x, 'wrs'));
    const mcPool = [...mc, ...sets.flatMap(matchAsMc)];
    const mcPicks = shuffle(mcPool).slice(0, Math.max(0, total - safety.length - worklife.length - tfPicks.length)).map(x => asMc(x, 'wrs'));
    return shuffle([...safety, ...worklife, ...tfPicks, ...mcPicks]).filter(q => q.correct >= 0).slice(0, total);
}

module.exports = { loadPool, buildTest, indicatorFor };
