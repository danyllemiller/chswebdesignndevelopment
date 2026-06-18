/**
 * REUSABLE WORKSHEET ENGINE
 * Designed for the CHS Web Design Track (18 Chapters)
 * Handles Answer Validation, Portfolio Image Generation, and Exhaustive Data Export
 */

// ==========================================
// GRADEBOOK SYNC FOR WORKSHEETS - 20 POINTS
// ==========================================
async function syncWorksheetToGradebook(chapter, assignmentName = 'Worksheet') {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.student_id) {
            console.warn("No user logged in for worksheet gradebook sync");
            return;
        }
        
        const examId = `Ch${chapter}-${assignmentName} [20 pts]`;
        await fetch('/api/submit-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: user.student_id,
                exam_id: examId,
                score: 20,  // FIXED: Worksheet = 20 points fixed
                total_points: 20
            })
        });
        console.log(`Worksheet synced to gradebook: Ch${chapter} = 20 points`);
    } catch (e) {
        console.error("Worksheet gradebook sync failed:", e);
    }
}

// Expose globally for HTML onclick handlers
window.syncWorksheetToGradebook = syncWorksheetToGradebook;

/**
 * Checks a specific section for correct answers based on data-answer attributes
 */
function checkSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const inputs = section.querySelectorAll('.user-input');
    const radios = section.querySelectorAll('.user-input-radio');
    
    inputs.forEach(input => {
        const correctVal = input.getAttribute('data-answer').toLowerCase().trim();
        const userVal = input.value.toLowerCase().trim();
        
        if (userVal === correctVal) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else if (userVal !== "") {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
    });

    const processedNames = new Set();
    radios.forEach(radio => {
        if (processedNames.has(radio.name)) return;
        processedNames.add(radio.name);
        const group = section.querySelectorAll(`input[name="${radio.name}"]`);
        const checked = section.querySelector(`input[name="${radio.name}"]:checked`);
        group.forEach(el => el.parentElement.classList.remove('is-valid', 'is-invalid'));
        if (checked) {
            if (checked.hasAttribute('data-answer')) {
                checked.parentElement.classList.add('is-valid');
            } else {
                checked.parentElement.classList.add('is-invalid');
            }
        }
    });
}

function checkAll() {
    const sections = document.querySelectorAll('.quest-section');
    sections.forEach(section => {
        if (section.id) checkSection(section.id);
    });
}

/**
 * Generates a high-resolution PNG of the worksheet
 */
async function takeScreenshot(contentId = 'worksheet-content') {
    const element = document.getElementById(contentId);
    if (!element) return;

    const uiToHide = document.querySelectorAll('.no-print');
    uiToHide.forEach(el => el.style.display = 'none');
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2, 
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = imgData;
        const placeholder = document.getElementById('captured-image-placeholder');
        if (placeholder) {
            placeholder.innerHTML = '';
            placeholder.appendChild(img);
            const modalEl = document.getElementById('screenshotModal');
            if (modalEl) {
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            }
        }
    } catch (err) {
        console.error("Screenshot failed:", err);
    } finally {
        uiToHide.forEach(el => el.style.display = '');
    }
}

/**
 * NUCLEAR COPY LOGIC
 * Reconstructs the worksheet as a text document, including restricted code blocks.
 */
function copyWorksheetToClipboard() {
    const pageTitle = document.title || "Study Guide Progress Report";
    let report = `${pageTitle.toUpperCase()}\n`;
    report += "========================================\n\n";

    // 1. Capture Learning Targets
    const targets = document.querySelectorAll('.list-group-item');
    if(targets.length > 0) {
        report += "[ LEARNING TARGETS CHECKLIST ]\n";
        targets.forEach(t => {
            const check = t.querySelector('input').checked ? "[X]" : "[ ]";
            report += `${check} ${t.innerText.trim()}\n`;
        });
        report += "\n";
    }

    // 2. Capture Questions and User Data
    const sections = document.querySelectorAll('.quest-section');
    sections.forEach(section => {
        const title = section.querySelector('.section-title, h2, h4')?.innerText || "Section";
        report += `[ ${title.toUpperCase()} ]\n`;

        // Process Table Inputs
        const rows = section.querySelectorAll('tr');
        rows.forEach(row => {
            const label = row.cells[0]?.innerText.trim();
            const input = row.querySelector('input, select');
            if (label && input) {
                report += `Q: ${label}\n`;
                report += `A: ${input.value || "(No answer)"}\n\n`;
            }
        });

        // Process Standard Div Inputs (non-table)
        const divs = section.querySelectorAll('div.mb-4, div.mb-3');
        divs.forEach(div => {
            const label = div.querySelector('label')?.innerText.trim();
            const input = div.querySelector('input, select, textarea');
            if (label && input) {
                report += `Q: ${label}\n`;
                report += `A: ${input.value || "(No answer)"}\n\n`;
            }
        });

        // Process Code Blocks (Force extraction of text from .no-copy areas)
        const codeBlocks = section.querySelectorAll('pre, code, .font-monospace');
        codeBlocks.forEach(block => {
            // Reconstruct logic if there are inputs inside the code block
            let codeText = block.innerText.trim();
            const internalInputs = block.querySelectorAll('input');
            if(internalInputs.length > 0) {
                report += "Technical Exercise Reconstructed:\n";
                report += codeText + "\n\n";
            } else {
                report += "Reference Code:\n" + codeText + "\n\n";
            }
        });

        report += "----------------------------------------\n";
    });

    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = report;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    
    try {
        document.execCommand('copy');
        alert("✅ Entire worksheet (including restricted code blocks) has been copied to your clipboard!");
    } catch (err) {
        console.error("Copy failed", err);
    }
    document.body.removeChild(tempTextArea);
}