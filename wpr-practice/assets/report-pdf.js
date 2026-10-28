// wpr-practice/assets/report-pdf.js
// A student's WPR Practice report as a PDF file, made in their browser once the teacher ends the test
// (wpr-practice/index.html; the data comes from POST /api/wpr/results). It names the student by initials only,
// never by name or student ID, so it can be shared, and it says nothing about anyone's time limit.
// jsPDF (assets/vendor/jspdf.umd.min.js, MIT license) loads only when a report is made.
(function () {
    let loading = null;
    function load() {
        if (window.jspdf) return Promise.resolve();
        return loading || (loading = new Promise((ok, no) => {
            const s = document.createElement('script');
            s.src = '/wpr-practice/assets/vendor/jspdf.umd.min.js';
            s.onload = ok;
            s.onerror = () => { loading = null; no(new Error('The report maker didn\'t load. Check your internet and try again.')); };
            document.head.appendChild(s);
        }));
    }

    // The PDF's built-in fonts only have Western European letters.
    const plain = s => String(s ?? '').replace(/[\u2018\u2019\u201a\u2032]/g, "'").replace(/[\u201c\u201d\u201e\u2033]/g, '"')
        .replace(/\s*\u2014\s*/g, ' - ').replace(/[\u2013\u2212]/g, '-').replace(/\u2026/g, '...').replace(/\u00d7/g, 'x').replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '');
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    // Green 80% and up, yellow 70-79%, red under 70% (the teacher's "reteach" line)
    const band = p => (p >= 80 ? { rgb: [25, 135, 84], label: 'On track' } : p >= 70 ? { rgb: [214, 150, 0], label: 'Almost there' } : { rgb: [200, 35, 51], label: 'Review this' });
    const TOPIC = { '': 'Workplace Readiness Skills', safety: 'Workplace safety', worklife: 'Work and personal life', bank: 'Your teacher\'s questions' };
    const ENDED = { student: 'You submitted it', time: 'Time ran out', 'left-test': 'Submitted after leaving the test twice', ended: 'Your teacher ended the test' };
    const NAVY = [29, 42, 72], INK = [29, 36, 51], MUTED = [93, 103, 121], LINE = [227, 231, 238];

    // Right and answered, per topic, over the questions the student answered
    function topics(review) {
        const by = new Map();
        review.forEach(m => {
            const k = TOPIC[m.topic] ? m.topic : '';
            const g = by.get(k) || { name: TOPIC[k], right: 0, seen: 0 };
            g.seen++; if (m.right) g.right++;
            by.set(k, g);
        });
        return Object.keys(TOPIC).filter(k => by.has(k)).map(k => by.get(k));
    }

    async function build(report, result) {
        await load();
        const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'letter' });
        const W = 612, M = 54, R = W - M, BOTTOM = 735;
        let y = 0;
        const font = (size, style, rgb) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(...(rgb || INK)); };
        const room = h => { if (y + h > BOTTOM) { doc.addPage(); y = 64; } };
        const lines = (text, x, width, size, style, rgb, gap) => {
            font(size, style, rgb);
            doc.splitTextToSize(plain(text), width).forEach(l => { room(size * 1.3); doc.text(l, x, y); y += size * 1.3; });
            y += gap || 0;
        };
        const heading = text => { room(44); y += 10; font(13, 'bold', NAVY); doc.text(text, M, y); y += 6; doc.setDrawColor(...NAVY); doc.setLineWidth(1.5); doc.line(M, y, R, y); y += 18; };

        // Banner
        doc.setFillColor(...NAVY); doc.rect(0, 0, W, 62, 'F');
        font(17, 'bold', [255, 255, 255]); doc.text('WPR Practice Pro', M, 38);
        font(11, 'normal', [255, 255, 255]); doc.text('Student report', R, 38, { align: 'right' });
        y = 98;
        font(20, 'bold', NAVY); doc.text(`Practice test results for ${plain(report.initials) || 'a student'}`, M, y); y += 22;
        const when = report.submittedAt ? new Date(report.submittedAt).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
        const facts = [
            ['Test', report.label], ['Teacher', report.teacher], ['Class code', report.code], ['Finished', when],
            ['How it ended', ENDED[report.endReason] || ENDED.student],
            ['Left the test screen', `${report.violations || 0} time${report.violations === 1 ? '' : 's'}`]
        ].filter(f => f[1]);
        facts.forEach(([k, v]) => { font(10, 'bold', MUTED); doc.text(k, M, y); lines(v, M + 120, R - M - 120, 10, 'normal', INK); });

        // Score
        y += 14;
        const score = pct(result.correct, result.total), b = band(score);
        doc.setFillColor(...b.rgb); doc.roundedRect(M, y, 150, 92, 10, 10, 'F');
        font(38, 'bold', [255, 255, 255]); doc.text(`${score}%`, M + 75, y + 50, { align: 'center' });
        font(11, 'bold', [255, 255, 255]); doc.text(b.label, M + 75, y + 74, { align: 'center' });
        font(14, 'bold', INK); doc.text(`${result.correct} of ${result.total} questions right`, M + 172, y + 30);
        font(11, 'normal', MUTED);
        doc.text(`You answered ${result.answered} of ${result.total}. Of those, ${pct(result.correct, result.answered)}% were right.`, M + 172, y + 50);
        doc.text('Green: 80% or higher   Yellow: 70-79%   Red: under 70%, review it', M + 172, y + 70);
        y += 118;

        // By topic
        const review = result.review || [];
        heading('By topic');
        font(9, 'normal', MUTED); doc.text('Based on the questions you answered.', M, y); y += 16;
        topics(review).forEach(g => {
            room(36);
            const p = pct(g.right, g.seen), c = band(p);
            font(11, 'bold', INK); doc.text(plain(g.name), M, y);
            font(11, 'normal', INK); doc.text(`${p}% (${g.right} of ${g.seen})`, R, y, { align: 'right' });
            y += 7;
            doc.setFillColor(...LINE); doc.roundedRect(M, y, R - M, 9, 4, 4, 'F');
            if (p) { doc.setFillColor(...c.rgb); doc.roundedRect(M, y, Math.max(9, (R - M) * p / 100), 9, 4, 4, 'F'); }
            y += 25;
        });

        // Missed questions
        const missed = review.filter(m => !m.right);
        heading(`Questions to review (${missed.length})`);
        if (!missed.length) lines('You didn\'t miss any of the questions you answered. Nice work!', M, R - M, 11, 'normal', INK);
        missed.forEach(m => {
            room(56);
            if (m.prompt && m.prompt !== 'True or false?') lines(m.prompt, M, R - M, 9, 'bold', MUTED);
            lines(`Question ${m.n}. ${m.q}`, M, R - M, 11, 'bold', INK, 2);
            lines(`Your answer: ${m.yours || '(none)'}`, M + 12, R - M - 12, 10, 'normal', [176, 42, 55]);
            lines(`Correct answer: ${m.answer}`, M + 12, R - M - 12, 10, 'bold', [20, 108, 67], 12);
        });

        // Footer on every page
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            font(8, 'normal', MUTED);
            doc.text(`WPR Practice Pro  -  wprpracticepro.com  -  Practice only, not the official state assessment  -  Page ${i} of ${pages}`, W / 2, 770, { align: 'center' });
        }
        return doc;
    }

    async function download(report, result) {
        const doc = await build(report, result);
        const day = new Date(report.submittedAt || Date.now()).toLocaleDateString('en-CA');
        const who = String(report.initials || '').replace(/[^A-Za-z]/g, '');
        doc.save(`WPR-report-${who ? who + '-' : ''}${day}.pdf`);
    }

    window.WprReport = { download, build };
})();
