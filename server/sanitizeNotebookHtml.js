// Notebooks (student/notes.html and cs-notebook.html) save raw HTML
// straight from a contentEditable iframe with no sanitization at all --
// a student could embed a <script> or an onerror= handler and it would
// execute in whoever's browser later renders that note (their own, and
// the teacher's, in admin/notebooks.html). Allowlist matches exactly
// what the toolbar actually produces (bold/italic/underline, headings,
// lists, the highlight span, tables) plus the donow/worksheet template
// classes, so legitimate formatting round-trips untouched.
const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
    'p', 'div', 'span', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'blockquote', 'code', 'pre'
];

const ALLOWED_ATTRIBUTES = {
    '*': ['style', 'class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan']
};

const ALLOWED_STYLES = {
    '*': {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'text-align': [/^left$|^right$|^center$|^justify$/],
        'font-weight': [/^bold$|^normal$|^[1-9]00$/],
        'font-style': [/^italic$|^normal$/],
        'text-decoration': [/^underline$|^line-through$|^none$/]
    }
};

function sanitizeNotebookHtml(rawHtml) {
    return sanitizeHtml(rawHtml || '', {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedStyles: ALLOWED_STYLES
    });
}

module.exports = { sanitizeNotebookHtml };
