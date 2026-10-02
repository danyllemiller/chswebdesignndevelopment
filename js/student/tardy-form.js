// /js/student/tardy-form.js
import { apiFetch } from '../modules/api-client.js';

let needsReflection = false;

async function checkReflectionStatus() {
    try {
        const data = await apiFetch('/api/student/tardy-form/status');
        needsReflection = !!data.needs_reflection;
        document.getElementById('reflectionArea').classList.toggle('d-none', !needsReflection);
    } catch (e) { /* if this fails, submit-time server validation still catches it */ }
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');
    const reason = document.getElementById('reasonInput').value.trim();
    const hadPass = document.querySelector('input[name="hadPass"]:checked')?.value || '';
    const notes = document.getElementById('notesInput').value.trim();
    const reflection1 = document.getElementById('reflection1').value.trim();
    const reflection2 = document.getElementById('reflection2').value.trim();
    const reflection3 = document.getElementById('reflection3').value.trim();
    const reflection4 = document.getElementById('reflection4').value.trim();

    msg.className = 'small mt-2';
    msg.textContent = '';

    if (!reason) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = 'Please enter a reason for being late.';
        return;
    }
    if (!hadPass) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = 'Please say whether you had a signed pass.';
        return;
    }
    if (needsReflection && (!reflection1 || !reflection2 || !reflection3 || !reflection4)) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = 'Please complete all 4 reflection questions too -- this is your 2nd tardy (or more) this quarter.';
        return;
    }

    btn.disabled = true;
    try {
        await apiFetch('/api/student/tardy-form/submit', {
            method: 'POST',
            body: JSON.stringify({
                reason, had_pass: hadPass, notes,
                reflection_1: reflection1, reflection_2: reflection2, reflection_3: reflection3, reflection_4: reflection4
            })
        });
        document.getElementById('formArea').classList.add('d-none');
        document.getElementById('successArea').classList.remove('d-none');
    } catch (e) {
        msg.classList.add('text-danger', 'fw-bold');
        msg.textContent = e.message || 'Could not submit -- try again.';
        btn.disabled = false;
    }
});

checkReflectionStatus();
