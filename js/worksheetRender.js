// Builds a worksheet's HTML from its structured data (title/vocab/mc/shortAnswer),
// re-shuffling the vocabulary-matching definitions and each multiple-choice
// question's options on every call -- so a term's position never predicts its
// answer letter, and the same worksheet never renders with identical option
// order twice. Content/wording is untouched; only display order changes.
(function () {
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.renderWorksheetHTML = function (sheet) {
        if (!sheet) return null;
        const title = sheet.title || 'Worksheet';
        let n = 1;
        let html = `<div class='worksheet' style='font-family: Arial, sans-serif;'><h3 style='color:#000099; border-bottom:2px solid #cfe1f0; padding-bottom:5px;'>${esc(title)}</h3><p><strong>Name:</strong> <span class='blank' style='color:blue;'>[Type Name]</span></p>`;

        if (Array.isArray(sheet.vocab) && sheet.vocab.length) {
            const shuffledDefs = shuffle(sheet.vocab.map(v => v.definition));
            html += `<h4 style='margin-top:20px; color:#000099;'>Part 1: Vocabulary Matching</h4><div style='background:#f8f9fa; padding:10px; border:1px solid #ddd; margin-bottom:15px; font-family: monospace;'><strong>Options:</strong><br>`;
            html += shuffledDefs.map((d, i) => `${String.fromCharCode(65 + i)}. ${esc(d)}`).join('<br>');
            html += `</div>`;
            sheet.vocab.forEach(v => {
                html += `<p>${n}. ${esc(v.term)} <span class='blank' style='color:blue;'>[___]</span></p>`;
                n++;
            });
        }

        if (Array.isArray(sheet.mc) && sheet.mc.length) {
            html += `<h4 style='margin-top:30px; color:#000099;'>Part 2: Multiple Choice</h4>`;
            const letters = ['a', 'b', 'c', 'd'];
            sheet.mc.forEach(q => {
                const opts = shuffle(q.options || []);
                const optsStr = opts.map((o, i) => `${letters[i]}) ${esc(o)}`).join(' &nbsp; ');
                html += `<p><strong>${n}. ${esc(q.question)}</strong> <span class='blank' style='color:blue;'>[___]</span><br>${optsStr}</p>`;
                n++;
            });
        }

        if (Array.isArray(sheet.shortAnswer) && sheet.shortAnswer.length) {
            html += `<h4 style='margin-top:30px; color:#000099;'>Part 3: Short Answer</h4>`;
            sheet.shortAnswer.forEach(q => {
                html += `<p><strong>${n}. ${esc(q.question)}</strong><br><span style='color:blue;'>[Type your answer here...]</span></p>`;
                n++;
            });
        }

        html += `</div>`;
        return html;
    };
})();
