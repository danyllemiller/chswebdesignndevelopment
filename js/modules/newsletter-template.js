// Plain-text parent progress letter, one per student, meant to be copied
// into a ParentSquare direct message. Voice/format matches the existing
// "Welcome Letters 2026-2027 (ParentSquare)" letters: direct salutation,
// warm but concise, signed and with contact info at the bottom.

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// student: { first_name, last_name }
// gradeSummary: { percent, letterGrade, courseLabel } (from /admin/payroll/grade-summary)
// missingAssignments: array of { title, due_date }
export function renderNewsletterText(student, gradeSummary, missingAssignments) {
    const firstName = student.first_name || 'Your student';
    const missing = missingAssignments || [];
    const course = gradeSummary?.courseLabel || 'class';
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const gradeLine = (gradeSummary && gradeSummary.percent !== null && gradeSummary.percent !== undefined)
        ? `CURRENT GRADE: ${gradeSummary.percent}% (${gradeSummary.letterGrade})`
        : 'CURRENT GRADE: not enough graded work yet to report';

    const missingBlock = missing.length === 0
        ? `${firstName} is fully caught up on assignments right now — nice work.`
        : `MISSING ASSIGNMENTS (${missing.length})\n` + missing.map(m => `- ${m.title} — was due ${fmtDate(m.due_date)}`).join('\n')
          + `\n\nIf ${firstName} can turn these in, the grade above will update right away — grades are always live at https://chswebdesignndevelopment.com, no waiting for a progress report.`;

    return `Subject: ${firstName}'s Progress Update — ${course}

Hello ${firstName}'s family,

Here's a quick update on how ${firstName} is doing in ${course} as of ${todayStr}.

${gradeLine}

${missingBlock}

If you have any questions about their progress, please don't hesitate to reach out.

Danylle Miller
damiller@carson.k12.nv.us
775-283-1600 ext. 1817

Ms. Miller`;
}
