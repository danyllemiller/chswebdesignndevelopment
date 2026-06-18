/**
 * CHAPTER 12: THE MANAGER (CMS & WordPress)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: CMS BASICS ---
        { cat: "CMS Basics", val: 100, q: "Software that allows users to manage digital content without writing code.", a: "CMS", d: ["IDE", "Operating System", "FTP Client"] },
        { cat: "CMS Basics", val: 100, q: "What 'CMS' stands for in web design.", a: "Content Management System", d: ["Code Management Software", "Cloud Media Server", "Computer Management Site"] },
        { cat: "CMS Basics", val: 100, q: "A CMS requires this type of storage to save all text, user accounts, and settings.", a: "Database", d: ["Floppy Disk", "PDF File", "Thin Air"] },

        { cat: "CMS Basics", val: 200, q: "Visual builders in a CMS that allow design entirely using a mouse.", a: "Drag and Drop", d: ["Line by Line", "Binary Coding", "Manual Parsing"] },
        { cat: "CMS Basics", val: 200, q: "The admin dashboard where you manage content and settings is known as this.", a: "Back-End", d: ["Front-End", "Footer", "Root Folder"] },
        { cat: "CMS Basics", val: 200, q: "The output shown in the user's browser that the public sees.", a: "Front-End", d: ["Back-End", "Server Room", "Logic Gate"] },

        { cat: "CMS Basics", val: 300, q: "The company behind the WordPress.com hosting service.", a: "Automattic", d: ["Microsoft", "Google", "Adobe"] },
        { cat: "CMS Basics", val: 300, q: "Software whose source code is public and free to modify by the community.", a: "Open Source", d: ["Proprietary", "Encrypted", "Closed Source"] },
        { cat: "CMS Basics", val: 300, q: "The main language used to build the WordPress software.", a: "PHP", d: ["Python", "Java", "C++"] },

        { cat: "CMS Basics", val: 400, q: "A CMS that has a back-end but uses APIs to send data to any custom front-end.", a: "Headless CMS", d: ["Static CMS", "Legacy CMS", "Ghost CMS"] },
        { cat: "CMS Basics", val: 400, q: "The standard relational database used by most CMS platforms like WordPress.", a: "MySQL", d: ["MongoDB", "Excel", "Firebase"] },
        { cat: "CMS Basics", val: 400, q: "Running a CMS on your own private or rented server space.", a: "Self-Hosted", d: ["Cloud-Hosted", "SaaS", "Localhost"] },

        { cat: "CMS Basics", val: 500, q: "This term refers to the static, permanent URL assigned to a specific page.", a: "Permalink", d: ["Temp-link", "Redirect", "Subdomain"] },
        { cat: "CMS Basics", val: 500, q: "A review of all CMS data to ensure information is accurate and up to date.", a: "Content Audit", d: ["Tax Audit", "Code Review", "Link Check"] },
        { cat: "CMS Basics", val: 500, q: "Updating a CMS regularly is vital for this specific reason.", a: "Security", d: ["Adding more logos", "Lowering costs", "Better fonts"] },

        // --- CATEGORY: WORDPRESS ---
        { cat: "WordPress", val: 100, q: "The most popular content management system in the world.", a: "WordPress", d: ["Wix", "Shopify", "Joomla"] },
        { cat: "WordPress", val: 100, q: "The name of the modern WordPress block editor.", a: "Gutenberg", d: ["Classic Editor", "TinyMCE", "Elementor"] },
        { cat: "WordPress", val: 100, q: "Is WordPress.org the self-hosted or cloud-hosted version?", a: "Self-Hosted", d: ["Cloud-Hosted", "Free-only", "Blog-only"] },

        { cat: "WordPress", val: 200, q: "The first screen you see after logging into the WordPress admin area.", a: "Dashboard", d: ["Homepage", "Profile", "Settings"] },
        { cat: "WordPress", val: 200, q: "Dynamic, time-based content usually found in a blog.", a: "Post", d: ["Page", "Widget", "Plugin"] },
        { cat: "WordPress", val: 200, q: "Static content like an 'About Us' or 'Contact' section.", a: "Page", d: ["Post", "Story", "Update"] },

        { cat: "WordPress", val: 300, q: "The taxonomy used for broad grouping of related posts.", a: "Category", d: ["Tag", "Slug", "Widget"] },
        { cat: "WordPress", val: 300, q: "Keywords used for specific, detailed labels on content.", a: "Tags", d: ["Categories", "Shortcodes", "Plugins"] },
        { cat: "WordPress", val: 300, q: "A way to see and restore previous versions of a WordPress page.", a: "Revisions", d: ["Backups", "Drafts", "History"] },

        { cat: "WordPress", val: 400, q: "A small code bracket like [gallery] used to add features inside a post.", a: "Shortcode", d: ["Mini-code", "Tag-code", "Script-code"] },
        { cat: "WordPress", val: 400, q: "The central hub used to store all uploaded images and videos.", a: "Media Library", d: ["File Folder", "Photo Hub", "Data Center"] },
        { cat: "WordPress", val: 400, q: "A WordPress plugin that turns a site into a social network.", a: "BuddyPress", d: ["WooCommerce", "Jetpack", "Akismet"] },

        { cat: "WordPress", val: 500, q: "A theme that inherits styles from another but allows safe customization.", a: "Child Theme", d: ["Baby Theme", "Sub Theme", "Skin Theme"] },
        { cat: "WordPress", val: 500, q: "The standardRelational Database language WordPress uses to talk to MySQL.", a: "SQL", d: ["PHP", "JavaScript", "HTML"] },
        { cat: "WordPress", val: 500, q: "The specific PHP file that usually defines the layout of a WordPress theme.", a: "index.php", d: ["style.css", "header.html", "script.js"] },

        // --- CATEGORY: THEMES & PLUGINS ---
        { cat: "Themes & Plugins", val: 100, q: "An add-on that extends the core functionality of a CMS.", a: "Plugin", d: ["Extension", "Widget", "Tool"] },
        { cat: "Themes & Plugins", val: 100, q: "The software component that controls the visual appearance of a CMS.", a: "Theme", d: ["Plugin", "Widget", "Dashboard"] },
        { cat: "Themes & Plugins", val: 100, q: "Should you keep unused plugins installed on your site?", a: "No", d: ["Yes, for luck", "Yes, they are free", "Only if deactivated"] },

        { cat: "Themes & Plugins", val: 200, q: "A small, modular UI component often found in sidebars or footers.", a: "Widget", d: ["Plugin", "Block", "Snippet"] },
        { cat: "Themes & Plugins", val: 200, q: "Which property allows you to change CMS colors manually using code?", a: "CSS", d: ["HTML", "SQL", "PHP"] },
        { cat: "Themes & Plugins", val: 200, q: "Can a plugin affect the loading speed of your website?", a: "Yes", d: ["No, they are weightless", "Only on mobile", "Only if expensive"] },

        { cat: "Themes & Plugins", val: 300, q: "The block editor system uses these individual units to build pages.", a: "Blocks", d: ["Cells", "Divs", "Frames"] },
        { cat: "Themes & Plugins", val: 300, q: "A theme that automatically adjusts its layout for mobile phones.", a: "Responsive Theme", d: ["Static Theme", "Smart Theme", "Fluid Theme"] },
        { cat: "Themes & Plugins", val: 300, q: "This type of plugin helps manage page titles and meta descriptions.", a: "SEO Plugin", d: ["Security Plugin", "Speed Plugin", "Design Plugin"] },

        { cat: "Themes & Plugins", val: 400, q: "The popular WordPress plugin used to add ecommerce functionality.", a: "WooCommerce", d: ["Shopify", "Etsy", "BuddyPress"] },
        { cat: "Themes & Plugins", val: 400, q: "The popular WordPress plugin used for adding complex forums.", a: "bbPress", d: ["BuddyPress", "Jetpack", "Akismet"] },
        { cat: "Themes & Plugins", val: 400, q: "Which type of plugin prevents comment spam?", a: "Akismet", d: ["Yoast", "Wordfence", "Elementor"] },

        { cat: "Themes & Plugins", val: 500, q: "A CMS plugin used to host and distribute podcast RSS feeds.", a: "PowerPress", d: ["AudioPress", "SpotifyBox", "PodHub"] },
        { cat: "Themes & Plugins", val: 500, q: "The main security plugin often used to protect WordPress sites.", a: "Wordfence", d: ["Yoast", "WooCommerce", "Jetpack"] },
        { cat: "Themes & Plugins", val: 500, q: "The file extension for a theme or plugin folder when uploading to WordPress.", a: ".zip", d: [".exe", ".dmg", ".html"] },

        // --- CATEGORY: PLATFORMS ---
        { cat: "Platforms", val: 100, q: "A cloud-based ecommerce platform specifically for online stores.", a: "Shopify", d: ["Wix", "Joomla", "Drupal"] },
        { cat: "Platforms", val: 100, q: "A design-heavy SaaS website builder popular with artists.", a: "Squarespace", d: ["WordPress", "Magento", "Ghost"] },
        { cat: "Platforms", val: 100, q: "What 'SaaS' stands for in cloud computing.", a: "Software as a Service", d: ["System as a Server", "Standard as a Service", "Static as a Script"] },

        { cat: "Platforms", val: 200, q: "A website builder known for its 'unstructured' drag-and-drop editor.", a: "Wix", d: ["WordPress", "Drupal", "Joomla"] },
        { cat: "Platforms", val: 200, q: "A complex, robust CMS often used by high-security government sites.", a: "Drupal", d: ["Wix", "Ghost", "Shopify"] },
        { cat: "Platforms", val: 200, q: "The platform used by the White House (at one point) for its security.", a: "Drupal", d: ["Joomla", "WordPress", "Squarespace"] },

        { cat: "Platforms", val: 300, q: "A fast, professional CMS platform focused primarily on blogging.", a: "Ghost", d: ["Shopify", "Magento", "Drupal"] },
        { cat: "Platforms", val: 300, q: "A flexible, middle-ground open-source CMS between WordPress and Drupal.", a: "Joomla", d: ["Squarespace", "Wix", "Joomla"] },
        { cat: "Platforms", val: 300, q: "Is 'Squarespace' considered an open-source platform?", a: "No", d: ["Yes", "Only for students", "Only for business"] },

        { cat: "Platforms", val: 400, q: "A powerful CMS platform specifically for large-scale enterprise ecommerce.", a: "Magento", d: ["Shopify", "WooCommerce", "Wix"] },
        { cat: "Platforms", val: 400, q: "The core difference between a Static Site Generator and a CMS.", a: "SSGs build files ahead of time", d: ["CMS uses no database", "SSGs are for phones only", "They are identical"] },
        { cat: "Platforms", val: 400, q: "Which platform 'owns' your content more strictly due to its proprietary nature?", a: "Wix", d: ["WordPress", "Drupal", "Ghost"] },

        { cat: "Platforms", val: 500, q: "A tool used to set up a 'Local Server' for CMS development on a PC.", a: "LocalWP / XAMPP", d: ["GitHub", "FileZilla", "VS Code"] },
        { cat: "Platforms", val: 500, q: "A lightweight text-formatting language supported by many modern CMS editors.", a: "Markdown", d: ["HTML", "XML", "SQL"] },
        { cat: "Platforms", val: 500, q: "The main benefit of a Headless CMS approach.", a: "Separation of data and design", d: ["Faster database speeds", "Free hosting", "Automatic SEO"] },

        // --- CATEGORY: ROLES & SEO ---
        { cat: "Roles & SEO", val: 100, q: "A CMS user role with full control over all settings and users.", a: "Administrator", d: ["Editor", "Author", "Subscriber"] },
        { cat: "Roles & SEO", val: 100, q: "A CMS user role that can publish and manage any user's posts.", a: "Editor", d: ["Contributor", "Author", "Admin"] },
        { cat: "Roles & SEO", val: 100, q: "A CMS role that can only manage their own profile.", a: "Subscriber", d: ["Contributor", "Author", "Editor"] },

        { cat: "Roles & SEO", val: 200, q: "Information that appears in search results like page titles and descriptions.", a: "Metadata", d: ["Microdata", "Headers", "Sitemaps"] },
        { cat: "Roles & SEO", val: 200, q: "Does SEO work differently on a CMS than on a custom site?", a: "No, principles are same", d: ["Yes, Google blocks CMS", "Yes, CMS is always rank 1", "CMS doesn't use SEO"] },
        { cat: "Roles & SEO", val: 200, q: "A file that tells Google about every page on your CMS site.", a: "Sitemap", d: ["Robots.txt", "Config.php", "Log.txt"] },

        { cat: "Roles & SEO", val: 300, q: "The process of managing multiple users with specific permissions.", a: "User Management", d: ["Authentication", "Versioning", "Curation"] },
        { cat: "Roles & SEO", val: 300, q: "Tracking visitor behavior on your CMS by pasting a tracking code.", a: "Analytics", d: ["Metadata", "Social Media", "Debugging"] },
        { cat: "Roles & SEO", val: 300, q: "Content stored in the database stays safe when you change this.", a: "Theme", d: ["Database", "Hosting", "Admin account"] },

        { cat: "Roles & SEO", val: 400, q: "Creating a custom section in a CMS for things like 'Movies' or 'Books'.", a: "Custom Post Type", d: ["Page", "Widget", "Category"] },
        { cat: "Roles & SEO", val: 400, q: "The practice of scheduling a post to go live at a future date.", a: "Scheduled Publishing", d: ["Deferred Loading", "Lazy Posting", "Async Content"] },
        { cat: "Roles & SEO", val: 400, q: "Translating a CMS site into multiple languages using a plugin.", a: "Multilingual", d: ["Bilingual", "Hyper-local", "Globalized"] },

        { cat: "Roles & SEO", val: 500, q: "An internal, private network for a specific group powered by a CMS.", a: "Intranet", d: ["Extranet", "Internet", "Localhost"] },
        { cat: "Roles & SEO", val: 500, q: "Ensuring a CMS matches a company's look and feel.", a: "Branding", d: ["Formatting", "Curation", "Validation"] },
        { cat: "Roles & SEO", val: 500, q: "The standard version number assigned to a software release.", a: "Version", d: ["Edition", "Batch", "Serial"] }
    ].map(item => ({ ...item, chapter: "Chapter 12", grade: "Web Design 2" })));
