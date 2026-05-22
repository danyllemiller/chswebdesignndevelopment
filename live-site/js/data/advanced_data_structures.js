/**
 * CHAPTER 13: Advanced Data Structures
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
        // --- CATEGORY: DATA COLLECTIONS ---
        { cat: "Data Collections", val: 100, q: "Why is creating 100 individual variables for 100 students inefficient?", a: "It requires massive code, is hard to read, and prevents using loops", d: ["It uses less RAM", "Variables delete automatically", "Google Sheets requires it"] },
        { cat: "Data Collections", val: 100, q: "What is a 'Data Structure'?", a: "A specialized format for organizing and storing data so it can be accessed efficiently", d: ["A physical filing cabinet", "A hardware sensor", "An infinite loop"] },
        { cat: "Data Collections", val: 100, q: "What is the primary benefit of grouping data into a collection?", a: "You can use a loop to perform actions on the entire group at once", d: ["It makes text bold", "It encrypts data", "It stops hackers"] },

        { cat: "Data Collections", val: 200, q: "What does 'Scalability' mean for data structures?", a: "The ability of code to handle growing amounts of data without needing a rewrite", d: ["The weight of the server", "The size of the monitor", "The Wi-Fi speed"] },
        { cat: "Data Collections", val: 200, q: "In the 'Grocery List Challenge', what does the 'Chaos Bag' represent?", a: "Unorganized, loose variables scattered in memory", d: ["An Array", "A Linked List", "A Relational Database"] },
        { cat: "Data Collections", val: 200, q: "In the 'Grocery List Challenge', what does the 'Organized Bag' represent?", a: "A deliberate data structure", d: ["A broken program", "A virus", "A syntax error"] },

        { cat: "Data Collections", val: 300, q: "How do data collections relate to Abstraction?", a: "They allow programmers to manage a single 'Filing Cabinet' instead of 100 loose papers", d: ["They hide the data entirely", "They make the data invisible", "They encrypt the data"] },
        { cat: "Data Collections", val: 300, q: "What two factors are primarily evaluated when discussing data structure tradeoffs?", a: "Execution Speed and Memory Usage", d: ["Colors and Sounds", "Keyboards and Mice", "Wi-Fi and Bluetooth"] },
        { cat: "Data Collections", val: 300, q: "If you choose a structure that is fast to search but uses lots of 'placeholder' memory, you are prioritizing:", a: "Execution Speed over Memory Usage", d: ["Memory Usage over Speed", "Cost over Value", "Storage over RAM"] },

        { cat: "Data Collections", val: 400, q: "Why are single variables considered 'inflexible' for large systems?", a: "You must know the exact name of every variable to calculate anything", d: ["They take up too much hard drive space", "They cannot store numbers", "They expire after 24 hours"] },
        { cat: "Data Collections", val: 400, q: "What happens to the CPU if variables are scattered all over the RAM instead of structured?", a: "It has to work harder to 'jump' around and find them", d: ["It overheats and explodes", "It turns off the monitor", "It sends the data to the cloud"] },
        { cat: "Data Collections", val: 400, q: "A 'Top 10 Leaderboard' is best stored in what type of collection?", a: "An ordered data structure (like an Array)", d: ["10 separate local variables", "A flat text file", "An unorganized Chaos Bag"] },

        { cat: "Data Collections", val: 500, q: "What is the term for identifying the best structure based on how data will actually be used?", a: "Generalizing Problems", d: ["Syntax Error", "Infinite Looping", "Data Exfiltration"] },
        { cat: "Data Collections", val: 500, q: "How does choosing the wrong data structure affect the user experience?", a: "It causes the program to lag, stall, or crash", d: ["It makes the font size smaller", "It changes the app's colors", "It forces the user to buy a new PC"] },
        { cat: "Data Collections", val: 500, q: "If a system needs to track an unknown, constantly growing number of items, it needs:", a: "A Dynamic Collection", d: ["A Static Collection", "A Single Constant", "A Read-Only File"] },

        // --- CATEGORY: ARRAYS ---
        { cat: "Arrays", val: 100, q: "A collection of items stored in a specific order in contiguous memory locations.", a: "An Array", d: ["A single variable", "A text file", "A network cable"] },
        { cat: "Arrays", val: 100, q: "What is an 'Index' in an array?", a: "The specific number or 'locker number' used to find an item", d: ["The total size of the array", "A type of virus", "The array's password"] },
        { cat: "Arrays", val: 100, q: "What is 'Zero-Based Indexing'?", a: "Starting the count at 0 instead of 1", d: ["Typing only zeros", "Deleting the array", "Starting the count at 10"] },

        { cat: "Arrays", val: 200, q: "In an array with 10 items, what is the index of the very last item?", a: "9", d: ["10", "0", "11"] },
        { cat: "Arrays", val: 200, q: "Why do computers use zero-based indexing for arrays?", a: "The index represents the offset or distance from the start of the array", d: ["It saves electricity", "Zero is a lucky number", "It is required by law"] },
        { cat: "Arrays", val: 200, q: "What happens if you try to access `locker[10]` in an array that only has 10 items?", a: "You get an 'Out of Bounds' error", d: ["It gives you the first item again", "It deletes the array", "It works perfectly"] },

        { cat: "Arrays", val: 300, q: "What does it mean to 'Iterate' through an array?", a: "Using a loop to walk through every item one by one", d: ["Deleting the array", "Sorting alphabetically", "Printing the array"] },
        { cat: "Arrays", val: 300, q: "In Google Apps Script, what property tells you how many items are in an array?", a: ".length", d: [".size", ".count", ".total"] },
        { cat: "Arrays", val: 300, q: "An array that has a fixed size and cannot grow is called a:", a: "Static Array", d: ["Dynamic Array", "Locked Array", "Frozen Array"] },

        { cat: "Arrays", val: 400, q: "An array that can grow or shrink as the program runs.", a: "Dynamic Array", d: ["Static Array", "Deleted Array", "Fixed Array"] },
        { cat: "Arrays", val: 400, q: "What command is commonly used to add a new item to the end of a dynamic array?", a: ".push()", d: [".add()", ".insert()", ".new()"] },
        { cat: "Arrays", val: 400, q: "In JavaScript, `var friends = ['Alice', 'Bob'];` is an example of what?", a: "An Array", d: ["A Linked List", "A Function", "A For Loop"] },

        { cat: "Arrays", val: 500, q: "If `fruits = ['Apple', 'Banana', 'Cherry']`, what does `fruits[1]` return?", a: "Banana", d: ["Apple", "Cherry", "fruits"] },
        { cat: "Arrays", val: 500, q: "Why do Arrays need a 'Block' of memory?", a: "The items must be stored in contiguous, side-by-side memory locations", d: ["They are encrypted", "They use pointers", "They are stored on flash drives"] },
        { cat: "Arrays", val: 500, q: "What happens if you ask for a massive array but your RAM has no large empty contiguous blocks?", a: "The memory allocation might fail, crashing the program", d: ["It is stored on the screen", "It deletes other programs", "It becomes a linked list"] },

        // --- CATEGORY: LINKED LISTS ---
        { cat: "Linked Lists", val: 100, q: "A collection of nodes where each item points to the next one in line.", a: "A Linked List", d: ["A spreadsheet", "A row of lockers", "An internet cable"] },
        { cat: "Linked Lists", val: 100, q: "What do we call the very first item in a linked list?", a: "The Head", d: ["The Start", "The Alpha", "The Index"] },
        { cat: "Linked Lists", val: 100, q: "True or False: Items in a linked list must sit right next to each other in physical RAM.", a: "False; they can be anywhere in memory", d: ["True; they must be contiguous", "True; they share the same block", "False; they don't use RAM"] },

        { cat: "Linked Lists", val: 200, q: "How does a computer find the 5th item in a linked list?", a: "It must start at the Head and follow the pointers 5 times", d: ["It jumps straight to index 5", "It uses a binary search", "It randomly guesses"] },
        { cat: "Linked Lists", val: 200, q: "Why is a 'Music Playlist' best modeled by a Linked List?", a: "Inserting/deleting songs requires changing pointers, not moving the whole list", d: ["Music files are large", "Arrays cannot hold audio", "It uses more CPU"] },
        { cat: "Linked Lists", val: 200, q: "Why is a Linked List considered 'Memory-Friendly' in a cluttered RAM?", a: "It can use tiny gaps of empty space scattered anywhere in memory", d: ["It uses exactly 0 bytes", "It compresses data", "It stores data in the CPU"] },

        { cat: "Linked Lists", val: 300, q: "Which structure is best for an 'Undo' history in a word processor?", a: "A Linked List", d: ["A Static Array", "A Flat File", "A Decimal Variable"] },
        { cat: "Linked Lists", val: 300, q: "Why does a Linked List use slightly MORE total memory per item than an Array?", a: "Every node must also store the Pointer address", d: ["It has better graphics", "It uses HD audio", "It requires internet access"] },
        { cat: "Linked Lists", val: 300, q: "In a Linked List, what does the last node's pointer point to?", a: "Nothing (or Null)", d: ["The Head", "The User", "The Cloud"] },

        { cat: "Linked Lists", val: 400, q: "If you lose the 'Head' of a linked list, what happens?", a: "You lose access to the entire list", d: ["It automatically rebuilds itself", "It turns into an array", "Nothing happens"] },
        { cat: "Linked Lists", val: 400, q: "Why is a 'Social Media Feed' often modeled using linked list concepts?", a: "New posts are inserted continuously without rewriting the entire history", d: ["Because it uses video", "Because it requires a password", "Because posts are short"] },
        { cat: "Linked Lists", val: 400, q: "If a video game is constantly spawning and destroying hundreds of enemies every second, which is better?", a: "Linked List", d: ["Static Array", "CSV File", "Single Variable"] },

        { cat: "Linked Lists", val: 500, q: "What happens when you delete a node from the middle of a linked list?", a: "The previous node's pointer is updated to point to the next node, bypassing the deleted one", d: ["All other nodes move over one spot", "The list crashes", "The list is wiped clean"] },
        { cat: "Linked Lists", val: 500, q: "Why is a linked list preferred for a 'Train Simulator' where cars are added to the middle?", a: "Insertion only requires updating two pointers, making it incredibly fast", d: ["Trains are too heavy for arrays", "It looks better on screen", "Arrays cannot store trains"] },
        { cat: "Linked Lists", val: 500, q: "What is a 'Doubly Linked List'?", a: "A list where each node points to both the NEXT and the PREVIOUS node", d: ["A list with two heads", "An array inside a list", "A list stored on two servers"] },

        // --- CATEGORY: POINTERS & NODES ---
        { cat: "Pointers/Nodes", val: 100, q: "What are the two parts of a 'Node' in a linked list?", a: "The Data and a Pointer", d: ["The Title and the Date", "The Lock and the Key", "The Front and the Back"] },
        { cat: "Pointers/Nodes", val: 100, q: "What is a 'Pointer' in a linked list?", a: "The memory address that tells the computer where to find the next item", d: ["A type of mouse", "A variable", "A security code"] },
        { cat: "Pointers/Nodes", val: 100, q: "In the 'Scavenger Hunt Logic' activity, what represented the Pointer?", a: "The 'Next Person' name written on the card", d: ["The student holding the card", "The room", "The secret word"] },

        { cat: "Pointers/Nodes", val: 200, q: "If you want to insert a new node into the middle of a linked list, what do you actually change?", a: "Just the pointers of the surrounding nodes", d: ["Every single node in the list", "The entire array", "The RAM speed"] },
        { cat: "Pointers/Nodes", val: 200, q: "A pointer effectively acts as a digital version of this.", a: "A Map or Direction", d: ["A Lock", "A Hammer", "A Battery"] },
        { cat: "Pointers/Nodes", val: 200, q: "Without a pointer, a piece of data in RAM is considered:", a: "Orphaned or Lost", d: ["Saved permanently", "Encrypted securely", "A Static Array"] },

        { cat: "Pointers/Nodes", val: 300, q: "What does a pointer value of 'Null' indicate?", a: "The end of the linked list has been reached", d: ["A virus is present", "The data is corrupted", "The RAM is full"] },
        { cat: "Pointers/Nodes", val: 300, q: "Why do pointers make Linked Lists slightly larger in file size than Arrays?", a: "They require extra memory to store the address itself", d: ["They use high-res images", "They require an internet connection", "They run infinite loops"] },
        { cat: "Pointers/Nodes", val: 300, q: "In physical RAM, what exactly is the 'address' stored in a pointer?", a: "The hexadecimal location of the next transistor block", d: ["A web URL", "An email address", "A street address"] },

        { cat: "Pointers/Nodes", val: 400, q: "If Node A points to Node C instead of Node B, what happens to Node B?", a: "It is effectively removed from the list's sequence", d: ["It becomes the Head", "It explodes", "It becomes an Array"] },
        { cat: "Pointers/Nodes", val: 400, q: "How does the 'Head' pointer differ from the other pointers?", a: "It is the starting reference saved by the program itself", d: ["It points to null", "It holds no data", "It is stored on the hard drive"] },
        { cat: "Pointers/Nodes", val: 400, q: "In the scavenger hunt, why didn't students have to change seats when a new person was added?", a: "Only the pointer (the name on the card) had to change, not physical location", d: ["Because they used an Array", "Because the room was too small", "Because the teacher said no"] },

        { cat: "Pointers/Nodes", val: 500, q: "What is a 'Memory Leak' related to nodes?", a: "When a node is removed from a list but the computer forgets to free its memory space", d: ["When the battery drains", "When Wi-Fi disconnects", "When a file is uploaded"] },
        { cat: "Pointers/Nodes", val: 500, q: "How do pointers enable the 'flexibility' of Linked Lists?", a: "They detach the logical order of data from its physical layout in RAM", d: ["They compress the data to 10%", "They encrypt the data automatically", "They make the CPU spin faster"] },
        { cat: "Pointers/Nodes", val: 500, q: "If you have a pointer to a node, what can you instantly access?", a: "Both the data inside that node and the path to the next node", d: ["The entire history of the computer", "The Wi-Fi password", "The user's location"] },

        // --- CATEGORY: TRADEOFFS ---
        { cat: "Tradeoffs", val: 100, q: "What is a major advantage of an Array?", a: "It is incredibly fast at accessing a specific item by its index", d: ["It is fast at adding items to the beginning", "It uses no RAM", "It cannot be hacked"] },
        { cat: "Tradeoffs", val: 100, q: "What is a major disadvantage of an Array?", a: "It is slow at inserting items in the middle because everything else must move", d: ["It is slow at finding items", "It can only hold 10 items", "It requires a paid subscription"] },
        { cat: "Tradeoffs", val: 100, q: "What is the major advantage of a Linked List?", a: "It is incredibly fast at inserting or deleting items anywhere in the list", d: ["It is fast at searching", "It uses less total memory than an array", "It sorts itself"] },

        { cat: "Tradeoffs", val: 200, q: "What is the major disadvantage of a Linked List?", a: "It is slow at accessing a specific item in the middle of the list", d: ["It is slow at adding items", "It cannot hold text", "It deletes data randomly"] },
        { cat: "Tradeoffs", val: 200, q: "If you insert a new high score at index `[0]`, what must the computer do?", a: "Physically move all other scores over by one spot in memory", d: ["Delete all other scores", "Create a new array", "Nothing"] },
        { cat: "Tradeoffs", val: 200, q: "Which structure is best for building a 'Top 10 Leaderboard' accessed quickly?", a: "An Array", d: ["A Linked List", "A Flat File", "A Single Variable"] },

        { cat: "Tradeoffs", val: 300, q: "What is 'Searchability' when evaluating data structures?", a: "How much work the CPU has to do to find a specific item", d: ["How easy it is to Google", "How bright the screen is", "How many users have the app"] },
        { cat: "Tradeoffs", val: 300, q: "Why can an Array use a 'Binary Search' (cutting the list in half repeatedly)?", a: "The items are in a row and accessible directly by their index", d: ["They are linked by pointers", "Arrays are always short", "It requires a cloud server"] },
        { cat: "Tradeoffs", val: 300, q: "Why CAN'T a Linked List use a 'Binary Search'?", a: "You don't know where the middle is without following pointers to get there", d: ["It uses decimal search instead", "It is too fast", "It has no data"] },

        { cat: "Tradeoffs", val: 400, q: "If an app requires constant searching for specific names in a sorted list, use:", a: "An Array", d: ["A Linked List", "A Flat File", "A Queue"] },
        { cat: "Tradeoffs", val: 400, q: "Why does choosing the wrong data structure affect the user experience?", a: "It causes the program to lag, stall, or crash", d: ["It makes font size smaller", "It changes app colors", "It forces users to buy a new PC"] },
        { cat: "Tradeoffs", val: 400, q: "For a classroom attendance sheet where names rarely change but need quick access, use:", a: "An Array", d: ["A Linked List", "A Dynamic Pointer", "A Chaos Bag"] },

        { cat: "Tradeoffs", val: 500, q: "How does the physical architecture of RAM make Arrays faster for 'jumping' to data?", a: "Contiguous blocks allow the CPU to calculate exact memory offsets mathematically instantly", d: ["RAM has tiny physical lockers", "RAM spins faster for arrays", "RAM encrypts linked lists"] },
        { cat: "Tradeoffs", val: 500, q: "Why is a Linked List immune to the 'Array Resizing Penalty'?", a: "It never needs to find a larger contiguous block of memory to grow", d: ["It deletes old data automatically", "It uses the hard drive instead", "It compresses all its nodes"] },
        { cat: "Tradeoffs", val: 500, q: "In big-O notation terms, why is accessing an array element considered O(1)?", a: "It takes the exact same amount of time regardless of how big the array is", d: ["It takes 1 second", "It takes 1 minute", "It only looks at the first item"] }
    ].map(item => ({ ...item, chapter: "Chapter 13", grade: "CS & Literacy Guild" })));
    
})();