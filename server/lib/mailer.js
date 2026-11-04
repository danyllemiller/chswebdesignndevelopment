// server/lib/mailer.js
// Sends the site's few emails (so far: new WPR Practice Pro feedback, server/routes/wprFeedback.js) through
// an SMTP account set in .env. For contact@wprpracticepro.com on Proton that's
//   SMTP_HOST=smtp.protonmail.ch  SMTP_PORT=587  SMTP_USER=contact@wprpracticepro.com  SMTP_PASS=<an SMTP token>
// (Proton: Settings > IMAP/SMTP > SMTP tokens). Until SMTP_PASS is set nothing is sent: callers get false,
// and everything they would have mailed is still saved where it always was.
const nodemailer = require('nodemailer');

let transport = null, warned = false;
function getTransport() {
    if (transport) return transport;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        if (!warned) { console.log('[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set; no email is sent'); warned = true; }
        return null;
    }
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
        host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000
    });
    return transport;
}

// { to, subject, text, replyTo, attachments } -> true once the SMTP server accepts it, false if email is off
async function sendMail(msg) {
    const t = getTransport();
    if (!t) return false;
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, ...msg });
    return true;
}

module.exports = { sendMail };
