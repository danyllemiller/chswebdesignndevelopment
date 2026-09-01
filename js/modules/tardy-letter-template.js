// Plain-text tardy follow-up letters, matching the voice/format of
// newsletter-template.js. Third tardy is parent-only (meant for
// ParentSquare); fourth-and-beyond loops in the counselor too (meant for
// email) -- matches the ladder on discipline.html and js/modules/tardy-ladder.js.

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Student names come out of the roster however the school's SIS export
// stored them, which is often ALL CAPS -- letters home should read like a
// name, not a shout, so every name is title-cased before it goes in.
function toTitleCase(str) {
    return String(str || '').toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
}

// student: { first_name, last_name }
// step: result of getTardyStep(count), from tardy-ladder.js
// counselor: { name, email } | null
export function renderTardyLetterText(student, count, step, counselor) {
    const firstName = toTitleCase(student.first_name) || 'Your student';
    const today = fmtDate(new Date());
    const isFourthPlus = count >= 4;

    const ccLine = isFourthPlus
        ? (counselor?.email
            ? `\ncc: ${counselor.name || 'Counselor'} <${counselor.email}>`
            : '\ncc: [Counselor name/email not set yet]')
        : '';

    const counselorBody = isFourthPlus
        ? `${firstName} has now reached the fourth tardy in ${firstName === 'Your student' ? 'their' : `${firstName}'s`} class this grading period, so ${counselor?.name || 'the counselor'} is being looped in alongside this note home, per our tardy policy's next step.\n\n`
        : '';

    return `Subject: ${firstName}'s Attendance — Tardy Follow-Up${ccLine}

Hello ${firstName}'s family,

I wanted to reach out because ${firstName} has reached ${step.label.toLowerCase()} in class as of ${today}.

${step.consequence}

My classroom tardy policy is posted at chswebdesignndevelopment.com/discipline.html#tardies, and the school's official tardy policy is in the student handbook.

${counselorBody}Two things help most: talk with ${firstName} about the Tardy Form — it takes ninety seconds and it's the difference between a tardy and an absence on the record — and if something is making it hard to get to class on time, let me know. There's usually something we can build around.

If you have any questions, please don't hesitate to reach out.

Danylle Miller
damiller@carson.k12.nv.us
775-283-1600 ext. 1817

Ms. Miller`;
}
