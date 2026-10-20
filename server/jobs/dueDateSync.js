// server/jobs/dueDateSync.js
// Moves gradebook due dates (exams.due_date / period_due_dates) and the
// matching student-calendar entries to follow Jotability's pacing, every
// time Jotability sends a schedule (POST /agenda/sync/schedule).
//
// Each agenda block's chapterLabel ("Chapter 3: The Blueprint · Day 2 of 8",
// "Unit 4: ... · Day 1 of 9") says which chapter/unit it teaches, and
// agenda_days says which real dates each block lands on. Items are matched:
//   Pre-Assessment / Pre-Scale  -> first class day of the chapter/unit
//   Chapter/Unit exam           -> the slide that is the test/checkpoint day,
//                                  else the project-due day, else the last day
//   Chapter project (chN_milestone) -> the "Milestone/Project Due" slide
//   Milestone labs              -> the slide that names the lab; if none does,
//                                  spread through the chapter in lab order
//   CS chapter labs             -> same relative spot inside their unit
// Never touched: timeclock check-ins, items with no due date, anything already
// due before today, and anything that would land before today.
// Comp Sci has an A-day track and a B-day track, so CS items get one date per
// period (period_due_dates) and due_date = the later of the two.
// Every change is logged in due_date_sync_log (old and new values) for undo.
const { withConnection } = require('../db');

// OFF until Jotability sends lessons in order: on 2026-10-20 its WD2 pacing
// put Ch13 Day 5 before Day 1 and the project-due day before Day 3, which
// would have set project due dates ahead of their labs. Flip to true once a
// dry run (syncDueDates(course, { dryRun: true })) looks right.
const AUTO_ENABLED = false;

const COURSES = {
    wd1: { courseId: '05254G1S', bucket: 'WD1' },
    wd2: { courseId: '05254G2S', bucket: 'WD2' },
    cs_s1: { courseId: '10003GS', bucket: 'CS', unitBased: true }
};

const LOG_DDL = `CREATE TABLE IF NOT EXISTS due_date_sync_log (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    run_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    course     VARCHAR(20) NOT NULL,
    exam_id    VARCHAR(255) NOT NULL,
    old_due    DATE NULL,
    old_pdd    TEXT NULL,
    new_due    DATE NULL,
    new_pdd    TEXT NULL,
    rule       VARCHAR(40) NULL,
    KEY idx_run (run_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

const ymd = d => (d instanceof Date)
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : (d ? String(d).slice(0, 10) : null);
const todayStr = () => ymd(new Date());

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'lab', 'labs', 'your', 'to', 'for', 'in', 'on', 'with', 'milestone', 'milestones', 'project', 'capstone', 'part', 'due']);
const words = s => String(s || '').toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w));

// "Milestone 2: Meet Your Persona" -> "Meet Your Persona"; "Ch9-The Data Vault Lab" -> "The Data Vault Lab"
const coreTitle = (t) => String(t || '')
    .replace(/^(milestones?|project|capstone|final project|lab)\s*[\d&\s-]*:\s*/i, '')
    .replace(/^ch\d+\s*[-:]\s*/i, '')
    .replace(/\s*[\[(]\d+\s*pts?[\])]/i, '')
    .trim();

function groupOf(label) {
    const head = String(label || '').split(' · ')[0].trim();
    let m = head.match(/^Chapter\s+(\d+)/i);
    if (m) return `ch${m[1]}`;
    m = head.match(/^Unit\s+(\d+)/i);
    if (m) return `unit${m[1]}`;
    return head || null;
}

async function loadCourse(connection, course) {
    const cfg = COURSES[course];
    const [contentRows] = await connection.execute('SELECT block_num, content FROM agenda_content WHERE course = ?', [course]);
    const blocks = {};
    contentRows.forEach(r => {
        let c = r.content;
        try { if (typeof c === 'string') c = JSON.parse(c); } catch (e) { c = {}; }
        const ms = c.milestone && typeof c.milestone === 'object' ? c.milestone.title : null;
        blocks[r.block_num] = {
            num: r.block_num,
            group: groupOf(c.chapterLabel),
            title: c.tasksTitle || '',
            milestone: ms || null,
            text: [c.tasksTitle, ...(Array.isArray(c.tasksList) ? c.tasksList : []), ms].filter(Boolean).join(' | ')
        };
    });
    const [dayRows] = await connection.execute('SELECT track, event_date, block_num FROM agenda_days WHERE course = ?', [course]);
    // track -> block -> [dates]
    const tracks = {};
    dayRows.forEach(r => {
        const t = (tracks[r.track] = tracks[r.track] || {});
        (t[r.block_num] = t[r.block_num] || []).push(ymd(r.event_date));
    });
    Object.values(tracks).forEach(t => Object.values(t).forEach(list => list.sort()));

    // Which periods follow which track (CS: A-day periods -> A, B-day -> B).
    let periodsByTrack = { main: [] };
    if (cfg.unitBased) {
        const [secs] = await connection.execute(
            'SELECT section_id FROM class_sections WHERE course_id = ? AND archived = 0 AND permanent = 0', [cfg.courseId]);
        periodsByTrack = { A: [], B: [] };
        secs.forEach(s => { const t = String(s.section_id).charAt(0).toUpperCase(); if (periodsByTrack[t]) periodsByTrack[t].push(s.section_id); });
    }

    const [items] = await connection.execute(
        'SELECT exam_id, title, due_date, period_due_dates FROM exams WHERE course_id = ?', [cfg.courseId]);
    return { cfg, blocks, tracks, periodsByTrack, items };
}

// All class dates for a group on a track, in order.
function groupDates(ctx, track, group) {
    const t = ctx.tracks[track] || {};
    const out = [];
    Object.values(ctx.blocks).filter(b => b.group === group).forEach(b => (t[b.num] || []).forEach(d => out.push(d)));
    return [...new Set(out)].sort();
}
const blockLastDate = (ctx, track, block) => { const l = (ctx.tracks[track] || {})[block.num] || []; return l.length ? l[l.length - 1] : null; };

function bestBlockByName(ctx, group, title) {
    const want = words(coreTitle(title));
    if (!want.length) return null;
    let best = null, bestScore = 0;
    Object.values(ctx.blocks).filter(b => b.group === group).forEach(b => {
        const have = new Set(words(b.text));
        const hit = want.filter(w => have.has(w)).length / want.length;
        if (hit > bestScore || (hit === bestScore && best && b.num > best.num)) { bestScore = hit; best = b; }
    });
    return bestScore >= 0.6 ? best : null;
}

// Decide one item's new date on one track. Returns { date, rule } or null.
function targetFor(ctx, track, item, extra) {
    const id = item.exam_id, title = item.title || '';
    if (ctx.cfg.unitBased) {
        const um = id.match(/^Unit(\d+)[\s-]/i);
        if (um) {
            const g = `unit${um[1]}`;
            const dates = groupDates(ctx, track, g);
            if (!dates.length) return null;
            if (/pre/i.test(id)) return { date: dates[0], rule: 'unit-first-day' };
            if (/-Exam$/i.test(id)) {
                const cp = Object.values(ctx.blocks).filter(b => b.group === g && /checkpoint|exam/i.test(b.title)).sort((a, b) => b.num - a.num)[0];
                return { date: (cp && blockLastDate(ctx, track, cp)) || dates[dates.length - 1], rule: cp ? 'unit-checkpoint' : 'unit-last-day' };
            }
            return null;
        }
        // CS chapter labs: keep their relative spot inside their unit.
        if (extra && extra.unitOf && extra.unitOf[id]) {
            const { unit, frac } = extra.unitOf[id];
            const dates = groupDates(ctx, track, `unit${unit}`);
            if (!dates.length) return null;
            return { date: dates[Math.round(frac * (dates.length - 1))], rule: 'unit-relative' };
        }
        return null;
    }

    const cm = id.match(/^ch(\d+)[\s_-]/i);
    if (!cm) return null;
    const g = `ch${cm[1]}`;
    const dates = groupDates(ctx, track, g);
    if (!dates.length) return null;
    const chBlocks = Object.values(ctx.blocks).filter(b => b.group === g).sort((a, b) => a.num - b.num);
    const msBlock = chBlocks.filter(b => b.milestone).pop();
    if (/pre-(assessment|scale)/i.test(id)) return { date: dates[0], rule: 'chapter-first-day' };
    if (/-Exam$/i.test(id)) {
        const examBlock = chBlocks.filter(b => /\bexam\b|\btest\b/i.test(b.title) && !/retest/i.test(b.title)).pop();
        if (examBlock && blockLastDate(ctx, track, examBlock)) return { date: blockLastDate(ctx, track, examBlock), rule: 'exam-day' };
        if (msBlock && blockLastDate(ctx, track, msBlock)) return { date: blockLastDate(ctx, track, msBlock), rule: 'project-due-day' };
        return { date: dates[dates.length - 1], rule: 'chapter-last-day' };
    }
    if (/_milestone$/i.test(id)) {
        if (msBlock && blockLastDate(ctx, track, msBlock)) return { date: blockLastDate(ctx, track, msBlock), rule: 'project-due-day' };
        return { date: dates[dates.length - 1], rule: 'chapter-last-day' };
    }
    const named = bestBlockByName(ctx, g, title);
    if (named && blockLastDate(ctx, track, named)) return { date: blockLastDate(ctx, track, named), rule: 'lab-by-name' };
    if (extra && extra.labOrder && extra.labOrder[id]) {
        const { k, n } = extra.labOrder[id];
        return { date: dates[Math.min(dates.length - 1, Math.round(((k + 1) / (n + 1)) * (dates.length - 1)))], rule: 'lab-in-order' };
    }
    return null;
}

// Pre-computed context the per-item rules need.
function buildExtra(ctx) {
    const extra = { labOrder: {}, unitOf: {} };
    if (ctx.cfg.unitBased) {
        // A CS chapter item belongs to the unit whose exam is the first one on
        // or after its current due date; its spot is measured between that
        // unit's pre-test and exam dates.
        const units = {};
        ctx.items.forEach(it => {
            const m = it.exam_id.match(/^Unit(\d+)-(Pre|Exam)$/i);
            if (m && it.due_date) (units[m[1]] = units[m[1]] || {})[m[2].toLowerCase()] = ymd(it.due_date);
        });
        const order = Object.entries(units).filter(([, u]) => u.exam).sort((a, b) => a[1].exam.localeCompare(b[1].exam));
        ctx.items.forEach(it => {
            if (!/^(cs_ch\d+_|ch\d+-)/i.test(it.exam_id) || !it.due_date) return;
            const due = ymd(it.due_date);
            const hit = order.find(([, u]) => u.exam >= due);
            if (!hit) return;
            const [unit, u] = hit;
            const start = u.pre || due;
            const span = (new Date(u.exam) - new Date(start)) || 1;
            const frac = Math.max(0, Math.min(1, (new Date(due) - new Date(start)) / span));
            extra.unitOf[it.exam_id] = { unit, frac };
        });
        return extra;
    }
    const byCh = {};
    ctx.items.forEach(it => {
        const m = it.exam_id.match(/^ch(\d+)_lab(\d+)/i);
        if (m) (byCh[m[1]] = byCh[m[1]] || []).push({ id: it.exam_id, n: Number(m[2]) });
    });
    Object.values(byCh).forEach(list => {
        list.sort((a, b) => a.n - b.n).forEach((x, i) => { extra.labOrder[x.id] = { k: i, n: list.length }; });
    });
    return extra;
}

// Computes the changes for one course. Pure read; returns a plan.
async function planCourse(connection, course) {
    const ctx = await loadCourse(connection, course);
    const extra = buildExtra(ctx);
    const today = todayStr();
    const plan = [], skipped = [];
    const trackNames = ctx.cfg.unitBased ? ['A', 'B'] : ['main'];
    for (const it of ctx.items) {
        const oldDue = ymd(it.due_date);
        if (/^TC-/i.test(it.exam_id)) continue;
        if (!oldDue) continue;
        if (oldDue < today) continue;
        const perTrack = {};
        let rule = null;
        for (const t of trackNames) {
            const r = targetFor(ctx, t, it, extra);
            if (r && r.date) { perTrack[t] = r.date; rule = rule || r.rule; }
        }
        if (!Object.keys(perTrack).length) { skipped.push({ exam_id: it.exam_id, title: it.title, due: oldDue, why: 'no matching lesson' }); continue; }
        if (Object.values(perTrack).some(d => d < today)) { skipped.push({ exam_id: it.exam_id, title: it.title, due: oldDue, why: 'new date would be in the past' }); continue; }

        let newDue, newPdd = null;
        if (ctx.cfg.unitBased) {
            const pdd = {};
            Object.entries(perTrack).forEach(([t, d]) => (ctx.periodsByTrack[t] || []).forEach(p => { pdd[p] = d; }));
            newDue = Object.values(perTrack).sort().pop();
            newPdd = Object.keys(pdd).length ? pdd : null;
        } else {
            newDue = perTrack.main;
        }
        let oldPdd = it.period_due_dates;
        try { if (typeof oldPdd === 'string') oldPdd = JSON.parse(oldPdd); } catch (e) { oldPdd = null; }
        const same = newDue === oldDue && JSON.stringify(newPdd || null) === JSON.stringify(oldPdd || null);
        if (same) continue;
        plan.push({ exam_id: it.exam_id, title: it.title, oldDue, oldPdd: oldPdd || null, newDue, newPdd, perTrack, rule });
    }
    return { course, cfg: ctx.cfg, plan, skipped };
}

async function applyPlan(connection, result) {
    const { course, cfg, plan } = result;
    if (!plan.length) return 0;
    await connection.execute(LOG_DDL);
    await connection.beginTransaction();
    try {
        for (const p of plan) {
            await connection.execute(
                'UPDATE exams SET due_date = ?, period_due_dates = ? WHERE exam_id = ? AND course_id = ?',
                [p.newDue, p.newPdd ? JSON.stringify(p.newPdd) : null, p.exam_id, cfg.courseId]);
            await connection.execute(
                'INSERT INTO due_date_sync_log (course, exam_id, old_due, old_pdd, new_due, new_pdd, rule) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [course, p.exam_id, p.oldDue, p.oldPdd ? JSON.stringify(p.oldPdd) : null, p.newDue, p.newPdd ? JSON.stringify(p.newPdd) : null, p.rule]);
            // Student calendar: replace this item's due-date entries.
            const title = String(p.title || p.exam_id).trim();
            await connection.execute(
                `DELETE FROM calendar_events WHERE source = 'due_date' AND course_bucket = ? AND (title = ? OR title LIKE ?)`,
                [cfg.bucket, `${title} Due`, `${title} Due – %`]);
            const desc = `${cfg.courseId} – ${title}`;
            const tracks = Object.entries(p.perTrack);
            const distinct = [...new Set(tracks.map(([, d]) => d))];
            if (distinct.length <= 1) {
                await connection.execute(
                    `INSERT INTO calendar_events (event_date, title, type, description, all_day, source, course_bucket) VALUES (?, ?, 'none', ?, 1, 'due_date', ?)`,
                    [p.newDue, `${title} Due`, desc, cfg.bucket]);
            } else {
                for (const [t, d] of tracks) {
                    await connection.execute(
                        `INSERT INTO calendar_events (event_date, title, type, description, all_day, source, course_bucket) VALUES (?, ?, 'none', ?, 1, 'due_date', ?)`,
                        [d, `${title} Due – ${t}-day classes`, `${desc} [${t}-day]`, cfg.bucket]);
                }
            }
        }
        await connection.commit();
    } catch (e) { await connection.rollback(); throw e; }
    return plan.length;
}

// Called after every Jotability schedule send. dryRun returns the plan only.
async function syncDueDates(course, { dryRun = false } = {}) {
    if (!COURSES[course]) return null;
    return withConnection(async (connection) => {
        const result = await planCourse(connection, course);
        if (!dryRun) result.applied = await applyPlan(connection, result);
        return result;
    });
}

module.exports = { syncDueDates, COURSES, AUTO_ENABLED };
