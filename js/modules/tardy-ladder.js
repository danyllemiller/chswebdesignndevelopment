// /js/modules/tardy-ladder.js
// Single source of truth for the tardy consequence ladder, matching the
// official policy on discipline.html word-for-word. Used by both the
// student-facing count (student/grades.html) and the teacher's follow-up
// flag (admin/tools/tardy-tracker.html) so neither can drift out of sync
// with the real policy or with each other.
export const TARDY_LADDER = [
    { count: 1, label: 'First Tardy', consequence: 'Brief private check-in. No further consequence.' },
    { count: 2, label: 'Second Tardy', consequence: 'Five-minute conference and a short written reflection identifying one specific change.' },
    { count: 3, label: 'Third Tardy', consequence: "I'll ask what you think could help your student get to class on time, and we'll build a plan together based on your input." },
    { count: 4, label: 'Fourth Tardy', consequence: "A restorative session is scheduled, the counselor is looped in, and I'll ask what you think could help your student get to class on time." },
    { count: 5, label: 'Fifth Tardy & Beyond', consequence: 'Administrative referral, with a meeting requested including parent/guardian, counselor, and an administrator.' }
];

// Returns the ladder step that applies at a given tardy count (5+ all map
// to the "Fifth Tardy & Beyond" step, matching the policy's own wording).
export function getTardyStep(count) {
    if (!count || count < 1) return null;
    return TARDY_LADDER.find(s => s.count === count) || TARDY_LADDER[TARDY_LADDER.length - 1];
}
