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
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { WPR_MC_QUESTIONS } = require('../wprQuestionBank');

const PRACTICE_FILES = ['', '-b', '-c', '-d'].map(s =>
    path.join(__dirname, '..', '..', 'pre-assessments', `workplace-readiness-skills${s}.html`));

let cache = null;

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
    const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
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

// One student's 100-question test, answers included (kept server-side).
// Mix: 2 matching sets (their items stay together), ~25 true/false, the rest
// multiple choice. Each question: { kind, prompt, q, options, correct, hint }.
function buildTest(total = 100) {
    const { tf, mc, sets } = loadPool();
    const blocks = [];
    let count = 0;
    shuffle(sets).slice(0, 2).forEach(set => {
        const letters = set.choices.map(c => String(c).trim().charAt(0).toUpperCase());
        const block = shuffle(set.items).map(it => ({
            kind: 'match', prompt: set.title, q: it.q, options: set.choices,
            correct: letters.indexOf(String(it.answer).trim().charAt(0).toUpperCase()), hint: it.hint || ''
        })).filter(x => x.correct >= 0);
        count += block.length;
        blocks.push(block);
    });
    const nTf = Math.min(tf.length, 25);
    shuffle(tf).slice(0, nTf).forEach(x => {
        blocks.push([{ kind: 'tf', prompt: 'True or false?', q: x.q, options: ['True', 'False'], correct: x.answer === 'T' ? 0 : 1, hint: x.hint }]);
        count++;
    });
    shuffle(mc).slice(0, Math.max(0, total - count)).forEach(x => {
        const options = shuffle(x.options);
        blocks.push([{ kind: 'mc', prompt: '', q: x.q, options, correct: options.indexOf(x.answer), hint: x.hint }]);
    });
    return shuffle(blocks).flat().slice(0, total);
}

module.exports = { loadPool, buildTest };
