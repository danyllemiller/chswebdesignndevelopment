<?php
/**
 * REUSABLE PRE-ASSESSMENT HANDLER (DATABASE VERSION)
 * Features: Server-Side Grading, MySQL Logging, 10-Question Logic.
 */

// 1. DATABASE CONFIGURATION (Update with your specific DB User/Pass)
$host = "localhost";
$db_user = "digartcl_danylle"; 
$db_pass = "k@T1e!2503!$";
$db_name = "digartcl_students";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$conn = @new mysqli($host, $db_user, $db_pass, $db_name);
if ($conn->connect_error) {
    http_response_code(200); 
    echo json_encode(["result" => "error", "message" => "DB Connection Failed: " . $conn->connect_error]);
    exit;
}

$json = isset($_POST['payload']) ? $_POST['payload'] : file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(200);
    echo json_encode(["result" => "error", "message" => "No payload received."]);
    exit;
}

// ---------------------------------------------------------
// 3. MASTER ANSWER KEY FOR SERVER-SIDE GRADING
// ---------------------------------------------------------
$masterKey = [
    // --- CHAPTER 9 DIAGNOSTIC KEY (Advanced Layouts) ---
      "A client needs a sidebar that stays glued to the side of the screen even when the user scrolls down the page. Which position value should you use?": "fixed",
      "You set a box to 400px wide and add 20px of padding. If you are using the 'Pro Standard' border-box model, what is the final width?": "400px",
      "Which CSS property allows you to control the stacking order of elements that are overlapping on the screen?": "z-index",
      "If you want to create a CSS variable for your primary brand color, where is the most professional place to declare it?": "The :root pseudo-class",
      "Which unit is essential for accessible typography because it scales based on the user's browser font-size settings?": "rem",
      "To create a layout with three columns where the side columns are equal and the middle column takes up all remaining space, use:": "grid-template-columns: 1fr auto 1fr",
      "In Flexbox, which property is used to align items along the 'Main Axis' (usually horizontally)?": "justify-content",
      "You want an element to behave normally while scrolling until it hits the top of the browser, then stay there. Use position:": "sticky",
      "Which CSS function allows you to set a font size that scales with the window but never gets smaller than 16px?": "clamp()",
      "To hide an element but keep the blank space it occupied reserved in the layout, use:": "visibility: hidden",
      "The 'Mobile-First' philosophy suggests that we should use which type of media query as our standard?": "@media (min-width: ...)",
      "Which unit represents 1% of the total height of the user's browser window?": "vh",
      "To center a fixed-width container horizontally inside its parent, which margin setting is the industry standard?": "margin: 0 auto",
      "In CSS Grid, the 'fr' unit stands for a fraction of what?": "The available free space in the grid container",
      "Which property forces a scrollbar to appear inside a box if the text inside is too long for its height?": "overflow: auto",
      "To target only the paragraphs that are direct 'children' of an article (not grandchildren), which combinator is used?": ">",
      "What is the result of using 'display: none' on an element?": "The element is removed from the layout and adjacent elements move to fill the gap.",
      "How do you correctly use a CSS variable named '--main-bg' in a rule?": "background-color: var(--main-bg);",
      "Which property allows you to physically grow an element by 20% when a user hovers over it?": "transform: scale(1.2);",
      "To make a single grid item span across three columns, which property do you apply to that item?": "grid-column: span 3",
      "If an element has 'position: absolute', what is it positioned relative to?": "Its closest ancestor that has a position value other than static.",
      "Which CSS function is required if you want to subtract 50px from a 100% width?": "calc()",
      "To add 20px of space BETWEEN grid items without using margins on the items themselves, use:": "gap: 20px",
      "Which property ensures that a video or image maintains its 16:9 widescreen shape as it resizes?": "aspect-ratio",
      "A media query targeting '(orientation: portrait)' will trigger when:": "The height of the screen is greater than the width.",
      "What happens to a 'static' positioned element if you try to apply a z-index to it?": "Nothing; z-index only works on positioned elements (relative, absolute, etc.).",
      
      // Chapter 10
      "Which property is the 'Magic Reset' that prevents padding from expanding a box?": "box-sizing: border-box",
      "What is the primary benefit of SVG over other image formats?": "Perfectly sharp at any size (Vector)",
      "In the 8-step SSL Handshake, what is the first thing the browser does?": "Asks for a secure session",
      "Which unit is relative to the Root HTML element's font size?": "rem",
      "What is a 'Digital Footprint'?": "A permanent record of online activity",
      "Which attribute is REQUIRED for a video to autoplay in most browsers?": "muted",
      "What does PII stand for in privacy law?": "Personally Identifiable Information",
      "Which Photoshop tool is used to 'shrink' the total pixel dimensions of an image?": "Image Size",
      "What tag is used to specify multiple file formats (like MP3 and OGG) for audio?": "<source>",
      "What is the purpose of the <track> tag?": "To provide subtitles or captions",
      "Which table tag is used to wrap the summary or totals at the bottom?": "<tfoot>",
      "What attribute allows an <iframe> to take up the full width of a container?": "width='100%'",
      "The Nevada Privacy Act SB220 uses which model for data sales?": "Opt-Out",
      "Which of the 'POUR' principles ensures a site can be used with a keyboard?": "Operable",
      "What is 'Dithering'?": "Simulating colors using patterns",
      "Why is JPG preferred over PNG for large, complex photographs?": "It has a much smaller file size due to lossy compression.",
      "What is the 'poster' attribute used for in a <video> tag?": "It specifies a static image to show before the video plays.",
      "Which image format was created by Google to provide superior lossless and lossy compression on the web?": "WebP",
      "Why is it considered a bad practice to use HTML tables for an entire page layout?": "They are not accessible to screen readers and break responsive design.",
      "What does the 'colspan' attribute do in a table data cell (<td>)?": "Stretches the cell horizontally across multiple columns.",
      
      // CHAPTER 12: The Game Dev (Advanced JS & Game Logic)
      "Standard order for a game loop?": "Clear -> Update -> Draw",
      "Keyword to instantiate a new class object?": "new",
      "Physics system checking for rectangle overlap?": "AABB Collision",
      "Function that runs automatically in an ES6 Class?": "constructor()",
      "How do you stop a loop using requestAnimationFrame?": "cancelAnimationFrame()",
      "Origin point (0,0) location?": "Top-Left",
      "Math object for whole numbers?": "Math.floor",
      "Property for physical key pressed?": "event.code",
      "Keyword for specific class instance?": "this",
      "Remove FIRST element of an array?": "shift()",
      "Time elapsed since last frame?": "Delta Time",
      "Simulate gravity logic?": "Add constant to vertical velocity",
      "Math theorem for circle collision?": "Pythagoras",
      "Detect key RELEASE?": "keyup",
      "Clear entire canvas ctx?": "ctx.clearRect()",
      "Math.floor(Math.random() * 10) range?": "0 to 9",
      "Advantage of ES6 Classes?": "Reusability/Blueprints",
      "Draw image to canvas?": "ctx.drawImage()",
      "Coordinate for top-left corner?": "(0,0)",
      "Move object RIGHT logic?": "x++",
      "Single image with multiple animation frames?": "Sprite Sheet",
      "Checks for invisible calculation area?": "Hitbox",
      "Background layers moving at different speeds?": "Parallax",
      "Convert degrees to radians formula?": "degrees * (PI / 180)",
      "Gradually reducing velocity over time?": "Friction",
      "Remove item from MIDDLE of array?": "splice()",
      "Canvas 'Depth' order equivalent?": "Drawing Order",
      "Refers to speed and direction?": "Velocity",
      "Method to start custom shape path?": "ctx.beginPath()",
      "Why separate Update from Draw logic?": "Easier to maintain and debug",
      "What object is returned by fetch()?": "Promise",
      "Which method draws a full circle arc?": "ctx.arc()",
      "What is the 'context' for canvas?": "The 2D drawing API (ctx)",
      "How many radians in a full circle?": "Math.PI * 2",
      "Horizontal flip canvas scaling?": "scale(-1, 1)",
      "Keyword to inherit from a Class?": "extends",
      "A game state variable uses which type?": "Boolean",
      "What prevents 'smearing' on canvas?": "ctx.clearRect()",
      "Which method starts a custom path?": "beginPath()",
      "Axis for jumping up and down?": "Y-axis",
      "Force that reduces velocity every frame?": "Friction",
      "What is an 'instance'?": "A specific object created from a Class",
      "Which method renders text on canvas?": "fillText()",
      "What does ctx.save() do?": "Saves the current drawing state",
      "Haptic feedback uses which sense?": "Touch",
      "Standard frames per second for smooth games?": "60 FPS",
      "A 'Hard-coded' unexplained number is a:": "Magic number",
      "A character sprite sheet contains:": "Multiple frames of animation",
      "Function to round 4.9 down to 4?": "Math.floor()",
      "What method stops a setInterval engine?": "clearInterval()",
      "Hitbox logic is the same concept as:": "Bounding Box",

      // CHAPTER 13: The Cloud (Collaboration & Hosting)
      "What is the main purpose of a Version Control System (VCS)?": "To track changes and act as a time machine for code.",
      "Which of the following best describes Git?": "Local version control software installed on your computer.",
      "How is GitHub different from Git?": "GitHub is a cloud hosting service specifically for your Git repositories.",
      "What is a 'branch' in Git?": "An isolated copy of the project for safely testing new features.",
      "What does the term 'commit' mean in version control?": "Saving a permanent snapshot of your code to the local history.",
      "What is a Data Center?": "A highly secured physical building filled with powerful servers.",
      "Which company is known as the 'Original and Biggest' cloud provider (the PlayStation of the cloud)?": "Amazon Web Services (AWS)",
      "Which cloud service model (like a Dine-In Restaurant) provides a completed piece of software online where the provider manages everything?": "SaaS (Software as a Service)",
      "Which cloud service model provides the raw hardware (like a blank Virtual Machine) where you have to build everything inside it?": "IaaS (Infrastructure as a Service)",
      "Which cloud service model (like Netlify) gives developers the environment to deploy code without managing the operating system?": "PaaS (Platform as a Service)",
      "What is a Public Cloud?": "Infrastructure owned by a provider and shared among many customers.",
      "What is a Private Cloud?": "Cloud infrastructure dedicated solely to a single organization.",
      "What is a Hybrid Cloud?": "A mix of public and private clouds working together.",
      "What does 'Scalability' mean in cloud computing?": "The ability to easily handle a growing amount of work by adding more computer power.",
      "What is the primary benefit of cloud 'Elasticity'?": "Automatically scaling down when traffic drops to save money.",
      "Why is emailing files back and forth the 'wrong way' to collaborate on code?": "It leads to chaos, overwritten files, and lost work.",
      "What is a 'push' in Git?": "Uploading your local history to a remote repository like GitHub.",
      "What is the purpose of a README file on GitHub?": "To explain what your project is to visitors.",
      "Who currently owns GitHub?": "Microsoft",
      "If your home internet goes down, can you still use Git?": "Yes, because Git works locally on your hard drive.",
      "What does the term 'Cloud Computing' actually mean?": "Renting computer power from someone else over the internet.",
      "Which major cloud provider is known as the 'Business' choice and deeply integrates with Windows?": "Microsoft Azure",
      "Which major cloud provider is known as the 'Data & AI' king (hosting YouTube)?": "GCP (Google Cloud Platform)",
      "What is a 'Repository' (Repo)?": "The main folder that contains all of your project's files and version history.",
      "What is a 'merge' in version control?": "Combining code from one branch (like a teammate's feature) into the main timeline.",
      "In the 'Pizza as a Service' analogy, what does 'Take and Bake' represent?": "IaaS",
      "In the 'Pizza as a Service' analogy, what does 'Pizza Delivery' represent?": "PaaS",
      "Google Docs and Netflix are examples of which service model?": "SaaS",
      "Why do Data Centers have massive industrial air conditioning units?": "Because thousands of powerful servers generate extreme heat that would melt them.",
      "What is the role of backup generators at a Data Center?": "To ensure servers stay powered and websites stay online even during regional blackouts.",
      "What does it mean to work in 'parallel' using Git?": "Multiple developers working on the same project simultaneously on different branches without interrupting each other.",
      "How does GitHub serve as a modern resume?": "Employers can view your public repositories to see the actual code you have written.",
      "When creating a new repository on GitHub, what does setting it to 'Public' mean?": "Anyone on the internet can see your code, which is great for portfolios.",
      "If you want to keep highly sensitive financial data completely isolated, which deployment model should you use?": "Private Cloud",
      "Which cloud deployment model is like 'Renting an apartment in a giant skyscraper'?": "Public Cloud",
      "When traffic spikes from 100 users to 50,000 users, what prevents a cloud-hosted site from crashing?": "Elasticity and Scalability allowing the system to instantly add more server power.",
      "How do you pay for Cloud Computing resources?": "By the minute or second based exactly on how much power you use.",
      "What does the command 'git clone' do?": "Downloads a full copy of a remote repository to your local machine.",
      "What does the command 'git pull' do?": "Downloads the latest changes from the remote repository to your local machine.",
      "What is a 'merge conflict'?": "When two developers change the exact same line of code and Git doesn't know which one to keep.",
      "Why is it important to write descriptive commit messages?": "So you and your team know exactly what changes were made in that specific snapshot.",
      "What is 'Web Hosting'?": "Paying a company to store your finalized web files on a server connected to the internet.",
      "What is an Operating System (OS) in the context of servers?": "The core software (like Linux or Windows) that manages the server's hardware and resources.",
      "If you rent a Virtual Machine on AWS, what model are you using?": "IaaS",
      "Why is 'The Cloud' considered a nickname?": "Because it actually refers to physical computers sitting in a warehouse.",
      "What does it mean to deploy a website?": "To move the files from a local, private environment into a public, live production environment.",
      "What is the primary advantage of working on a 'Branch'?": "It allows you to experiment and make mistakes without breaking the main, working version of the project.",
      "If your startup suddenly goes viral on TikTok, which cloud feature saves you from going bankrupt after the viral spike ends?": "Elasticity (scaling down)",
      "What is the 'Main' or 'Master' branch?": "The default, definitive timeline of your project's code.",
      "How does version control act as a 'time machine'?": "It allows you to instantly rewind your project back to a previous, working commit if you break something.",
      "Why do companies use a Hybrid Cloud?": "To keep sensitive data locked in a Private Cloud while running public websites on a cheaper Public Cloud.",
      "Which tool do you install on your local computer to track version history?": "Git",

      // CHAPTER 14: The Manager (Expanded Pre-Assessment Key)
      "What does CMS stand for?": "Content Management System",
      "Which platform represents the 'Owner' model where you download free software and host it yourself?": "WordPress.org",
      "What is the WordPress 'Dashboard'?": "The private back-end mission control for the website.",
      "What controls the 'Look' or visual design of a WordPress site?": "A Theme",
      "What is used to add new functionality (like a store or contact form) to a WordPress site?": "A Plugin",
      "What is a WordPress 'Post'?": "A timely, reverse-chronological news article or blog update.",
      "What is a WordPress 'Page'?": "Timeless, permanent information like an 'About Us' section.",
      "What is the modern default WordPress editor called?": "The Block Editor (Gutenberg)",
      "What programming language powers the logic and templates of WordPress?": "PHP",
      "What is the primary risk of installing too many WordPress plugins?": "They can slow down the site, cause conflicts, and create security vulnerabilities.",
      "Which user role has absolute total control over every aspect of a WordPress site?": "Administrator",
      "How can you tell if a piece of software is truly a CMS?": "It separates the content creation from the code structure and design.",
      "What is the primary disadvantage of a 'No-Code' builder like Wix?": "Vendor lock-in: you do not own the code and cannot easily move your site to a different hosting provider.",
      "What is the purpose of the 'Permalink' setting?": "To control the structure of the URL (e.g., making it /about-us instead of /?p=123) for better SEO and readability.",
      "Before updating the WordPress core or installing a major plugin, what is the single most important action a professional developer must take?": "Perform a complete database and file Backup.",
      "What is the primary difference between a builder and a manager in web design?": "Managers use a pre-built CMS to post content quickly without coding from scratch.",
      "Which platform represents the 'Rental' model where the hosting company manages everything for you?": "WordPress.com",
      "What is the Media Library in a CMS?": "The digital warehouse where all uploaded photos and videos are stored.",
      "How do you typically access the hidden back-end login screen of a standard WordPress site?": "Adding /wp-admin to the URL",
      "Which piece of content relies heavily on Categories and Tags for searching?": "Posts",
      "How does the Block Editor handle content?": "Every paragraph, image, or video is its own movable block.",
      "Where do you find the button to add new elements in the Block Editor?": "The '+' Icon",
      "If the Block Editor doesn't have a specific visual feature you need, how can you write code directly?": "Use a 'Custom HTML Block'.",
      "What is a 'Featured Image'?": "The main thumbnail people see when the post is shared on social media.",
      "In the 'Smartphone' analogy, what do WordPress Plugins represent?": "The apps you download to give the phone new powers.",
      "What happens to your blog posts if you switch to a completely different WordPress Theme?": "The design changes, but the text and posts remain perfectly intact.",
      "Why is WordPress.org the professional standard over website builders like Wix?": "Total freedom and ownership of every line of code.",
      "Which of the following is NOT a popular Content Management System?": "Photoshop",
      "What does it mean that WordPress is 'Open-Source'?": "The source code is free and available for anyone to inspect, modify, and enhance.",
      "Why might 'Manager Mike' prefer a CMS over hand-coding HTML?": "He wants to log in, write a headline, and publish quickly without touching code.",
      "When you change the 'Site Title' in WordPress General Settings, what happens?": "The browser tab and site header update instantly across the entire site.",
      "If you want to create a 'Contact Us' section that lives in your main menu, should you use a Post or a Page?": "Page",
      "If you want to announce a weekend sale that expires on Sunday, should you use a Post or a Page?": "Post",
      "What is a 'Widget' in the context of a CMS?": "A small block that performs a specific function, often placed in sidebars or footers (like a search bar or calendar).",
      "What is the difference between a 'Draft' and a 'Published' post?": "Drafts are saved in the back-end but hidden from the public; Published posts are live.",

      // --- CHAPTER 15 DIAGNOSTIC KEY (The Network) ---
      "What is the primary role of an API in the 'Waiter' analogy?": "The Messenger (Waiter) that takes your request to the kitchen and brings back data.",
      "Which HTTP method is used when you simply want to view a list of products on an e-commerce site?": "GET",
      "Which status code indicates that the request was successful and the data is attached?": "200 OK",
      "What happens if you try to use data from a fetch() request before using the 'await' keyword?": "You receive a 'Pending Promise' instead of the actual data.",
      "Which format is the modern standard for API data delivery because it looks like a JavaScript object?": "JSON",
      "What is an API 'Endpoint'?": "The specific URL address where a service or data can be accessed.",
      "If a user enters the wrong password and the server denies access, which status code is most likely returned?": "401 Unauthorized",
      "Which function is used to turn a usable JavaScript Object into a raw string of text for transmission?": "JSON.stringify()",
      "What is a 'Rate Limit' on an API?": "A restriction on how many requests a user can make in a specific time period.",
      "Why is a 'try/catch' block essential when fetching data?": "It acts as a safety net that catches network failures (like no Wi-Fi) without crashing the app.",
      "Which HTTP method is used to create a completely new user account on a server?": "POST",
      "What is a CORS error?": "A security feature where a server blocks a domain from accessing its data.",
      "What does 'Stateless' mean in the context of a REST API?": "The server does not remember anything about previous requests; each request is independent.",
      "Which technology hosts copies of media on global servers to reduce lag for users?": "CDN (Content Delivery Network)",
      "If you receive a 404 status code, whose 'fault' is the error according to the standards?": "The Client (The user requested something that doesn't exist).",
      "What is 'Pagination' in an API?": "Splitting a huge result set into smaller 'pages' (e.g., 20 results at a time).",
      "What acts as a digital ID badge to authenticate your application to an API provider?": "API Key",
      "Which legacy format preceded JSON but is much heavier because of its tag-based structure?": "XML",
      "What does the 'CRUD' acronym stand for?": "Create, Read, Update, Delete",
      "Which JavaScript keyword tells a function that it is allowed to 'pause' while waiting for a network request?": "async",
      "What is a 'Webhook'?": "An automated message sent from one app to another triggered by a specific event.",
      "When using fetch(), which boolean property do you check to see if the response was in the 200-range?": "response.ok",
      "Which status code means 'Forbidden' (You are logged in, but not allowed to see this specific data)?": "403",
      "What is the 'Payload' of a POST request?": "The actual data being sent to the server.",
      "To display an image from a JSON object, you must inject the URL into which HTML attribute?": "src",
      "Which HTTP method is used to change a user's existing email address in a database?": "PUT/PATCH",
      
      // Chapter 17
      "Which of the following best describes a Single Page Application (SPA)?": "A web app that loads a single HTML page and dynamically updates as the user interacts.",
      "When a developer uses a 'Framework' like React or Vue, what is the primary benefit?": "It provides pre-written code and components to speed up development.",
      "What is the primary role of an API Key?": "To identify and authenticate the calling program to the API service.",
      "Which HTTP method is typically used to 'fetch' or 'retrieve' data from an API?": "GET",
      "Data from an API is typically delivered in this key-value text format:": "JSON",
      "The 'Internet of Things' (IoT) relies heavily on which hardware to collect information?": "Sensors",
      "What is a major security concern regarding mass-produced IoT devices?": "Weak default passwords.",
      "Which AI application is most likely used to filter spam emails?": "Pattern Recognition",
      "What acts as the architectural visual blueprint before any code is written?": "A Wireframe",
      "Multi-Factor Authentication (MFA) requires:": "Two or more proofs of identity.",
      "Designing for Voice interfaces like Alexa is known as:": "VUI (Voice User Interface)",
      "An HTTP status code of 404 indicates:": "Not Found",
      "Which subset of AI improves systems through exposure to datasets?": "Machine Learning",
      "A 'Full Stack Developer' works on:": "Both Front-End and Back-End",
      "Augmented Reality (AR) works by:": "Overlaying digital graphics onto the physical world."
];

// 3. SERVER-SIDE GRADING
$score = 0;
$totalQuestions = isset($data['total']) ? (int)$data['total'] : 0;
if (isset($data['answers']) && is_array($data['answers'])) {
    foreach ($data['answers'] as $ans) {
        $qText = trim($ans['question']);
        $studentAnswer = trim($ans['selected']);
        if (isset($masterKey[$qText]) && $masterKey[$qText] === $studentAnswer) { $score++; }
    }
}
$percentageNum = ($totalQuestions > 0) ? round(($score / $totalQuestions) * 100) : 0;
$percentageStr = $percentageNum . "%";

date_default_timezone_set('America/Los_Angeles'); 
$timestamp = date('Y-m-d H:i:s');

// 4. SAVE TO DATABASE (Force Notes to N/A)
$notes = "N/A";
$stmt = $conn->prepare("INSERT INTO pre_assessment_results (timestamp, lastName, firstName, studentClass, chapter, score, total, percentage, notesUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssiiss", $timestamp, $data['lastName'], $data['firstName'], $data['studentClass'], $data['chapter'], $score, $totalQuestions, $percentageStr, $notes);

if ($stmt->execute()) {
    echo json_encode(["result" => "success", "score" => $score, "total" => $totalQuestions, "percentage" => $percentageNum]);
} else {
    http_response_code(200);
    echo json_encode(["result" => "error", "message" => "Save Failed: " . $stmt->error]);
}
$stmt->close();
$conn->close();
?>