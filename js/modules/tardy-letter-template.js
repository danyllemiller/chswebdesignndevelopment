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

    // The ladder's own consequence wording ("contacted by phone or email...")
    // reads oddly inside the very email that IS the contact, and presumes
    // what the plan should be -- the letter asks the parent directly
    // instead, without changing the underlying policy text shown anywhere
    // else (the admin follow-up list, discipline.html).
    const bodyLine = (count === 3 || count === 4)
        ? `I'd like to hear from you — what do you think would help ${firstName} get to class on time? Let's build a plan together based on your input.`
        : step.consequence;

    return `Subject: ${firstName}'s Attendance — Tardy Follow-Up${ccLine}

Hello ${firstName}'s family,

I wanted to reach out because ${firstName} has reached ${step.label.toLowerCase()} in class as of ${today}.

${bodyLine}

My classroom tardy policy is posted at chswebdesignndevelopment.com/discipline.html#tardies, and the school's official tardy policy is in the student handbook.

${counselorBody}Two things help most: talk with ${firstName} about the Tardy Form — it takes ninety seconds and it's the difference between a tardy and an absence on the record — and if something is making it hard to get to class on time, let me know. There's usually something we can build around.

If you have any questions, please don't hesitate to reach out.

Danylle Miller
damiller@carson.k12.nv.us
775-283-1600 ext. 1817

Ms. Miller`;
}

// Short heads-up sent directly to the student (via the private messaging
// system) about their 5-minute conference -- the Second Tardy step's
// consequence, and every tardy from there on. Deliberately NOT the full
// paper reflection form with signature/date blanks -- those only make
// sense on paper, not in a chat thread -- just a plain-text notice asking
// them to come find her.
// student: { first_name }
export function renderStudentReflectionRequestText(student) {
    const firstName = toTitleCase(student.first_name) || 'there';
    return `Hi ${firstName} — since this is a tardy for you today, let's do our 5-minute conference. Come find me before/after class or during a passing period so we can talk through what happened and land on one small thing to change for next time.

See you soon.
- Ms. Miller`;
}
