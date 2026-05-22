/**
 * CHAPTER 8: Storing Data
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
        // --- CATEGORY: ORGANIZING DATA ---
        { cat: "Organizing Data", val: 100, q: "A single piece of information, like a name or a GPA, is called a data:", a: "Element", d: ["Record", "Database", "Primary Key"] },
        { cat: "Organizing Data", val: 100, q: "A collection of related data elements (like a student's full profile) is a:", a: "Record", d: ["File Extension", "Binary Bit", "Packet"] },
        { cat: "Organizing Data", val: 100, q: "In a database, a student's Name, ID, and GPA are linked to form a single:", a: "Record", d: ["Data Element", "Header", "Checklist"] },

        { cat: "Organizing Data", val: 200, q: "Linking multiple data elements together is known as creating a data:", a: "Relationship", d: ["Compression", "Encapsulation", "Decomposition"] },
        { cat: "Organizing Data", val: 200, q: "Which of these is an example of a data relationship in a school system?", a: "Linking a Student ID to a specific GPA.", d: ["Unplugging a monitor.", "Deleting an app.", "Charging a laptop."] },
        { cat: "Organizing Data", val: 200, q: "A Data Architect's job is to decide how different pieces of info _____ to each other.", a: "Relate", d: ["Delete", "Broadcast", "Encrypt"] },

        { cat: "Organizing Data", val: 300, q: "In the Inventory Activity, 'Title' and 'Author' are examples of:", a: "Data Elements", d: ["Primary Keys", "Storage Media", "Operating Systems"] },
        { cat: "Organizing Data", val: 300, q: "Organizing data into logical groups allows a computer to perform:", a: "Complex tasks and retrievals", d: ["Hardware repairs", "Manual typing", "Physical filing"] },
        { cat: "Organizing Data", val: 300, q: "When you view your grades, the system pulls your Name and Scores from a linked:", a: "Record", d: ["Binary String", "Pixel Grid", "Hardware Driver"] },

        { cat: "Organizing Data", val: 400, q: "What is the primary goal of architecting data relationships?", a: "To ensure info is retrieved quickly and kept organized.", d: ["To make the computer look better.", "To hide data from everyone.", "To use more electricity."] },
        { cat: "Organizing Data", val: 400, q: "In a 'Doctor's Office' system, what two elements must be linked for safety?", a: "Patient Name and Medical History", d: ["Doctor's height and weight", "The office floor plan", "The type of keyboard used"] },
        { cat: "Organizing Data", val: 400, q: "If a name is linked to the wrong score, the data relationship has lost its:", a: "Integrity", d: ["Storage", "Bandwidth", "Latency"] },

        { cat: "Organizing Data", val: 500, q: "Which concept explains how a single update to a student's address can change it everywhere?", a: "Centralized Data Relationships", d: ["Lossy Compression", "Static Modeling", "Packet Routing"] },
        { cat: "Organizing Data", val: 500, q: "Professional systems use 'Relational Logic' to prevent what problem?", a: "Duplicate and inconsistent data entries.", d: ["Slow internet speeds.", "Monitor glare.", "Keyboard typos."] },
        { cat: "Organizing Data", val: 500, q: "Designing a data plan before building a system is the main role of a:", a: "Data Architect", d: ["Hardware Tech", "Beta Tester", "Project Manager"] },

        // --- CATEGORY: DATABASES & FLAT FILES ---
        { cat: "Databases & Flat Files", val: 100, q: "A simple list of data stored in one single table or text file is a:", a: "Flat File", d: ["Relational Database", "Operating System", "Cloud Server"] },
        { cat: "Databases & Flat Files", val: 100, q: "Which file extension is a common format for a 'Flat File' list?", a: ".csv", d: [".exe", ".sys", ".dll"] },
        { cat: "Databases & Flat Files", val: 100, q: "True or False: A basic spreadsheet with one sheet of names is a Flat File.", a: "True", d: ["False", "Only if it is encrypted", "Only if it uses binary"] },

        { cat: "Databases & Flat Files", val: 200, q: "A collection of multiple tables linked together is called a:", a: "Relational Database", d: ["Flat File", "Word Document", "Slide Deck"] },
        { cat: "Databases & Flat Files", val: 200, q: "What is a major disadvantage of using a Flat File for a large business?", a: "Data redundancy (typing the same thing many times).", d: ["They are too fast.", "They use pulses of light.", "They require a specialized keyboard."] },
        { cat: "Databases & Flat Files", val: 200, q: "Databases are better than Flat Files because they avoid:", a: "Duplicate data entries", d: ["Using any RAM", "Connecting to Wi-Fi", "Showing colors"] },

        { cat: "Databases & Flat Files", val: 300, q: "If you have a 'Students' table and a 'Classes' table linked, you are using a:", a: "Relational Database", d: ["Flat File", "Text Document", "Folder Hierarchy"] },
        { cat: "Databases & Flat Files", val: 300, q: "Why would a school use a Database instead of a simple Flat File list?", a: "To manage thousands of students and classes efficiently.", d: ["To make the computer monitor brighter.", "Because Flat Files are illegal.", "To prevent students from typing."] },
        { cat: "Databases & Flat Files", val: 300, q: "In a Relational Database, tables are connected using common:", a: "Fields or Keys", d: ["USB Cables", "Passwords", "Screen Protectors"] },

        { cat: "Databases & Flat Files", val: 400, q: "Which system is easier to search when you have millions of records?", a: "Relational Database", d: ["Flat File", "Paper Ledger", "Sticky Note"] },
        { cat: "Databases & Flat Files", val: 400, q: "If a company changes its address, a Database allows them to update it:", a: "Once, and it reflects everywhere", d: ["Manually on every single order", "By calling the internet", "By restarting the server"] },
        { cat: "Databases & Flat Files", val: 400, q: "Relational databases use 'Queries' to find data, while Flat Files usually require:", a: "Manual scanning or linear searching", d: ["A hardware upgrade", "A DNS server", "A fiber optic link"] },

        { cat: "Databases & Flat Files", val: 500, q: "Which term refers to the assurance that data is accurate across all linked tables?", a: "Referential Integrity", d: ["Lossless Compression", "High Latency", "Network Redundancy"] },
        { cat: "Databases & Flat Files", val: 500, q: "Which type of data storage is most scalable for global apps like Amazon?", a: "Relational Database", d: ["Flat File", "Binary String", "Text File"] },
        { cat: "Databases & Flat Files", val: 500, q: "The logical design of how tables link in a database is called a:", a: "Schema", d: ["Protocol", "Topology", "Abstraction"] },

        // --- CATEGORY: PRIMARY KEYS ---
        { cat: "Primary Keys", val: 100, q: "A unique identifier used to make sure no two records are mixed up is a:", a: "Primary Key", d: ["Secondary Link", "Data Element", "Folder Name"] },
        { cat: "Primary Keys", val: 100, q: "What is an example of a Primary Key for a student at school?", a: "Student ID Number", d: ["First Name", "Favorite Color", "Locker Location"] },
        { cat: "Primary Keys", val: 100, q: "Which field in a book database is the best Primary Key?", a: "ISBN Number", d: ["Title", "Author", "Page Count"] },

        { cat: "Primary Keys", val: 200, q: "Why is 'Full Name' a bad choice for a Primary Key?", a: "Two people might have the exact same name.", d: ["Names are too long for RAM.", "Computers cannot read letters.", "Names change every day."] },
        { cat: "Primary Keys", val: 200, q: "A Primary Key must be 'Unique,' which means it:", a: "Cannot be repeated in any other record.", d: ["Must be written in binary.", "Must contain at least 20 letters.", "Must be hidden from the user."] },
        { cat: "Primary Keys", val: 200, q: "If a hospital has two patients named 'John Doe,' they use this to keep them separate:", a: "A unique Patient ID (Primary Key)", d: ["Their hair color", "A Flat File", "A high-speed router"] },

        { cat: "Primary Keys", val: 300, q: "In the 'Classroom Inventory' activity, which element is the 'Anchor' for a book?", a: "ISBN", d: ["Title", "Price", "Date Borrowed"] },
        { cat: "Primary Keys", val: 300, q: "Primary Keys allow a Data Architect to uniquely identify a single:", a: "Record", d: ["Packet", "Bit", "Hardware Port"] },
        { cat: "Primary Keys", val: 300, q: "Without a Primary Key, a database would suffer from:", a: "Data confusion and collisions", d: ["Fast performance", "High security", "Perfect integrity"] },

        { cat: "Primary Keys", val: 400, q: "What is a 'Composite Key'?", a: "A Primary Key made by combining two or more data elements.", d: ["A key made of plastic.", "A key that opens two different doors.", "A password for the Wi-Fi."] },
        { cat: "Primary Keys", val: 400, q: "Social Security Numbers are used as Primary Keys by the government because:", a: "They are unique to every citizen.", d: ["They are shorter than names.", "They are written in Hexadecimal.", "They help the CPU run faster."] },
        { cat: "Primary Keys", val: 400, q: "Which rule ensures that a Primary Key can never be empty or 'Null'?", a: "Entity Integrity Rule", d: ["The DRY Principle", "The 3-2-1 Rule", "The OSI Model"] },

        { cat: "Primary Keys", val: 500, q: "When one table's Primary Key is used in another table to create a link, it's called a:", a: "Foreign Key", d: ["Guest Pass", "Logic Link", "Data Node"] },
        { cat: "Primary Keys", val: 500, q: "Primary Keys are essential for the process of 'Normalization,' which means:", a: "Organizing tables to reduce redundancy.", d: ["Making all data look the same.", "Restarting the computer.", "Deleting large files."] },
        { cat: "Primary Keys", val: 500, q: "If you search for a specific receipt in a store, the system looks for the:", a: "Transaction ID (Primary Key)", d: ["Store Address", "Cashier's Name", "Total Price"] },

        // --- CATEGORY: STORAGE LOCATIONS & MEDIA ---
        { cat: "Storage Locations", val: 100, q: "Data stored directly on your laptop's internal SSD is:", a: "Local Storage", d: ["Cloud Storage", "Network Storage", "Virtual Storage"] },
        { cat: "Storage Locations", val: 100, q: "Data stored on a remote server accessible over the internet is:", a: "Cloud Storage", d: ["Local Storage", "Static Storage", "RAM"] },
        { cat: "Storage Locations", val: 100, q: "The school's shared 'H:' drive is an example of:", a: "Network Storage", d: ["Local Storage", "Cloud Storage", "Flash Storage"] },

        { cat: "Storage Locations", val: 200, q: "What is the main risk of keeping data ONLY in Local Storage?", a: "If the device breaks or is stolen, the data is gone.", d: ["It is too slow.", "It costs too much money.", "It requires a constant internet connection."] },
        { cat: "Storage Locations", val: 200, q: "Why is Cloud Storage considered 'Convenient'?", a: "You can access your files from any device with an internet connection.", d: ["It makes your laptop's CPU faster.", "It doesn't use any data.", "It is 100% free for everyone."] },
        { cat: "Storage Locations", val: 200, q: "Which storage hardware is fast, silent, and has no moving parts?", a: "SSD (Solid State Drive)", d: ["HDD (Hard Disk Drive)", "Optical Disc", "Floppy Disk"] },

        { cat: "Storage Locations", val: 300, q: "In the 'Storage Architect' activity, why would a photographer use Local SSDs?", a: "For maximum speed when editing large files without internet.", d: ["Because SSDs are the cheapest storage.", "To hide photos from the cloud.", "Because cameras cannot use the internet."] },
        { cat: "Storage Locations", val: 300, q: "Which storage media is best for long-term 'Archival' because it is very cheap?", a: "HDD (Hard Disk Drive)", d: ["RAM", "SSD", "Flash Drive"] },
        { cat: "Storage Locations", val: 300, q: "What is the tradeoff of using Cloud Storage for a business?", a: "Ease of access vs. privacy and monthly costs.", d: ["Fast CPU vs. slow RAM.", "Color vs. Black and White.", "Cables vs. Wi-Fi."] },

        { cat: "Storage Locations", val: 400, q: "What does 'Flash Memory' refer to?", a: "Non-volatile storage used in SSDs and USB drives.", d: ["Memory that only works for a second.", "A type of computer monitor.", "A fast network cable."] },
        { cat: "Storage Locations", val: 400, q: "Network storage often uses a server acting as a 'Librarian.' This is called:", a: "NAS (Network Attached Storage)", d: ["RAM", "CPU", "GPU"] },
        { cat: "Storage Locations", val: 400, q: "If you have a 10TB video collection, why might you choose an HDD over an SSD?", a: "The HDD is much cheaper for that massive amount of data.", d: ["The HDD is faster for video editing.", "The HDD uses less electricity.", "The HDD is lighter."] },

        { cat: "Storage Locations", val: 500, q: "Which media has the highest 'Longevity' but low 'Portability'?", a: "Optical or Archival Tape", d: ["USB Flash Drive", "SSD", "RAM"] },
        { cat: "Storage Locations", val: 500, q: "When a cloud provider says your data is 'redundant,' they mean:", a: "They have multiple copies on different servers for safety.", d: ["They deleted your data because it was old.", "They shared your data with everyone.", "Your data is stored in binary."] },
        { cat: "Storage Locations", val: 500, q: "A 'Cold Storage' solution for a bank is designed for:", a: "Data that is rarely accessed but must be kept for years.", d: ["Storing data in a freezer.", "Storing data that is currently being edited.", "Data that needs to be accessed in milliseconds."] },

        // --- CATEGORY: INTEGRITY & PRIVACY ---
        { cat: "Integrity & Privacy", val: 100, q: "Assuring that data is accurate and has not been corrupted is called data:", a: "Integrity", d: ["Compression", "Abstraction", "Encryption"] },
        { cat: "Integrity & Privacy", val: 100, q: "A 'Digital Fingerprint' used to check if a file changed during a download is a:", a: "Checksum", d: ["Password", "Primary Key", "File Extension"] },
        { cat: "Integrity & Privacy", val: 100, q: "A file permission that allows you to see data but not change it is:", a: "Read-Only", d: ["Write-Access", "Admin-Level", "Binary-Lock"] },

        { cat: "Integrity & Privacy", val: 200, q: "What is the ethical tradeoff of storing data in the Cloud?", a: "Trading personal privacy for convenience and access.", d: ["Trading speed for better graphics.", "Trading RAM for more CPU cores.", "Trading a mouse for a keyboard."] },
        { cat: "Integrity & Privacy", val: 200, q: "Who technically 'owns' or has access to your data once it's on a cloud server?", a: "The company that owns the server (depending on the Terms of Service).", d: ["Only you, forever.", "The local police.", "The hardware manufacturer."] },
        { cat: "Integrity & Privacy", val: 200, q: "Why is data 'Integrity' critical for a bank's database?", a: "If the numbers change by mistake, people lose real money.", d: ["So the website looks pretty.", "To make the database smaller.", "To use less Wi-Fi."] },

        { cat: "Integrity & Privacy", val: 300, q: "How can data organization help a 'Screen Reader' (accessibility device)?", a: "By using clear headers and structured tables so the robot can read logically.", d: ["By making the text very small.", "By removing all numbers.", "By encrypting the database."] },
        { cat: "Integrity & Privacy", val: 300, q: "What is the consequence of data being 'Forever' once it hits the internet?", a: "It is nearly impossible to truly delete every copy on every server.", d: ["The internet will run out of space next year.", "Data becomes more expensive every day.", "Your computer will eventually explode."] },
        { cat: "Integrity & Privacy", val: 300, q: "A 'Checksum Mismatch' error tells the user that:", a: "The file is corrupted or was altered during transmission.", d: ["The password was wrong.", "The computer is too hot.", "The internet is too fast."] },

        { cat: "Integrity & Privacy", val: 400, q: "Why should a Data Architect avoid 'Merged Cells' in an accessibility-focused sheet?", a: "They confuse screen readers and break the logical reading path.", d: ["They use too much RAM.", "They are illegal in the US.", "They make the file size larger."] },
        { cat: "Integrity & Privacy", val: 400, q: "What is 'Jurisdiction' in terms of data privacy?", a: "The laws of the country where the server is physically located.", d: ["The speed of the CPU.", "The number of users on a network.", "The type of encryption used."] },
        { cat: "Integrity & Privacy", val: 400, q: "In the 'Classroom Inventory,' marking a student's history as 'Private' is an example of:", a: "Access Control / Authorization", d: ["Data Compression", "Hardware Maintenance", "System Troubleshooting"] },

        { cat: "Integrity & Privacy", val: 500, q: "How does the GDPR law (from Ch 16) impact data integrity and privacy?", a: "It gives users the 'Right to be Forgotten' and demand data deletion.", d: ["It makes all internet free.", "It speeds up every CPU in Europe.", "It requires all data to be in binary."] },
        { cat: "Integrity & Privacy", val: 500, q: "A 'Data Breach' often results in the loss of what specific information?", a: "PII (Personally Identifiable Information)", d: ["CPU Clock Speed", "Monitor Resolution", "Keyboard Layout"] },
        { cat: "Integrity & Privacy", val: 500, q: "What is the 'Immutable' nature of some modern databases?", a: "Data that can be added to, but can never be changed or deleted.", d: ["Data that changes every second.", "Data that is only stored on paper.", "Data that is 100% free."] }
    ].map(item => ({ ...item, chapter: "Chapter 8", grade: "CS & Literacy Guild" })));
    
})();