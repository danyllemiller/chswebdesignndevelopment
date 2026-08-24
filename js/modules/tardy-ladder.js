// /js/modules/tardy-ladder.js
// Single source of truth for the tardy consequence ladder, matching the
// official policy on discipline.html word-for-word. Used by both the
// student-facing count (student/grades.html) and the teacher's follow-up
// flag (admin/tools/tardy-tracker.html) so neither can drift out of sync
// with the real policy or with each other.
export const TARDY_LADDER = [
    { count: 1, label: 'First Tardy', consequence: 'Brief private check-in. No further consequence.' },
    { count: 2, label: 'Second Tardy', consequence: 'Five-minute conference and a short written reflection identifying one specific change.' },
    { count: 3, label: 'Third Tardy', consequence: 'Parent/guardian contacted by phone or email, and a short support plan is built together. Missed class time is made up during lunch or before/after school.' },
    { count: 4, label: 'Fourth Tardy', consequence: "Scheduled restorative session, a revised plan, and the student's counselor is looped in. Parent/guardian is notified of the outcome." },
    { count: 5, label: 'Fifth Tardy & Beyond', consequence: 'Administrative referral, with a meeting requested including parent/guardian, counselor, and an administrator.' }
];

// Returns the ladder step that applies at a given tardy count (5+ all map
// to the "Fifth Tardy & Beyond" step, matching the policy's own wording).
export function getTardyStep(count) {
    if (!count || count < 1) return null;
    return TARDY_LADDER.find(s => s.count === count) || TARDY_LADDER[TARDY_LADDER.length - 1];
}
