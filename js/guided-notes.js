// js/guided-notes.js
// Handles the "Copy to Notebook" logic and tooltips for Guided Notes pages.

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Initialize Bootstrap Tooltips
    // This looks for any element with data-bs-toggle="tooltip" and activates it
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // 2. The Copy to Notebook Logic
    const copyBtn = document.getElementById('copyNotebookBtn');
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const btn = this;
            const worksheetContent = document.getElementById('worksheet-content');
            
            if (!worksheetContent) {
                console.error("Could not find the 'worksheet-content' ID.");
                return;
            }

            // Grab the raw HTML content of the worksheet
            let rawHTML = worksheetContent.outerHTML;
            
            // We inject the necessary CSS so it formats correctly inside their notebook iframe
            const notebookTemplate = `
<style>
    .notes-container { font-family: Arial, sans-serif; font-size: 1.1rem; line-height: 1.8; color: #333; }
    .section-heading { background-color: #f8f9fa; color: #0d6efd; padding: 8px 15px; border-left: 4px solid #0d6efd; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; border-radius: 0 5px 5px 0; }
    .fill-blank { display: inline-block; min-width: 150px; border-bottom: 2px solid #0d6efd; color: #0d6efd; font-weight: bold; padding: 0 5px; text-align: center; }
    .student-info-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; margin-bottom: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 1rem; }
    .cornell-summary { width: 100%; min-height: 150px; border: 2px solid #ced4da; border-radius: 8px; padding: 15px; background-image: linear-gradient(transparent, transparent 29px, #e0e0e0 29px); background-size: 100% 30px; line-height: 30px; }
</style>
${rawHTML}
            `;

            navigator.clipboard.writeText(notebookTemplate).then(() => {
                const originalText = btn.innerHTML;
                
                // Temporarily hide the tooltip so it doesn't overlap the success message text
                const tooltipInstance = bootstrap.Tooltip.getInstance(btn);
                if(tooltipInstance) tooltipInstance.hide();

                btn.innerHTML = '<i class="fas fa-check me-1"></i> Copied! Paste into Notebook Code Tab';
                btn.classList.replace('btn-primary', 'btn-success');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.replace('btn-success', 'btn-primary');
                }, 3000);
            }).catch(err => {
                alert('Failed to copy to clipboard. Please select the text manually.');
            });
        });
    }
});