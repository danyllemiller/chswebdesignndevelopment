/**
 * CHAPTER 5: THE BONES (HTML)
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
        // --- CATEGORY: STRUCTURE ---
        { cat: "Structure", val: 100, q: "Every HTML document must start with this declaration.", a: "<!DOCTYPE html>", d: ["<html>", "<head>", "<start>"] },
        { cat: "Structure", val: 100, q: "The root element of an HTML page that wraps all other tags.", a: "<html>", d: ["<body>", "<head>", "<root>"] },
        { cat: "Structure", val: 100, q: "HTML tags are usually enclosed in these specific symbols.", a: "Angle brackets", d: ["Parentheses", "Curly braces", "Square brackets"] },
        
        { cat: "Structure", val: 200, q: "The container where you put metadata about the document.", a: "<head>", d: ["<body>", "<footer>", "<title>"] },
        { cat: "Structure", val: 200, q: "The tag that defines the visible content of the page.", a: "<body>", d: ["<html>", "<main>", "<content>"] },
        { cat: "Structure", val: 200, q: "This tag defines the title shown in the browser tab.", a: "<title>", d: ["<head>", "<header>", "<meta>"] },

        { cat: "Structure", val: 300, q: "Extra information provided inside a tag to modify an element.", a: "Attribute", d: ["Closing tag", "Value", "Nesting"] },
        { cat: "Structure", val: 300, q: "The practice of putting tags inside other tags.", a: "Nesting", d: ["Attribute use", "Validation", "Styling"] },
        { cat: "Structure", val: 300, q: "This character is used to indicate a closing tag.", a: "/", d: ["\\", ">", "!"] },

        { cat: "Structure", val: 400, q: "The standard character encoding used for the web.", a: "UTF-8", d: ["ASCII", "ISO-8859", "Unicode"] },
        { cat: "Structure", val: 400, q: "This meta tag ensures proper scaling on mobile devices.", a: "viewport", d: ["charset", "description", "author"] },
        { cat: "Structure", val: 400, q: "This tag provides info for search engines and metadata.", a: "<meta>", d: ["<title>", "<link>", "<search>"] },

        { cat: "Structure", val: 500, q: "Who founded the W3C (World Wide Web Consortium)?", a: "Tim Berners-Lee", d: ["Bill Gates", "Brendan Eich", "Håkon Wium Lie"] },
        { cat: "Structure", val: 500, q: "This tag is used to define the base URL for relative links.", a: "<base>", d: ["<url>", "<root>", "<path>"] },
        { cat: "Structure", val: 500, q: "A single piece of HTML content, consisting of a start tag, content, and end tag.", a: "Element", d: ["Attribute", "Selector", "Variable"] },

        // --- CATEGORY: BASIC TAGS ---
        { cat: "Basic Tags", val: 100, q: "The tag used for the largest and most important heading.", a: "<h1>", d: ["<h6>", "<head>", "<header>"] },
        { cat: "Basic Tags", val: 100, q: "The tag used to create a single line break.", a: "<br>", d: ["<lb>", "<break>", "<hr>"] },
        { cat: "Basic Tags", val: 100, q: "The tag used to define a standard paragraph of text.", a: "<p>", d: ["<para>", "<text>", "<pg>"] },

        { cat: "Basic Tags", val: 200, q: "The tag used for a horizontal rule (thematic line).", a: "<hr>", d: ["<line>", "<br>", "<border>"] },
        { cat: "Basic Tags", val: 200, q: "Tags that have no content and no closing tag.", a: "Void elements", d: ["Empty div tags", "Hidden elements", "Invalid tags"] },
        { cat: "Basic Tags", val: 200, q: "Comments in HTML start with this specific sequence.", a: "<!--", d: ["//", "/*", "#"] },

        { cat: "Basic Tags", val: 300, q: "The tag used for bold text with strong importance.", a: "<strong>", d: ["<b>", "<bold>", "<emp>"] },
        { cat: "Basic Tags", val: 300, q: "The tag used for italic text with added emphasis.", a: "<em>", d: ["<i>", "<ital>", "<emphasis>"] },
        { cat: "Basic Tags", val: 300, q: "The tag used to group block-level content for styling or layout.", a: "<div>", d: ["<span>", "<section>", "<group>"] },

        { cat: "Basic Tags", val: 400, q: "The tag used for small, inline text styling or containers.", a: "<span>", d: ["<div>", "<em>", "<text>"] },
        { cat: "Basic Tags", val: 400, q: "A sequence used to display reserved characters like < or &.", a: "Entity", d: ["Attribute", "Tag", "Variable"] },
        { cat: "Basic Tags", val: 400, q: "This entity represents a non-breaking space.", a: "&nbsp;", d: ["&space;", "&gt;", "&amp;"] },

        { cat: "Basic Tags", val: 500, q: "This entity is used to display the '<' character.", a: "&lt;", d: ["&gt;", "&amp;", "&quot;"] },
        { cat: "Basic Tags", val: 500, q: "This entity is used to display the '&' character.", a: "&amp;", d: ["&and;", "&lt;", "&copy;"] },
        { cat: "Basic Tags", val: 500, q: "The tag used for the smallest heading.", a: "<h6>", d: ["<h1>", "<h3>", "<h5>"] },

        // --- CATEGORY: LINKS & LISTS ---
        { cat: "Links & Lists", val: 100, q: "The tag used to create a clickable hyperlink.", a: "<a>", d: ["<link>", "<href>", "<url>"] },
        { cat: "Links & Lists", val: 100, q: "This attribute is used to provide the link destination.", a: "href", d: ["src", "link", "target"] },
        { cat: "Links & Lists", val: 100, q: "The common name for an <a> tag.", a: "Anchor tag", d: ["Action tag", "Access tag", "Array tag"] },

        { cat: "Links & Lists", val: 200, q: "How you start an unordered (bulleted) list.", a: "<ul>", d: ["<ol>", "<li>", "<list>"] },
        { cat: "Links & Lists", val: 200, q: "How you start an ordered (numbered) list.", a: "<ol>", d: ["<ul>", "<li>", "<num>"] },
        { cat: "Links & Lists", val: 200, q: "Each item in a list is defined by this tag.", a: "<li>", d: ["<ul>", "<item>", "<list-item>"] },

        { cat: "Links & Lists", val: 300, q: "This attribute value opens a link in a new tab.", a: "target='_blank'", d: ["rel='external'", "type='new'", "href='tab'"] },
        { cat: "Links & Lists", val: 300, q: "Which attribute identifies an element uniquely on a page?", a: "id", d: ["class", "name", "key"] },
        { cat: "Links & Lists", val: 300, q: "Which attribute applies to multiple elements for group styling?", a: "class", d: ["id", "group", "type"] },

        { cat: "Links & Lists", val: 400, q: "Which tag is used for the introductory content of a section?", a: "<header>", d: ["<head>", "<top>", "<nav>"] },
        { cat: "Links & Lists", val: 400, q: "Which semantic tag is used for navigation links?", a: "<nav>", d: ["<links>", "<menu>", "<ul>"] },
        { cat: "Links & Lists", val: 400, q: "Which tag defines content at the bottom of a page?", a: "<footer>", d: ["<bottom>", "<end>", "<base>"] },

        { cat: "Links & Lists", val: 500, q: "A link that leads to another section of the same page.", a: "Internal Link / Anchor", d: ["External Link", "Relative Link", "Absolute Link"] },
        { cat: "Links & Lists", val: 500, q: "A link that contains the full URL including protocol.", a: "Absolute Link", d: ["Relative Link", "Anchor Link", "Root Link"] },
        { cat: "Links & Lists", val: 500, q: "A link that is relative to the current file location.", a: "Relative Link", d: ["Absolute Link", "Hyperlink", "Global Link"] },

        // --- CATEGORY: MULTIMEDIA ---
        { cat: "Multimedia", val: 100, q: "Which tag is used to embed an image?", a: "<img>", d: ["<image>", "<picture>", "<src>"] },
        { cat: "Multimedia", val: 100, q: "This attribute provides the file path to an image.", a: "src", d: ["href", "alt", "path"] },
        { cat: "Multimedia", val: 100, q: "This attribute provides text for screen readers.", a: "alt", d: ["title", "desc", "label"] },

        { cat: "Multimedia", val: 200, q: "Which tag is used to embed another HTML page inside your own?", a: "<iframe>", d: ["<embed>", "<object>", "<include>"] },
        { cat: "Multimedia", val: 200, q: "This HTML5 tag allows native support for video files.", a: "<video>", d: ["<movie>", "<media>", "<film>"] },
        { cat: "Multimedia", val: 200, q: "This HTML5 tag allows native support for audio files.", a: "<audio>", d: ["<sound>", "<voice>", "<music>"] },

        { cat: "Multimedia", val: 300, q: "Which tag is used to define an SVG vector drawing?", a: "<svg>", d: ["<canvas>", "<img>", "<draw>"] },
        { cat: "Multimedia", val: 300, q: "Which tag is used for drawing graphics via JavaScript?", a: "<canvas>", d: ["<svg>", "<draw>", "<art>"] },
        { cat: "Multimedia", val: 300, q: "This tag provides text tracks for video/audio (subtitles).", a: "<track>", d: ["<caption>", "<subtext>", "<lang>"] },

        { cat: "Multimedia", val: 400, q: "Which tag is used for self-contained content like a photo with a caption?", a: "<figure>", d: ["<section>", "<main>", "<article>"] },
        { cat: "Multimedia", val: 400, q: "Inside a figure, what tag provides the caption text?", a: "<figcaption>", d: ["<caption>", "<label>", "<title>"] },
        { cat: "Multimedia", val: 400, q: "What does HTML5 allow that previous versions didn't?", a: "Native Audio/Video support", d: ["Tables", "Hyperlinks", "Images"] },

        { cat: "Multimedia", val: 500, q: "This file format is best for logos because it stays crisp when resized.", a: "SVG", d: ["JPG", "GIF", "PNG"] },
        { cat: "Multimedia", val: 500, q: "This tag is used to provide alternate sources for an image.", a: "<picture>", d: ["<figure>", "<media>", "<canvas>"] },
        { cat: "Multimedia", val: 500, q: "Attribute used to add play/pause buttons to a video.", a: "controls", d: ["autoplay", "loop", "muted"] },

        // --- CATEGORY: SEMANTIC & FORMS ---
        { cat: "Semantic & Forms", val: 100, q: "Which tag defines an independent, self-contained article?", a: "<article>", d: ["<section>", "<aside>", "<div>"] },
        { cat: "Semantic & Forms", val: 100, q: "The tag used to group elements that relate to the main topic.", a: "<section>", d: ["<div>", "<aside>", "<article>"] },
        { cat: "Semantic & Forms", val: 100, q: "What tag represents the main content of the document?", a: "<main>", d: ["<body>", "<section>", "<article>"] },

        { cat: "Semantic & Forms", val: 200, q: "The tag used to collect user input data.", a: "<form>", d: ["<input>", "<submit>", "<select>"] },
        { cat: "Semantic & Forms", val: 200, q: "The default value of the 'type' attribute for an <input>.", a: "text", d: ["button", "submit", "password"] },
        { cat: "Semantic & Forms", val: 200, q: "The tag used for long, multi-line text input.", a: "<textarea>", d: ["<input type='text'>", "<text>", "<box>"] },

        { cat: "Semantic & Forms", val: 300, q: "Which tag is used for a dropdown menu in a form?", a: "<select>", d: ["<dropdown>", "<input>", "<option>"] },
        { cat: "Semantic & Forms", val: 300, q: "Which tag associates a text label with a form input?", a: "<label>", d: ["<span>", "<text>", "<caption>"] },
        { cat: "Semantic & Forms", val: 300, q: "Which tag represents a button that sends form data?", a: "<button>", d: ["<click>", "<a>", "<input type='radio'>"] },

        { cat: "Semantic & Forms", val: 400, q: "Which tag defines a table row?", a: "<tr>", d: ["<td>", "<th>", "<table>"] },
        { cat: "Semantic & Forms", val: 400, q: "Which tag defines a standard data cell in a table?", a: "<td>", d: ["<tr>", "<th>", "<row>"] },
        { cat: "Semantic & Forms", val: 400, q: "Which attribute allows a cell to merge across columns?", a: "colspan", d: ["rowspan", "span", "width"] },

        { cat: "Semantic & Forms", val: 500, q: "The tag used for picking a specific color in a form.", a: "<input type='color'>", d: ["<colorpicker>", "<select>", "<palette>"] },
        { cat: "Semantic & Forms", val: 500, q: "Which tag represents a range of time or a date in HTML5?", a: "<time>", d: ["<date>", "<chrono>", "<calendar>"] },
        { cat: "Semantic & Forms", val: 500, q: "Which attribute specifies where to send form data on submit?", a: "action", d: ["method", "target", "post"] }
    ].map(item => ({ ...item, chapter: "Chapter 5", grade: "Web Design 1" })));
    
})();