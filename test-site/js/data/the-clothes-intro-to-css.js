/**
 * CHAPTER 6: THE CLOTHES (CSS)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
(async function() {
    const firebaseConfig = {
        apiKey: "AIzaSyAK1sGWu6jyWzbxfQCj-cgUBn85mJh9Nv0",
        authDomain: "digitalartsclasses-games-67ae7.firebaseapp.com",
        projectId: "digitalartsclasses-games-67ae7",
        storageBucket: "digitalartsclasses-games-67ae7.firebasestorage.app",
        messagingSenderId: "662051088920",
        appId: "1:662051088920:web:3b05cb890d834c0b9cb16d",
        measurementId: "G-LZ4CXH6X3G"
    };

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const { getFirestore, collection, addDoc, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: BASICS & SELECTORS ---
        { cat: "Basics & Selectors", val: 100, q: "The acronym for Cascading Style Sheets.", a: "CSS", d: ["Coded Style System", "Computer Style Sheets", "Creative Style Sheets"] },
        { cat: "Basics & Selectors", val: 100, q: "The selector symbol used to target a specific ID.", a: "# (Hash)", d: [". (Dot)", "* (Asterisk)", "@ (At)"] },
        { cat: "Basics & Selectors", val: 100, q: "The selector symbol used to target a specific class.", a: ". (Dot)", d: ["# (Hash)", "* (Asterisk)", "$ (Dollar)"] },

        { cat: "Basics & Selectors", val: 200, q: "Where internal styles belong within the HTML document.", a: "<head>", d: ["<body>", "<footer>", "<div>"] },
        { cat: "Basics & Selectors", val: 200, q: "The tag used inside the <head> to write internal CSS.", a: "<style>", d: ["<css>", "<link>", "<script>"] },
        { cat: "Basics & Selectors", val: 200, q: "The tag used to connect an external .css file to a page.", a: "<link>", d: ["<style>", "<a>", "<href>"] },

        { cat: "Basics & Selectors", val: 300, q: "Applying CSS directly inside an HTML tag using the style attribute.", a: "Inline Styling", d: ["External Styling", "Internal Styling", "Linked Styling"] },
        { cat: "Basics & Selectors", val: 300, q: "The universal selector used to select every element on a page.", a: "* (Asterisk)", d: ["# (Hash)", "all", "body"] },
        { cat: "Basics & Selectors", val: 300, q: "Between ID and Class, this one has higher priority in the cascade.", a: "ID", d: ["Class", "Tag", "Attribute"] },

        { cat: "Basics & Selectors", val: 400, q: "The character used to end a CSS declaration (property:value;).", a: "; (Semicolon)", d: [": (Colon)", ", (Comma)", ". (Period)"] },
        { cat: "Basics & Selectors", val: 400, q: "This keyword forces a specific style to win regardless of priority.", a: "!important", d: ["!force", "!winning", "!override"] },
        { cat: "Basics & Selectors", val: 400, q: "Comments in CSS are wrapped inside these symbols.", a: "/* */", d: ["//", "<!-- -->", "#"] },

        { cat: "Basics & Selectors", val: 500, q: "The person who first proposed the concept of CSS in 1994.", a: "Håkon Wium Lie", d: ["Tim Berners-Lee", "Bill Gates", "Brendan Eich"] },
        { cat: "Basics & Selectors", val: 500, q: "Picks which specific HTML element to apply styles to.", a: "Selector", d: ["Property", "Value", "Declaration"] },
        { cat: "Basics & Selectors", val: 500, q: "The current generation or level of CSS used today.", a: "CSS3", d: ["CSS9", "HTML5", "CSS.next"] },

        // --- CATEGORY: BOX MODEL ---
        { cat: "Box Model", val: 100, q: "The space added inside an element, between the content and the border.", a: "Padding", d: ["Margin", "Gutter", "Outline"] },
        { cat: "Box Model", val: 100, q: "The space added outside an element border to separate it from neighbors.", a: "Margin", d: ["Padding", "Spacing", "Depth"] },
        { cat: "Box Model", val: 100, q: "The visible outline that surrounds an element's padding.", a: "Border", d: ["Margin", "Shadow", "Frame"] },

        { cat: "Box Model", val: 200, q: "This property is used to create rounded corners on a box.", a: "border-radius", d: ["border-style", "border-width", "corner-tool"] },
        { cat: "Box Model", val: 200, q: "The CSS property used to center a block element horizontally.", a: "margin: auto", d: ["padding: center", "align: middle", "float: center"] },
        { cat: "Box Model", val: 200, q: "The property that determines if padding adds to the total width of a box.", a: "box-sizing", d: ["box-model", "width-mode", "border-check"] },

        { cat: "Box Model", val: 300, q: "The value of box-sizing that includes padding and border in the width.", a: "border-box", d: ["content-box", "padding-box", "fixed-box"] },
        { cat: "Box Model", val: 300, q: "Setting this to 'none' removes the underline from hyperlinks.", a: "text-decoration", d: ["font-style", "text-transform", "list-style"] },
        { cat: "Box Model", val: 300, q: "Setting this to 'none' removes bullets from a list.", a: "list-style-type", d: ["text-decoration", "list-mode", "marker-hide"] },

        { cat: "Box Model", val: 400, q: "This property adds an artistic shadow effect to an entire box.", a: "box-shadow", d: ["text-shadow", "drop-shadow", "glow"] },
        { cat: "Box Model", val: 400, q: "This property adds a shadow effect specifically to text characters.", a: "text-shadow", d: ["box-shadow", "font-shadow", "letter-glow"] },
        { cat: "Box Model", val: 400, q: "This property stops elements from floating on both sides of an item.", a: "clear: both", d: ["float: stop", "overflow: hide", "reset: float"] },

        { cat: "Box Model", val: 500, q: "This value for 'border-style' creates a line made of short dashes.", a: "dashed", d: ["dotted", "solid", "double"] },
        { cat: "Box Model", val: 500, q: "This property makes an element invisible while keeping its layout space.", a: "visibility: hidden", d: ["display: none", "opacity: 0", "z-index: -1"] },
        { cat: "Box Model", val: 500, q: "The four components of the box model from the outside in.", a: "Margin, Border, Padding, Content", d: ["Content, Padding, Border, Margin", "Border, Margin, Padding, Content", "Padding, Border, Content, Margin"] },

        // --- CATEGORY: POSITIONING ---
        { cat: "Positioning", val: 100, q: "The default positioning value for all HTML elements.", a: "static", d: ["relative", "absolute", "fixed"] },
        { cat: "Positioning", val: 100, q: "This property determines the transparency or see-through level of an item.", a: "Opacity", d: ["Visibility", "Z-index", "Alpha"] },
        { cat: "Positioning", val: 100, q: "The property used to control the stacking order of overlapping elements.", a: "z-index", d: ["stack-order", "layer-id", "depth-level"] },

        { cat: "Positioning", val: 200, q: "This position value moves an element relative to its normal position.", a: "relative", d: ["static", "absolute", "fixed"] },
        { cat: "Positioning", val: 200, q: "This position value removes an element from flow to place it relative to a parent.", a: "absolute", d: ["relative", "static", "fixed"] },
        { cat: "Positioning", val: 200, q: "This position value locks an element to the viewport so it never scrolls.", a: "fixed", d: ["absolute", "sticky", "static"] },

        { cat: "Positioning", val: 300, q: "This value for 'display' removes an element and its space from the page.", a: "none", d: ["hidden", "block", "inline"] },
        { cat: "Positioning", val: 300, q: "This display value allows an element to sit in a line but accept width/height.", a: "inline-block", d: ["block", "inline", "flex"] },
        { cat: "Positioning", val: 300, q: "The z-index property only works if this property is also set.", a: "position", d: ["display", "float", "overflow"] },

        { cat: "Positioning", val: 400, q: "This position value acts like relative until a scroll point, then acts like fixed.", a: "sticky", d: ["absolute", "locked", "viewport"] },
        { cat: "Positioning", val: 400, q: "This property clips or adds scrollbars to content that is too big for its box.", a: "overflow", d: ["clip", "scroll-mode", "contain"] },
        { cat: "Positioning", val: 400, q: "This property allows you to change the mouse cursor icon.", a: "cursor", d: ["mouse-pointer", "click-style", "icon"] },

        { cat: "Positioning", val: 500, q: "Moving an element to the left or right to allow text to wrap around it.", a: "Float", d: ["Flex", "Grid", "Position"] },
        { cat: "Positioning", val: 500, q: "This CSS value resets a property to its default browser value.", a: "initial", d: ["none", "default", "auto"] },
        { cat: "Positioning", val: 500, q: "This property is used to rotate, scale, or flip an element.", a: "transform", d: ["transition", "animation", "motion"] },

        // --- CATEGORY: RESPONSIVE & UNITS ---
        { cat: "Responsive & Units", val: 100, q: "A relative unit based on the font-size of the root element.", a: "rem", d: ["em", "px", "vh"] },
        { cat: "Responsive & Units", val: 100, q: "A relative unit based on the font-size of the immediate parent element.", a: "em", d: ["rem", "px", "vw"] },
        { cat: "Responsive & Units", val: 100, q: "An absolute unit representing a single dot on the screen.", a: "px (Pixel)", d: ["rem", "em", "pt"] },

        { cat: "Responsive & Units", val: 200, q: "Unit equal to 1% of the visible viewport height.", a: "vh", d: ["vw", "vmin", "rem"] },
        { cat: "Responsive & Units", val: 200, q: "Unit equal to 1% of the visible viewport width.", a: "vw", d: ["vh", "vmax", "px"] },
        { cat: "Responsive & Units", val: 200, q: "Designing a website so it looks good and functions on all screen sizes.", a: "Responsive Design", d: ["Static Design", "Adaptive Design", "Fluid Design"] },

        { cat: "Responsive & Units", val: 300, q: "The rule used to apply CSS only when certain screen conditions are met.", a: "@media", d: ["@import", "@viewport", "@responsive"] },
        { cat: "Responsive & Units", val: 300, q: "Using this property on images prevents them from overflowing their containers.", a: "max-width: 100%", d: ["width: 100%", "size: responsive", "object-fit"] },
        { cat: "Responsive & Units", val: 300, q: "The specific width where a responsive layout changes structure.", a: "Breakpoint", d: ["Cutoff", "Viewport Limit", "Stop Line"] },

        { cat: "Responsive & Units", val: 400, q: "The visible area of a web page on a device.", a: "Viewport", d: ["Canvas", "Frame", "Window"] },
        { cat: "Responsive & Units", val: 400, q: "This property adjusts the vertical space between lines of text.", a: "line-height", d: ["letter-spacing", "text-align", "font-size"] },
        { cat: "Responsive & Units", val: 400, q: "This property allows for horizontal or vertical text orientation.", a: "writing-mode", d: ["text-direction", "font-rotation", "transform"] },

        { cat: "Responsive & Units", val: 500, q: "This property stretches text spacing to create straight edges on both sides.", a: "text-align: justify", d: ["text-align: center", "text-align: stretch", "text-align: full"] },
        { cat: "Responsive & Units", val: 500, q: "Fonts like Arial or Helvetica that lack small decorative feet on letters.", a: "Sans-Serif", d: ["Serif", "Monospace", "Display"] },
        { cat: "Responsive & Units", val: 500, q: "Fonts like Times New Roman that have small decorative lines on letters.", a: "Serif", d: ["Sans-Serif", "Script", "Gothic"] },

        // --- CATEGORY: LAYOUT & COLORS ---
        { cat: "Layout & Colors", val: 100, q: "A 1-dimensional layout model for aligning items in rows or columns.", a: "Flexbox", d: ["CSS Grid", "Floats", "Tables"] },
        { cat: "Layout & Colors", val: 100, q: "A 2-dimensional layout model for handling both columns and rows.", a: "CSS Grid", d: ["Flexbox", "Block Layout", "Inline Layout"] },
        { cat: "Layout & Colors", val: 100, q: "The color model based on Red, Green, and Blue.", a: "RGB", d: ["CMYK", "HSL", "HEX"] },

        { cat: "Layout & Colors", val: 200, q: "The six-digit code system used to define colors (e.g. #000000).", a: "HEX", d: ["RGBA", "HSL", "Binary"] },
        { cat: "Layout & Colors", val: 200, q: "The color model using Hue, Saturation, and Lightness.", a: "HSL", d: ["RGB", "HEX", "HSB"] },
        { cat: "Layout & Colors", val: 200, q: "The 'a' in RGBA stands for this setting.", a: "Alpha (Transparency)", d: ["Alternative", "Active", "Alignment"] },

        { cat: "Layout & Colors", val: 300, q: "The hex code for the color pure Black.", a: "#000000", d: ["#FFFFFF", "#CCCCCC", "#FF0000"] },
        { cat: "Layout & Colors", val: 300, q: "The hex code for the color pure White.", a: "#FFFFFF", d: ["#000000", "#111111", "#F0F0F0"] },
        { cat: "Layout & Colors", val: 300, q: "The default flex-direction value in Flexbox.", a: "row", d: ["column", "wrap", "stack"] },

        { cat: "Layout & Colors", val: 400, q: "This property allows Flexbox items to move to a new line if needed.", a: "flex-wrap", d: ["flex-flow", "item-wrap", "grid-wrap"] },
        { cat: "Layout & Colors", val: 400, q: "The property used to animate a change between two CSS states smoothly.", a: "transition", d: ["transform", "animation", "motion"] },
        { cat: "Layout & Colors", val: 400, q: "The property used to stretch an image to cover an entire background area.", a: "background-size: cover", d: ["background-fit", "image-stretch", "contain"] },

        { cat: "Layout & Colors", val: 500, q: "A pseudo-selector used to select every other row in a table.", a: ":nth-child(even)", d: [":nth-row", ":every-other", ":middle"] },
        { cat: "Layout & Colors", val: 500, q: "This pseudo-element allows you to change the color of list bullets.", a: "::marker", d: ["::bullet", "::list-item", "::before"] },
        { cat: "Layout & Colors", val: 500, q: "This property defines the duration of a CSS animation in seconds.", a: "transition-duration", d: ["animation-speed", "motion-time", "time-limit"] }
    ].map(item => ({ ...item, chapter: "Chapter 6", grade: "Web Design 1" })));
    
})();