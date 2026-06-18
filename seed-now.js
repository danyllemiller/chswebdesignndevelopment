// Quick seed script to populate CS exam questions
// Run with: node seed-now.js

const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'chs_password',
    database: 'chs_gradebook'
};

const unit0Questions = [
{ chapter: 0, question: "What must be done to successfully power on a standard desktop computer setup?", options: ["Both the PC tower and the monitor must be turned on independently.", "Only the monitor needs to be turned on.", "Pressing the spacebar will automatically turn everything on from a completely powered-off state.", "Unplugging the power strip and plugging it back in."], answer: "Both the PC tower and the monitor must be turned on independently.", hint: "The 'brain' (tower) and the display (monitor) are separate pieces of hardware that both require power.", tag: "Basic Operation" },
    { chapter: 0, question: "If you press the power button on your computer and nothing happens, what is the best first troubleshooting step?", options: ["Check the power strip and ensure the cables are firmly plugged into the wall, the tower, and the monitor.", "Immediately take the computer apart to check the motherboard.", "Delete old files from your cloud drive to free up space.", "Buy a replacement power button."], answer: "Check the power strip and ensure the cables are firmly plugged into the wall, the tower, and the monitor.", hint: "Always check the physical connections before assuming the computer is broken.", tag: "Troubleshooting" },
    { chapter: 0, question: "What is the most effective first step if your computer is acting slow, frozen, or glitchy?", options: ["Restart (reboot) the machine using the operating system's Start menu.", "Unplug the computer from the wall directly while it is running.", "Turn the monitor off and back on again.", "Strike the keyboard repeatedly to wake the processor up."], answer: "Restart (reboot) the machine using the operating system's Start menu.", hint: "This clears the temporary memory (RAM) and gives the computer a fresh start.", tag: "Troubleshooting" },
    { chapter: 0, question: "Which of the following is considered an 'Input' device?", options: ["A keyboard or mouse used to send commands into the computer.", "A monitor displaying a video.", "A printer producing a physical document.", "A speaker playing music."], answer: "A keyboard or mouse used to send commands into the computer.", hint: "These devices push information from the real world INTO the processor.", tag: "Hardware" },
    { chapter: 0, question: "What is the primary function of an 'Output' device?", options: ["To receive processed data from the computer and present it back to the user, like a screen or speakers.", "To type letters and numbers into a document.", "To click on icons on the desktop.", "To connect the computer to the wall outlet for electricity."], answer: "To receive processed data from the computer and present it back to the user, like a screen or speakers.", hint: "These devices push information OUT OF the machine so humans can experience it.", tag: "Hardware" },
    { chapter: 0, question: "Why is it important to use folders (directories) to manage your files instead of saving everything to the Desktop?", options: ["It organizes related items, making files easier to find and preventing your computer from becoming a cluttered digital junkyard.", "It automatically translates the files into a different language.", "It prevents hackers from accessing your computer.", "It makes the files completely invisible to everyone."], answer: "It organizes related items, making files easier to find and preventing your computer from becoming a cluttered digital junkyard.", hint: "Think of your hard drive like a massive physical filing cabinet.", tag: "File Management" },
    { chapter: 0, question: "What is the main advantage of using Cloud Storage (like Google Drive) over Local Storage (like a hard drive)?", options: ["Files automatically save to remote servers and can be accessed from any internet-connected device.", "Files are completely immune to all computer viruses.", "It requires zero internet connection to work.", "It physically makes the computer run twice as fast."], answer: "Files automatically save to remote servers and can be accessed from any internet-connected device.", hint: "If your personal computer breaks, your files are still safe on the internet.", tag: "File Management" },
    { chapter: 0, question: "What is the primary purpose of a Word Processor like Google Docs or Microsoft Word?", options: ["Creating, formatting, and editing text-based documents such as essays, letters, and reports.", "Calculating complex math formulas automatically.", "Editing digital photographs and graphics.", "Browsing the internet for information."], answer: "Creating, formatting, and editing text-based documents such as essays, letters, and reports.", hint: "This tool relies heavily on text hierarchy, line spacing, and margins.", tag: "Office Software" },
    { chapter: 0, question: "Which application is best suited for organizing data into rows and columns, tracking budgets, and calculating statistics?", options: ["A spreadsheet program like Microsoft Excel or Google Sheets.", "A presentation program like Google Slides.", "A word processor like Microsoft Word.", "An email client like Gmail."], answer: "A spreadsheet program like Microsoft Excel or Google Sheets.", hint: "It uses a grid system and allows you to write math formulas.", tag: "Office Software" },
    { chapter: 0, question: "What is a key design principle to remember when using presentation software like Google Slides or PowerPoint?", options: ["Rely heavily on images and white space while minimizing large blocks of text so the audience listens to you.", "Copy and paste entire paragraphs of text so the audience can read along silently.", "Always use at least five different fonts to make it look creative.", "Use yellow text on a white background to make it stand out."], answer: "Rely heavily on images and white space while minimizing large blocks of text so the audience listens to you.", hint: "A presentation is a visual aid for a speaker, not a document meant to be read.", tag: "Office Software" },
    { chapter: 0, question: "Which universal keyboard shortcut acts as a 'lifesaver' by undoing your last action?", options: ["Ctrl + Z", "Ctrl + C", "Ctrl + V", "Ctrl + F"], answer: "Ctrl + Z", hint: "If you accidentally delete a paragraph, press this combination to bring it right back.", tag: "Digital Literacy" },
    { chapter: 0, question: "Which two keyboard shortcuts are used together to Copy and then Paste text?", options: ["Ctrl + C, followed by Ctrl + V", "Ctrl + X, followed by Ctrl + Z", "Ctrl + S, followed by Ctrl + A", "Ctrl + T, followed by Ctrl + F"], answer: "Ctrl + C, followed by Ctrl + V", hint: "Think 'C' for Copy, and the key right next to it for dropping it down.", tag: "Digital Literacy" },
    { chapter: 0, question: "Why is exporting a finished document as a PDF highly recommended before emailing it to a client or teacher?", options: ["A PDF locks the fonts, images, and formatting in place so it looks exactly the same on every device and operating system.", "A PDF allows the recipient to easily edit and change your text.", "A PDF automatically translates the document into the recipient's native language.", "A PDF makes the file size larger so it is easier to download."], answer: "A PDF locks the fonts, images, and formatting in place so it looks exactly the same on every device and operating system.", hint: "It takes a 'digital snapshot' of your work that cannot easily be broken.", tag: "Office Software" },
    { chapter: 0, question: "What is the purpose of the BCC (Blind Carbon Copy) field in an email?", options: ["It sends a copy of the email securely without letting the other recipients see the BCC'd person's email address.", "It highlights the email as urgent for the recipient.", "It automatically deletes the email after the recipient reads it.", "It sends the email without a subject line."], answer: "It sends a copy of the email securely without letting the other recipients see the BCC'd person's email address.", hint: "It protects privacy when sending a message to a large, unrelated group of people.", tag: "Professional Communication" },
    { chapter: 0, question: "Which of the following is considered poor 'Netiquette' when writing a professional email?", options: ["Typing the entire message in ALL CAPS or using excessive text-speak (like 'idk' or 'lol').", "Including a clear, concise subject line summarizing the email.", "Starting with a professional greeting like 'Dear Mr. Miller.'", "Proofreading the email for spelling and grammar before sending."], answer: "Typing the entire message in ALL CAPS or using excessive text-speak (like 'idk' or 'lol').", hint: "Online, typing in all capital letters is interpreted as shouting.", tag: "Professional Communication" }
];

async function seedNow() {
    console.log("Connecting to database...");
    const connection = await mysql.createConnection(dbConfig);
    
    // Ensure exams entry exists
    console.log("Ensuring exam entry exists...");
    await connection.execute(
        'INSERT INTO exams (exam_id, title, total_points, course_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = COALESCE(title, title)',
        ['cs-unit-0', 'Computer Science Unit 0 Pre-Assessment', 100, '10003GS']
    );
    
    // Delete existing unit 0 questions
    console.log("Clearing old unit 0 questions...");
    await connection.execute("DELETE FROM questions WHERE exam_id = 'cs-unit-0'");
    
    // Also clear any with chapter 'a' or 0
    await connection.execute("DELETE FROM questions WHERE chapter_number = 'a' OR chapter_number = 0");
    
    // Seed new questions
    console.log(`Seeding ${unit0Questions.length} questions...`);
    
    for (const q of unit0Questions) {
        await connection.execute(
            `INSERT INTO questions (exam_id, chapter_number, question_text, option_a, option_b, option_c, option_d, correct_answer, study_hint, concept_tag) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'cs-unit-0',
                String(q.chapter),
                q.question,
                q.options[0],
                q.options[1],
                q.options[2],
                q.options[3],
                q.answer,
                q.hint,
                q.tag
            ]
        );
    }
    
    // Verify
    const [rows] = await connection.execute("SELECT COUNT(*) as cnt FROM questions WHERE exam_id = 'cs-unit-0'");
    console.log(`Verification: ${rows[0].cnt} questions now in database`);
    
    await connection.end();
    console.log("Done!");
}

seedNow().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
