// /js/modules/utils.js
/**
 * Shared Utilities
 * Contains pure functions for string manipulation, 
 * scoring logic, and data formatting.
 */

export function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function parsePts(name) {
    const ptsMatch = name.match(/[\[\(](\d+)\s*pts?[\]\)]/i);
    if (ptsMatch) return parseInt(ptsMatch[1], 10);

    const lowerName = name.toLowerCase();
    if (lowerName.includes('pre-test') || lowerName.includes('pretest') || 
        lowerName.includes('pre-assessment') || lowerName.includes('preassessment') || 
        lowerName.includes('diagnostic')) return 10;
        
    if (lowerName.includes('post test') || lowerName.includes('post-test') || 
        lowerName.includes('formative') || lowerName.includes('assessment') || 
        lowerName.includes('exam') || lowerName.includes('summative')) return 20;
        
    if (lowerName.includes('lab') || lowerName.includes('worksheet') || 
        lowerName.includes('ch ') || lowerName.match(/ch\d+/) || 
        lowerName.includes('unit')) return 25;
    
    return 100;
}