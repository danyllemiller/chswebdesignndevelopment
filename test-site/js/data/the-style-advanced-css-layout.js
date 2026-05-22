/**
 * CHAPTER 7: ADVANCED CSS LAYOUT
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
        // --- CATEGORY: FLEXBOX ---
        { cat: "Flexbox", val: 100, q: "This CSS property turns a container into a flexbox layout.", a: "display: flex", d: ["display: grid", "display: block", "display: inline"] },
        { cat: "Flexbox", val: 100, q: "The default direction flex items will arrange themselves in a container.", a: "row", d: ["column", "wrap", "stack"] },
        { cat: "Flexbox", val: 100, q: "The axis that runs from left to right by default in a flex container.", a: "Main Axis", d: ["Cross Axis", "Y-Axis", "Vertical Axis"] },
        
        { cat: "Flexbox", val: 200, q: "This property aligns flex items along the Main Axis (horizontal by default).", a: "justify-content", d: ["align-items", "align-content", "flex-direction"] },
        { cat: "Flexbox", val: 200, q: "This property aligns flex items along the Cross Axis (vertical by default).", a: "align-items", d: ["justify-content", "flex-wrap", "order"] },
        { cat: "Flexbox", val: 200, q: "To make flex items stack vertically, you set flex-direction to this.", a: "column", d: ["row", "wrap", "reverse"] },

        { cat: "Flexbox", val: 300, q: "This property allows flex items to break onto new lines if space is limited.", a: "flex-wrap", d: ["flex-flow", "overflow", "flex-grow"] },
        { cat: "Flexbox", val: 300, q: "This shorthand property combines flex-direction and flex-wrap.", a: "flex-flow", d: ["flex-set", "flex-bundle", "flex-box"] },
        { cat: "Flexbox", val: 300, q: "This property overrides alignment for a single, specific flex item.", a: "align-self", d: ["align-item", "justify-self", "order"] },

        { cat: "Flexbox", val: 400, q: "The justify-content value that pushes items to the far start and end edges.", a: "space-between", d: ["space-around", "center", "flex-end"] },
        { cat: "Flexbox", val: 400, q: "The justify-content value that adds equal space around every item.", a: "space-around", d: ["space-between", "space-evenly", "flex-start"] },
        { cat: "Flexbox", val: 400, q: "This property defines the initial size of a flex item before spacing happens.", a: "flex-basis", d: ["flex-grow", "flex-shrink", "width"] },

        { cat: "Flexbox", val: 500, q: "This property changes the visual sequence of flex items without changing the HTML.", a: "order", d: ["index", "sequence", "z-index"] },
        { cat: "Flexbox", val: 500, q: "This unitless number defines how much a flex item can expand to fill empty space.", a: "flex-grow", d: ["flex-basis", "flex-expand", "flex-stretch"] },
        { cat: "Flexbox", val: 500, q: "The default align-items value that stretches items to fill the container height.", a: "stretch", d: ["center", "baseline", "flex-start"] },

        // --- CATEGORY: CSS GRID ---
        { cat: "CSS Grid", val: 100, q: "CSS Grid is primarily designed for layouts in this many dimensions.", a: "Two (2D)", d: ["One (1D)", "Three (3D)", "Zero (0D)"] },
        { cat: "CSS Grid", val: 100, q: "The CSS declaration used to enable grid layout on a container.", a: "display: grid", d: ["display: flex", "grid-mode: on", "display: table"] },
        { cat: "CSS Grid", val: 100, q: "The property used to define the exact width and number of columns in a grid.", a: "grid-template-columns", d: ["grid-columns", "column-width", "grid-template-rows"] },

        { cat: "CSS Grid", val: 200, q: "The specialized unit in Grid representing a flexible fraction of available space.", a: "fr", d: ["px", "rem", "em"] },
        { cat: "CSS Grid", val: 200, q: "The property that adds space specifically between grid rows and columns.", a: "gap", d: ["padding", "margin", "spacing"] },
        { cat: "CSS Grid", val: 200, q: "The horizontal and vertical lines that divide the grid into cells.", a: "Grid Lines", d: ["Grid Borders", "Grid Tracks", "Grid Areas"] },

        { cat: "CSS Grid", val: 300, q: "A shorthand function used to create multiple equal-sized columns easily.", a: "repeat()", d: ["multi()", "calc()", "grid()"] },
        { cat: "CSS Grid", val: 300, q: "The smallest unit of a grid, formed by the intersection of a row and column.", a: "Grid Cell", d: ["Grid Area", "Grid Track", "Grid Node"] },
        { cat: "CSS Grid", val: 300, q: "A rectangular area on the grid consisting of one or more adjacent cells.", a: "Grid Area", d: ["Grid Box", "Grid Zone", "Grid Block"] },

        { cat: "CSS Grid", val: 400, q: "The keyword used to make a grid item stretch across multiple tracks.", a: "span", d: ["merge", "join", "stretch"] },
        { cat: "CSS Grid", val: 400, q: "The shorthand property for placing an item in a specific named grid area.", a: "grid-area", d: ["grid-location", "grid-spot", "grid-place"] },
        { cat: "CSS Grid", val: 400, q: "The space between two adjacent grid lines (representing a column or row).", a: "Grid Track", d: ["Grid Path", "Grid Lane", "Grid Slot"] },

        { cat: "CSS Grid", val: 500, q: "This property allows you to name and map out sections of your grid layout visually.", a: "grid-template-areas", d: ["grid-map", "grid-layout", "grid-name"] },
        { cat: "CSS Grid", val: 500, q: "This property aligns grid items along the column (vertical) axis within their cell.", a: "align-items", d: ["justify-items", "place-content", "grid-align"] },
        { cat: "CSS Grid", val: 500, q: "This property aligns grid items along the row (horizontal) axis within their cell.", a: "justify-items", d: ["align-items", "place-items", "grid-justify"] },

        // --- CATEGORY: POSITIONING ---
        { cat: "Positioning", val: 100, q: "The default position value for all HTML elements where they follow the page flow.", a: "static", d: ["relative", "absolute", "fixed"] },
        { cat: "Positioning", val: 100, q: "The CSS property used to control the vertical stacking order of overlapping items.", a: "z-index", d: ["layer", "stack", "depth"] },
        { cat: "Positioning", val: 100, q: "The property used to move a positioned element down from its top edge.", a: "top", d: ["margin-top", "padding-top", "y-axis"] },

        { cat: "Positioning", val: 200, q: "This position value moves an element relative to its normal starting spot.", a: "relative", d: ["static", "absolute", "fixed"] },
        { cat: "Positioning", val: 200, q: "This position removes an element from flow and glues it to the user's viewport.", a: "fixed", d: ["relative", "absolute", "sticky"] },
        { cat: "Positioning", val: 200, q: "Does an absolute positioned element leave a gap in the normal document flow?", a: "No", d: ["Yes", "Only on mobile", "Only if floated"] },

        { cat: "Positioning", val: 300, q: "An 'absolute' element positions itself relative to this type of ancestor.", a: "nearest positioned ancestor", d: ["the body only", "the direct parent", "the viewport"] },
        { cat: "Positioning", val: 300, q: "This position acts like relative until a scroll threshold is hit, then becomes fixed.", a: "sticky", d: ["relative", "absolute", "locked"] },
        { cat: "Positioning", val: 300, q: "If no ancestor has a position set, an absolute element uses this as its context.", a: "Body / HTML", d: ["Header", "Div", "Viewport"] },

        { cat: "Positioning", val: 400, q: "For z-index to function, an element cannot have this specific position value.", a: "static", d: ["relative", "absolute", "fixed"] },
        { cat: "Positioning", val: 400, q: "If two absolute elements overlap without z-index, this determines the top one.", a: "Source Order", d: ["File Size", "Alphabetical ID", "HTML Tag Type"] },
        { cat: "Positioning", val: 400, q: "The common position value used on a parent to 'trap' an absolute child inside.", a: "relative", d: ["static", "fixed", "sticky"] },

        { cat: "Positioning", val: 500, q: "Navigation bars that stay visible at the top while scrolling usually use this.", a: "fixed", d: ["relative", "static", "absolute"] },
        { cat: "Positioning", val: 500, q: "Position: absolute removes an element from this logical page context.", a: "Document Flow", d: ["Media Query", "Flexbox", "Z-Index"] },
        { cat: "Positioning", val: 500, q: "The transform value used to perfectly center an absolute element on both axes.", a: "translate(-50%, -50%)", d: ["rotate(180deg)", "scale(0.5)", "skew(10deg)"] },

        // --- CATEGORY: RESPONSIVE ---
        { cat: "Responsive", val: 100, q: "The CSS rule used to apply styles based on specific screen sizes or conditions.", a: "@media", d: ["@import", "@viewport", "@responsive"] },
        { cat: "Responsive", val: 100, q: "The specific screen width (in pixels) where a layout structure changes.", a: "breakpoint", d: ["cutoff", "limit", "edge"] },
        { cat: "Responsive", val: 100, q: "Designing the website for the smallest screens before the largest screens.", a: "Mobile-First", d: ["Desktop-First", "App-First", "Text-First"] },

        { cat: "Responsive", val: 200, q: "This unit of measurement is relative to the font-size of the root HTML element.", a: "rem", d: ["em", "px", "vh"] },
        { cat: "Responsive", val: 200, q: "This unit of measurement is relative to the font-size of the immediate parent element.", a: "em", d: ["rem", "px", "vw"] },
        { cat: "Responsive", val: 200, q: "This unit represents 1% of the total visible viewport width.", a: "vw", d: ["vh", "rem", "px"] },

        { cat: "Responsive", val: 300, q: "To make an image responsive and prevent overflow, set max-width to this.", a: "100%", d: ["1000px", "auto", "0"] },
        { cat: "Responsive", val: 300, q: "Using 'min-width' in a media query targets screens that are this size OR...", a: "Larger", d: ["Smaller", "Exactly", "Wider"] },
        { cat: "Responsive", val: 300, q: "Using 'max-width' in a media query targets screens that are this size OR...", a: "Smaller", d: ["Larger", "Taller", "Zoomed"] },

        { cat: "Responsive", val: 400, q: "This meta tag is required in the <head> for responsive scaling on phones.", a: "Viewport Meta Tag", d: ["Charset Tag", "Title Tag", "Description Tag"] },
        { cat: "Responsive", val: 400, q: "Using display: none inside a media query performs this action on mobile.", a: "Hides the element", d: ["Centers it", "Enlarges it", "Animates it"] },
        { cat: "Responsive", val: 400, q: "To center a block element horizontally, set margin-left/right to this.", a: "auto", d: ["100%", "center", "fixed"] },

        { cat: "Responsive", val: 500, q: "A layout that uses percentages instead of fixed pixels for widths.", a: "Fluid Layout", d: ["Static Layout", "Fixed Layout", "Draft Layout"] },
        { cat: "Responsive", val: 500, q: "The visible area of a web page on a user's device.", a: "Viewport", d: ["Canvas", "Frame", "Monitor"] },
        { cat: "Responsive", val: 500, q: "Switching flex-direction from row to column handles this specific mobile need.", a: "Vertical Stacking", d: ["Horizontal Scrolling", "Text Wrapping", "Image Scaling"] },

        // --- CATEGORY: BOX MODEL ---
        { cat: "Box Model", val: 100, q: "The transparent area located outside of the element's border.", a: "margin", d: ["padding", "spacing", "outline"] },
        { cat: "Box Model", val: 100, q: "The transparent area located inside the border, surrounding the content.", a: "padding", d: ["margin", "gutter", "padding-box"] },
        { cat: "Box Model", val: 100, q: "The visible line that surrounds an element's padding and content.", a: "border", d: ["margin", "outline", "shadow"] },

        { cat: "Box Model", val: 200, q: "The property that determines how the total width and height of an element is calculated.", a: "box-sizing", d: ["box-model", "calc", "sizing-mode"] },
        { cat: "Box Model", val: 200, q: "The box-sizing value that includes padding and border in the specified width.", a: "border-box", d: ["content-box", "padding-box", "fixed-box"] },
        { cat: "Box Model", val: 200, q: "The property used to set the color of an element's text.", a: "color", d: ["text-color", "font-color", "fill"] },

        { cat: "Box Model", val: 300, q: "In 'content-box', the total width is the content width plus these two things.", a: "Padding + Border", d: ["Margin + Padding", "Margin + Border", "Shadow + Gutter"] },
        { cat: "Box Model", val: 300, q: "The default browser value for the box-sizing property.", a: "content-box", d: ["border-box", "auto", "initial"] },
        { cat: "Box Model", val: 300, q: "The unit 'px' is an example of this type of measurement.", a: "Absolute", d: ["Relative", "Flexible", "Liquid"] },

        { cat: "Box Model", val: 400, q: "The phenomenon where the vertical margins of two adjacent elements combine.", a: "Margin Collapse", d: ["Margin Merge", "Padding Stack", "Gutter Join"] },
        { cat: "Box Model", val: 400, q: "This display type takes up the full width of its parent container.", a: "block", d: ["inline", "inline-block", "none"] },
        { cat: "Box Model", val: 400, q: "This display type only takes up as much width as its content needs.", a: "inline", d: ["block", "flex", "grid"] },

        { cat: "Box Model", val: 500, q: "This display type allows width/height dimensions but sits in line with text.", a: "inline-block", d: ["block", "flex", "static"] },
        { cat: "Box Model", val: 500, q: "To center a block, both margin-left and margin-right must be set to this.", a: "auto", d: ["100%", "center", "0"] },
        { cat: "Box Model", val: 500, q: "If an element has 100px width and 10px padding (border-box), the content width is...", a: "80px", d: ["100px", "90px", "120px"] }
    ].map(item => ({ ...item, chapter: "Chapter 7", grade: "Web Design 1" })));
    
})();