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
    'blockquote', 'code', 'pre',
    'img'
];

const ALLOWED_ATTRIBUTES = {
    '*': ['style', 'class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    img: ['src', 'alt']
};

const ALLOWED_STYLES = {
    '*': {
        color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'text-align': [/^left$|^right$|^center$|^justify$/],
        'font-weight': [/^bold$|^normal$|^[1-9]00$/],
        'font-style': [/^italic$|^normal$/],
        'text-decoration': [/^underline$|^line-through$|^none$/],
        // Pasted-screenshot resize (native CSS `resize`, which stores the
        // dragged dimensions as inline width/height) and the Word/Docs-style
        // wrap-text toggle (float + margin) both need these to round-trip.
        width: [/^\d+(\.\d+)?(px|%)$/],
        height: [/^\d+(\.\d+)?(px|%)$/],
        'max-width': [/^\d+(\.\d+)?(px|%)$/],
        float: [/^left$|^right$|^none$/],
        margin: [/^(0|[\d.]+px)( (0|[\d.]+px)){0,3}$/]
    }
};

// img src is allowed to be a pasted screenshot's data: URI (what
// contenteditable's native paste-image behavior produces) in addition to a
// normal http(s) URL -- scoped to the img tag specifically so this doesn't
// loosen link/script handling anywhere else.
const ALLOWED_SCHEMES_BY_TAG = { img: ['http', 'https', 'data'] };

function sanitizeNotebookHtml(rawHtml) {
    return sanitizeHtml(rawHtml || '', {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        allowedStyles: ALLOWED_STYLES,
        allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG
    });
}

module.exports = { sanitizeNotebookHtml };
