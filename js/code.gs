/**
 * GOOGLE APPS SCRIPT: CS INTERACTIVE GRADER
 * Handles: Chapter 1 & Chapter 2 (Pre-Test & Summative)
 * Columns (10): Timestamp, Email/ID, Last Name, First Name, Class, Chapter, Score, Total, %, Notes URL
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mainSheet = ss.getSheets()[0]; 
    const sheet = mainSheet; // Alias for sorting
    
    // SUPER-CLEANER
    const clean = (str) => {
      if (!str) return "";
      let s = str.toString().toLowerCase()
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&amp;/g, '&')
                 .replace(/&quot;/g, '"')
                 .replace(/&#039;/g, "'");
      return s.replace(/[\s"“”'‘’`.,!?*-]/g, '');
    };

    const now = new Date();
    // --- 1. SUMMATIVE MASTER KEY WITH HINTS ---
    const masterKey = {
      // CHAPTER 1: THE DEVELOPER'S WORLD (Infrastructure, Professionalism & Ethics)
  
  // 1. Federal Law
  "Your chapter wants to attend the SkillsUSA National Conference, but you need funding. Which federal law provides specific financial support for CTE equipment and training?": {
    answer: "The Carl D. Perkins Law",
    hint: "It is the primary federal funding source for Career and Technical Education programs."
  },
  "Which piece of legislation ensures that high school labs are stocked with industry-standard hardware for technical training?": {
    answer: "The Carl D. Perkins Law",
    hint: "Named after a congressman, this law is the backbone of CTE funding."
  },

  // 2. Parliamentary Procedure
  "Sarah wants the Guild to design a website for a local shelter. According to Parliamentary Procedure, what is the correct first step she must take?": {
    answer: "She must stand and say 'I move that we design a website...' so someone can second it.",
    hint: "Think about how formal business is introduced in a meeting."
  },
  "In a professional meeting, if you want the group to take action on an idea, you must formally introduce a:": {
    answer: "Motion",
    hint: "You start by saying 'I move that...'"
  },
  "If your SkillsUSA chapter has 30 members but only 5 show up, you cannot hold an official vote because you lack a:": {
    answer: "Quorum",
    hint: "The minimum number of members needed to conduct official business."
  },
  "In Parliamentary Procedure, what must happen immediately after a motion is made before it can be discussed?": {
    answer: "Someone must second the motion.",
    hint: "This proves that at least two people want to talk about the idea."
  },
  "A temporary 'Strike Team' formed to handle a specific, short-term task is known as a:": {
    answer: "Committee",
    hint: "These are smaller groups assigned to a specific job within the Guild."
  },

  // 3. Career Roles
  "Which highly-paid tech role is responsible for building the 'engine room'—including servers, databases, and security logic?": {
    answer: "Back-End Developer",
    hint: "This role works behind the scenes on logic and data storage."
  },
  "Which career role focuses primarily on visual aesthetics and user psychology to create a frictionless journey?": {
    answer: "UI/UX Designer",
    hint: "This role balances the User Interface and the User Experience."
  },
  "What do you call an elite developer who has mastered both the Front-End interface and the Back-End database architecture?": {
    answer: "Full-Stack Developer",
    hint: "They work on the 'full' pile of technologies from the browser down to the server."
  },
  "A developer who is paid to find glitches, test edge cases, and try to break software before launch is a:": {
    answer: "Quality Assurance (QA) Tester",
    hint: "They are the 'Bug Hunters' of the development team."
  },
  "On a dev team, the person acting as the bridge between the client's needs and the programmers' schedule is the:": {
    answer: "Project Manager",
    hint: "They manage the timeline, budget, and team communication."
  },

  // 4. Soft Skills & Interviewing
  "Using the STAR method to answer interview questions, which part is missing if you explain the problem but never explain the positive outcome?": {
    answer: "The Result",
    hint: "STAR stands for Situation, Task, Action, and [?]."
  },
  "Which 'Soft Skill' is best defined as the ability to understand and share the feelings of the end-user?": {
    answer: "Empathy",
    hint: "Crucial for UX designers and teamwork."
  },
  "A professional 1-page document summarizing your technical skills, WBL experience, and community service is a:": {
    answer: "Resume",
    hint: "Your primary marketing tool when applying for a tech job."
  },
  "Which interviewing technique helps you structure a story about a time you solved a technical problem?": {
    answer: "The STAR Method",
    hint: "Situation, Task, Action, Result."
  },

  // 5. Internet Infrastructure
  "What is the fundamental difference between the Internet and the World Wide Web?": {
    answer: "The Internet is the physical infrastructure; the Web is a software service running on it.",
    hint: "One is the highway system, and the other is the cars/traffic."
  },
  "Who is credited with inventing the World Wide Web in 1989?": {
    answer: "Tim Berners-Lee",
    hint: "He was a physicist at CERN who proposed a global information management system."
  },
  "A restricted, internal network only for members of a specific organization is called an:": {
    answer: "Intranet",
    hint: "It's like a private version of the Internet for a company or school."
  },
  "What is the physical network of cables, routers, and servers connecting the globe called?": {
    answer: "The Internet",
    hint: "It is the physical 'hardware' foundation."
  },

  // 6. DNS & Protocols
  "What is the 'phone book' of the internet that translates human-readable domain names into numerical IP addresses?": {
    answer: "DNS (Domain Name System)",
    hint: "A three-letter acronym for the system that maps names like google.com to IP addresses."
  },
  "What is an IP Address?": {
    answer: "A unique numerical coordinate assigned to every device on a network.",
    hint: "Think of it as the 'GPS coordinates' for a computer."
  },
  "What cryptographic mechanism does a website need to establish a secure, encrypted HTTPS connection?": {
    answer: "An SSL Certificate",
    hint: "This digital ID card provides the 'Secure' part of the protocol."
  },
  "Which global non-profit organization manages the rules for Domain Name registrars?": {
    answer: "ICANN",
    hint: "Internet Corporation for Assigned Names and Numbers."
  },

  // 7. Cloud Concepts
  "Which cloud hosting model is like 'Take-and-Bake' pizza, where you rent raw hardware but configure the OS yourself?": {
    answer: "IaaS (Infrastructure as a Service)",
    hint: "You are responsible for everything above the raw hardware level."
  },
  "What is the primary purpose of a CDN (Content Delivery Network)?": {
    answer: "It stores copies of static files on global edge servers to speed up loading times.",
    hint: "It reduces the physical distance between the data and the user."
  },
  "According to the Agile Project Triangle, every project balances Time, Cost, and Quality. What is the golden rule?": {
    answer: "You can only pick TWO.",
    hint: "If you want it fast and cheap, it won't be good."
  },
  "The cloud's ability to automatically shrink or grow computer power based on a viral traffic spike is called:": {
    answer: "Elasticity",
    hint: "Think of a rubber band stretching to match the number of visitors."
  },

  // 8. Languages & Design
  "Which core web language is considered the 'Bones' or structural foundation of a webpage?": {
    answer: "HTML",
    hint: "It stands for HyperText Markup Language."
  },
  "Which web language provides the 'Clothes' (Style and Appearance) of a website?": {
    answer: "CSS",
    hint: "Cascading Style Sheets."
  },
  "Which web language provides the 'Brains' (Interactivity and Logic) of a website?": {
    answer: "JavaScript",
    hint: "It acts as the verbs of the code, enabling action."
  },
  "Arranging elements on a page by size and color so the user's eye is naturally guided to the most important information first is known as:": {
    answer: "Visual Hierarchy",
    hint: "It directs optical attention according to importance."
  },
  "The design principle of leaving 'Breathing Room' or empty space around elements to improve readability is:": {
    answer: "White Space",
    hint: "Also known as negative space."
  },

  // 9. File Rules
  "What is the mandatory, non-negotiable filename for the homepage of a professional website?": {
    answer: "index.html",
    hint: "Servers are programmed to look for this specific file as the entry point."
  },
  "Why must web developers NEVER use spaces in their file or folder names?": {
    answer: "Because web servers process spaces as broken characters; developers must use hyphens.",
    hint: "Use hyphens (-) or underscores (_) to separate words to avoid URL errors."
  },
  "What naming convention uses a lowercase first letter and capitalizes subsequent words (e.g., userName)?": {
    answer: "camelCase",
    hint: "It is the standard naming convention for JavaScript variables."
  },
  "On a Linux-based web server, 'About-us.html' and 'about-us.html' are considered:": {
    answer: "Two different files because servers are case-sensitive.",
    hint: "Always use all-lowercase to avoid broken links."
  },

  // 10. Legal & Ethics
  "What principle states that designing for marginalized users makes the web better for everyone?": {
    answer: "The Curb Cut Effect",
    hint: "Named after sidewalk ramps that help wheelchairs and strollers alike."
  },
  "What is the industry term for deceptive UI tricks designed to manipulate users into clicking things they did not intend to?": {
    answer: "Dark Patterns",
    hint: "These are highly unethical design choices used to trap users."
  },
  "The legal contract professionals sign to protect a company's Trade Secrets is called an:": {
    answer: "NDA (Non-Disclosure Agreement)",
    hint: "It establishes a legally binding confidential relationship."
  },
  "Automatic legal protection for original creative works (like code, photos, or text) is called:": {
    answer: "Copyright",
    hint: "It exists the moment the work is created in a tangible form."
  },
  "Which license allows you to share your work legally while still keeping your copyright?": {
    answer: "Creative Commons",
    hint: "Look for the CC icons on sites like Unsplash or Flickr."
  },

  // 11. Workflow & Debugging
  "Which debugging technique involves a developer articulating their code line-by-line to an inanimate object?": {
    answer: "Rubber Duck Debugging",
    hint: "Explaining it out loud often reveals your own logical fallacies."
  },
  "The 'Open Web' philosophy, stating the web should be a public resource for all, is protected by the:": {
    answer: "W3C (World Wide Web Consortium)",
    hint: "The international community that develops web standards."
  },
  "A version of a product with just enough features to be usable by early customers for feedback is a:": {
    answer: "Minimum Viable Product (MVP)",
    hint: "Focuses on the core value without extra 'bells and whistles'."
  },
  "The iterative project management system used to build software in small steps called Sprints is:": {
    answer: "Agile",
    hint: "This methodology values flexibility over rigid planning."
  },

  // 12. Miscellaneous Variations
  "What does the acronym CTSO stand for?": {
    answer: "Career and Technical Student Organization",
    hint: "Organizations like SkillsUSA that offer technical competitions."
  },
  "In the 'Client-Server' model, which device initiates the request for a webpage?": {
    answer: "The Client (The Browser)",
    hint: "Your computer is the one asking for the data."
  },
  "What part of a URL represents the folder structure on the server (e.g., /products/shoes)?": {
    answer: "The Path",
    hint: "It follows the domain name and points to a specific location."
  },
  "The '.org' or '.gov' part of a domain name is officially known as the:": {
    answer: "TLD (Top-Level Domain)",
    hint: "It classifies the type of entity owning the address."
  },
  "What is 'Spamdexing'?": {
    answer: "Unethical SEO techniques like keyword stuffing to trick search engines.",
    hint: "A combination of 'spam' and 'indexing'."
  },
  "A developer who organizes their code using professional naming and clear structure is showing:": {
    answer: "Professional Decorum",
    hint: "One of the key Workplace Readiness Skills."
  },

      // CHAPTER 2: The Rules
      "The moment you create an original piece of code or take a photo, what legal shield automatically applies?": {
        answer: "Copyright",
        hint: "It protects original works of authorship the moment they are fixed in a tangible form."
      },
      "What does the symbol '™' represent?": {
        answer: "Trademark (Brand identity)",
        hint: "This protects things like brand names, logos, and slogans."
      },
      "Which type of intellectual property is NOT automatic and must be applied for and granted by the government?": {
        answer: "Patent",
        hint: "This legal protection for inventions usually lasts for about 20 years."
      },
      "What is 'Work Made for Hire'?": {
        answer: "A contract where your employer owns the copyright to everything you build while working for them.",
        hint: "In this scenario, the company is the legal 'author' of the code you write on the clock."
      },
      "Which Creative Commons license requirement means 'You must give credit to the original creator'?": {
        answer: "Attribution (BY)",
        hint: "Think of the two-letter code that essentially means 'Created BY [Name]'."
      },
      "If a license is marked 'NC', can you use that asset on a website that sells products?": {
        answer: "No, NC means NonCommercial use only.",
        hint: "The 'C' stands for Commercial; the 'N' stands for No."
      },
      "What does the 'ND' requirement in a CC license prohibit?": {
        answer: "Editing, cropping, or filtering the work (No Derivatives).",
        hint: "You cannot make a 'Derivative' work or change the original in any way."
      },
      "Work that has no copyright protection and is free for anyone to use without permission belongs to the:": {
        answer: "Public Domain",
        hint: "It's like a public park; it belongs to everyone."
      },
      "What is the 'Digital Footprint'?": {
        answer: "A permanent record of every activity, search, and comment a user makes online.",
        hint: "Think of the trail of data you leave behind every time you use the internet."
      },
      "What does PII stand for in the context of user privacy?": {
        answer: "Personally Identifiable Information",
        hint: "Information that can be used on its own or with other info to identify a specific person."
      },
      "What is an 'Invasion of Privacy' in web development?": {
        answer: "Collecting or sharing a user's personal data without their consent.",
        hint: "It involves taking a user's data without asking first."
      },
      "HTTP is like sending a ____________, while HTTPS is like sending a sealed armored letter.": {
        answer: "Postcard",
        hint: "Think of something that anyone who touches it can easily read."
      },
      "What technology provides the 's' in HTTPS and the padlock icon in the browser?": {
        answer: "SSL/TLS Certificate",
        hint: "It stands for Secure Sockets Layer; it's the digital passport for a secure site."
      },
      "How many steps are typically involved in the SSL/TLS Handshake?": {
        answer: "8",
        hint: "It's a specific even number of 'greetings' between the client and the server."
      },
      "What is a 'Certificate Authority' (CA)?": {
        answer: "A trusted third party that verifies a website is who they say they are.",
        hint: "Like a notary or a government office that issues ID cards for websites."
      },
      "The European privacy law that uses an 'OPT-IN' model for data collection is:": {
        answer: "GDPR",
        hint: "A four-letter acronym for the most famous data privacy regulation in the EU."
      },
      "The Nevada privacy law SB220 uses which model for the sale of consumer data?": {
        answer: "Opt-Out",
        hint: "Users must specifically tell the company to STOP selling their data."
      },
      "What does 'Privacy by Design' mean?": {
        answer: "Building data protection into the technology from the very start of development.",
        hint: "Security isn't an afterthought; it's planned from day one."
      },
      "What does 'a11y' stand for?": {
        answer: "Accessibility",
        hint: "Count the letters between the 'A' and the 'y' in the full word."
      },
      "Which federal law makes web accessibility a legal requirement for public businesses?": {
        answer: "ADA (Americans with Disabilities Act)",
        hint: "The primary civil rights law for people with disabilities in the US."
      },
      "What is the global standard for web accessibility guidelines?": {
        answer: "WCAG (Web Content Accessibility Guidelines)",
        hint: "The acronym for the international standards set by the W3C."
      },
      "Which WCAG compliance level is the standard target for most legal and professional sites?": {
        answer: "Level AA",
        hint: "It's the middle tier of compliance (A, ?, AAA)."
      },
      "In the 'POUR' principles, what does the 'P' stand for?": {
        answer: "Perceivable",
        hint: "Information and UI components must be presentable to users in ways they can 'perceive'."
      },
      "Which principle ensures that a user can navigate your entire site using only a keyboard?": {
        answer: "Operable",
        hint: "Users must be able to 'operate' the interface."
      },
      "Why is 'Alt Text' required for images?": {
        answer: "So screen readers can describe the image to visually impaired users.",
        hint: "It provides a text-based 'alternative' to the visual data."
      },
      "What is the minimum required color contrast ratio for normal text under WCAG standards?": {
        answer: "4.5:1",
        hint: "It's a ratio involving the numbers 4 and 5."
      },
      "What happens if you use light gray text on a white background?": {
        answer: "It fails accessibility contrast requirements and is unreadable for many users.",
        hint: "The difference in brightness is too low for the human eye to distinguish comfortably."
      },
      "The 'Curb Cut Effect' refers to:": {
        answer: "Designing for marginalized users, which often improves the experience for everyone.",
        hint: "Think about how sidewalk ramps help both wheelchairs and strollers."
      },
      "What is an 'NDA'?": {
        answer: "Non-Disclosure Agreement",
        hint: "A legal contract to ensure you don't 'disclose' secrets."
      },
      "What are 'Trade Secrets'?": {
        answer: "Proprietary information that gives a business a competitive edge (like code logic).",
        hint: "Information that is kept 'secret' to maintain a 'trade' advantage."
      },
      "How long can a developer be legally required to keep a Trade Secret confidential after leaving a job?": {
        answer: "Indefinitely",
        hint: "Unlike patents, these secrets are protected as long as they remain secret."
      },
      "What is 'Algorithmic Bias'?": {
        answer: "When human prejudices sneak into code and cause systematically prejudiced results.",
        hint: "It's when the math becomes 'biased' because of the data it was fed."
      },
      "Bias in AI systems usually originates from:": {
        answer: "The Training Dataset used to teach the model.",
        hint: "If the 'textbooks' you give the AI are biased, the AI will be too."
      },
      "What is a 'Dark Pattern' in UI design?": {
        answer: "A deceptive trick used to manipulate users into making choices they didn't intend.",
        hint: "Think of an interface designed to 'trick' you into a subscription."
      },
      "If a site makes the 'Unsubscribe' link tiny and almost invisible, it is using a:": {
        answer: "Dark Pattern",
        hint: "It's a 'shady' design choice meant to control user behavior."
      },
      "What does the 'O' in POUR stand for?": {
        answer: "Operable",
        hint: "The site must be 'workable' or..."
      },
      "What does the 'U' in POUR stand for?": {
        answer: "Understandable",
        hint: "Users must be able to comprehend the information and the operation of the interface."
      },
      "What does the 'R' in POUR stand for?": {
        answer: "Robust",
        hint: "Content must be compatible with a wide variety of user agents, including assistive technologies."
      },
      "Which IP protection lasts for about 20 years and is NOT automatic?": {
        answer: "Patent",
        hint: "You have to 'apply' for this protection for new inventions."
      },
      "If you cannot find a license for an image online, what must you assume?": {
        answer: "All rights are reserved and you cannot use it.",
        hint: "In the absence of a license, standard copyright law applies."
      },
      "What is 'Fair Use'?": {
        answer: "A limited legal defense for using copyrighted material for education or news.",
        hint: "It's a 'fair' way to use small parts of a work for teaching or reporting."
      },
      "Why is 'Hashing' better than 'Encryption' for storing passwords?": {
        answer: "It is a one-way process that can never be reversed, even if the database is stolen.",
        hint: "Encryption has a key to unlock it; this process has no 'unlock' button."
      },
      "Adding random characters to a password before hashing is called:": {
        answer: "Salting",
        hint: "Like seasoning food, you 'add' this to make the result more unique."
      },
      "Which Status Code is returned if a browser attempts to access an HTTPS site with an expired certificate?": {
        answer: "Security Warning / SSL Error",
        hint: "The browser will stop you and show a giant 'Your connection is not private' alert."
      },
      "In the 'Waiter' analogy, what does the Menu represent?": {
        answer: "The API Documentation",
        hint: "It's the list of everything you are allowed to order from the kitchen."
      },
      "Which persona from the curriculum demands 'Persistence' for high scores?": {
        answer: "Competitive Cody",
        hint: "He cares about the leaderboard and won't stop until he wins."
      },
      "Which persona prioritizes 'Page Speed' because of a spotty mobile connection?": {
        answer: "Impatient Ian",
        hint: "He's on a bus with bad Wi-Fi and 'no time' for slow sites."
      },
      "What is the primary goal of the GDPR's 'Right to be Forgotten'?": {
        answer: "To allow users to demand that a company delete all their personal data.",
        hint: "It's the legal right to have your data 'deleted' or 'erased'."
      },
      "Which technology uses 'Asymmetric Encryption' (Public/Private Keys) to start a connection?": {
        answer: "SSL/TLS",
        hint: "This is the backbone of the HTTPS handshake."
      },
      "What is 'Infringement'?": {
        answer: "The unauthorized use of someone else's intellectual property.",
        hint: "It's the legal term for 'breaking' someone's copyright or trademark."
      },
      "Why should you use Semantic HTML tags for accessibility?": {
        answer: "They tell assistive tech (screen readers) exactly what an element does.",
        hint: "Tags like <nav> or <main> provide 'Meaning' to the software."
      },
      "What is a 'Survival Clause' in an NDA?": {
        answer: "A section stating that the duty to keep secrets continues even after you leave the company.",
        hint: "The promise to keep the secret 'survives' the end of the job."
      },

      // CHAPTER 3: THE BLUEPRINT (UX Research & Information Architecture)
  
  "Which research methodology involves having a direct 1-on-1 conversation with a user to uncover emotional motivations?": {
    answer: "User Interviews",
    hint: "It is a qualitative method focused on quality over quantity."
  },
  "What is the primary objective of creating a User Persona during the blueprint phase?": {
    answer: "To synthesize research data into a relatable archetype for empathy",
    hint: "It acts as a human face for your raw survey data."
  },
  "In a SWOT analysis, a unique feature that only your company offers is categorized as a:": {
    answer: "Strength",
    hint: "S-W are internal, O-T are external."
  },
  "What do we call a market space that is 'uncontested' because you are offering features competitors currently ignore?": {
    answer: "Blue Ocean",
    hint: "Think of clear water without the 'blood' of heavy competition."
  },
  "A hierarchical, top-down diagram that represents the organization of all pages on a site is called a:": {
    answer: "Sitemap",
    hint: "It is the structural map of your site's navigation."
  },
  "Which level of wireframe fidelity provides a clean, black-and-white digital layout ready for client presentation?": {
    answer: "Mid-Fidelity (Mid-Fi)",
    hint: "It's the middle ground between a paper sketch and a mockup."
  },
  "In the MoSCoW method, which category represents features that are absolutely vital for the MVP launch?": {
    answer: "Must Have",
    hint: "These are the 'M' features that are non-negotiable."
  },
  "What is the industry-standard format for a User Story?": {
    answer: "As a [user], I want to [action] so that [goal]",
    hint: "It keeps the focus entirely on the benefit to the end-user."
  },
  "The specific 'test' conditions that prove a User Story is completed are called:": {
    answer: "Acceptance Criteria",
    hint: "These are the rules that define when a feature is truly 'done'."
  },
  "Which 5-step iterative model is used for professional project management in web design?": {
    answer: "ADDIE Model",
    hint: "Analyze, Design, Develop, Implement, Evaluate."
  },
  "In Atomic Design, which level represents a complex section of a page like a Header or Sidebar?": {
    answer: "Organism",
    hint: "It is a group of molecules working together as a section."
  },
  "Which reading pattern describes how users scan a text-heavy blog post or news article?": {
    answer: "F-Pattern",
    hint: "The scan path moves across the top and down the left margin."
  },
  "Which three components form the 'SEO Holy Trinity' for on-page optimization?": {
    answer: "Title Tag, Meta Description, H1 Tag",
    hint: "The three most important HTML tags for Google's index."
  },
  "A highly specific search phrase like 'affordable retro game shop in Carson City' is an example of a:": {
    answer: "Long-tail Keyword",
    hint: "Long phrases capture high-intent users and have less competition."
  },
  "What is the primary reason for avoiding color in Mid-Fidelity wireframes?": {
    answer: "To prevent stakeholders from being distracted by aesthetic choices over function",
    hint: "Prevents arguing about 'fashion' before the layout is agreed upon."
  },
  "Which quadrant of an Empathy Map records the user's visible actions and behaviors?": {
    answer: "DOES",
    hint: "This captures what the user physically 'does'."
  },
  "In the ADDIE model, creating the Sitemap and Wireframe occurs during which phase?": {
    answer: "Design",
    hint: "This is the second phase of the cycle."
  },
  "A version of a product with just enough features to be usable by early customers is called the:": {
    answer: "Minimum Viable Product (MVP)",
    hint: "The focused version that allows you to launch quickly."
  },
  "How many <h1> tags should be included on a single webpage for optimal SEO and hierarchy?": {
    answer: "Exactly one",
    hint: "Google needs one clear main topic per page."
  },
  "What is the technical term for the design of the structural map and content labeling of a site?": {
    answer: "Information Architecture (IA)",
    hint: "It is the 'blueprint' for the organization of info."
  },
  "In Atomic Design, a single `<label>` or `<button>` tag is considered a(n):": {
    answer: "Atom",
    hint: "The smallest building block that cannot be broken down."
  },
  "Which optical scanning pattern is best for visual landing pages with a clear 'Hero' section?": {
    answer: "Z-Pattern",
    hint: "The eye moves from top-left, to right, then diagonal, then bottom-right."
  },
  "The snippet of text that appears under a website's link in search engine results is the:": {
    answer: "Meta Description",
    hint: "It serves as a 150-character 'ad' for your page."
  },
  "Which SWOT category identifies external factors that could negatively impact your project?": {
    answer: "Threats",
    hint: "T is an external danger, like a new competitor."
  },
  "A strategic tool used to cross-reference which features you have versus what your rivals have is a:": {
    answer: "Competitive Matrix",
    hint: "It looks like a spreadsheet with checkmarks."
  },
  "The '3 Cs' of User Story planning stand for Card, Conversation, and:": {
    answer: "Confirmation",
    hint: "The phase where the goal is confirmed to be met."
  },
  "In the MoSCoW method, a feature that is 'nice to have' but not needed for launch is a:": {
    answer: "Could Have",
    hint: "The 'C' features are the first to be cut."
  },
  "Which part of a User Story defines the ultimate benefit or 'Value' to the user?": {
    answer: "...so that [goal]",
    hint: "This explains 'the why' behind the feature."
  },
  "The 'Given / When / Then' format is primarily used for writing:": {
    answer: "Acceptance Criteria",
    hint: "A logical way to test if a feature works."
  },
  "In the ADDIE model, which phase involves launching the site on a web host?": {
    answer: "Implement",
    hint: "Putting the site into actual use."
  },
  "Which type of keyword has higher competition but usually higher search volume?": {
    answer: "Short-tail Keyword",
    hint: "One-word terms like 'games' or 'cars'."
  },
  "Which quadrant of an Empathy Map records quotes and things a user tells you in an interview?": {
    answer: "SAYS",
    hint: "This captures verbalized thoughts."
  },
  "What do we call the 'breathing room' or empty space in a wireframe meant to improve clarity?": {
    answer: "White Space",
    hint: "Also known as negative space."
  },
  "Which level of fidelity is best for rapid sketching on paper to get ideas out quickly?": {
    answer: "Low-Fidelity (Lo-Fi)",
    hint: "Quick, cheap, and easily changed."
  },
  "In Atomic Design, a Search Bar (Input + Button) is best described as a:": {
    answer: "Molecule",
    hint: "Two atoms combined for a single task."
  },
  "Which SEO tag creates the 'Blue Link' that users click in Google results?": {
    answer: "The Title Tag",
    hint: "It is the most important SEO tag in the <head>."
  },
  "What does the 'S' stand for in a SWOT Analysis?": {
    answer: "Strengths",
    hint: "The internal advantages of your project."
  },
  "If a user feels 'Proud' of their gaming scores, where should this be noted in design planning?": {
    answer: "Empathy Map (FEELS)",
    hint: "This records the emotional state of the persona."
  },
  "In the ADDIE model, which phase is focused on gathering user feedback after the site is live?": {
    answer: "Evaluate",
    hint: "Analyzing the data to see if the goals were met."
  },
  "The 'W' in MoSCoW stands for:": {
    answer: "Won't Have",
    hint: "Features explicitly excluded from the current scope."
  },
  "Which research type gives you 'Hard Numbers' like 45% of users use Safari?": {
    answer: "Quantitative Research",
    hint: "Quantity refers to numerical data."
  },
  "What is the mandatory filename for the top-level homepage of your sitemap?": {
    answer: "index.html",
    hint: "Required for web servers to load the 'front door' automatically."
  },
  "Which design concept is the 'blueprint' for a single page, showing where elements live?": {
    answer: "Wireframe",
    hint: "It maps out the hierarchy of a single page."
  },
  "The process of 'breaking it down into manageable steps' in Agile is called:": {
    answer: "Iterative development",
    hint: "Repeating cycles to improve a product."
  },
  "Which career role is most likely to conduct the initial user interviews in Phase 1?": {
    answer: "UX Researcher",
    hint: "The specialist in user behavior and data."
  },
  "A 'Pain Point' is best defined as a:": {
    answer: "Frustration or barrier to user success",
    hint: "Anything that stops the user from having a good experience."
  },
  "A Z-Pattern scan path usually ends at the bottom right with a:": {
    answer: "Call to Action (CTA)",
    hint: "The main button or link you want the user to click."
  },
  "Why is an Empathy Map helpful for a developer who is NOT a designer?": {
    answer: "It provides context on the user's needs so they build the right logic",
    hint: "It helps the programmer understand 'the why'."
  },
  "What happens if you use a Short-tail keyword like 'cars' instead of a Long-tail keyword?": {
    answer: "You will face extremely high competition and likely not rank highly",
    hint: "One-word terms are incredibly hard to beat big companies on."
  },
  "In Atomic Design, why is reusability important?": {
    answer: "It saves time and creates visual consistency across the entire app",
    hint: "Building it once and using it everywhere is professional."
  },

      // CHAPTER 4: The Why
      "What does UX stand for in the context of web design?": {
        answer: "User Experience",
        hint: "How the user 'feels'."
      },
      "What does UI stand for in the context of web design?": {
        answer: "User Interface",
        hint: "The 'buttons' and 'colors' they see."
      },
      "Which of the following best describes the difference between UI and UX?": {
        answer: "UI is how it looks (the paint); UX is how it feels and functions (the architecture).",
        hint: "Paint vs. Architecture."
      },
      "What is User-Centered Design (UCD)?": {
        answer: "A process where the needs, wants, and limitations of the end-user are given extensive attention at each stage.",
        hint: "Focusing on the person at every step."
      },
      "In visual design, what is 'White Space' (Negative Space)?": {
        answer: "The empty space between and around elements that gives the design 'room to breathe'.",
        hint: "Empty room."
      },
      "Why is White Space important in UI design?": {
        answer: "It improves readability, reduces cognitive overload, and clarifies relationships between elements.",
        hint: "It makes things readable."
      },
      "What is Visual Hierarchy?": {
        answer: "Arranging elements in order of importance, guiding the user's eye from most critical to least critical.",
        hint: "Ranking importance by look."
      },
      "Which characteristic is the strongest tool for establishing Visual Hierarchy?": {
        answer: "Size (making the most important thing the largest).",
        hint: "Bigger is more important."
      },
      "How do western users typically scan a text-heavy webpage?": {
        answer: "In an F-Pattern (across the top, down the side, across the middle).",
        hint: "Scanned like the letter F."
      },
      "How do users typically scan highly visual, image-based websites?": {
        answer: "In a Z-Pattern (left-to-right, diagonal down-left, left-to-right).",
        hint: "Scanned like the letter Z."
      },
      "In color psychology, what emotion or action is most commonly associated with the color Red?": {
        answer: "Excitement, urgency, or an error/warning.",
        hint: "Urgency and warnings."
      },
      "In color psychology, what is the color Blue often used to convey?": {
        answer: "Trust, security, and professionalism (often used by banks).",
        hint: "Trust and banks."
      },
      "What is the 60-30-10 Rule in UI color design?": {
        answer: "A formula for dividing your palette: 60% dominant base color, 30% secondary color, and 10% accent color (like for buttons).",
        hint: "Color division recipe."
      },
      "What is an 'Affordance' in UX design?": {
        answer: "A visual clue that tells the user how an object should be used (e.g., a button looking clickable).",
        hint: "A clue on how to use something."
      },
      "Why is 'Consistency' a golden rule in UI design?": {
        answer: "It reduces the user's learning curve because things behave exactly as they expect across the whole site.",
        hint: "Things always working the same way."
      },
      "What does the Gestalt Principle of 'Proximity' state?": {
        answer: "Elements that are placed close to each other are perceived as being related or part of a group.",
        hint: "Close items are related."
      },
      "What does the Gestalt Principle of 'Similarity' state?": {
        answer: "Elements that look similar (in shape, color, or size) are perceived as having the same function.",
        hint: "Similar items do the same thing."
      },
      "What is 'Cognitive Load' in UX?": {
        answer: "The amount of mental effort required by the user to understand and navigate an interface.",
        hint: "Thinking power used."
      },
      "A great UX designer aims to ____________ cognitive load.": {
        answer: "Reduce",
        hint: "Make it easier to think."
      },
      "What is the primary purpose of a 'Call to Action' (CTA)?": {
        answer: "To prompt the user to take a specific, desired action (like 'Buy Now' or 'Sign Up').",
        hint: "Final button goal."
      },
      "Which of the following is a characteristic of a good Call to Action (CTA)?": {
        answer: "It stands out visually using a strong accent color and clear, action-oriented text.",
        hint: "Clear and bright button."
      },
      "What is a 'Wireframe'?": {
        answer: "A low-fidelity, structural blueprint showing the layout of elements without distracting design details.",
        hint: "The layout bones."
      },
      "What is a 'Prototype' in UI/UX?": {
        answer: "An interactive model of the design that simulates how the final product will feel and function before coding begins.",
        hint: "Clickable test version."
      },
      "Why is it cheaper to fix a usability problem during the Wireframing/Prototyping phase rather than after the site is coded?": {
        answer: "Because changing lines on a blueprint takes minutes, while rewriting complex code architecture can take weeks.",
        hint: "Fixed on paper vs fixed in code."
      },
      "What is A/B Testing?": {
        answer: "Showing two slightly different versions of a design to users to see which one performs better.",
        hint: "Comparing version A vs B."
      },
      "What is the 'Three-Click Rule' in UX?": {
        answer: "A theory that users will leave a site if they can't find what they want within three clicks.",
        hint: "The rule of 3."
      },
      "In typography, what is 'Tracking'?": {
        answer: "The uniform spacing between all letters in a block of text.",
        hint: "Total space between letters."
      },
      "In typography, what is 'Leading' (Line-Height)?": {
        answer: "The vertical space between lines of text, crucial for readability.",
        hint: "Vertical gap."
      },
      "Which font type is generally considered best for large blocks of text on digital screens because of its clean edges?": {
        answer: "Sans-Serif",
        hint: "Fonts without feet."
      },
      "What is 'Friction' in User Experience?": {
        answer: "Anything that slows down, confuses, or prevents a user from completing their goal.",
        hint: "Resistance to the goal."
      },
      "Requiring a user to fill out a 20-field form just to download a free PDF is an example of:": {
        answer: "High Friction.",
        hint: "Lots of resistance."
      },
      "What is a 'Dark Pattern' in UI design?": {
        answer: "A deceptive interface trick designed to manipulate users into doing things they didn't intend to do (like a hidden subscription fee).",
        hint: "Shady design trick."
      },
      "Which of the following is a classic example of a Dark Pattern?": {
        answer: "A tiny, barely visible 'unsubscribe' link hidden at the bottom of a spam email.",
        hint: "Hiding the exit."
      },
      "What is the 'Fold' in web design?": {
        answer: "The imaginary line where the bottom of the user's screen cuts off the page before they scroll.",
        hint: "The bottom edge of the screen."
      },
      "Why is 'Above the Fold' critical real estate?": {
        answer: "Because it is the first thing users see without scrolling, making it the best place for your core message and CTA.",
        hint: "The top view."
      },
      "What is 'Responsive Design' primarily concerned with?": {
        answer: "Ensuring the UI adapts gracefully to provide a good UX on any device (mobile, tablet, desktop).",
        hint: "Device adaptation."
      },
      "What does the 'Accessibility' (a11y) aspect of UX focus on?": {
        answer: "Ensuring the site is usable by people of all abilities and disabilities.",
        hint: "Designing for all abilities."
      },
      "Adequate color contrast is a critical rule for both UI aesthetics and:": {
        answer: "Accessibility for visually impaired users.",
        hint: "Helping low vision users."
      },
      "What is a 'User Persona'?": {
        answer: "A fictional character created to represent a specific user type, helping designers empathize with their target audience.",
        hint: "Fictional user profile."
      },
      "When designing for a 'User Persona', what is the most important question to ask?": {
        answer: "'What problem is this specific user trying to solve?'",
        hint: "What is their goal?"
      },
      "What is 'Microcopy'?": {
        answer: "The tiny bits of text on an interface (like button labels, error messages, and tooltips) that guide the user.",
        hint: "Small helper text."
      },
      "Changing a button label from 'Submit' to 'Get Your Free Guide' is an improvement in:": {
        answer: "Microcopy and UX.",
        hint: "Helper text improvement."
      },
      "What is 'Feedback' in UI design?": {
        answer: "The system acknowledging a user's action (e.g., a button changing color when clicked, or a success message appearing).",
        hint: "Acknowledging the click."
      },
      "If a user clicks a 'Buy' button and nothing visually happens for 5 seconds while it loads, what UX principle has failed?": {
        answer: "System Feedback",
        hint: "System silence."
      },
      "What is 'Breadcrumb Navigation'?": {
        answer: "A secondary navigation scheme that shows the user's location in a site's hierarchy (e.g., Home > Electronics > TVs).",
        hint: "Bread trails."
      },
      "What is the 'Law of Proximity' a subset of?": {
        answer: "Gestalt Psychology.",
        hint: "A 'Gestalt' principle."
      },
      "Why should you never use color as the *only* way to convey important information?": {
        answer: "Because colorblind users might not be able to perceive the difference.",
        hint: "Colorblind accessibility."
      },
      "What is 'Card Sorting'?": {
        answer: "A UX research method where users organize topics into groups, helping designers build logical navigation menus.",
        hint: "Card sorting research."
      },
      "Which tool is commonly used by professionals to create high-fidelity UI prototypes?": {
        answer: "Figma",
        hint: "The world's leading UI tool."
      },
      "The phrase 'Don't Make Me Think' is a famous UX mantra. What does it mean?": {
        answer: "Interfaces should be obvious, self-explanatory, and intuitive so users don't have to figure out how to use them.",
        hint: "Intuitive and obvious."
      },
      "What is 'Accessibility Contrast Ratio'?": {
        answer: "The mathematical difference in brightness between text and its background color.",
        hint: "Brightness difference."
      },
      "If a website's primary goal is a calm, relaxing meditation app, which color palette is the most appropriate UI choice?": {
        answer: "Soft Blues, Greens, and Whites.",
        hint: "Calming colors."
      },

      // CHAPTER 5: The Bones
      "Why is a code editor like Visual Studio Code better than a basic text editor like Notepad?": {
    answer: "It color-codes your code and checks for mistakes as you type.",
    hint: "Think about features like 'Syntax Highlighting' and real-time error checking."
  },
  "Which tool acts like a 'spell-checker' for your HTML code to find tricky errors?": {
    answer: "The W3C validation website",
    hint: "This is an official online tool that checks if your code follows the standard rules."
  },
  "What is the primary goal of 'responsive design'?": {
    answer: "To ensure the website looks great and functions well on any screen size, including mobile phones.",
    hint: "It's about the site's ability to 'respond' to different devices."
  },
  "What is the very first line of code required in a modern HTML5 document (the document type declaration)?": {
    answer: "<!DOCTYPE html>",
    hint: "This line tells the browser exactly which version of HTML you are using."
  },
  "In the HTML 'family tree', which element is considered the root that holds everything else together?": {
    answer: "<html>",
    hint: "This tag wraps every other tag on the page except the doctype."
  },
  "Why is it important to include the `lang='en'` attribute in the root html tag?": {
    answer: "It tells search engines and screen readers what language the page is in.",
    hint: "It provides a 'language' hint for accessibility tools."
  },
  "Which part of the HTML boilerplate holds important information that the user does NOT see on the page?": {
    answer: "<head>",
    hint: "Think of this as the 'brain' of the document, containing settings and metadata."
  },
  "What does the `<meta charset='UTF-8'>` tag do?": {
    answer: "It tells the browser to use a standard character set that supports almost all symbols.",
    hint: "It defines the encoding for all the text and symbols on your site."
  },
  "Which invisible tag provides a short summary of your page for search engine results like Google?": {
    answer: "<meta name='description'>",
    hint: "This 'meta' tag provides a 'description' for outsiders."
  },
  "Which section of the HTML document holds all the content the user actually sees (text, images, video)?": {
    answer: "<body>",
    hint: "This is the physical 'body' of the website content."
  },
  "All web servers look for a specific file name to serve as a website's default home page. What is it?": {
    answer: "index.html",
    hint: "Think of it as the 'index' or starting point of your project."
  },
  "What is an 'empty element' in HTML?": {
    answer: "A tag that has no content inside it and only needs one tag (like <br>).",
    hint: "These elements are 'self-closing' because they don't wrap any text."
  },
  "What does the 'First-In, Last-Out' rule refer to?": {
    answer: "When nesting tags, the last tag you open is the first one you must close.",
    hint: "If you open a box inside a box, you have to close the inner box before the outer one."
  },
  "Using the suitcase analogy, what happens if you try to close an outer tag before closing the inner nested tag?": {
    answer: "It results in incorrect nesting (overlapping tags) and can break the layout.",
    hint: "The tags would 'overlap' which confuses the browser's structure."
  },
  "Which tag is used to create a standard paragraph of text?": {
    answer: "<p>",
    hint: "The tag name is simply the first letter of the word 'Paragraph'."
  },
  "Which tag is used to logically emphasize text, usually rendering it in italics?": {
    answer: "<em>",
    hint: "Short for 'Emphasis'."
  },
  "What is an HTML 'Attribute'?": {
    answer: "Special instructions added to the starting tag to give elements extra information (like class='intro').",
    hint: "These are key/value pairs found inside the opening tag brackets."
  },
  "Why should developers use Semantic Tags (like <article> or <footer>) instead of generic <div> tags?": {
    answer: "Their names describe exactly what kind of content they contain, which is great for SEO and screen readers.",
    hint: "These tags provide 'Meaning' to the computer and accessibility tools."
  },
  "What is the primary purpose of creating a wireframe before coding?": {
    answer: "To map out the logical structure and placement of semantic areas before getting distracted by design.",
    hint: "It acts as a low-fidelity blueprint for where things go."
  },
  "Which semantic tag marks the introduction of a section or page?": {
    answer: "<header>",
    hint: "Think of the very top or 'head' of a specific section."
  },
  "Which semantic tag is used to wrap a list of hypertext navigation links?": {
    answer: "<nav>",
    hint: "Short for 'Navigation'."
  },
  "Which semantic tag marks a self-contained piece of content, like a blog post or news story?": {
    answer: "<article>",
    hint: "Like a story you would read in a newspaper."
  },
  "What is the difference between a block-level element and an inline element?": {
    answer: "Block elements take up the full width and stack; inline elements sit next to each other and don't start a new line.",
    hint: "One creates a 'block' that takes up a whole row; the other stays 'in line' with text."
  },
  "Which element represents a generic container used to group elements when no semantic tag fits?": {
    answer: "<div>",
    hint: "Short for 'Division' or 'Divider'."
  },
  "Which text-level element indicates content of strong importance (usually rendered bold)?": {
    answer: "<strong>",
    hint: "You use this when the importance of the text is 'Strong'."
  },
  "Which tag is used to create a numbered, sequential list?": {
    answer: "<ol>",
    hint: "Short for 'Ordered List'."
  },
  "In a Description List (<dl>), what tag is used for the term being defined?": {
    answer: "<dt>",
    hint: "Short for 'Description Term'."
  },
  "Which attribute is REQUIRED in an <img> tag to provide a description for screen readers?": {
    answer: "alt",
    hint: "Short for 'Alternative Text'."
  },
  "Which attribute in an <img> tag tells the browser exactly where to find the image file?": {
    answer: "src",
    hint: "Short for 'Source'."
  },
  "What tag is used to create a clickable hypertext link?": {
    answer: "<a>",
    hint: "Short for 'Anchor'."
  },
  "In a link, what does the attribute `target='_blank'` do?": {
    answer: "Opens the link in a new browser tab.",
    hint: "It targets a 'blank' or new page."
  },
  "What is the difference between an Absolute Path and a Relative Path?": {
    answer: "Absolute paths are the full URL (https://...); relative paths are the path from the current file to the target file.",
    hint: "One is the full address; the other is 'relative' to where you are now."
  },
  "Why do we use character entity references like `&copy;`?": {
    answer: "To display symbols not found on a standard keyboard, like the copyright symbol.",
    hint: "These are special codes that start with an ampersand and end with a semicolon."
  },
  "What tag is specifically designed to hold a long quote from another source and visually indents it?": {
    answer: "<blockquote>",
    hint: "A 'block' of text representing a 'quote'."
  },
  "In order to connect an external CSS file to an HTML document, which tag must be placed inside the <head>?": {
    answer: "<link rel='stylesheet' href='...'>",
    hint: "You need to 'link' the two files together."
  },
  "What does the `href` attribute stand for in an anchor tag?": {
    answer: "Hypertext Reference",
    hint: "It provides a 'reference' to the 'hypertext' destination."
  },
  "Which tag should be used to wrap the name of the author or the title of a work being quoted?": {
    answer: "<cite>",
    hint: "You use this to 'cite' your sources."
  },
  "If you want a link to open the user's default email program, what prefix do you use in the href?": {
    answer: "mailto:",
    hint: "It literally says 'mail to' the address."
  },
  "If you want a link to allow mobile users to tap to call a phone number, what prefix do you use in the href?": {
    answer: "tel:",
    hint: "Short for 'Telephone'."
  },
  "Which HTML tag acts as a generic inline container for styling small runs of text without starting a new line?": {
    answer: "<span>",
    hint: "It allows a style to 'span' across a few words."
  },
  "What is the correct syntax to add a class named 'active' to a paragraph?": {
    answer: "<p class='active'>",
    hint: "Use the 'class' attribute inside the start tag."
  },
  "Which tag is used to mark a thematic break in content, usually displaying as a horizontal line?": {
    answer: "<hr>",
    hint: "Short for 'Horizontal Rule'."
  },
  "Which grouping element is best used to mark content that shares a common theme or purpose on the page?": {
    answer: "<section>",
    hint: "It defines a specific 'section' of the page."
  },
  "Which grouping element marks content that is related to the main article but usually placed to the side?": {
    answer: "<aside>",
    hint: "Think of content placed 'to the side'."
  },
  "In an unordered list (<ul>), what tag must wrap every individual bullet point?": {
    answer: "<li>",
    hint: "Short for 'List Item'."
  },
  "If an HTML document does not have a <title> tag, what will the browser display in the tab?": {
    answer: "The filename (e.g., index.html)",
    hint: "The browser will just show the name of the file."
  },
  "Why is the `<meta name='viewport'>` tag considered mandatory for modern websites?": {
    answer: "It tells mobile devices to render the page at its actual width rather than zooming out to show a desktop version.",
    hint: "It controls the 'view' through the 'port' of a mobile device."
  },
  "What happens if you use a relative path like `href='about.html'` but the file is actually inside a folder named 'pages'?": {
    answer: "The link will break and show a 'File Not Found' error.",
    hint: "The path is incorrect, so the computer can't locate the file."
  },
  "What is the purpose of the <figcaption> tag?": {
    answer: "To provide a caption specifically associated with a <figure> element.",
    hint: "A 'caption' for a 'figure'."
  },
  "If you want to display the exact code `<p>` on a webpage without the browser interpreting it as a paragraph, what entity must you use for the less-than sign?": {
    answer: "&lt;",
    hint: "Short for 'Less Than'."
  },
  "Which tag is used to mark text that represents computer code?": {
    answer: "<code>",
    hint: "The tag name is the word for what a developer writes."
  },
  "In the curriculum persona, what was 'Organizer Olivia' primarily looking for?": {
    answer: "A clear, logically structured page to easily find location and contact info.",
    hint: "She is an 'Organizer' who values logical structure."
  },

      // CHAPTER 6: The Clothes
      "What is the primary function of Browser Developer Tools?": {
        answer: "To see which CSS rules are affecting an element and test changes live without altering your files.",
        hint: "It lets you 'inspect' the code and styles inside the browser."
      },
      "In the CSS hierarchy of power, which type of style has the ultimate 'final say' (highest priority)?": {
        answer: "Inline Styles",
        hint: "These are styles written directly inside the HTML tag."
      },
      "What is an External Stylesheet?": {
        answer: "A separate .css file linked in the <head> of the document.",
        hint: "It is a style file that lives 'external' to the HTML."
      },
      "If an element has a red color set in an External stylesheet but a blue color set Inline, what color will it be?": {
        answer: "Blue, because Inline styles have the highest priority.",
        hint: "The style closest to the HTML element usually wins."
      },
      "What is the purpose of vendor prefixes like `-webkit-` or `-moz-`?": {
        answer: "They were used by browsers to test new, experimental CSS features before they became standard.",
        hint: "Specific browser 'vendors' used these for early versions of features."
      },
      "What does the 'C' in CSS stand for, and what does it mean?": {
        answer: "Cascading: the order of rules matters, and the last rule read by the browser wins ties.",
        hint: "Like a waterfall, the styles flow down, and later rules can overwrite earlier ones."
      },
      "If you set `font-family: Arial;` on the `<body>` tag, why do all the paragraphs inside it also become Arial?": {
        answer: "Because of Style Inheritance.",
        hint: "Children 'inherit' certain traits from their parent elements."
      },
      "What is the format of a Hexadecimal color code?": {
        answer: "A hash (#) followed by six digits (0-9 and A-F).",
        hint: "A base-16 number system starting with a #."
      },
      "What do the three numbers in an RGB color code represent?": {
        answer: "Red, Green, Blue intensity from 0 to 255.",
        hint: "The acronym stands for the three primary colors of light."
      },
      "Why might a web designer choose HSL over Hex codes?": {
        answer: "HSL is easier for humans to understand and tweak (Hue, Saturation, Lightness).",
        hint: "It describes colors using Hue, Saturation, and Lightness."
      },
      "How do you make a color 50% transparent using RGBA or HSLA?": {
        answer: "Set the Alpha channel value to 0.5.",
        hint: "The 'A' in the acronym stands for 'Alpha' which controls transparency."
      },
      "In CSS Specificity, which selector acts as the 'heavyweight champ' (highest specificity)?": {
        answer: "ID Selector (#main-header)",
        hint: "The selector that uses the hash (#) symbol is the most powerful."
      },
      "What does the descendant selector `article p` target?": {
        answer: "Any <p> tag that is anywhere inside an <article>.",
        hint: "It looks for any paragraph that 'descends' from an article."
      },
      "What does the child selector `article > p` target?": {
        answer: "Only <p> tags that are a direct child (one level deep) of an <article>.",
        hint: "The '>' symbol means it must be an immediate 'child'."
      },
      "What does the wildcard selector `*` do?": {
        answer: "Selects every single element on the page.",
        hint: "This symbol is used to target 'everything'."
      },
      "What is a 'font stack'?": {
        answer: "A list of fonts provided in CSS, starting with the first choice and ending with generic backups.",
        hint: "It's a 'stack' of fonts the browser tries to use in order."
      },
      "What is the defining characteristic of a 'serif' font?": {
        answer: "It has little 'feet' or strokes at the ends of the letters.",
        hint: "Think of fonts like Times New Roman that have little decorative feet."
      },
      "Which generic font family has letters that are all exactly the same width?": {
        answer: "monospace",
        hint: "Every character takes up exactly one 'space'."
      },
      "What is a 'web font'?": {
        answer: "A font linked from a service (like Google Fonts) that the browser downloads automatically.",
        hint: "A font fetched from the 'web' rather than being installed on the user's computer."
      },
      "Why is it a best practice to use `rem` units for font sizes instead of fixed `px` (pixels)?": {
        answer: "rem units are relative to the root font size, allowing visually impaired users to scale up the text using browser settings.",
        hint: "This unit allows the text to scale based on the 'root' font size."
      },
      "What do the Viewport Units (`vw` and `vh`) measure?": {
        answer: "Percentages of the visible browser window's width/height.",
        hint: "They measure the size of the 'viewport' window."
      },
      "Which CSS property is used to push the first line of a paragraph inward?": {
        answer: "text-indent",
        hint: "You use this to 'indent' the 'text'."
      },
      "What does the `line-height` property adjust?": {
        answer: "The vertical space between lines of text.",
        hint: "It changes the 'height' of each 'line' box."
      },
      "If you want text to align to the right edge of its container, which property do you use?": {
        answer: "text-align: right;",
        hint: "You want to 'align' the 'text' to a specific side."
      },
      "What is a CSS 'pseudo-class'?": {
        answer: "A keyword added to a selector that specifies a special state (like :hover).",
        hint: "It targets an element only when it's in a specific 'state' or condition."
      },
      "Which pseudo-class targets a link that the user has already clicked on?": {
        answer: ":visited",
        hint: "It targets links you have already 'visited'."
      },
      "Which pseudo-class targets an element the precise moment it is being clicked (mouse down)?": {
        answer: ":active",
        hint: "It is only 'active' during the actual click."
      },
      "Which pseudo-class targets an element when a user tabs to it?": {
        answer: ":focus",
        hint: "It happens when the element receives 'focus' via the keyboard."
      },
      "How would you select the very last paragraph in a group of siblings?": {
        answer: "p:last-child",
        hint: "It targets the child that is the 'last' one."
      },
      "What does the structural pseudo-class `:nth-child(even)` do when applied to table rows (<tr>)?": {
        answer: "Selects alternating rows (2, 4, 6) for 'zebra striping'.",
        hint: "It selects every 'even' numbered child."
      },
      "What is a 'pseudo-element' (like `::before`) used for?": {
        answer: "To style a specific part of an element or inject 'phantom' content without changing the HTML.",
        hint: "It styles a virtual 'element' that isn't really in the HTML code."
      },
      "Which property is REQUIRED to bring a `::before` or `::after` pseudo-element to life?": {
        answer: "content",
        hint: "Without this property, the pseudo-element has no 'content' to show."
      },
      "What is 'Progressive Enhancement'?": {
        answer: "Starting with a simple, solid baseline for all browsers, then layering on advanced features for modern browsers.",
        hint: "You start with the basics and 'enhance' as you go."
      },
      "What does a CSS Validator do?": {
        answer: "It checks your code for syntax errors and typos like a strict teacher.",
        hint: "It 'validates' that your syntax is correct."
      },
      "In the CSS rule `h1 { color: blue; }`, what is the 'selector'?": {
        answer: "h1",
        hint: "It's the part that 'selects' what you want to style."
      },
      "In the CSS rule `h1 { color: blue; }`, what is the 'property'?": {
        answer: "color",
        hint: "It's the specific trait or 'property' you are changing."
      },
      "What character is used to separate the property and the value in a CSS declaration?": {
        answer: "Colon (:)",
        hint: "The punctuation mark used before a value."
      },
      "What character MUST be placed at the very end of a CSS declaration to close it?": {
        answer: "Semicolon (;)",
        hint: "The punctuation mark used to end a statement."
      },
      "If you want to style elements with the class 'highlight', what is the correct selector syntax?": {
        answer: ".highlight",
        hint: "Classes use the dot (.) symbol in CSS."
      },
      "If you want to style an element with the ID 'main-nav', what is the correct selector syntax?": {
        answer: "#main-nav",
        hint: "IDs use the hash (#) symbol in CSS."
      },
      "How do you group multiple selectors so they share the exact same style rule?": {
        answer: "Separate them with a comma (e.g., `h1, h2, h3`).",
        hint: "You use a 'list' of selectors separated by this common punctuation mark."
      },
      "What does the `text-transform: uppercase;` property do?": {
        answer: "Changes all letters to capital letters visually without altering the HTML.",
        hint: "It 'transforms' the text to all caps."
      },
      "Which property changes the color of the text itself?": {
        answer: "color",
        hint: "The property name is simply the word for 'color'."
      },
      "What does `font-style: italic;` do?": {
        answer: "Slants the text.",
        hint: "It changes the 'style' of the font to be slanted."
      },
      "If you want to remove the default underline from a hyperlink, which property do you use?": {
        answer: "text-decoration: none;",
        hint: "It removes the 'decoration' from the text."
      },
      "What does the `opacity` property control?": {
        answer: "How transparent an entire element is (0.0 is invisible, 1.0 is solid).",
        hint: "It dictates how 'opaque' or see-through the element is."
      },
      "What is the purpose of the `@charset 'UTF-8';` rule at the top of a CSS file?": {
        answer: "It specifies the character encoding, ensuring symbols and international text render correctly.",
        hint: "It defines the 'character set' for the file."
      },
      "How do you write a comment inside a CSS file?": {
        answer: "/* Comment */",
        hint: "It starts with a slash-star and ends with a star-slash."
      },
      "In the persona profile, what does 'Science Student Sam' rely on to quickly scan articles?": {
        answer: "Clean typography, clear link states, and organized styling.",
        hint: "He needs clear, organized styling to scan text quickly."
      },
      "If you write `p { color: red; }` at line 10, and `p { color: blue; }` at line 50, what color will paragraphs be? Why?": {
        answer: "Blue, because of the 'Cascading' rule where later styles override earlier ones.",
        hint: "The 'cascade' means the rules further down the page take priority."
      },
      "Which of these is NOT a valid way to write the color white in CSS?": {
        answer: "hsl(0, 0%, 0%)",
        hint: "In HSL, a lightness of 0% represents pure black."
      },
      "If you want to target an input field only when it has the attribute `type='text'`, what selector do you use?": {
        answer: "input[type='text']",
        hint: "Use square brackets to target a specific 'attribute'."
      },

      // CHAPTER 7: The Style
      "If an element has 100px width, 10px padding, and a 5px border (using content-box), what is the total rendered width?": {
        answer: "130px",
        hint: "In content-box, you must add the padding and border of BOTH sides to the width (100 + 10+10 + 5+5)."
      },
      "The 'rem' unit is relative to the font size of which element?": {
        answer: "The root (<html>) element",
        hint: "The 'r' in rem stands for 'root'."
      },
      "What is 'Margin Collapse'?": {
        answer: "When adjacent vertical margins combine into a single margin.",
        hint: "Think about why two 20px margins between elements don't result in 40px of space."
      },
      "Which unit represents 1% of the browser window's width?": {
        answer: "vw",
        hint: "Look for the unit that stands for 'Viewport Width'."
      },
      "What does the 'Mobile-First' design strategy entail?": {
        answer: "Coding styles for small screens first, then using min-width media queries for larger screens.",
        hint: "You start with the smallest screen and add complexity as the screen gets wider."
      },
      "An element with 'position: absolute' is positioned relative to what?": {
        answer: "The closest non-static positioned ancestor",
        hint: "It looks up the HTML tree for the first parent that has a position like relative, absolute, or fixed."
      },
      "Which CSS property controls the stacking order of overlapping elements on the Z-axis?": {
        answer: "z-index",
        hint: "Think about the 3rd dimension (depth) in a coordinate system."
      },
      "Which position value acts as 'relative' until it reaches a specific scroll threshold, then stays in place?": {
        answer: "sticky",
        hint: "It 'sticks' to the top or bottom once you scroll past a certain point."
      },
      "Which position value glues an element to the viewport so it never moves when the user scrolls?": {
        answer: "fixed",
        hint: "This value keeps the element in a 'fixed' location relative to the browser window."
      },
      "In Flexbox, which property aligns items along the Cross Axis (usually vertically)?": {
        answer: "align-items",
        hint: "Justify-content handles the main axis; this property handles the opposite axis."
      },
      "What does 'justify-content: space-between' do in a flex container?": {
        answer: "Pushes the first item to the start edge and the last item to the end edge, spacing the rest evenly.",
        hint: "There is no space at the very beginning or the very end, only between the items."
      },
      "If flex items run out of horizontal space, which property allows them to drop to a new line?": {
        answer: "flex-wrap: wrap",
        hint: "You need to enable 'wrapping' so items don't just shrink or overflow."
      },
      "CSS Grid is primarily designed for what kind of layouts?": {
        answer: "2-Dimensional (Rows and Columns simultaneously)",
        hint: "Flexbox is 1D; Grid is designed to handle both directions at once."
      },
      "What is the 'fr' unit in CSS Grid?": {
        answer: "Fractional Unit of available free space",
        hint: "It represents a 'fraction' of the space left over in the grid."
      },
      "How do you create 3 equally sized columns in CSS Grid?": {
        answer: "grid-template-columns: 1fr 1fr 1fr",
        hint: "You define the template for columns using three equal fractional units."
      },
      "What does the 'gap' property do?": {
        answer: "Sets the space between grid tracks or flex items without using margins.",
        hint: "It creates 'gutters' or empty space strictly between the items."
      },
      "Which of the following is the correct syntax for a media query targeting screens 600px wide or smaller?": {
        answer: "@media (max-width: 600px)",
        hint: "You are setting a 'maximum' limit for the styles to apply."
      },
      "What is the standard 'magic fix' to ensure images never overflow their parent containers?": {
        answer: "max-width: 100%",
        hint: "This ensures the image can be smaller than its original size, but never larger than its container."
      },
      "Which CSS property completely removes an element from the document flow as if it doesn't exist?": {
        answer: "display: none",
        hint: "Unlike 'visibility: hidden', this one makes the element stop taking up space entirely."
      },
      "To make a grid item stretch across two columns, you use:": {
        answer: "grid-column: span 2",
        hint: "Use the keyword that tells the item to 'span' across multiple tracks."
      },
      "What is the primary benefit of using `box-sizing: border-box`?": {
        answer: "Padding and borders are included in the element's total width and height.",
        hint: "This makes the width you set in CSS the 'actual' final width of the box."
      },
      "What does the `vh` unit stand for?": {
        answer: "Viewport Height",
        hint: "It represents 1% of the total height of the browser window."
      },
      "In Flexbox, what does the `flex-grow` property determine?": {
        answer: "How much of the available free space the item should take up.",
        hint: "It dictates how the item 'grows' to fill empty spots in the container."
      },
      "What is the default `flex-direction` of a newly created flex container?": {
        answer: "row",
        hint: "By default, flex items line up horizontally like words in a sentence."
      },
      "Which CSS property defines the height of rows in a CSS Grid?": {
        answer: "grid-template-rows",
        hint: "You are setting the 'template' for the horizontal tracks."
      },
      "What does `grid-column: 1 / 3` signify for a grid item?": {
        answer: "It starts at column line 1 and ends at column line 3 (spanning 2 columns).",
        hint: "The numbers refer to the grid lines, not the columns themselves."
      },
      "If you use `@media (min-width: 1024px)`, the CSS rules inside will apply to:": {
        answer: "Screens 1024px and wider.",
        hint: "This sets a 'minimum' threshold; the screen must be at least this big."
      },
      "How does `position: relative` affect an element?": {
        answer: "It allows you to move it using top/bottom/left/right relative to its normal position.",
        hint: "The element stays in the 'flow' of the page, but can be visually offset."
      },
      "If an element has `position: static`, what happens if you apply `top: 50px` to it?": {
        answer: "Nothing happens; static elements ignore top/bottom/left/right.",
        hint: "Static is the default; it doesn't support coordinate offsets."
      },
      "How do you properly declare a custom CSS variable on the root pseudo-class?": {
        answer: ":root { --primary-color: #f00; }",
        hint: "Custom variables must always start with two dashes (--)."
      },
      "How do you apply a previously declared CSS variable named `--main-bg` to an element?": {
        answer: "background-color: var(--main-bg);",
        hint: "You must wrap the variable name in the 'var()' function."
      },
      "If text is spilling out of its container, which property forces a scrollbar to appear inside the box?": {
        answer: "overflow: scroll;",
        hint: "You need to control what happens when content 'overflows' the container."
      },
      "Which CSS function allows you to perform math directly in your stylesheet (e.g., subtracting pixels from percentages)?": {
        answer: "calc()",
        hint: "Short for 'calculate'."
      },
      "What is the classic CSS technique to horizontally center a block-level element (like a container div) with a set width?": {
        answer: "margin: 0 auto;",
        hint: "Setting left and right margins to 'auto' forces them to be equal."
      },
      "What makes `display: inline-block` different from `display: inline?": {
        answer: "It sits inline with text but respects width and height properties.",
        hint: "It acts like a box (respecting size) but flows like text."
      },
      "Which CSS Grid property allows you to map out your layout using named visual strings?": {
        answer: "grid-template-areas",
        hint: "This allows you to name 'areas' of your grid and arrange them visually."
      },
      "In Flexbox, what is the difference between `align-items` and `align-content`?": {
        answer: "align-items handles individual items on a single line; align-content handles the spacing of multiple wrapped lines.",
        hint: "Content-alignment only matters if the flex container has multiple rows (wrapped)."
      },
      "Which property allows you to visually re-arrange the sequence of flex items without changing the HTML markup?": {
        answer: "order",
        hint: "You can change the 'order' of appearance numerically."
      },
      "Can a `z-index` have a negative value (e.g., `z-index: -1`)?": {
        answer: "Yes, pushing the element behind the default background layer.",
        hint: "Negative values are valid and useful for placing things in the background."
      },
      "What does the `<meta name='viewport'>` tag do in the HTML head?": {
        answer: "It tells mobile devices not to zoom out and to render the page at its actual device width.",
        hint: "Without this, mobile browsers 'fake' a large screen and zoom out."
      },
      "The `em` unit is relative to:": {
        answer: "The font-size of its direct parent element.",
        hint: "Unlike 'rem' (root), this one looks at the immediate parent."
      },
      "What happens if a block element's `width` is set to 1000px, but the user's screen is only 400px wide?": {
        answer: "The browser creates a horizontal scrollbar.",
        hint: "The element won't shrink on its own if you give it a fixed pixel width."
      },
      "Which CSS property maintains an element's proportions (like a 16:9 video) as it resizes?": {
        answer: "aspect-ratio",
        hint: "This property defines the relationship between width and height."
      },
      "In CSS Grid, what is the primary difference between `auto-fill` and `auto-fit`?": {
        answer: "auto-fill leaves empty tracks if there's extra space; auto-fit collapses empty tracks to stretch existing items.",
        hint: "One 'fills' the space with ghost columns; the other 'fits' the actual items into the row."
      },
      "What does the `minmax()` function do in CSS Grid?": {
        answer: "It defines a size range for a track, setting a minimum size and allowing it to grow to a maximum size.",
        hint: "It ensures a column is never too small but can expand if space is available."
      },
      "Which CSS function is perfect for fluid typography, allowing font size to scale smoothly between a minimum and maximum value?": {
        answer: "clamp()",
        hint: "Think of it like a 'clamp' that holds the size between a floor and a ceiling."
      },
      "If a child div is set to `width: 50%`, it will take up half the width of:": {
        answer: "Its direct parent element.",
        hint: "Percentages for width are almost always calculated from the parent's width."
      },
      "In Flexbox, what does `justify-content: space-evenly` do?": {
        answer: "Ensures the gap between all items AND the edges of the container are exactly identical.",
        hint: "Every gap—including the ones at the start and end—is the same size."
      },
      "How does `visibility: hidden` differ from `display: none`?": {
        answer: "visibility: hidden makes the element invisible but it still takes up physical space; display: none removes it from the layout entirely.",
        hint: "One leaves an empty gap where the item used to be; the other 'deletes' the gap."
      },
      "Which media query detects if the user is holding their phone sideways?": {
        answer: "@media (orientation: landscape)",
        hint: "Sideways mode is called 'landscape'."
      },
      "If an ID selector (`#header`) and a class selector (`.hero`) both target the same element with different colors, which one wins?": {
        answer: "The ID selector, because IDs have higher specificity.",
        hint: "IDs are more 'specific' and powerful than classes in CSS logic."
      },
      "Which pseudo-class targets an element when the user moves their mouse over it?": {
        answer: ":hover",
        hint: "Think of the word for floating your mouse cursor over something."
      },

      // CHAPTER 8: Sights & Sounds
      "Which property is the 'Magic Reset' that prevents padding from expanding a box?": {
        answer: "box-sizing: border-box",
        hint: "This property ensures the width and height include padding and borders."
      },
      "What is the primary benefit of SVG over other image formats?": {
        answer: "Perfectly sharp at any size (Vector)",
        hint: "Think about the difference between a grid of pixels and mathematical paths."
      },
      "In the 8-step SSL Handshake, what is the first thing the browser does?": {
        answer: "Asks for a secure session",
        hint: "The browser initiates the greeting by requesting security."
      },
      "Which unit is relative to the Root HTML element's font size?": {
        answer: "rem",
        hint: "The 'r' stands for root."
      },
      "What is a 'Digital Footprint'?": {
        answer: "A permanent record of online activity",
        hint: "It's the trail of data you leave behind on the internet."
      },
      "Which attribute is REQUIRED for a video to autoplay in most browsers?": {
        answer: "muted",
        hint: "Browsers generally won't play videos with sound automatically to avoid annoying users."
      },
      "What does PII stand for in privacy law?": {
        answer: "Personally Identifiable Information",
        hint: "Information that can be used to distinguish one person from another."
      },
      "Which Photoshop tool is used to 'shrink' the total pixel dimensions of an image?": {
        answer: "Image Size",
        hint: "This menu command directly alters the pixel count of the document."
      },
      "What tag is used to specify multiple file formats (like MP3 and OGG) for audio?": {
        answer: "<source>",
        hint: "It goes inside the audio or video tag to provide alternatives."
      },
      "What is the purpose of the <track> tag?": {
        answer: "To provide subtitles or captions",
        hint: "It adds text-based accessibility to media files."
      },
      "Which table tag is used to wrap the summary or totals at the bottom?": {
        answer: "<tfoot>",
        hint: "Think of the 'foot' of the table."
      },
      "What attribute allows an <iframe> to take up the full width of a container?": {
        answer: "width='100%'",
        hint: "A percentage value ensures it stretches to its parent's edges."
      },
      "The Nevada Privacy Act SB220 uses which model for data sales?": {
        answer: "Opt-Out",
        hint: "Users have the right to tell companies to STOP selling their data."
      },
      "Which of the 'POUR' principles ensures a site can be used with a keyboard?": {
        answer: "Operable",
        hint: "If a user can't navigate with a keyboard, the site isn't 'usable' or..."
      },
      "What is 'Dithering'?": {
        answer: "Simulating colors using patterns",
        hint: "It creates the illusion of more colors using a limited palette."
      },
      "Why is JPG preferred over PNG for large, complex photographs?": {
        answer: "It has a much smaller file size due to lossy compression.",
        hint: "Think about the trade-off between file size and perfect quality."
      },
      "What is the 'poster' attribute used for in a <video> tag?": {
        answer: "It specifies a static image to show before the video plays.",
        hint: "Like a movie advertisement on a wall."
      },
      "Which image format was created by Google to provide superior lossless and lossy compression on the web?": {
        answer: "WebP",
        hint: "It's the modern web-standard format that starts with 'Web'."
      },
      "Why is it considered a bad practice to use HTML tables for an entire page layout?": {
        answer: "They are not accessible to screen readers and break responsive design.",
        hint: "Tables are for data, not for making the structure of a website."
      },
      "What does the 'colspan' attribute do in a table data cell (<td>)?": {
        answer: "Stretches the cell horizontally across multiple columns.",
        hint: "It allows a cell to take up multiple column widths."
      },
      "What does the 'rowspan' attribute do in a table cell?": {
        answer: "Stretches the cell vertically across multiple rows.",
        hint: "It allows a cell to take up multiple row heights."
      },
      "If an image fails to load, which attribute's text will the browser display instead?": {
        answer: "alt",
        hint: "Short for 'alternative text'."
      },
      "Which HTML tag is semantically correct for defining the header row containing column titles in a table?": {
        answer: "<th>",
        hint: "The 'h' stands for Header."
      },
      "Why is embedding a YouTube video via <iframe> often better than hosting the MP4 yourself?": {
        answer: "You don't have to pay for the massive bandwidth the video uses.",
        hint: "Google covers the cost of sending the video data to the user."
      },
      "In the context of the Web Content Accessibility Guidelines (WCAG), what does 'Level AA' represent?": {
        answer: "The standard, legally targeted level of compliance.",
        hint: "It is the middle level, between A and AAA."
      },
      "What happens during 'Lossy' compression (like saving a JPG)?": {
        answer: "Mathematical data is permanently deleted to reduce file size.",
        hint: "Data is 'lost' to make the file smaller."
      },
      "What happens during 'Lossless' compression (like saving a PNG)?": {
        answer: "The file size is reduced by rewriting the data without losing visual quality.",
        hint: "No information is 'lost' during the process."
      },
      "A site with light gray text on a white background fails which accessibility check?": {
        answer: "Color Contrast",
        hint: "The difference between the text and the background is too small."
      },
      "Which of the following is an example of an 'empty' or 'self-closing' HTML tag?": {
        answer: "<img>",
        hint: "It doesn't need a closing tag like </img>."
      },
      "What does the <caption> tag do when used inside a <table>?": {
        answer: "It acts as a title or explanation specifically for that table.",
        hint: "It provides context for what the table contains."
      },
      "If you want an HTML5 video to automatically loop forever, which attribute do you add?": {
        answer: "loop",
        hint: "The word for something that repeats."
      },
      "What is the primary function of a Content Delivery Network (CDN)?": {
        answer: "To host copies of your media on servers globally to reduce load times for users far away.",
        hint: "It places data closer to the user to make the site faster."
      },
      "Which type of data is a SQL (Relational) database best suited for?": {
        answer: "Highly structured, interconnected data like bank accounts and user profiles.",
        hint: "Think of rigid tables with set relationships."
      },
      "Which type of database stores data as flexible 'documents' rather than rigid tables?": {
        answer: "NoSQL (like MongoDB)",
        hint: "The 'No' stands for Not Only."
      },
      "If a user clears their browser cache, what happens to data saved in Local Storage?": {
        answer: "It is deleted entirely.",
        hint: "Local storage is part of the browser's persistent cache data."
      },
      "In a relational database, what prevents two users from having the exact same identity record?": {
        answer: "The Primary Key",
        hint: "The unique ID for every single row in a table."
      },
      "The SQL command used to retrieve information from a database is:": {
        answer: "SELECT",
        hint: "You use this to 'choose' which data you want to see."
      },
      "What does the SQL 'WHERE' clause do?": {
        answer: "Filters the results to only include rows that meet a specific condition.",
        hint: "It acts as a filter for your query."
      },
      "Which SQL command is used to add a brand new record to a table?": {
        answer: "INSERT INTO",
        hint: "You 'put' new data into the table."
      },
      "Why must developers use 'Hashing' for passwords instead of standard Encryption?": {
        answer: "Hashing is a one-way process that cannot be reversed by anyone, keeping the data secure even if the database is stolen.",
        hint: "Unlike encryption, hashing cannot be 'unlocked' with a key."
      },
      "What does 'Sanitizing Input' prevent?": {
        answer: "Cross-Site Scripting (XSS) and SQL Injection attacks.",
        hint: "It cleans the user's data to make sure no malicious code is hidden inside."
      },
      "A hacker types `'; DROP TABLE Users; --` into a login field. What kind of attack is this?": {
        answer: "SQL Injection",
        hint: "It 'injects' code into a database query."
      },
      "In the 'CRUD' acronym, what does the 'U' stand for?": {
        answer: "Update",
        hint: "Create, Read, ?, Delete."
      },
      "Which HTTP method is structurally equivalent to the SQL 'DELETE' command?": {
        answer: "DELETE",
        hint: "The names are identical."
      },
      "If an image is 4000px wide, why is it bad practice to simply use CSS `width: 400px` to make it smaller on screen?": {
        answer: "The browser still has to download the massive original file, slowing down the site.",
        hint: "The user's computer still does all the work to get the big file."
      },
      "Which file format uses mathematical formulas to draw lines and curves, keeping it sharp at any scale?": {
        answer: "SVG",
        hint: "Scalable Vector Graphics."
      },
      "What is the recommended tool for checking color contrast accessibility?": {
        answer: "WebAIM Contrast Checker",
        hint: "A famous tool from 'Web Accessibility In Mind'."
      },
      "What is an NDA (Non-Disclosure Agreement)?": {
        answer: "A legally binding contract protecting trade secrets and confidential company information.",
        hint: "A promise not to 'disclose' secrets."
      },
      "How does the 'Curb Cut Effect' relate to web design?": {
        answer: "Designing for the most marginalized users (like screen reader compatibility) often improves the experience for everyone.",
        hint: "Designing for accessibility benefits all users."
      },
      "If you use a photo licensed under Creative Commons 'BY-NC', what are you legally required to do?": {
        answer: "Give credit (Attribution) and NOT use it for commercial profit.",
        hint: "BY = give credit, NC = No Commercial."
      },
      "What is the primary difference between GDPR (Europe) and SB220 (Nevada)?": {
        answer: "GDPR requires explicit Opt-In consent; SB220 focuses on the right to Opt-Out of data sales.",
        hint: "One makes you say 'yes' first, the other lets you say 'no' later."
      },

      // CHAPTER 9: The Brains
      "Which symbol is used for 'Strict Equality' (checking both value and type)?": {
        answer: "===",
        hint: "This symbol uses three characters to ensure the value AND the data type match perfectly."
      },
      "What is the mathematical result of 10 % 3?": {
        answer: "1",
        hint: "The modulo operator (%) finds the 'remainder' left over after division."
      },
      "What is the result of the logic statement: (true && false)?": {
        answer: "False",
        hint: "With the AND (&&) operator, BOTH sides must be true for the whole thing to be true."
      },
      "Which DOM selector is most flexible and uses CSS-style syntax (e.g., #id or .class)?": {
        answer: "querySelector",
        hint: "It's the method that 'queries' the document using CSS selectors."
      },
      "How do you change the text inside an HTML element via JavaScript?": {
        answer: ".innerText",
        hint: "This property targets the 'text' that lives 'inner' the HTML tags."
      },
      "How do you change the background color of an element named 'box'?": {
        answer: "box.style.backgroundColor = 'red'",
        hint: "You must access the 'style' property, then use CamelCase for 'backgroundColor'."
      },
      "What property retrieves the text typed into an <input> box by a user?": {
        answer: ".value",
        hint: "Think about the 'value' of the data inside the input field."
      },
      "Which error occurs if you miss a closing '}' in your code?": {
        answer: "Syntax Error",
        hint: "This error means there is a mistake in the 'grammar' or structure of your code."
      },
      "In the array ['Apple', 'Banana', 'Cherry'], what is the index number of 'Apple'?": {
        answer: "0",
        hint: "Programming languages almost always start counting lists at zero."
      },
      "Which operator is used for 'OR' in JavaScript logic?": {
        answer: "||",
        hint: "It looks like two vertical 'pipes' or bars."
      },
      "What does the command element.classList.toggle('active') do?": {
        answer: "Adds 'active' if it’s missing; removes it if it’s present.",
        hint: "Think of a light switch—it 'toggles' the state back and forth."
      },
      "Which event fires as soon as a user types a single character into an input box?": {
        answer: "'input'",
        hint: "It's a very short event name that matches the name of the tag itself."
      },
      "What is the definition of 'Event Bubbling'?": {
        answer: "When an event triggers on a child element and moves up to its parents.",
        hint: "Think of a bubble in water—it starts at the bottom (child) and rises to the top (parent)."
      },
      "How do you write a single-line comment in JavaScript?": {
        answer: "// Comment",
        hint: "Two forward slashes tell the browser to ignore the rest of the line."
      },
      "What is the difference between null and undefined?": {
        answer: "null is an intentional empty value; undefined means no value was assigned.",
        hint: "One is a 'box' you purposefully left empty; the other is a variable you simply haven't 'defined' yet."
      },
      "How do you convert a string like '5' into an actual mathematical number?": {
        answer: "Number('5')",
        hint: "Use the built-in function that shares the same name as the data type you want."
      },
      "What is the default Boolean value of an empty string ''?": {
        answer: "False",
        hint: "Empty values in JavaScript are considered 'falsy'."
      },
      "What is the correct code to select an element with a class named 'hero-image'?": {
        answer: "document.querySelector('.hero-image')",
        hint: "Don't forget the dot (.) which is the CSS symbol for a class."
      },
      "What happens if you declare a variable with 'const' and then try to change its value later?": {
        answer: "The browser throws a TypeError.",
        hint: "Constants are 'constant'—they aren't allowed to change type or value."
      },
      "Why is JavaScript called a 'Client-Side' language?": {
        answer: "It runs in the user's browser, not on a remote server.",
        hint: "The 'client' refers to the person's computer viewing the site."
      },
      "What happens if you try to select an element that does not exist in the HTML using querySelector?": {
        answer: "It returns null.",
        hint: "JavaScript returns this specific 'empty' value when it looks for something and finds nothing."
      },
      "Which keyword is used to declare a variable that is expected to change its value?": {
        answer: "let",
        hint: "'Let' it change! This keyword replaced the old 'var' for changeable values."
      },
      "What is the result of '5' + 5 in JavaScript?": {
        answer: "55",
        hint: "When you add a string and a number, JavaScript just 'glues' (concatenates) them together."
      },
      "What is the result of '5' - 1 in JavaScript?": {
        answer: "4",
        hint: "Unlike addition, subtraction forces the string to become a number and performs real math."
      },
      "Which method prevents a form from submitting and refreshing the page?": {
        answer: "event.preventDefault()",
        hint: "You are telling the browser to 'prevent' its 'default' behavior."
      },
      "What does the 'DOMContentLoaded' event listener do?": {
        answer: "It ensures the HTML is fully parsed before the JavaScript runs.",
        hint: "It waits for the 'Document Object Model' content to finish loading."
      },
      "If you want an action to happen when a user moves their mouse over an image, which event do you listen for?": {
        answer: "mouseover",
        hint: "Think of the event where the mouse moves 'over' the element."
      },
      "How do you write a multi-line comment in JavaScript?": {
        answer: "/* Comment */",
        hint: "It starts with a slash-star and ends with a star-slash."
      },
      "Which of the following is NOT a primitive data type in JavaScript?": {
        answer: "Object",
        hint: "Primitives are simple values (strings, numbers, booleans); this type is complex and holds multiple values."
      },
      "What does the console.log() function do?": {
        answer: "Prints messages to the browser's developer tools for debugging.",
        hint: "It 'logs' info to the hidden 'console' window used by coders."
      },
      "What is an Array in JavaScript?": {
        answer: "A single variable that holds a numbered list of multiple items.",
        hint: "Think of a physical shopping list where every item has a number."
      },
      "What is an Object in JavaScript?": {
        answer: "A variable that holds data in descriptive 'key: value' pairs.",
        hint: "Think of a 'dictionary' entry where you have a word (key) and a definition (value)."
      },
      "How do you access the 'name' property of an object named 'player'?": {
        answer: "player.name",
        hint: "Use 'dot notation' to look inside the object for a specific property."
      },
      "Which loop is specifically designed to iterate over the values in an Array?": {
        answer: "for...of",
        hint: "You want to perform a loop 'for' every item 'of' the array."
      },
      "What does document.createElement('div') do?": {
        answer: "It creates a new div invisibly in the browser's memory.",
        hint: "It builds the element, but it isn't 'on the page' until you append it to a parent."
      },
      "After creating a new HTML element with JavaScript, how do you make it visible on the page?": {
        answer: "parent.appendChild(element)",
        hint: "You must 'append' the new item as a 'child' to an existing parent on the page."
      },
      "What is the purpose of Template Literals (backticks ` `)?": {
        answer: "To easily inject JavaScript variables into text strings using ${ }.",
        hint: "These special strings allow you to 'template' data directly into the text."
      },
      "If you have an array `const colors = ['red', 'blue', 'green']`, what does `colors.length` return?": {
        answer: "3",
        hint: "Length counts the actual number of items in the list (starting at 1, not 0)."
      },
      "What does `classList.add('hide')` do?": {
        answer: "Adds the class 'hide' to the element's existing classes.",
        hint: "It modifies the 'classList' by 'adding' a new CSS rule."
      },
      "Which of the following is an example of Server-Side scripting?": {
        answer: "Checking a username and password against a database to log in.",
        hint: "Any task requiring access to a secure 'database' usually happens on the server."
      },
      "What is a 'ReferenceError'?": {
        answer: "Trying to use a variable that hasn't been declared or doesn't exist.",
        hint: "The browser is trying to 'refer' to something it can't find."
      },
      "What does the 'return' keyword do in a function?": {
        answer: "It stops the function and sends a specific value back to wherever the function was called.",
        hint: "It exits the function and 'returns' a result."
      },
      "What are 'Parameters' in a function?": {
        answer: "The variables declared inside the parentheses that act as 'ingredients' for the function to use.",
        hint: "Think of them as the 'variables' the function expects to receive to do its job."
      },
      "If a function is defined as `function multiply(a, b)`, what happens when you call `multiply(5, 2)`?": {
        answer: "It assigns 5 to 'a' and 2 to 'b' for that specific execution.",
        hint: "The inputs are mapped to the parameters in the exact same order."
      },
      "What is the difference between declaring a function and calling a function?": {
        answer: "Declaring builds the instructions; calling actually executes those instructions.",
        hint: "Declaring is writing the recipe; calling is actually cooking the meal."
      },
      "In the logic `if (score >= 10)`, what does `>=` mean?": {
        answer: "Greater than or equal to",
        hint: "It checks if the first number is bigger than OR exactly the same as the second."
      },
      "What does the Logical NOT (!) operator do?": {
        answer: "It toggles a boolean, turning true to false, and false to true.",
        hint: "Think of it as the 'opposite' operator."
      },
      "If you want an 'if' statement to run ONLY when two separate conditions are both true, which operator do you use?": {
        answer: "&&",
        hint: "This is the 'AND' operator."
      },
      "What is 'Scope' in programming?": {
        answer: "The rule defining where variables can be 'seen' or used (Global vs. Local).",
        hint: "It determines the 'territory' where a variable is active."
      },
      "A variable declared inside a function using `let` is:": {
        answer: "Only accessible inside that specific function (Local).",
        hint: "Variables inside functions are 'trapped' in their local scope."
      },
      "What does the += operator do?": {
        answer: "Adds a value to the existing value of the variable.",
        hint: "It is a shortcut for `variable = variable + value`."
      },

      // CHAPTER 10: THE GAME DEV
      "Which method tells the browser to perform an animation and requests a call to a function to update before the next repaint?": {
        answer: "requestAnimationFrame()",
        hint: "This method is preferred over setInterval because it syncs with the browser's refresh rate for smooth motion."
      },
      "When setting up a game loop, in what order should the core functions generally execute?": {
        answer: "Clear canvas -> Update logic -> Draw objects",
        hint: "Think about the lifecycle of a frame: you must wipe the old slate, calculate new positions, and then render the results."
      },
      "How do you stop a game loop when the player loses?": {
        answer: "cancelAnimationFrame()",
        hint: "If you used 'request' to start it, you use this command to 'cancel' the upcoming frame."
      },
      "To prevent an object named player from moving off the left edge of the canvas, which condition should you check?": {
        answer: "if (player.x < 0)",
        hint: "The horizontal (X) coordinate of the canvas starts at zero on the far left."
      },
      "What property of a keyboard event tells you the physical key that was pressed (like 'ArrowRight')?": {
        answer: "event.code",
        hint: "This property returns the exact string name for the key regardless of capitalization or modifiers."
      },
      "In JavaScript ES6, what function runs automatically when a new instance of a class is created?": {
        answer: "constructor()",
        hint: "This function is used to 'construct' the initial properties of your object (like health or position)."
      },
      "How do you create a brand new enemy from an Enemy class?": {
        answer: "new Enemy()",
        hint: "You must use the keyword that indicates you are creating a 'new' instance of the blueprint."
      },
      "If you have an array of asteroids, how do you remove the first one from the array after it is destroyed?": {
        answer: "asteroids.shift()",
        hint: "This array method 'shifts' the whole list by removing the item at index 0."
      },
      "Which Canvas API method is used to render an image asset (like a character sprite) onto the screen?": {
        answer: "ctx.drawImage()",
        hint: "You are telling the 'context' (ctx) to literally 'draw' an 'image'."
      },
      "Axis-Aligned Bounding Box (AABB) collision detection requires checking the overlap of which properties?": {
        answer: "x, y, width, and height",
        hint: "Rectangular collision relies on checking the boundaries of the boxes in 2D space."
      },
      "If player.y + player.height >= canvas.height evaluates to true, what is happening?": {
        answer: "The player is touching the bottom of the canvas",
        hint: "The Y coordinate increases as you move down; this check sees if the player's bottom edge passed the floor."
      },
      "To apply basic gravity to a jumping character, what must you do every frame?": {
        answer: "Add a constant value to the character's vertical velocity",
        hint: "Gravity is a constant force pulling downward; it makes the speed increase over time."
      },
      "How do you detect if a user has released a key to stop moving?": {
        answer: "'keyup'",
        hint: "This event triggers specifically when the key is no longer pressed (goes 'up')."
      },
      "What mathematical object is required to generate a random spawning location for an item?": {
        answer: "Math",
        hint: "All calculations for randomness (Math.random) or rounding live inside this built-in object."
      },
      "If a game runs too fast on high-refresh-rate monitors, what concept is used to normalize the speed?": {
        answer: "Delta Time",
        hint: "This is the difference in time between the current frame and the last frame."
      },
      "How can you completely clear the entire canvas element ctx?": {
        answer: "ctx.clearRect(0, 0, canvas.width, canvas.height)",
        hint: "You are telling the context to 'clear' a 'rect' from the top-left (0,0) to the full dimensions."
      },
      "To check for circular collision, which mathematical theorem is typically applied to find the distance between center points?": {
        answer: "Pythagorean theorem",
        hint: "A² + B² = C². You need this to find the direct distance (the hypotenuse) between two circles."
      },
      "What is the main advantage of using a Class to build game objects?": {
        answer: "It encapsulates properties and methods for reuse",
        hint: "Classes act as templates so you can spawn hundreds of objects without rewriting the code each time."
      },
      "When building a Start Screen, how do you prevent the main game loop from running until a button is clicked?": {
        answer: "Wrap requestAnimationFrame inside a conditional state check",
        hint: "You only trigger the animation function if a 'gameState' variable equals 'playing'."
      },
      "What does Math.floor(Math.random() * 10) return?": {
        answer: "An integer between 0 and 9",
        hint: "Random produces 0 to 0.99; multiplying by 10 and rounding 'down' gives you single digits."
      },
      "Which method is used to get the 2D drawing context for a canvas element?": {
        answer: "getContext('2d')",
        hint: "You are 'getting' the 'context' specifically for '2d' rendering."
      },
      "What happens if you don't call clearRect() or fillRect() at the start of every frame?": {
        answer: "The previous frames' drawings will stay on the screen (smearing)",
        hint: "Without clearing, you are drawing on top of old paintings, creating a 'trail' or 'smear'."
      },
      "In a class, what does the 'this' keyword refer to?": {
        answer: "The specific instance of the object being created/updated",
        hint: "It refers to 'this' person/object right now, distinguishing it from other enemies or players."
      },
      "Which coordinate represents the top-left corner of the canvas?": {
        answer: "(0, 0)",
        hint: "In computer graphics, the origin point starts at the very top and very left."
      },
      "To move an object to the right, what must you do to its X coordinate?": {
        answer: "Add a positive value to x",
        hint: "X increases as you move from left to right."
      },
      "How do you define a new method inside a JavaScript class?": {
        answer: "MethodName() { }",
        hint: "Methods are functions defined directly inside the class body without using the word 'function'."
      },
      "What is 'Sprite Sheet' animation?": {
        answer: "One large image containing multiple frames of animation",
        hint: "Instead of 10 separate files, you use one big 'sheet' and draw small slices of it over time."
      },
      "When using ctx.arc(), which parameter defines the size of the circle?": {
        answer: "radius",
        hint: "It's the distance from the center point to the outer edge."
      },
      "Which property allows you to change the color of a shape before calling fill?": {
        answer: "ctx.fillStyle",
        hint: "You are setting the 'style' used to 'fill' the shape."
      },
      "How do you create an 'infinite' wrap-around effect on the X-axis?": {
        answer: "if (x > width) x = 0",
        hint: "If the object's position goes past the right edge, you reset it to the start."
      },
      "Which array method is best for adding a newly spawned projectile to a list of active bullets?": {
        answer: "bullets.push()",
        hint: "This method 'pushes' a new item onto the end of the array."
      },
      "What is the purpose of a 'Game State' variable (like gameState = 'menu')?": {
        answer: "To control which screens or logic blocks are active",
        hint: "It acts as a traffic controller to decide if we are showing the menu, the game, or the end screen."
      },
      "Why is requestAnimationFrame better than setInterval for games?": {
        answer: "It syncs with the monitor's refresh rate and pauses when the tab is inactive",
        hint: "It is more efficient because it doesn't waste energy drawing when the user isn't looking."
      },
      "If you want a bullet to travel upwards, what should its Y-velocity be?": {
        answer: "A negative number",
        hint: "Since 0 is the top, moving 'up' means the Y coordinate must get smaller."
      },
      "What does the 'ctx.save()' and 'ctx.restore()' pair do?": {
        answer: "Saves and resets the current drawing state (rotation, scale, colors)",
        hint: "Think of it like taking a snapshot of your settings so you can mess with them and then go back to normal."
      },
      "How do you rotate an object on the canvas?": {
        answer: "Use ctx.rotate() after translating to the object's center",
        hint: "Rotation happens around the (0,0) origin, so you have to move the origin to the object first."
      },
      "What is 'Hitbox'?": {
        answer: "The invisible area used to calculate collisions",
        hint: "It is the geometric boundary (often smaller than the sprite) used for 'hit' detection."
      },
      "In circular collision detection, when has a collision occurred?": {
        answer: "When the distance between centers is less than the sum of the radii",
        hint: "If the 'gap' between the two centers is shorter than the two circles' sizes combined, they are overlapping."
      },
      "Which event listener is used to track the mouse position on the canvas?": {
        answer: "'mousemove'",
        hint: "This triggers every time the mouse 'moves'."
      },
      "How do you draw text on the canvas?": {
        answer: "ctx.fillText()",
        hint: "You are telling the context to 'fill' the screen with 'text'."
      },
      "What property determines the thickness of lines drawn with stroke()?": {
        answer: "ctx.lineWidth",
        hint: "You are defining the 'width' of the 'line' being drawn."
      },
      "Which method is used to start a path for drawing custom shapes?": {
        answer: "ctx.beginPath()",
        hint: "This tells the canvas to 'begin' a new 'path' of coordinates."
      },
      "What is 'Parallax Scrolling'?": {
        answer: "Background layers moving at different speeds to create depth",
        hint: "Think of a train ride: the trees nearby move fast, while the distant mountains move slowly."
      },
      "How do you check if a specific key (like 'Space') is currently being held down?": {
        answer: "Store the key state in a boolean variable inside keydown/keyup listeners",
        hint: "Instead of acting on one event, you keep a record (true/false) of whether the key is currently 'pressed'."
      },
      "Which function is used to convert degrees to radians (required for Math.sin/cos)?": {
        answer: "degrees * (Math.PI / 180)",
        hint: "JavaScript's Math functions don't use 360 degrees; they use the 'Pi' circle system."
      },
      "What is 'Friction' in game physics?": {
        answer: "Gradually reducing velocity over time",
        hint: "It's the force that resists motion, making objects eventually slow down and stop."
      },
      "What does 'ctx.globalAlpha' control?": {
        answer: "Transparency of everything drawn on the canvas",
        hint: "Setting this to 0.5 makes everything you draw 50% see-through."
      },
      "If you use asteroids.filter(a => !a.destroyed), what are you doing?": {
        answer: "Creating a new array containing only asteroids that are NOT destroyed",
        hint: "You are 'filtering' the list to keep only the ones that are still active."
      },
      "What is 'Z-Index' equivalent in Canvas?": {
        answer: "The order in which you draw (later items appear on top)",
        hint: "There is no layering property; things drawn last in the code appear 'on top' of things drawn first."
      },
      "Which property of a class instance allows it to 'know' how much health it has left?": {
        answer: "A property defined in the constructor, like this.health",
        hint: "You store individual data points (stats) as properties using the 'this' keyword."
      },
      "How do you make an object 'bounce' off the bottom of the canvas?": {
        answer: "velocity.y *= -1",
        hint: "By multiplying the speed by -1, you reverse the direction of motion."
      },
      "What is the primary purpose of 'Particle Systems' in games?": {
        answer: "To create effects like fire, smoke, or explosions using many small objects",
        hint: "Think about how hundreds of tiny dots can be animated together to look like an explosion."
      },

      // CHAPTER 11: The Cloud (Application Scenarios)
      "A developer is on a plane with no Wi-Fi. Which tool allows them to save snapshots of their code to their local hard drive?": {
        answer: "Git",
        hint: "Think of the software that allows for 'local' version control without needing a server."
      },
      "A team of 4 is working on a website. They want to avoid 'Chaos' where they accidentally overwrite each other's files via email. They need a:": {
        answer: "Version Control System",
        hint: "This is a general system designed to manage and track changes to code for groups."
      },
      "Microsoft owns which popular cloud hub used to host code repositories?": {
        answer: "GitHub",
        hint: "It's the most popular online community for developers to store and share code."
      },
      "A developer wants to test a dangerous new feature without breaking the 'definitive' working version of the site. They should work on a:": {
        answer: "Branch",
        hint: "This allows you to 'split' off from the main timeline to work on something separately."
      },
      "What action is being performed when a developer uploads their local coding history to GitHub?": {
        answer: "Push",
        hint: "You are 'pushing' your local changes up to the remote server."
      },
      "You join a project for the first time and need to download a full copy of the team's code to your machine. Which command do you use?": {
        answer: "git clone",
        hint: "You are creating a perfect 'clone' or copy of the existing project."
      },
      "Two developers edit line 10 of the same file. When they try to combine their work, Git stops and asks for a human to decide. This is a:": {
        answer: "Merge Conflict",
        hint: "This happens when two pieces of code 'conflict' during a merge."
      },
      "A 'Commit Message' is important because it:": {
        answer: "Documents exactly what was changed in that specific snapshot for the team.",
        hint: "It provides a 'label' for the changes so your teammates know what you did."
      },
      "In the 'Pizza' analogy, which model is like 'Take and Bake' where you provide the oven (OS) but rent the dough (Hardware)?": {
        answer: "IaaS",
        hint: "Infrastructure as a Service: you rent the virtual 'hardware' but install your own OS."
      },
      "A startup wants to host a Node.js app. They don't want to manage security patches or hardware; they just want to upload code. They need:": {
        answer: "PaaS",
        hint: "Platform as a Service: you just provide the 'app' code, and they provide the 'platform' to run it."
      },
      "Google Docs and Netflix are examples of which service model?": {
        answer: "SaaS",
        hint: "Software as a Service: you just use the 'software' directly via the browser."
      },
      "Which cloud provider is considered the 'PlayStation' (The original and biggest)?": {
        answer: "Amazon Web Services (AWS)",
        hint: "Owned by the world's largest online retailer."
      },
      "Which cloud provider is the 'Xbox' (The corporate business choice integrated with Windows)?": {
        answer: "Microsoft Azure",
        hint: "Built by the creators of Windows and Office."
      },
      "A bank keeps sensitive social security numbers in a locked vault but runs its public blog on a cheap shared server. This is a:": {
        answer: "Hybrid Cloud",
        hint: "It's a 'hybrid' mix of private and public cloud resources."
      },
      "Cloud computing is often called a 'Nickname' because it actually refers to:": {
        answer: "Physical computers inside secured buildings called Data Centers.",
        hint: "The cloud isn't magic; it's just 'someone else's computer' in a warehouse."
      },
      "Which physical hardware ensures a Data Center stays online even during a city-wide power outage?": {
        answer: "Backup Generators",
        hint: "Huge diesel engines that create electricity when the grid fails."
      },
      "Why do Data Centers need massive industrial cooling systems?": {
        answer: "Because thousands of servers generate extreme heat that would melt them.",
        hint: "Electronics get hot; warehouses full of them get dangerously hot."
      },
      "A site jumps from 100 users to 1,000,000 during a viral event. The ability to add power instantly is called:": {
        answer: "Scalability",
        hint: "The ability for a system to 'scale' up to handle more work."
      },
      "A site scales DOWN at 2:00 AM when everyone goes to sleep, saving the company thousands of dollars. This is called:": {
        answer: "Elasticity",
        hint: "Think of a rubber band: it stretches when needed and snaps back to save space/cost."
      },
      "Cloud resources are typically paid for using which model?": {
        answer: "Pay-As-You-Go (by the minute/second)",
        hint: "It's like a utility bill (water/power) where you only pay for what you use."
      },
      "In a relational database, the unique ID for a row is the:": {
        answer: "Primary Key",
        hint: "The 'primary' way to identify one specific record."
      },
      "Which SQL command is used to 'Read' or retrieve information?": {
        answer: "SELECT",
        hint: "You use this to 'select' which data columns you want to see."
      },
      "A hacker tries to 'trick' a database by typing code into a search box. This is called:": {
        answer: "SQL Injection",
        hint: "They are 'injecting' malicious SQL code into your app's queries."
      },
      "Why should you NEVER save passwords in 'plain text'?": {
        answer: "If the database is stolen, hackers have every user's actual password.",
        hint: "Passwords should be scrambled so they are unreadable to humans."
      },
      "What is the 'One-way mathematical meat-grinder' used to secure passwords?": {
        answer: "Hashing",
        hint: "It turns a password into a unique fingerprint that cannot be reversed."
      },
      "If you need to get the latest updates from your team's GitHub repo to your laptop, you use:": {
        answer: "git pull",
        hint: "You are 'pulling' the new changes down to your machine."
      },
      "The 'Main' or 'Master' branch represents:": {
        answer: "The default, definitive timeline of working code.",
        hint: "It's the 'source of truth' for the project's production code."
      },
      "Which cloud model is like 'Renting an apartment in a skyscraper' where hardware is shared?": {
        answer: "Public",
        hint: "Resources are 'publicly' available to anyone with a credit card."
      },
      "An Operating System (OS) like Linux on a server is responsible for:": {
        answer: "Managing the physical hardware and resources.",
        hint: "It's the software layer that 'operates' the hardware for the apps."
      },
      "If a developer writes 'DELETE FROM Users;' but forgets the 'WHERE' clause, what happens?": {
        answer: "Every user in the entire table is deleted.",
        hint: "Without a filter, the command applies to every single row."
      },
      "Which 'Reality' overlays digital graphics onto your real-world camera view?": {
        answer: "AR",
        hint: "Augmented Reality (like Pokemon Go or IKEA filters)."
      },
      "What is the main benefit of a Content Delivery Network (CDN)?": {
        answer: "It hosts copies of media globally to reduce lag for users.",
        hint: "It puts the content geographically closer to the user."
      },
      "A 'Single Page Application' (SPA) creates a fast experience by:": {
        answer: "Dynamically swapping content inside one HTML shell without refreshing.",
        hint: "The browser stays on one page and only updates the parts that change."
      },
      "Which language is used to build the logic and API fetching of a web app?": {
        answer: "JavaScript",
        hint: "The 'brains' of the web that handles interaction and data."
      },
      "An API is often compared to a 'Waiter' because it:": {
        answer: "Takes your request and brings back a response from the kitchen (server).",
        hint: "It acts as the messenger between your app and a remote service."
      },
      "What is the lightweight text format used by APIs to deliver data?": {
        answer: "JSON",
        hint: "JavaScript Object Notation."
      },
      "An 'API Key' is used to:": {
        answer: "Identify and authenticate your app to a service.",
        hint: "It's like a specialized username/password just for your application."
      },
      "Which IoT hardware component is responsible for gathering data from the environment?": {
        answer: "Sensors",
        hint: "They 'sense' things like temperature, light, or movement."
      },
      "What is a major security flaw in many mass-produced IoT devices?": {
        answer: "They have weak default passwords.",
        hint: "Manufacturers often ship them with easy-to-guess credentials like 'admin'."
      },
      "Which AI application recognizes patterns to filter spam email?": {
        answer: "Pattern Recognition",
        hint: "AI looks for common 'patterns' in known spam messages."
      },
      "When an AI makes prejudiced decisions because of its training data, it is called:": {
        answer: "Algorithmic Bias",
        hint: "The 'bias' comes from the data used to 'train' the AI algorithm."
      },
      "Which interface is designed for speech and natural language (like Alexa)?": {
        answer: "VUI",
        hint: "Voice User Interface."
      },
      "What acts as the 'Architectural Blueprint' before any code is written?": {
        answer: "Wireframe",
        hint: "A low-fidelity drawing of the site's layout."
      },
      "Which HTTP status code means 'Success'?": {
        answer: "200",
        hint: "The standard code for 'OK'."
      },
      "Which HTTP status code means the server is broken?": {
        answer: "500",
        hint: "Internal Server Error."
      },
      "Deployment is the process of moving code from:": {
        answer: "A private local folder to a live public server.",
        hint: "Moving the project from 'your house' to the 'storefront'."
      },
      "What is the 'Curb Cut Effect'?": {
        answer: "Designing for marginalized users which ends up helping everyone.",
        hint: "Think about how sidewalk ramps help both wheelchairs and strollers."
      },
      "A 'Full Stack' developer is comfortable working on:": {
        answer: "Both the Front-End and the Back-End.",
        hint: "They can handle the whole 'stack' of technology."
      },
      "What is the 'STAR' method used for in portfolios?": {
        answer: "Structuring project Case Studies.",
        hint: "Situation, Task, Action, Result."
      },
      "Why is 'Continuous Deployment' better than manual FTP?": {
        answer: "It automatically updates the site when you push to GitHub.",
        hint: "It removes the 'human error' step of manually uploading files."
      },
      "What does DNS do?": {
        answer: "Translates URLs (google.com) into numeric IP addresses.",
        hint: "It's the 'phonebook' of the internet."
      },
      "In an NDA, what is a 'Survival Clause'?": {
        answer: "A rule that you must keep secrets even after you leave the company.",
        hint: "The duty to keep the secret 'survives' the end of the employment."
      },

      // CHAPTER 12: The Manager
      "What does CMS stand for?": {
        answer: "Content Management System",
        hint: "A 'system' designed to 'manage' website 'content'."
      },
      "What is the primary difference between a builder and a manager in web design?": {
        answer: "Managers use a pre-built CMS to post content quickly without coding from scratch.",
        hint: "Builders code from scratch; managers use tools to organize existing parts."
      },
      "Which platform represents the 'Rental' model where the hosting company manages everything for you?": {
        answer: "WordPress.com",
        hint: "The commercial version where you pay for convenience and hosting."
      },
      "Which platform represents the 'Owner' model where you download free software and host it yourself?": {
        answer: "WordPress.org",
        hint: "The open-source version where you are the 'architect' and host."
      },
      "What is the WordPress 'Dashboard'?": {
        answer: "The private back-end mission control for the website.",
        hint: "The 'admin' area where you control everything."
      },
      "What controls the 'Look' or visual design of a WordPress site?": {
        answer: "A Theme",
        hint: "Think of it like the 'outfit' or 'skin' of the website."
      },
      "What is used to add new functionality (like a store or contact form) to a WordPress site?": {
        answer: "A Plugin",
        hint: "You 'plug' them 'in' to get new features."
      },
      "What is the Media Library in a CMS?": {
        answer: "The digital warehouse where all uploaded photos and videos are stored.",
        hint: "The central location for all your visual assets."
      },
      "How do you typically access the hidden back-end login screen of a standard WordPress site?": {
        answer: "Adding /wp-admin to the URL",
        hint: "The slash followed by the abbreviation for 'WordPress Admin'."
      },
      "What is a WordPress 'Post'?": {
        answer: "A timely, reverse-chronological news article or blog update.",
        hint: "A piece of content that has a specific date and timestamp."
      },
      "What is a WordPress 'Page'?": {
        answer: "Timeless, permanent information like an 'About Us' section.",
        hint: "Content that doesn't expire or belong on a news feed."
      },
      "Which piece of content relies heavily on Categories and Tags for searching?": {
        answer: "Posts",
        hint: "Because there can be hundreds of them, they need organization labels."
      },
      "What is the modern default WordPress editor called?": {
        answer: "The Block Editor (Gutenberg)",
        hint: "Named after the inventor of the printing press."
      },
      "How does the Block Editor handle content?": {
        answer: "Every paragraph, image, or video is its own movable block.",
        hint: "Content is broken down into modular 'blocks'."
      },
      "Where do you find the button to add new elements in the Block Editor?": {
        answer: "The '+' Icon",
        hint: "The universal symbol for 'add' or 'new'."
      },
      "If the Block Editor doesn't have a specific visual feature you need, how can you write code directly?": {
        answer: "Use a 'Custom HTML Block'.",
        hint: "There is a specific block designed for 'custom' code."
      },
      "What is a 'Featured Image'?": {
        answer: "The main thumbnail people see when the post is shared on social media.",
        hint: "The 'cover photo' for a specific post."
      },
      "In the 'Smartphone' analogy, what do WordPress Plugins represent?": {
        answer: "The apps you download to give the phone new powers.",
        hint: "Small software add-ons that perform specific tasks."
      },
      "What happens to your blog posts if you switch to a completely different WordPress Theme?": {
        answer: "The design changes, but the text and posts remain perfectly intact.",
        hint: "Content and Design are kept in separate 'compartments'."
      },
      "Why is WordPress.org the professional standard over website builders like Wix?": {
        answer: "Total freedom and ownership of every line of code.",
        hint: "You aren't locked into one company's tools."
      },
      "Which of the following is NOT a popular Content Management System?": {
        answer: "Photoshop",
        hint: "This is a photo editor, not a website manager."
      },
      "What does it mean that WordPress is 'Open-Source'?": {
        answer: "The source code is free and available for anyone to inspect, modify, and enhance.",
        hint: "The 'recipe' is public."
      },
      "Why might 'Manager Mike' prefer a CMS over hand-coding HTML?": {
        answer: "He wants to log in, write a headline, and publish quickly without touching code.",
        hint: "Speed and ease of use for non-technical users."
      },
      "When you change the 'Site Title' in WordPress General Settings, what happens?": {
        answer: "The browser tab and site header update instantly across the entire site.",
        hint: "It changes the global name of the project."
      },
      "If you want to create a 'Contact Us' section that lives in your main menu, should you use a Post or a Page?": {
        answer: "Page",
        hint: "It's permanent info that doesn't need a date."
      },
      "If you want to announce a weekend sale that expires on Sunday, should you use a Post or a Page?": {
        answer: "Post",
        hint: "It's a timely announcement."
      },
      "What is a 'Widget' in the context of a CMS?": {
        answer: "A small block that performs a specific function, often placed in sidebars or footers (like a search bar or calendar).",
        hint: "A mini-app that lives in the 'corners' of your site."
      },
      "What programming language powers the logic and templates of WordPress?": {
        answer: "PHP",
        hint: "The server-side language used for most CMS platforms."
      },
      "What is the primary risk of installing too many WordPress plugins?": {
        answer: "They can slow down the site, cause conflicts, and create security vulnerabilities.",
        hint: "Too much software makes the system 'heavy' and harder to protect."
      },
      "How do you ensure a WordPress site remains secure from hackers?": {
        answer: "Regularly update the WordPress core, themes, and plugins to patch vulnerabilities.",
        hint: "Always keep your software on the latest 'version'."
      },
      "What is the difference between a 'Draft' and a 'Published' post?": {
        answer: "Drafts are saved in the back-end but hidden from the public; Published posts are live.",
        hint: "One is a 'work in progress'; the other is 'out in the world'."
      },
      "What feature in the Block Editor allows you to move a paragraph above an image?": {
        answer: "The drag-and-drop handles or up/down arrows on the block.",
        hint: "Controls that allow you to change the order of blocks."
      },
      "Where do you manage the layout of your site's navigation links?": {
        answer: "Appearance > Menus",
        hint: "The 'Menu' area under the 'Appearance' tab."
      },
      "What does the 'Screen Options' tab do in the Dashboard?": {
        answer: "Allows you to hide or show specific panels on your admin screen to reduce clutter.",
        hint: "Settings that change what 'options' you see on your 'screen'."
      },
      "If a Theme is the 'clothes' of a website, what is the database?": {
        answer: "The brain/memory that remembers the content.",
        hint: "The place where the actual text and settings are stored."
      },
      "Can you switch WordPress Themes without losing your Media Library uploads?": {
        answer: "Yes, content and design are completely separate.",
        hint: "Changing your clothes doesn't erase your memories."
      },
      "What is 'WooCommerce'?": {
        answer: "The most popular e-commerce plugin that turns a WordPress site into an online store.",
        hint: "The plugin that adds a 'shopping cart' to WordPress."
      },
      "Why is it important to assign 'Roles' (like Editor, Author, Contributor) to users in a CMS?": {
        answer: "To restrict permissions so an author can't accidentally delete the entire website or change the theme.",
        hint: "Not everyone should have the keys to the whole building."
      },
      "Which user role has absolute total control over every aspect of a WordPress site?": {
        answer: "Administrator",
        hint: "The 'admin' who rules the site."
      },
      "What is a WordPress 'Revision'?": {
        answer: "An automatically saved previous version of a post that you can restore if you make a mistake.",
        hint: "A 'backup' of an individual post."
      },
      "How does a CMS help with SEO (Search Engine Optimization)?": {
        answer: "By automatically generating clean HTML structure, sitemaps, and allowing plugins (like Yoast) to optimize keywords.",
        hint: "It helps Google find and understand your site content."
      },
      "What is a 'Shortcode'?": {
        answer: "A small piece of code in brackets (e.g., [gallery]) that executes a larger script or plugin feature within a post.",
        hint: "A 'short' bit of 'code' used in the editor."
      },
      "If you want to build a highly customized page layout that the standard Block Editor can't handle, what type of plugin would you install?": {
        answer: "A Page Builder Plugin (like Elementor or Divi)",
        hint: "A plugin specifically for 'building' complex 'pages'."
      },
      "What is 'Caching' in the context of a CMS?": {
        answer: "Creating static copies of dynamic pages so they load much faster for visitors.",
        hint: "Storing a 'ready-made' version of the page so the server doesn't have to think."
      },
      "What does it mean if a plugin has not been 'tested with your current version of WordPress'?": {
        answer: "It might be abandoned by its developer and could break your site or introduce security flaws.",
        hint: "The plugin might be out-of-date or 'abandonware'."
      },
      "How can you tell if a piece of software is truly a CMS?": {
        answer: "It separates the content creation from the code structure and design.",
        hint: "Content and Design live in separate worlds."
      },
      "What is the primary advantage of a 'No-Code' builder like Squarespace compared to a CMS like WordPress?": {
        answer: "They are easier and faster for absolute beginners with no technical knowledge to set up.",
        hint: "Simplicity and speed for new users."
      },
      "What is the primary disadvantage of a 'No-Code' builder like Wix?": {
        answer: "Vendor lock-in: you do not own the code and cannot easily move your site to a different hosting provider.",
        hint: "You are stuck with one 'vendor'."
      },
      "If 'Manager Mike' accidentally deletes a paragraph in the Block Editor, what is the fastest way to get it back?": {
        answer: "Use the 'Undo' button (or Ctrl+Z) in the editor.",
        hint: "The standard 'oops' fix."
      },
      "Where would you typically place a copyright notice that needs to appear on every single page of the site?": {
        answer: "In the Footer (via Widgets or Theme Customizer).",
        hint: "The very bottom of the page."
      },
      "What is the purpose of the 'Permalink' setting?": {
        answer: "To control the structure of the URL (e.g., making it /about-us instead of /?p=123) for better SEO and readability.",
        hint: "It makes the link look 'clean' and permanent."
      },
      "Before updating the WordPress core or installing a major plugin, what is the single most important action a professional developer must take?": {
        answer: "Perform a complete database and file Backup.",
        hint: "Saving a copy of the site in case something breaks."
      },

      // CHAPTER 13: The Network
      "What does the acronym API stand for?": {
        answer: "Application Programming Interface",
        hint: "Think of an 'Interface' that allows one 'Application' to 'Program' or talk to another."
      },
      "In the 'Waiter Analogy', what does the Kitchen represent?": {
        answer: "The Server and its Database.",
        hint: "The place where the actual work happens and the 'food' (data) is stored."
      },
      "What is an API 'Endpoint'?": {
        answer: "A specific URL where a service can be accessed by a client application.",
        hint: "The specific 'address' you visit to get a specific piece of data."
      },
      "Which HTTP method is the industry standard for 'Retrieving' or 'Reading' data?": {
        answer: "GET",
        hint: "You use this when you want to 'get' something from the server."
      },
      "Which HTTP method is used to send data to the server to 'Create' a new record?": {
        answer: "POST",
        hint: "You are 'posting' new information to the server's records."
      },
      "What does JSON stand for?": {
        answer: "JavaScript Object Notation",
        hint: "A way of 'noting' down data using 'JavaScript Objects'."
      },
      "How does JSON structure its data?": {
        answer: "Using 'key: value' pairs that look exactly like JavaScript objects.",
        hint: "Think of a label (key) and the item it describes (value)."
      },
      "Why is the `fetch()` command in JavaScript considered 'Asynchronous'?": {
        answer: "Because it runs in the background, allowing the rest of the website to load while waiting for the server's response.",
        hint: "The code doesn't stop and wait; it carries on with other tasks while the network works."
      },
      "What is a JavaScript 'Promise'?": {
        answer: "An object representing the eventual completion (or failure) of an asynchronous network operation.",
        hint: "A 'promise' that the data will arrive eventually (or an error will be reported)."
      },
      "What happens if you run `const data = fetch('url')` without using the `await` keyword?": {
        answer: "The variable 'data' is filled with a 'Pending Promise' rather than the actual data.",
        hint: "The variable gets the 'promise' of data, but not the actual data package yet."
      },
      "What does the `async` keyword do when placed before a function declaration?": {
        answer: "It tells JavaScript that the function will contain asynchronous operations and is allowed to use 'await'.",
        hint: "It unlocks the ability to use 'await' inside that specific function."
      },
      "Why do we need to call `await response.json()` after a successful fetch?": {
        answer: "Because the data comes across the internet as a raw stream of text, and this command translates it back into a usable JavaScript Object.",
        hint: "The raw text 'stream' needs to be parsed into a format JS understands."
      },
      "What does an HTTP Status Code in the 200s (like 200 OK) mean?": {
        answer: "The request was successful and the data is attached.",
        hint: "The universal code for 'everything went right'."
      },
      "What does an HTTP Status Code of 404 signify?": {
        answer: "Not Found (The client requested an endpoint that doesn't exist).",
        hint: "The server is fine, but it can't find the 'page' or 'endpoint' you asked for."
      },
      "What does an HTTP Status Code of 500 signify?": {
        answer: "The server encountered an unexpected condition that prevented it from fulfilling the request (Server Error).",
        hint: "The problem is on the 'other' end—the server's internal logic crashed."
      },
      "What is the primary purpose of a `try/catch` block in network requests?": {
        answer: "To provide a 'safety net' that catches errors (like no Wi-Fi) without crashing the entire application.",
        hint: "If the 'try' part fails, the 'catch' part handles the 'oops' gracefully."
      },
      "What is an API Key?": {
        answer: "A unique string of characters used to authenticate the caller to the API to prevent spam and abuse.",
        hint: "It's like a secret passport that identifies which app is asking for the data."
      },
      "What is 'Rate Limiting'?": {
        answer: "A restriction set by an API provider on how many times you can request data in a certain time period (e.g., 100 requests per hour).",
        hint: "A limit on how fast you can 'ask' for data so you don't overwhelm the server."
      },
      "In the context of the SpaceX API, if you fetch the '/rockets/falcon9' endpoint, what kind of data are you likely to get?": {
        answer: "A single JSON object detailing the specs of the Falcon 9 rocket.",
        hint: "You asked for one specific rocket, so you get one object back."
      },
      "If your `fetch()` request fails entirely (e.g., the user's internet drops), where does the JavaScript execution instantly jump to?": {
        answer: "The `catch` block.",
        hint: "This is the emergency area where code goes when something 'breaks' in the try block."
      },
      "What does the 'CRUD' acronym stand for in database and API operations?": {
        answer: "Create, Read, Update, Delete",
        hint: "The four basic things you can do with any piece of data."
      },
      "Which HTTP method corresponds to the 'Update' action in CRUD?": {
        answer: "PUT/PATCH",
        hint: "You 'put' or 'patch' new info onto an existing record."
      },
      "When making a POST request, where do you typically put the data you are sending (like a new user's email)?": {
        answer: "In the `body` (or payload) of the request.",
        hint: "The data lives inside the 'body' of the HTTP package."
      },
      "What is a 'CORS' error in the browser console?": {
        answer: "Cross-Origin Resource Sharing error; it happens when a server blocks your specific website domain from accessing its API.",
        hint: "The server is refusing to share its resources with your 'origin' (website)."
      },
      "What is API Documentation?": {
        answer: "The 'Menu' provided by the developers that explains exactly what endpoints exist and how to structure your requests.",
        hint: "The 'instruction manual' for using the API."
      },
      "Why is it important to use Template Literals (backticks) when dealing with API data?": {
        answer: "They allow you to easily inject the variables (e.g., `${data.name}`) you received from the JSON into your HTML string.",
        hint: "They make it easy to mix 'static' HTML with 'dynamic' variables."
      },
      "What does `console.error()` do that `console.log()` does not?": {
        answer: "It formats the message in red text in the developer tools, specifically designed for highlighting failures in a `catch` block.",
        hint: "It makes the message stand out in red so you know something failed."
      },
      "If you want to display an image URL that came from a JSON object (e.g., `rocket.flickr_images[0]`), which HTML attribute must you set?": {
        answer: "The `src` of an `<img>` tag.",
        hint: "The attribute that tells the browser where to find the 'source' of the image."
      },
      "What is a Webhook?": {
        answer: "A way for an app to provide other applications with real-time information by pushing data to them instantly when an event occurs.",
        hint: "The server 'hooks' into your app and 'pushes' data to you when something happens."
      },
      "How does a REST API generally differ from a GraphQL API?": {
        answer: "REST has multiple fixed endpoints for different data; GraphQL has one endpoint where you request exactly the shape of data you want.",
        hint: "One uses many specific addresses; the other uses one address with a specific 'question'."
      },
      "What is 'Pagination' in the context of an API request?": {
        answer: "When an API returns millions of results, it splits them into 'pages' (e.g., 20 results at a time) to save bandwidth.",
        hint: "It turns a massive list into small, manageable 'pages'."
      },
      "If an API requires an API key, where is the most common place to include it in your `fetch()` request?": {
        answer: "Appended to the end of the URL (e.g., `?api_key=123`) or in the Headers object.",
        hint: "It's usually part of the web address or hidden in the metadata headers."
      },
      "What is an HTTP 'Header'?": {
        answer: "Invisible metadata sent with a request/response (like specifying content-type or authorization tokens).",
        hint: "The 'labels' on the outside of the data package."
      },
      "Why should you never expose a private API key (like a Stripe payment key) in your client-side JavaScript?": {
        answer: "Anyone can view your JS code in DevTools, steal the key, and rack up massive charges on your account.",
        hint: "Client-side code is public code; if the key is there, anyone can take it."
      },
      "How do developers typically hide private API keys?": {
        answer: "By routing requests through their own secure Backend Server or using Serverless Functions, keeping the key off the client's browser.",
        hint: "They keep the key on a 'private' server that the public can't see."
      },
      "What is a 'Mock API'?": {
        answer: "A fake API server set up for testing purposes during development before the real backend is finished.",
        hint: "A 'fake' version used for practice and testing."
      },
      "What does the term 'Payload' refer to?": {
        answer: "The actual data you are sending to the server in a POST/PUT request.",
        hint: "The 'cargo' or data that the request is carrying."
      },
      "If an API returns an array of 50 users, which JavaScript loop is most efficient for rendering them all to the DOM?": {
        answer: "A for...of loop or the .forEach() method.",
        hint: "You want to perform a task 'for each' user in the list."
      },
      "What is the purpose of a 'Loading Spinner' UI element?": {
        answer: "To provide visual feedback to the user that an asynchronous fetch request is currently pending.",
        hint: "It shows the user that the app is 'thinking' or waiting for the internet."
      },
      "What does it mean if an API is 'Read-Only'?": {
        answer: "It only supports the GET method; you cannot POST, PUT, or DELETE data.",
        hint: "You can 'look' but you can't 'touch' or change the data."
      },
      "Which standard data format preceded JSON but is much heavier because it relies on complex tags (like `<user><name>Anna</name></user>`)?": {
        answer: "XML",
        hint: "An older format that looks a lot like HTML tags."
      },
      "What is 'Serialization' (or `JSON.stringify()`)?": {
        answer: "Converting a usable JavaScript Object into a raw string of JSON text so it can be transmitted over a network.",
        hint: "Turning a complex object into a 'string' of text for travel."
      },
      "What is 'Deserialization' (or `JSON.parse()`)?": {
        answer: "Taking a raw string of JSON text received from a network and converting it back into a usable JavaScript Object.",
        hint: "Turning the incoming 'text' back into a 'JavaScript object'."
      },
      "If you call `response.ok` on a fetch response and it returns `false`, what should your code do next?": {
        answer: "Throw an error so the `catch` block can handle the failure gracefully.",
        hint: "You should trigger the 'emergency' handler."
      },
      "What is a 'Timeout' in network requests?": {
        answer: "A mechanism that automatically cancels a fetch request if the server takes too long to respond, preventing the app from hanging forever.",
        hint: "A 'timer' that stops the request if it takes too long."
      },
      "What does it mean when an API is described as 'Stateless' (like a REST API)?": {
        answer: "The server does not remember anything about previous requests; every single request must contain all the information needed to understand it.",
        hint: "The server has 'no memory' of who you are between requests."
      },
      "In a URL, what is a 'Query Parameter'?": {
        answer: "The part of the URL after the `?` used to filter data (e.g., `?limit=10&sort=desc`).",
        hint: "The 'questions' you add to the end of a web address."
      },
      "Which HTTP status code signifies 'Forbidden' (You are logged in, but you don't have permission to see this)?": {
        answer: "403",
        hint: "You have a passport, but you aren't allowed in this room."
      },
      "Which HTTP status code signifies 'Unauthorized' (You need to log in first)?": {
        answer: "401",
        hint: "You don't even have a passport; log in first!"
      },
      "What does it mean to 'Consume' an API?": {
        answer: "To write code that makes requests to an API and uses its data in your own application.",
        hint: "Using the data provided by another service in your own project."
      },
      "Why is 'Astro Anna' using the SpaceX API instead of hardcoding the rocket data?": {
        answer: "So her fan site always displays the most accurate, up-to-date, real-time data automatically.",
        hint: "Because the data changes in real-time and she wants to be accurate."
      },
      "If you forget the `await` keyword before `response.json()`, what will your data variable contain?": {
        answer: "A pending Promise instead of the actual data.",
        hint: "You'll have a 'promise' of data, but the data hasn't arrived yet."
      },

      // CHAPTER 14: The Brain
      "What is the primary problem that a database solves for a dynamic website?": {
        answer: "It solves the 'amnesia' problem by providing permanent, organized memory/storage on a server.",
        hint: "Without it, the website forgets everything the moment the user closes the tab."
      },
      "What is a 'Relational Database' (like MySQL)?": {
        answer: "A database that organizes data into strict tables that are linked to each other using IDs.",
        hint: "Think of a set of interconnected spreadsheets."
      },
      "In relational database table, what is a Primary Key?": {
        answer: "A unique ID number for a specific row, ensuring no two records are identical.",
        hint: "The 'one' unique identifier for that specific person or item."
      },
      "What is a Foreign Key?": {
        answer: "A column in one table that points back to the Primary Key of another table, creating a link between them.",
        hint: "A 'key' that belongs to a 'foreign' table to create a relationship."
      },
      "What does the acronym CRUD stand for in database operations?": {
        answer: "Create, Read, Update, Delete",
        hint: "The four basic operations of data management."
      },
      "Which SQL command corresponds to the 'Read' action in CRUD?": {
        answer: "SELECT",
        hint: "You 'select' which information you want to see."
      },
      "Which SQL command is used to add a brand new record (Create) to a table?": {
        answer: "INSERT INTO",
        hint: "You 'insert' new data into the rows."
      },
      "What does the SQL `WHERE` clause do?": {
        answer: "Filters the results to only include rows that meet a specific condition.",
        hint: "It tells the database 'only show me the ones WHERE this is true'."
      },
      "Why is 'Local Storage' not considered a true database?": {
        answer: "It lives entirely in the user's specific browser, never touches the cloud, and vanishes if they clear their cache or switch devices.",
        hint: "It's 'local' to the computer and not 'shared' with anyone else."
      },
      "Which type of database stores data as flexible 'documents' (like JSON objects) rather than rigid tables with predefined columns?": {
        answer: "NoSQL (Non-Relational)",
        hint: "The 'No' stands for Not Only."
      },
      "What is an SQL Injection (SQLi) attack?": {
        answer: "A hacker typing malicious SQL commands into an input field to trick the server into executing them (like dropping a table).",
        hint: "They 'inject' their own bad code into your database queries."
      },
      "How do professional developers prevent SQL Injection attacks?": {
        answer: "By using 'Parameterized Queries' to sanitize inputs, treating them as harmless text rather than executable commands.",
        hint: "They 'sanitize' the user's input so it can't be run as code."
      },
      "Why is it a cardinal sin to store user passwords in 'plain text'?": {
        answer: "If the database is breached, hackers instantly have the exact passwords to access users' other accounts.",
        hint: "Because anyone who sees the file can read every password."
      },
      "What is 'Password Hashing'?": {
        answer: "A one-way mathematical meat-grinder that turns a password into an irreversible, scrambled fingerprint.",
        hint: "It turns a password into a 'hash' that can't be unscrambled."
      },
      "How does a server verify a login if it only has the hashed password stored?": {
        answer: "It takes the newly typed password, runs it through the exact same hashing algorithm, and checks if the new hash matches the saved hash.",
        hint: "It hashes the new password and compares the fingerprints."
      },
      "What does adding a 'Salt' to a password hash do?": {
        answer: "Adds random characters to the password before hashing, ensuring two users with the same password have completely different hashes.",
        hint: "It 'seasons' the password with random data so the fingerprint is unique."
      },
      "In the context of SQL, what does the `JOIN` command do?": {
        answer: "Combines columns from two or more tables based on a related column (like linking HighScores to Users).",
        hint: "It 'joins' two tables together based on a shared ID."
      },
      "If you execute `DELETE FROM Users;` without a `WHERE` clause, what happens?": {
        answer: "Every single user in the table is deleted.",
        hint: "Without a filter, the command deletes 'everything'."
      },
      "What is the primary characteristic of NoSQL databases like MongoDB or Firebase?": {
        answer: "They are highly flexible, allowing you to store different data structures in the same collection without strict rules.",
        hint: "They don't have rigid 'columns'; they use flexible 'documents'."
      },
      "What does the SQL command `ORDER BY score_value DESC` do?": {
        answer: "Orders the results from highest score to lowest (Descending).",
        hint: "It sorts the data in 'descending' order."
      },
      "What is a 'Database Schema'?": {
        answer: "The structural blueprint that defines the tables, columns, data types, and relationships in a relational database.",
        hint: "The 'blueprint' or 'map' of the database structure."
      },
      "Which data type is best for storing a user's date of birth in a SQL database?": {
        answer: "DATE or DATETIME",
        hint: "The specific data type used for 'dates' and 'times'."
      },
      "What does the `LIMIT 10` clause do at the end of a SQL query?": {
        answer: "Restricts the output to only return the first 10 rows of the result.",
        hint: "It 'limits' the number of results you see."
      },
      "In database design, what is 'Data Normalization'?": {
        answer: "Organizing data to reduce redundancy and improve data integrity (e.g., using Foreign Keys instead of typing a name 100 times).",
        hint: "Keeping data organized so you don't repeat the same info over and over."
      },
      "What is a 'Boolean' field in a database?": {
        answer: "A field that only stores True/False (or 1/0) values.",
        hint: "A 'yes/no' or 'true/false' data type."
      },
      "Which command would you use to modify an existing user's email address in a SQL database?": {
        answer: "UPDATE",
        hint: "You use this when you want to 'update' existing info."
      },
      "What is the danger of assigning the 'Root' or 'Admin' database role to a standard web application?": {
        answer: "If the application is hacked, the attacker gains absolute control over the entire database server.",
        hint: "Giving an app 'admin' powers is dangerous if that app is compromised."
      },
      "What is 'Data Validation'?": {
        answer: "Ensuring that data entered into a system meets specific criteria (e.g., an email field actually contains an '@' symbol) before saving it.",
        hint: "Checking that the data is 'valid' before you save it."
      },
      "Where should Data Validation occur for maximum security?": {
        answer: "Both on the Client-Side (for user experience) AND on the Server-Side (for actual security).",
        hint: "You should check it both in the browser and on the server."
      },
      "In Local Storage, data is always saved as what data type?": {
        answer: "A String (Text)",
        hint: "Local storage only understands 'text'."
      },
      "How do you store a complex JavaScript Object into Local Storage?": {
        answer: "You must use `JSON.stringify(object)` to turn it into a string before saving.",
        hint: "You have to 'stringify' the object first."
      },
      "How do you retrieve a complex string from Local Storage and turn it back into a JavaScript Object?": {
        answer: "Using `JSON.parse(string)`.",
        hint: "You 'parse' the string back into an object."
      },
      "What is the maximum storage capacity limit for Local Storage in most browsers?": {
        answer: "5 MB",
        hint: "It's a very small amount, around five megabytes."
      },
      "What does the SQL wildcard `%` mean when used with the `LIKE` operator?": {
        answer: "It represents zero, one, or multiple characters (e.g., `LIKE 'Dan%'` finds 'Dan', 'Daniel', 'Danny').",
        hint: "It's a 'match anything' symbol."
      },
      "If you want to find all users whose last name is EXACTLY 'Smith', which operator do you use?": {
        answer: "=",
        hint: "The standard 'equals' sign."
      },
      "What is an 'Index' in a database?": {
        answer: "A special data structure created to massively speed up search queries on a specific column, much like an index in a book.",
        hint: "It makes searching much 'faster'."
      },
      "What is the primary drawback of adding an Index to every single column in a database?": {
        answer: "It slows down `INSERT`, `UPDATE`, and `DELETE` operations because the index must also be updated every time.",
        hint: "It makes 'saving' or 'changing' data slower."
      },
      "In NoSQL (like Firebase), a 'Collection' is roughly equivalent to what in a SQL database?": {
        answer: "A Table",
        hint: "A container for many documents."
      },
      "In NoSQL (like Firebase), a 'Document' is roughly equivalent to what in a SQL database?": {
        answer: "A Single Row/Record",
        hint: "A single 'item' or 'row' of data."
      },
      "What does it mean for a database to be 'Hosted in the Cloud' (e.g., AWS RDS or MongoDB Atlas)?": {
        answer: "The database lives on a remote, managed server cluster rather than on a computer in your office.",
        hint: "It lives in a data center, not in your building."
      },
      "What is an ORM (Object-Relational Mapper)?": {
        answer: "A tool that allows developers to interact with a database using their preferred programming language (like JavaScript) instead of writing raw SQL queries.",
        hint: "A 'translator' between your code and the database."
      },
      "What happens if a developer forgets to 'Salt' a hashed password?": {
        answer: "Hackers can use pre-computed lists of hashes (Rainbow Tables) to quickly crack common passwords.",
        hint: "Common passwords will always have the same fingerprint, making them easy to guess."
      },
      "Which is a more secure, modern algorithm for password hashing?": {
        answer: "bcrypt or Argon2",
        hint: "The two most popular 'modern' hashing methods."
      },
      "What is 'Session Management'?": {
        answer: "The process of securely keeping a user logged in as they navigate from page to page, usually using cookies or tokens.",
        hint: "The system that remembers you are logged in."
      },
      "What is a JSON Web Token (JWT)?": {
        answer: "A secure, encoded string used to verify a user's identity between the client and server without needing to store a session in the database.",
        hint: "A 'token' used for authentication."
      },
      "If a database transaction involves multiple steps (e.g., deducting money from Account A and adding it to Account B), what ensures that either ALL steps succeed or NONE of them do?": {
        answer: "An ACID-compliant Transaction mechanism.",
        hint: "It's called a 'transaction'."
      },
      "What does the `COUNT()` function do in SQL?": {
        answer: "Returns the number of rows that match a specified criterion.",
        hint: "It 'counts' the number of items."
      },
      "What does the `SUM()` function do in SQL?": {
        answer: "Calculates the total mathematical sum of a numeric column.",
        hint: "It 'sums' up the numbers."
      },
      "If 'Competitive Cody' is playing ByteBox, where should his final High Score be saved so his friends can see it?": {
        answer: "A Server-Side Database",
        hint: "It needs to be 'shared' in the cloud."
      },
      "If 'Competitive Cody' clicks a button to toggle the game music off, where is the best place to save that preference?": {
        answer: "Local Storage",
        hint: "It only matters for his specific browser."
      },
      "What is the defining characteristic of a 'Primary Key'?": {
        answer: "It must contain a unique value for each row and cannot be null.",
        hint: "It's 'unique' and 'never empty'."
      },
      "What does it mean to 'Drop' a database table?": {
        answer: "To permanently delete the entire table structure and all the data inside it.",
        hint: "You are 'dropping' or deleting the whole thing forever."
      },

      // (CHAPTER 15) --- THE FUTURE (EMERGING TECH, APIs & WEB 3.0)
      "Which of the following best describes a Single Page Application (SPA)?": {
        answer: "A web app that loads a single HTML page and dynamically updates as the user interacts.",
        hint: "In an SPA, the browser stays on one page; only parts of it swap out via JavaScript."
      },
      "In modern web development, which language is primarily used to build the interactive logic of a Web App?": {
        answer: "JavaScript",
        hint: "The language of interaction and browser-side logic."
      },
      "When a developer uses a 'Framework' like React or Vue, what is the primary benefit?": {
        answer: "It provides pre-written code and components to speed up development.",
        hint: "Frameworks act as pre-built LEGO kits for code, offering modular UI building blocks."
      },
      "What is the primary role of an API Key?": {
        answer: "To identify and authenticate the calling program to the API service.",
        hint: "It is like a secret digital ID card for the software calling the service."
      },
      "Which HTTP method is typically used to 'fetch' or 'retrieve' data from an API?": {
        answer: "GET",
        hint: "You use this to 'get' or read information from a server."
      },
      "Which of the following is a common format for data exchanged between an API and a Web App?": {
        answer: "JSON",
        hint: "JavaScript Object Notation is the most common text-based data format."
      },
      "Machine Learning (a subset of AI) improves its performance based on:": {
        answer: "Experience and exposure to data.",
        hint: "The software 'learns' from seeing and processing more information over time."
      },
      "Which AI application is most likely used to filter spam emails?": {
        answer: "Pattern Recognition",
        hint: "Identifying 'patterns' in data that are common to junk or fraudulent mail."
      },
      "What is a 'Chatbot' in the context of emerging web technologies?": {
        answer: "An AI-driven interface that simulates conversation with users.",
        hint: "A virtual assistant or automated agent that users can 'chat' with via text or voice."
      },
      "The 'Internet of Things' (IoT) relies heavily on which type of hardware to collect information?": {
        answer: "Sensors",
        hint: "Physical objects that 'sense' their surroundings (heat, light, movement)."
      },
      "Which of the following is an example of an IoT application in a 'Smart City'?": {
        answer: "Streetlights that turn on automatically when they sense a pedestrian.",
        hint: "Devices communicating with each other and the network to automate city functions."
      },
      "What is a major security concern regarding IoT devices?": {
        answer: "Many have weak default passwords and are easily hacked.",
        hint: "Manufacturers often prioritize ease of setup over deep security protocols."
      },
      "In Augmented Reality (AR), what is the 'Augmentation'?": {
        answer: "Adding digital elements (graphics/sounds) to a live view of the real world.",
        hint: "Digital overlays like filters, maps, or informational signs on your camera view."
      },
      "Virtual Reality (VR) differs from AR because VR:": {
        answer: "Completely immerses the user in a simulated environment.",
        hint: "You cannot see the real world at all; you are 'fully' in a digital world."
      },
      "Which technology is best suited for 'trying on' a pair of sunglasses using a phone's camera?": {
        answer: "AR",
        hint: "Adding digital sunglasses to your real face via a camera stream."
      },
      "Voice User Interface (VUI) design focuses on interaction through:": {
        answer: "Natural language and speech.",
        hint: "Interacting with software using your 'voice' (e.g., Alexa or Siri)."
      },
      "Which term describes an API that is available for any developer to use?": {
        answer: "Open/Public API",
        hint: "An API that is accessible to the public rather than being restricted to one company."
      },
      "What is the primary purpose of a 'Wireframe' in the project design process?": {
        answer: "To create a visual blueprint of the layout and functionality.",
        hint: "A low-fidelity structural plan used to define the user journey before coding."
      },
      "Which of these is a societal concern regarding the advancement of AI?": {
        answer: "Potential job displacement and algorithmic bias.",
        hint: "Considering the human and ethical impact of automation and data prejudices."
      },
      "What does the acronym 'API' stand for?": {
        answer: "Application Programming Interface",
        hint: "A set of protocols for building and integrating application software."
      },
      "When writing asynchronous code in modern JavaScript, which keyword pauses execution until a Promise resolves?": {
        answer: "await",
        hint: "Used inside an async function to tell the code to 'wait' for a network response."
      },
      "What object is instantly returned when you call the `fetch()` method?": {
        answer: "A Promise",
        hint: "A JS object representing the eventual completion (or failure) of the request."
      },
      "If an API request returns an HTTP status code of 404, what does it mean?": {
        answer: "The requested resource or endpoint was not found.",
        hint: "The standard error for missing files or incorrect URLs."
      },
      "If an API request returns an HTTP status code of 500, what does it mean?": {
        answer: "The server encountered an internal error.",
        hint: "A 'Server-Side' error indicating the problem is in the provider's system."
      },
      "An HTTP status code of 200 signifies:": {
        answer: "Success (OK)",
        hint: "The standard code for a successful request where the data is returned."
      },
      "In JavaScript, what is the purpose of a `try / catch` block?": {
        answer: "To handle errors gracefully without crashing the entire script.",
        hint: "A safety net that 'catches' errors like network timeouts or failed requests."
      },
      "What does the 'CI' in CI/CD pipeline stand for?": {
        answer: "Continuous Integration",
        hint: "The practice of frequently 'integrating' and testing new code updates."
      },
      "Which software tool is the industry standard for Version Control?": {
        answer: "Git",
        hint: "A local tool used for tracking file history and collaborating on code."
      },
      "What does 'Serverless Computing' mean?": {
        answer: "Developers upload code functions that run on demand, without managing the underlying physical server hardware.",
        hint: "Renting specific code execution time rather than maintaining a whole virtual machine."
      },
      "What is the primary difference between Artificial Intelligence (AI) and Machine Learning (ML)?": {
        answer: "AI is the broad concept of machines acting smartly; ML is a specific subset where machines learn from data over time.",
        hint: "One is the general field of smart machines, the other is the 'learning' process."
      },
      "What is 'Algorithmic Bias'?": {
        answer: "When an AI system produces systematically prejudiced results due to flawed training data.",
        hint: "Occurs when a computer inherits human prejudices found in the data provided to it."
      },
      "In the context of IoT and wearable tech, what is 'Haptic Feedback'?": {
        answer: "Communication through physical touch or vibration.",
        hint: "Physical sensations, such as a buzz on a smartwatch or vibration in a controller."
      },
      "Why are smart appliances (like IoT refrigerators) often targeted by hackers?": {
        answer: "They are rarely updated by users and serve as an easy backdoor into a home network.",
        hint: "These devices often lack ongoing security updates or are forgotten by the user."
      },
      "How does Web 3.0 primarily differ from Web 2.0 conceptually?": {
        answer: "Web 3.0 focuses on decentralization (like blockchain) rather than centralized corporate servers.",
        hint: "Shifting ownership and data distribution away from a single corporate vault."
      },
      "What does HTTPS provide that standard HTTP does not?": {
        answer: "Data encryption during transit.",
        hint: "The 'S' stands for Secure, indicating that an SSL certificate is active."
      },
      "What is Multi-Factor Authentication (MFA)?": {
        answer: "A security system requiring more than one method of verification (e.g., a password AND a text message code).",
        hint: "Requiring 'two or more' proofs of identity to gain access."
      },
      "What defines 'Open-Source' software?": {
        answer: "Software that anyone can inspect, modify, and enhance.",
        hint: "The raw source code is made 'open' to the public to study and use."
      },
      "A 'Full Stack Developer' is someone who:": {
        answer: "Works comfortably on both the Front-End (UI) and the Back-End (Databases/Servers).",
        hint: "A developer capable of building both the 'look' and the 'brain' of an app."
      },
      "What is the primary focus of a UX/UI Designer?": {
        answer: "The psychology, visual design, and user experience of the interface.",
        hint: "Balancing how the site looks (UI) with how it feels and functions (UX)."
      },
      "What is the primary role of a DevOps Engineer?": {
        answer: "Ensuring smooth code deployment, server scalability, and robust cloud infrastructure.",
        hint: "The bridge between 'Development' and 'Operations'."
      },
      "How does a Prototype differ from a Wireframe?": {
        answer: "A prototype is interactive and clickable, simulating the final product.",
        hint: "Unlike a static blueprint, a prototype can be 'used' or 'tested' for flow."
      },
      "In an API POST request, the actual data being sent to the server is known as the:": {
        answer: "Payload / Body",
        hint: "The 'cargo' of information (like a new user's email) the request is carrying."
      },
      "JSON formats data using:": {
        answer: "Key-Value pairs (e.g., 'name': 'Anna')",
        hint: "Organizing data via descriptive labels and their associated values."
      },
      "Why is 'Synchronous' code a problem when making network requests?": {
        answer: "It causes the browser to completely freeze (block) while waiting for the response.",
        hint: "Synchronous code stops everything until the current line is finished."
      },
      "What is a 'Webhook'?": {
        answer: "An automated message/trigger sent from one app to another when a specific event happens.",
        hint: "A digital 'tripwire' that notifies another system instantly when an action occurs."
      },
      "What does CDN stand for?": {
        answer: "Content Delivery Network",
        hint: "A global network of servers that delivers content faster by being closer to the user."
      },
      "What makes a 'Headless CMS' different from traditional WordPress?": {
        answer: "It completely separates the back-end database from the front-end presentation layer.",
        hint: "The system has a 'body' (data) but no built-in 'head' (visual template)."
      },
      "Which device is most associated with Virtual Reality (VR)?": {
        answer: "A VR Headset or goggles",
        hint: "A device that wraps around the eyes to completely block out the real world."
      },
      "Pokemon Go, which places digital monsters on the real sidewalk via your phone screen, is an example of:": {
        answer: "AR",
        hint: "Augmenting or adding to the real-world view through a device."
      },
      "In the 'Waiter' analogy of an API, the 'Menu' represents:": {
        answer: "The API Documentation (rules for what you can order).",
        hint: "The specific list of instructions and endpoints available for use."
      },

      // CHAPTER 16: The Launch
      "What does the term 'Deployment' mean in web development?": {
        answer: "Moving files from a local private environment to a public live environment.",
        hint: "Moving the site from 'your house' to 'the public street'."
      },
      "What does FTP stand for?": {
        answer: "File Transfer Protocol",
        hint: "The standard 'protocol' for 'transferring' 'files'."
      },
      "Why is the 'Old School' FTP method considered dangerous for modern team development?": {
        answer: "It is manual, error-prone, and can instantly overwrite live files with no 'undo' button.",
        hint: "Too much room for human error with no backup safety net."
      },
      "What is the name of the popular, legacy software program used as a digital 'moving truck' for FTP?": {
        answer: "FileZilla",
        hint: "A famous free software with a dinosaur/zilla name."
      },
      "In modern development, what does CI/CD stand for?": {
        answer: "Continuous Integration / Continuous Deployment",
        hint: "Constantly integrating and constantly deploying."
      },
      "How does a modern cloud host (like Netlify) know when you have updated your code on GitHub?": {
        answer: "Through an automated digital tripwire called a Webhook.",
        hint: "A digital signal sent when you 'push' code."
      },
      "What is the primary benefit of a CI/CD pipeline?": {
        answer: "It automatically updates the live website seconds after you push code to GitHub.",
        hint: "No manual work is needed; the computer does it for you."
      },
      "What is the Domain Name System (DNS)?": {
        answer: "The internet's master phonebook that translates human-friendly names into computer-friendly IP addresses.",
        hint: "The 'phonebook' for website names."
      },
      "When you purchase a domain name from a Registrar (like GoDaddy), how long do you typically 'own' it before having to renew?": {
        answer: "One Year.",
        hint: "The standard subscription length."
      },
      "What is a DNS 'A Record' used for?": {
        answer: "Pointing a domain name to a specific numeric IP address.",
        hint: "Points to an 'Address'."
      },
      "What is a DNS 'CNAME Record' used for?": {
        answer: "Pointing a domain to another domain or subdomain URL (like a Netlify app link).",
        hint: "Pointing a name to another 'canonical' name."
      },
      "What does 'DNS Propagation' refer to?": {
        answer: "The time it takes for a new domain setting to spread to every internet provider across the globe.",
        hint: "How long it takes for a change to 'travel' around the world."
      },
      "In the context of launching a site, what does QA stand for?": {
        answer: "Quality Assurance",
        hint: "Assuring that the 'Quality' is high."
      },
      "Why should you perform the 'Resize Test' before launching?": {
        answer: "To ensure the layout doesn't break and remains fully responsive on mobile-sized screens.",
        hint: "Checking how it looks on big vs. small screens."
      },
      "What is 'Link Rot'?": {
        answer: "When hyperlinks point to pages or resources that have been deleted or moved (resulting in 404 errors).",
        hint: "When old links stop working and 'rot' away."
      },
      "When conducting an 'Alt Audit' for accessibility, what are you checking?": {
        answer: "That every <img> tag has a descriptive alt='' attribute for screen readers.",
        hint: "Auditing the 'alt' text."
      },
      "What should you be looking for when you open the Browser Developer Console during QA testing?": {
        answer: "Bright red JavaScript errors or failed image loads.",
        hint: "Checking for 'red' messages in the console."
      },
      "What is Google Lighthouse?": {
        answer: "A free, professional auditing tool built into Chrome that grades your site's performance and accessibility.",
        hint: "A tool named after a beam of light."
      },
      "Why is a portfolio so critical for a developer seeking a job?": {
        answer: "It acts as a 'Show, Don't Tell' trophy case that proves you can actually build functioning software.",
        hint: "It 'proves' you can do the work."
      },
      "What is the 'STAR Method' used for in a portfolio Case Study?": {
        answer: "Structuring project descriptions by explaining the Situation, Task, Action, and Result.",
        hint: "Situation + Task + Action + Result."
      },
      "Why is it important to include a link to the GitHub Repository for your portfolio projects?": {
        answer: "So senior engineers and hiring managers can read your raw code and see how you solved problems.",
        hint: "So they can see your 'raw ingredients' (code)."
      },
      "What is 'Imposter Syndrome'?": {
        answer: "A psychological feeling that you aren't a 'real' professional or aren't good enough, despite your accomplishments.",
        hint: "Feeling like an 'imposter'."
      },
      "If your QA test reveals that your text is light gray on a white background, which Lighthouse score will drop?": {
        answer: "Accessibility",
        hint: "Color contrast is a core part of site access for visually impaired users."
      },
      "What is a 'Subdomain'?": {
        answer: "A prefix added to a domain name to separate content (like 'blog.mysite.com' vs 'mysite.com').",
        hint: "A domain that lives 'under' the main one."
      },
      "Why is 'Continuous Deployment' safer than manual FTP?": {
        answer: "It relies on version control, meaning every update is tracked and can be instantly rolled back if a bug occurs.",
        hint: "It uses 'Git' to keep a history of every change."
      },
      "If you change a DNS setting, why might your friend in another city not see the change immediately?": {
        answer: "The change has not fully propagated across the global DNS network yet.",
        hint: "Information takes time to travel through the worldwide phonebook."
      },
      "What does the 'Performance' score in Google Lighthouse primarily measure?": {
        answer: "How fast the page loads and becomes interactive for the user.",
        hint: "How well/fast the site 'performs'."
      },
      "When an external link opens in the same tab and navigates the user away from your portfolio, it breaks best practices. What attribute fixes this?": {
        answer: "target='_blank'",
        hint: "The attribute to open a new tab."
      },
      "What happens if you deploy an HTML file but forget to deploy the `images` folder that goes with it?": {
        answer: "The images will show as broken links (404 errors) on the live site.",
        hint: "The browser will try to find pictures that aren't there."
      },
      "Why should you never wait for a project to be 'perfect' before putting it in your portfolio?": {
        answer: "Software is never truly finished; it is meant to be iterated upon.",
        hint: "Done is better than perfect; you can always fix it later."
      },
      "What is the primary function of a Content Delivery Network (CDN) like Netlify?": {
        answer: "To host copies of your website on servers globally so it loads fast for everyone.",
        hint: "It puts the content geographically closer to the user."
      },
      "If you push a broken `index.html` file to GitHub, what will the CI/CD pipeline do?": {
        answer: "Automatically deploy the broken code to the live site.",
        hint: "The automation does exactly what you told it to do—it pushes your mistake."
      },
      "What does the 'A' in the STAR method stand for?": {
        answer: "Action (What you specifically did to solve the problem)",
        hint: "S... T... A... R"
      },
      "What does the 'R' in the STAR method stand for?": {
        answer: "Result (The final outcome of your actions)",
        hint: "The 'ending' of the story."
      },
      "Why do hiring managers look for a 'Contact Information' section on a portfolio?": {
        answer: "Because if they can't easily figure out how to email you, they will move on to the next candidate.",
        hint: "They need to know how to reach you."
      },
      "What is the danger of hardcoding an Absolute Path (like `C:/Users/Hannah/Desktop/image.jpg`) in your HTML before deployment?": {
        answer: "It works on your laptop, but will break completely when moved to a cloud server.",
        hint: "The server doesn't have a 'C:/Users/Hannah' folder."
      },
      "Which file is automatically recognized as the default homepage by almost all web servers?": {
        answer: "index.html",
        hint: "The 'index' of the site."
      },
      "What is a '404 Error'?": {
        answer: "Not Found (The requested page or file does not exist on the server).",
        hint: "The number for 'not found'."
      },
      "How does a Custom Domain (like `johndoe.com`) improve a portfolio?": {
        answer: "It projects professionalism, authority, and brand ownership.",
        hint: "It makes you look more 'pro' and own your name."
      },
      "What is the purpose of an SSL/TLS Certificate on a live website?": {
        answer: "To enable the padlock icon and encrypt data sent between the user and the server.",
        hint: "It provides the padlock and encryption."
      },
      "If a user reports that a button on your live site doesn't work, what is the first debugging step you should take?": {
        answer: "Open the Browser Console to check for JavaScript errors.",
        hint: "Looking at the hidden developer log."
      },
      "What is 'Vendor Lock-in'?": {
        answer: "When you build a site on a closed platform (like Wix) and cannot easily move your code to a different host.",
        hint: "Being 'locked in' to a single provider."
      },
      "Why is it recommended to include a downloadable PDF resume on your portfolio?": {
        answer: "So recruiters can print it or upload it directly into their Applicant Tracking Systems.",
        hint: "Recruiters love PDFs for printing and scanning."
      },
      "What does the 'SEO' score in Google Lighthouse measure?": {
        answer: "Search Engine Optimization; how well search engines can understand and rank your page.",
        hint: "Search + Engine + ?"
      },
      "If your QA test reveals that your website requires horizontal scrolling on a phone, what CSS feature do you need to fix?": {
        answer: "The Media Queries and responsive widths",
        hint: "You missed a 'responsive' breakpoint."
      },
      "What is the best way to handle 'Imposter Syndrome'?": {
        answer: "Accept that all developers feel it, keep learning, and proudly share the work you have completed.",
        hint: "Accept it, learn, and be proud."
      },
      "When using Netlify, what branch does it monitor by default for automatic deployments?": {
        answer: "The 'main' or 'master' branch.",
        hint: "The 'definitive' timeline of the code."
      },
      "What is the purpose of a 'Favicon'?": {
        answer: "It is the small logo icon that appears in the browser tab, adding a final professional touch.",
        hint: "The 'favorite icon' for the tab."
      },
      "If you want to update your live Netlify site, what is the correct workflow?": {
        answer: "Change code locally -> Save -> Commit -> Push to GitHub.",
        hint: "Code -> Save -> Commit -> ?"
      },
      "What is the primary difference between HTTP and HTTPS?": {
        answer: "HTTPS encrypts the data being transferred; HTTP sends it in plain text.",
        hint: "One is scrambled (encrypted), the other is readable."
      },
      "Why is a 'Case Study' better than just a screenshot in a portfolio?": {
        answer: "It explains your thought process, challenges faced, and how he solved them, which employers value highly.",
        hint: "It tells the 'story' of the project, not just a picture."
      },
      "What is the very last thing you should do before officially sharing your portfolio link with an employer?": {
        answer: "Click every single link yourself to ensure absolutely nothing is broken.",
        hint: "The final 'manual' link check."
      }
    };
// --- 2. SAME-DAY COOLDOWN CHECK (LOCKS OUT UNTIL 11:59 PM) ---
    const rows = mainSheet.getDataRange().getValues();
    
    // THE FIX: Check against both ID and Email so the system never gets confused
    const incomingId = clean(data.studentId);
    const incomingEmail = clean(data.email);

    // Cooldown check
    for (let i = 1; i < rows.length; i++) {
      const rowTime = new Date(rows[i][0]);
      if (isNaN(rowTime.getTime())) continue; 
      
      const rowID = clean(rows[i][1]); // Email/ID Column
      const rowChap = clean(rows[i][5]); // Chapter Column
      
      const isSameStudent = (rowID !== "" && (rowID === incomingId || rowID === incomingEmail));
      
      if (isSameStudent && rowChap === clean(data.chapter)) {
        // THE FIX: Check if they took it on the exact same Calendar Day
        if (rowTime.getFullYear() === now.getFullYear() && 
            rowTime.getMonth() === now.getMonth() && 
            rowTime.getDate() === now.getDate()) {
            
            return ContentService.createTextOutput(JSON.stringify({
              "result": "error",
              "message": "Cooldown: You have already attempted this Assessment within the last 24 hours."
            })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // --- 3. GRADING LOGIC & ERROR LOGGING ---
    let score = 0;
    const feedback = [];

    data.answers.forEach(ans => {
      let correctData = null;
      for (let key in masterKey) {
          if (clean(key) === clean(ans.question)) {
              correctData = masterKey[key];
              break;
          }
      }

      if (correctData) {
        if (clean(ans.selected) === clean(correctData.answer)) {
          score++;
        } else {
          feedback.push({
            question: ans.question,
            hint: correctData.hint
          });
        }
      } else {
        feedback.push({
          question: ans.question,
          hint: "System Error: This question was not found in the answer key. Marked incorrect. Please notify your teacher."
        });

        let errorSheet = ss.getSheetByName("Error Log");
        if (!errorSheet) {
          errorSheet = ss.insertSheet("Error Log");
          errorSheet.appendRow(["Timestamp", "Chapter", "Missing Question Text", "Student Affected"]);
          errorSheet.getRange("A1:D1").setFontWeight("bold");
          errorSheet.setFrozenRows(1);
        }
        errorSheet.appendRow([now, data.chapter, ans.question, data.studentId || data.email]);
      }
    });

    const totalQuestions = data.total;
    const percentageNum = Math.round((score / totalQuestions) * 100);

    // --- 4. RECORD TO MAIN GRADEBOOK SHEET ---
    // THE FIX: Forcing it to always save the explicit ID so future checks don't fail
    const savedId = data.studentId || data.email || "Unknown ID";
    mainSheet.appendRow([
      now, 
      savedId, 
      data.lastName, 
      data.firstName, 
      data.studentClass, 
      data.chapter, 
      score, 
      totalQuestions, 
      percentageNum + "%", 
      data.notesUrl || "N/A"
    ]);

    // --- 5. ITEM ANALYSIS (CHAPTER-SPECIFIC AUDIT LOGS) ---
    const chapterSheetName = data.chapter + " Data";
    let chapterSheet = ss.getSheetByName(chapterSheetName);
    
    if (!chapterSheet) {
      chapterSheet = ss.insertSheet(chapterSheetName);
      chapterSheet.appendRow(["Timestamp", "Email", "Last Name", "First Name", "Class", "Notes URL", "Final Score", "Percentage", "Question", "Student Answer", "Correct Answer", "Result"]);
      chapterSheet.getRange("A1:L1").setFontWeight("bold"); 
      chapterSheet.setFrozenRows(1); 
    }
    
    data.answers.forEach(ans => {
      let correctData = null;
      for (let key in masterKey) {
          if (clean(key) === clean(ans.question)) {
              correctData = masterKey[key];
              break;
          }
      }
      
      const studentAnswer = ans.selected;
      const correctAnswer = correctData ? correctData.answer : "Not found in Key";
      const isCorrect = correctData ? (clean(studentAnswer) === clean(correctAnswer)) : false;
      const resultText = isCorrect ? "Correct" : "Incorrect";

      chapterSheet.appendRow([
        now,
        savedId,
        data.lastName,
        data.firstName,
        data.studentClass,
        data.notesUrl || "N/A",
        score,
        percentageNum + "%",
        ans.question,
        studentAnswer,
        correctAnswer,
        resultText
      ]);
    });

    // --- 6. AUTOMATIC SORTING ---
    if (sheet.getLastRow() > 1) {
       const sortRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
       sortRange.sort([
        {column: 5, ascending: true}, 
        {column: 6, ascending: true}, 
        {column: 3, ascending: true}, 
        {column: 1, ascending: false} 
       ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      "result": "success",
      "score": score,
      "total": totalQuestions,
      "percentage": percentageNum,
      "feedback": feedback
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}