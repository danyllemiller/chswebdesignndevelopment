/**
 * CHAPTER 8: SIGHTS & SOUNDS (Media & Tables)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * This file uses a single source of truth for all games.
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
    // ==============================================================
    // UNIFIED MASTER DATA BANK (75 ITEMS)
    // ==============================================================
    window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: IMAGES ---
        { cat: "Images", val: 100, q: "The HTML tag used to embed a static picture in a webpage.", a: "<img>", d: ["<pic>", "<image>", "<graphics>"] },
        { cat: "Images", val: 100, q: "The attribute that tells the browser the filename or URL of an image.", a: "src", d: ["href", "link", "url"] },
        { cat: "Images", val: 100, q: "The mandatory attribute providing a text description for screen readers.", a: "alt", d: ["title", "desc", "label"] },

        { cat: "Images", val: 200, q: "The best image format for high-quality photographs.", a: "JPG", d: ["GIF", "SVG", "PNG"] },
        { cat: "Images", val: 200, q: "The lossless image format that supports alpha transparency.", a: "PNG", d: ["JPG", "BMP", "TIFF"] },
        { cat: "Images", val: 200, q: "The math-based vector format that scales without pixelation.", a: "SVG", d: ["PNG", "JPG", "GIF"] },

        { cat: "Images", val: 300, q: "The standard image format used for simple web animations.", a: "GIF", d: ["WebP", "SVG", "JPG"] },
        { cat: "Images", val: 300, q: "Google's modern image format with superior compression over PNG/JPG.", a: "WebP", d: ["AVIF", "PNG", "GIF"] },
        { cat: "Images", val: 300, q: "The tiny icon displayed in the browser tab next to the page title.", a: "Favicon", d: ["Logo", "Thumbnail", "Avatar"] },

        { cat: "Images", val: 400, q: "The HTML tag used to group an image with a descriptive caption.", a: "<figure>", d: ["<section>", "<div>", "<aside>"] },
        { cat: "Images", val: 400, q: "The tag that provides a visible title for a <figure> element.", a: "<figcaption>", d: ["<caption>", "<label>", "<title>"] },
        { cat: "Images", val: 400, q: "An image that doesn't wrap a closing tag is known as this type of element.", a: "Void Element", d: ["Block element", "Inline element", "Semantic element"] },

        { cat: "Images", val: 500, q: "The tag used to provide different image sources for different screen sizes.", a: "<picture>", d: ["<media>", "<source>", "<canvas>"] },
        { cat: "Images", val: 500, q: "A legacy HTML tag used to create clickable hotspots on a single image.", a: "<map>", d: ["<area>", "<nav>", "<link>"] },
        { cat: "Images", val: 500, q: "The tag inside a <map> that defines specific clickable coordinates.", a: "<area>", d: ["<point>", "<coord>", "<link>"] },

        // --- CATEGORY: AUDIO & VIDEO ---
        { cat: "Audio & Video", val: 100, q: "The HTML tag used to embed a movie file in a page.", a: "<video>", d: ["<movie>", "<film>", "<media>"] },
        { cat: "Audio & Video", val: 100, q: "The HTML tag used to embed sound files in a page.", a: "<audio>", d: ["<sound>", "<music>", "<voice>"] },
        { cat: "Audio & Video", val: 100, q: "The most universally supported video format for the web.", a: ".mp4", d: [".avi", ".mov", ".wmv"] },

        { cat: "Audio & Video", val: 200, q: "The attribute that adds play, pause, and volume buttons to the player.", a: "controls", d: ["ui", "buttons", "player"] },
        { cat: "Audio & Video", val: 200, q: "The attribute that makes a video play automatically upon loading.", a: "autoplay", d: ["start", "auto", "run"] },
        { cat: "Audio & Video", val: 200, q: "The attribute that makes a media file restart once it reaches the end.", a: "loop", d: ["repeat", "cycle", "rebound"] },

        { cat: "Audio & Video", val: 300, q: "This attribute is required for autoplay to function in most browsers.", a: "muted", d: ["silent", "quiet", "no-audio"] },
        { cat: "Audio & Video", val: 300, q: "This attribute sets a placeholder image before the video starts playing.", a: "poster", d: ["thumbnail", "cover", "screen"] },
        { cat: "Audio & Video", val: 300, q: "The tag used inside media tags to offer multiple file formats.", a: "<source>", d: ["<file>", "<link>", "<src>"] },

        { cat: "Audio & Video", val: 400, q: "The tag used to load subtitle or caption files (VTT) into a video.", a: "<track>", d: ["<sub>", "<caption>", "<label>"] },
        { cat: "Audio & Video", val: 400, q: "This attribute value prevents the browser from downloading any data until the user clicks play.", a: "preload='none'", d: ["lazy='true'", "loading='off'", "defer"] },
        { cat: "Audio & Video", val: 400, q: "A common open-source audio container format similar to MP3.", a: ".ogg", d: [".wav", ".m4a", ".aac"] },

        { cat: "Audio & Video", val: 500, q: "This JS constructor allows you to play audio without using an HTML tag.", a: "Audio()", d: ["Sound()", "Player()", "Noise()"] },
        { cat: "Audio & Video", val: 500, q: "Linking to this at the end of a video URL starts play at 10 seconds.", a: "#t=10s", d: ["?time=10", "&start=10", ":10"] },
        { cat: "Audio & Video", val: 500, q: "A delay in media playback caused by network issues or high traffic.", a: "Latency", d: ["Bandwidth", "Buffering", "Throughput"] },

        // --- CATEGORY: TABLES ---
        { cat: "Tables", val: 100, q: "The wrapper tag used to define a data table.", a: "<table>", d: ["<grid>", "<list>", "<data>"] },
        { cat: "Tables", val: 100, q: "The tag that defines a single horizontal line of cells.", a: "<tr>", d: ["<td>", "<th>", "<row>"] },
        { cat: "Tables", val: 100, q: "The tag that holds actual content inside a standard table cell.", a: "<td>", d: ["<tr>", "<th>", "<cell>"] },

        { cat: "Tables", val: 200, q: "The tag used specifically for header cells, usually bold and centered.", a: "<th>", d: ["<head>", "<header>", "<title>"] },
        { cat: "Tables", val: 200, q: "The tag that provides an accessible title or label for the entire table.", a: "<caption>", d: ["<title>", "<label>", "<header>"] },
        { cat: "Tables", val: 200, q: "The CSS property that merges table borders into a single line.", a: "border-collapse", d: ["border-merge", "spacing-none", "border-style"] },

        { cat: "Tables", val: 300, q: "The attribute used to merge a cell across multiple columns.", a: "colspan", d: ["rowspan", "span-width", "merge-cols"] },
        { cat: "Tables", val: 300, q: "The attribute used to merge a cell vertically down multiple rows.", a: "rowspan", d: ["colspan", "span-height", "merge-rows"] },
        { cat: "Tables", val: 300, q: "The tag used to group the header rows of a complex table.", a: "<thead>", d: ["<head>", "<th-group>", "<top>"] },

        { cat: "Tables", val: 400, q: "The tag used to group the body content of a table.", a: "<tbody>", d: ["<content>", "<rows>", "<data>"] },
        { cat: "Tables", val: 400, q: "The tag used to group the summary or footer rows of a table.", a: "<tfoot>", d: ["<bottom>", "<summary>", "<footer-group>"] },
        { cat: "Tables", val: 400, q: "This legacy attribute was used to set the gap between table cells.", a: "cellspacing", d: ["cellpadding", "border-gap", "padding"] },

        { cat: "Tables", val: 500, q: "Creating tables inside other tables is known as this.", a: "Nesting", d: ["Stacking", "Layering", "Cloning"] },
        { cat: "Tables", val: 500, q: "The CSS property used on a wrapper to make a wide table scroll on mobile.", a: "overflow-x: auto", d: ["scrolling: yes", "display: scroll", "flex-wrap"] },
        { cat: "Tables", val: 500, q: "The standard amount of colors available in a GIF image file.", a: "256", d: ["16.7 Million", "1024", "16"] },

        // --- CATEGORY: ATTRIBUTES ---
        { cat: "Attributes", val: 100, q: "HTML attribute used to set the horizontal size of media in pixels.", a: "width", d: ["size", "length", "x-axis"] },
        { cat: "Attributes", val: 100, q: "HTML attribute used to set the vertical size of media in pixels.", a: "height", d: ["depth", "y-axis", "size"] },
        { cat: "Attributes", val: 100, q: "The attribute that tells the browser to wait to load images until scrolled to.", a: "loading='lazy'", d: ["defer", "async", "preload='none'"] },

        { cat: "Attributes", val: 200, q: "This CSS property determines how an image scales to fit its container.", a: "object-fit", d: ["image-size", "aspect-ratio", "content-fit"] },
        { cat: "Attributes", val: 200, q: "The 'object-fit' value that fills the box by cropping the image.", a: "cover", d: ["contain", "fill", "scale"] },
        { cat: "Attributes", val: 200, q: "The 'object-fit' value that fits the entire image without cropping.", a: "contain", d: ["cover", "fit", "shrink"] },

        { cat: "Attributes", val: 300, q: "This CSS property controls the transparency level of an image.", a: "opacity", d: ["filter", "alpha", "visibility"] },
        { cat: "Attributes", val: 300, q: "This CSS filter turns a color image into black and white.", a: "grayscale()", d: ["sepia()", "invert()", "contrast()"] },
        { cat: "Attributes", val: 300, q: "This CSS property adds an artistic glow or shadow behind an image.", a: "box-shadow", d: ["text-shadow", "drop-shadow", "glow"] },

        { cat: "Attributes", val: 400, q: "The CSS property used to create circular or rounded images.", a: "border-radius", d: ["corner-style", "circle-tool", "padding"] },
        { cat: "Attributes", val: 400, q: "This CSS filter makes an image look fuzzy or out of focus.", a: "blur()", d: ["sharpen()", "opacity()", "focus()"] },
        { cat: "Attributes", val: 400, q: "This CSS property controls which overlapping image appears on top.", a: "z-index", d: ["layer-up", "stack-order", "depth"] },

        { cat: "Attributes", val: 500, q: "This CSS property allows you to rotate or flip an image.", a: "transform", d: ["rotate", "spin", "transition"] },
        { cat: "Attributes", val: 500, q: "This property allows an image to blend with the background color.", a: "mix-blend-mode", d: ["color-mix", "layer-blend", "alpha-merge"] },
        { cat: "Attributes", val: 500, q: "Using CSS to change the color of an SVG path is done with this property.", a: "fill", d: ["color", "stroke", "background"] },

        // --- CATEGORY: ACCESSIBILITY ---
        { cat: "Accessibility", val: 100, q: "Decorative images should have an 'alt' attribute that is this.", a: "Empty (alt='')", d: ["Decorative", "None", "Hidden"] },
        { cat: "Accessibility", val: 100, q: "This HTML tag is used to embed another website inside your own page.", a: "<iframe>", d: ["<embed>", "<object>", "<link>"] },
        { cat: "Accessibility", val: 100, q: "The full name for the 'iframe' tag.", a: "Inline Frame", d: ["Internal Frame", "Internet Frame", "Input Frame"] },

        { cat: "Accessibility", val: 200, q: "Screen readers skip images that have this 'alt' value.", a: "Empty / Null", d: ["Missing", "Broken", "Long"] },
        { cat: "Accessibility", val: 200, q: "This element is just pixels and cannot be read by screen readers.", a: "<canvas>", d: ["<svg>", "<img>", "<iframe>"] },
        { cat: "Accessibility", val: 200, q: "The main reason to avoid using tables for page layout.", a: "Accessibility / SEO", d: ["File size", "Loading speed", "Colors"] },

        { cat: "Accessibility", val: 300, q: "Setting these two attributes on every image prevents Cumulative Layout Shift.", a: "Width & Height", d: ["Src & Alt", "Class & ID", "Loading & Decryption"] },
        { cat: "Accessibility", val: 300, q: "This property makes an element invisible but keeps its physical space.", a: "visibility: hidden", d: ["display: none", "opacity: 0", "filter: blur"] },
        { cat: "Accessibility", val: 300, q: "This property hides an element and removes its space from the layout.", a: "display: none", d: ["visibility: hidden", "opacity: 0", "z-index: -1"] },

        { cat: "Accessibility", val: 400, q: "This attribute in an iframe allows for full-screen mode.", a: "allowfullscreen", d: ["fullscreen='true'", "maximize", "viewmode"] },
        { cat: "Accessibility", val: 400, q: "A modern CSS property used to maintain a specific width-to-height ratio.", a: "aspect-ratio", d: ["box-sizing", "scale-mode", "ratio-lock"] },
        { cat: "Accessibility", val: 400, q: "Embedding a map or video usually requires this specific tag.", a: "<iframe>", d: ["<link>", "<a>", "<meta>"] },

        { cat: "Accessibility", val: 500, q: "This 1990s layout method is now considered completely obsolete.", a: "Table Layouts", d: ["Flexbox", "CSS Grid", "Block Level"] },
        { cat: "Accessibility", val: 500, q: "The specific CSS property used to animate an SVG's border path.", a: "stroke-dasharray", d: ["border-path", "svg-animate", "line-style"] },
        { cat: "Accessibility", val: 500, q: "This file format is mathematically drawn by the browser's engine.", a: "SVG", d: ["JPG", "GIF", "PNG"] }
    ].map(item => ({ ...item, chapter: "Chapter 8", grade: "Web Design 1" })));
