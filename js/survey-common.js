// /js/survey-common.js
// Shared renderer for the anonymous student feedback surveys
// (survey/agency-360-review.html, survey/cs-course-review.html). No
// auth-guard on these pages -- they must work with no login at all, so
// this file never touches localStorage 'user' or any student identity.
// The only localStorage use here is a per-browser "already submitted"
// flag, purely to prevent an accidental double-submit -- it is never sent
// to the server and identifies nothing to anyone but this one browser.
import { apiFetch } from './modules/api-client.js';

const SCALE_LABELS = { '1': 'Strongly disagree', '2': 'Disagree', '3': 'Agree', '4': 'Strongly agree', 'NA': 'Does not apply' };

function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'text') e.textContent = v;
        else if (k === 'html') e.innerHTML = v;
        else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => c && e.appendChild(c));
    return e;
}

function renderScaleItem(formId, item) {
    const groupName = `${formId}-q${item.num}`;
    const legend = el('legend', { class: 'survey-item-legend', text: `${item.num}. ${item.text}` });
    const fieldset = el('fieldset', { class: 'survey-scale-fieldset' }, legend);
    const optsWrap = el('div', { class: 'survey-scale-options', role: 'group' });
    SCALE_OPTIONS().forEach(opt => {
        const inputId = `${groupName}-${opt}`;
        const input = el('input', { type: 'radio', name: groupName, id: inputId, value: opt, class: 'survey-scale-input' });
        const label = el('label', { for: inputId, class: 'survey-scale-label' }, [
            el('span', { class: 'survey-scale-num', text: opt }),
            el('span', { class: 'survey-scale-word', text: SCALE_LABELS[opt] })
        ]);
        optsWrap.appendChild(el('div', { class: 'survey-scale-choice' }, [input, label]));
    });
    fieldset.appendChild(optsWrap);
    return fieldset;
}
function SCALE_OPTIONS() { return ['1', '2', '3', '4', 'NA']; }

function renderChoiceItem(formId, item) {
    const groupName = `${formId}-q${item.num}`;
    const legend = el('legend', { class: 'survey-item-legend', text: `${item.num}. ${item.text}` });
    const fieldset = el('fieldset', { class: 'survey-choice-fieldset' }, legend);
    const optsWrap = el('div', { class: 'survey-choice-options' });
    item.options.forEach((opt, i) => {
        const inputId = `${groupName}-${i}`;
        const input = el('input', { type: 'radio', name: groupName, id: inputId, value: opt, class: 'survey-choice-input' });
        const label = el('label', { for: inputId, class: 'survey-choice-label', text: opt });
        optsWrap.appendChild(el('div', { class: 'survey-choice-choice' }, [input, label]));
    });
    fieldset.appendChild(optsWrap);
    return fieldset;
}

function renderTextItem(formId, item) {
    const inputId = `${formId}-q${item.num}`;
    const label = el('label', { for: inputId, class: 'survey-text-label', text: `${item.num}. ${item.text}` });
    const textarea = el('textarea', { id: inputId, name: inputId, class: 'form-control survey-textarea', rows: '3' });
    if (item.placeholder) textarea.setAttribute('placeholder', item.placeholder);
    return el('div', { class: 'survey-text-item' }, [label, textarea]);
}

function renderPartHeader(part) {
    const wrap = el('div', { class: 'survey-part-header' });
    wrap.appendChild(el('h2', { class: 'survey-part-title', text: `Part ${part.key} · ${part.title}` }));
    if (part.subtitle) wrap.appendChild(el('p', { class: 'survey-part-subtitle', text: part.subtitle }));
    return wrap;
}

// Renders the whole form into #survey-root. `config`:
// { formId, formKey, title, intro, termOptions, termLabel, showPeriod,
//   parts: [{key, title, subtitle, items: [{num, text, type, options, placeholder}]}] }
export function renderSurvey(config) {
    const root = document.getElementById('survey-root');
    if (!root) return;

    const storageKey = () => `surveySubmitted:${config.formKey}:${document.getElementById('survey-term').value}`;

    root.innerHTML = '';
    const intro = el('div', { class: 'survey-intro' });
    intro.appendChild(el('h1', { class: 'gochi text-primary survey-title', text: config.title }));
    intro.appendChild(el('p', { class: 'survey-intro-text', text: config.intro }));
    intro.appendChild(el('div', { class: 'survey-anon-banner', role: 'note' },
        el('strong', { text: 'This form is anonymous and ungraded. Do not put your name on it.' })));
    root.appendChild(intro);

    const form = el('form', { id: 'survey-form', novalidate: 'novalidate' });

    const metaRow = el('div', { class: 'survey-meta-row' });
    const termGroup = el('div', { class: 'survey-meta-field' }, [
        el('label', { for: 'survey-term', text: config.termLabel || 'Term' }),
        (() => {
            const sel = el('select', { id: 'survey-term', class: 'form-select', required: 'required' });
            sel.appendChild(el('option', { value: '', text: '— Select —' }));
            config.termOptions.forEach(t => sel.appendChild(el('option', { value: t, text: t })));
            return sel;
        })()
    ]);
    metaRow.appendChild(termGroup);
    if (config.showPeriod) {
        metaRow.appendChild(el('div', { class: 'survey-meta-field' }, [
            el('label', { for: 'survey-period', text: 'Period (optional)' }),
            el('input', { type: 'text', id: 'survey-period', class: 'form-control', maxlength: '10', placeholder: 'e.g. A3' })
        ]));
    }
    form.appendChild(metaRow);

    config.parts.forEach(part => {
        form.appendChild(renderPartHeader(part));
        part.items.forEach(item => {
            let node;
            if (item.type === 'scale') node = renderScaleItem(config.formId, item);
            else if (item.type === 'choice') node = renderChoiceItem(config.formId, item);
            else node = renderTextItem(config.formId, item);
            form.appendChild(node);
        });
    });

    const submitRow = el('div', { class: 'survey-submit-row' });
    const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary btn-lg survey-submit-btn', text: 'Submit my responses' });
    const msg = el('div', { id: 'survey-msg', class: 'survey-msg', role: 'status' });
    submitRow.appendChild(submitBtn);
    submitRow.appendChild(msg);
    form.appendChild(submitRow);
    root.appendChild(form);

    const alreadyDone = el('div', { id: 'survey-thanks', class: 'survey-thanks', hidden: 'hidden' }, [
        el('h2', { class: 'gochi text-primary', text: 'Thanks -- that’s submitted.' }),
        el('p', { text: 'Nothing here is tied to your name. Your teacher will see it grouped with everyone else’s once enough responses are in.' })
    ]);
    root.appendChild(alreadyDone);

    function showThanks() {
        form.hidden = true;
        intro.hidden = true;
        document.getElementById('survey-thanks').hidden = false;
    }

    document.getElementById('survey-term').addEventListener('change', () => {
        try {
            if (localStorage.getItem(storageKey())) showThanks();
        } catch (e) { /* localStorage unavailable -- soft guard only, fine to skip */ }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const term = document.getElementById('survey-term').value;
        if (!term) { msg.textContent = 'Please choose a term above.'; msg.className = 'survey-msg text-danger'; return; }
        submitBtn.disabled = true;
        msg.textContent = '';

        const answers = {};
        config.parts.forEach(part => part.items.forEach(item => {
            const name = `${config.formId}-q${item.num}`;
            if (item.type === 'text') {
                const val = document.getElementById(name)?.value?.trim();
                if (val) answers[item.num] = val;
            } else {
                const checked = form.querySelector(`input[name="${name}"]:checked`);
                if (checked) answers[item.num] = checked.value;
            }
        }));

        const period = config.showPeriod ? document.getElementById('survey-period')?.value?.trim() : undefined;

        try {
            await apiFetch('/api/survey/submit', {
                method: 'POST',
                body: JSON.stringify({ form_key: config.formKey, term, period, answers })
            });
            try { localStorage.setItem(storageKey(), '1'); } catch (e) { /* best-effort only */ }
            showThanks();
        } catch (err) {
            msg.textContent = err.message || 'Something went wrong submitting this. Please try again.';
            msg.className = 'survey-msg text-danger';
            submitBtn.disabled = false;
        }
    });
}
