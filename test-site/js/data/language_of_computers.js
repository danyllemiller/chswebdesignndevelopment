/**
 * CHAPTER 7: The Language of Computers
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
        // --- CATEGORY: BITS, BYTES & SCALE ---
        { cat: "Bits, Bytes & Scale", val: 100, q: "What is the smallest unit of digital data, representing a single 0 or 1?", a: "Bit", d: ["Byte", "Pixel", "Node"] },
        { cat: "Bits, Bytes & Scale", val: 100, q: "How many bits are in one standard Byte?", a: "8", d: ["4", "10", "16"] },
        { cat: "Bits, Bytes & Scale", val: 100, q: "What physical component acts as a tiny on/off switch to create a bit?", a: "Transistor", d: ["Capacitor", "Monitor", "Router"] },

        { cat: "Bits, Bytes & Scale", val: 200, q: "Why do computers use Binary (Base-2) instead of Decimal (Base-10)?", a: "It is more reliable to detect only two states (on/off) in hardware.", d: ["Binary is easier for humans to read.", "Base-10 was not invented yet.", "It makes the computer use less electricity."] },
        { cat: "Bits, Bytes & Scale", val: 200, q: "A 'Kilobyte' is technically how many bytes?", a: "1,024", d: ["1,000", "512", "8"] },
        { cat: "Bits, Bytes & Scale", val: 200, q: "What does 'Base-2' mean?", a: "There are only two possible digits: 0 and 1.", d: ["The computer has two brains.", "Every file has two copies.", "Data is stored in two folders."] },

        { cat: "Bits, Bytes & Scale", val: 300, q: "Put these in order from smallest to largest: MB, KB, TB, GB.", a: "KB, MB, GB, TB", d: ["MB, KB, GB, TB", "TB, GB, MB, KB", "KB, GB, MB, TB"] },
        { cat: "Bits, Bytes & Scale", val: 300, q: "Which unit represents roughly one billion bytes?", a: "Gigabyte (GB)", d: ["Megabyte (MB)", "Terabyte (TB)", "Kilobyte (KB)"] },
        { cat: "Bits, Bytes & Scale", val: 300, q: "Why is a Kilobyte 1,024 bytes instead of 1,000?", a: "Because it is based on powers of 2 ($2^{10}$).", d: ["It includes extra space for viruses.", "It was a math error by early engineers.", "To make the hard drive look bigger."] },

        { cat: "Bits, Bytes & Scale", val: 400, q: "Which unit represents roughly one trillion bytes?", a: "Terabyte (TB)", d: ["Gigabyte (GB)", "Megabyte (MB)", "Petabyte (PB)"] },
        { cat: "Bits, Bytes & Scale", val: 400, q: "If a file is 8 bits long, it can represent how many unique values?", a: "256", d: ["8", "100", "512"] },
        { cat: "Bits, Bytes & Scale", val: 400, q: "What is a 'Nibble' in computer science?", a: "4 bits (half a byte)", d: ["A small download.", "A corrupted bit.", "A type of network switch."] },

        { cat: "Bits, Bytes & Scale", val: 500, q: "How many Megabytes are in a single Gigabyte?", a: "1,024", d: ["1,000", "8", "1,048,576"] },
        { cat: "Bits, Bytes & Scale", val: 500, q: "What determines the 'Scale' of a storage system?", a: "The number of bits the architecture can address.", d: ["The physical weight of the CPU.", "The color of the motherboard.", "The number of users on the Wi-Fi."] },
        { cat: "Bits, Bytes & Scale", val: 500, q: "If you have 2 bits, how many patterns can you make?", a: "4 (00, 01, 10, 11)", d: ["2", "8", "16"] },

        // --- CATEGORY: BINARY MATH ---
        { cat: "Binary Math", val: 100, q: "In an 8-bit number, what is the place value of the far-right digit?", a: "1 ($2^{0}$)", d: ["0", "2", "8"] },
        { cat: "Binary Math", val: 100, q: "What is the decimal value of the binary number `00000001`?", a: "1", d: ["0", "8", "10"] },
        { cat: "Binary Math", val: 100, q: "What are the first four binary place values starting from the right?", a: "1, 2, 4, 8", d: ["1, 10, 100, 1000", "0, 1, 2, 3", "2, 4, 6, 8"] },

        { cat: "Binary Math", val: 200, q: "What is the binary representation of the decimal number 10?", a: "00001010", d: ["00001111", "00001001", "00000110"] },
        { cat: "Binary Math", val: 200, q: "What is the decimal value of the binary number `00000011`?", a: "3", d: ["2", "11", "1"] },
        { cat: "Binary Math", val: 200, q: "If the first three bits are ON (`00000111`), what is the decimal total?", a: "7 ($4+2+1$)", d: ["3", "6", "10"] },

        { cat: "Binary Math", val: 300, q: "What is the binary representation of the decimal number 64?", a: "01000000", d: ["00100000", "10000000", "01100000"] },
        { cat: "Binary Math", val: 300, q: "What is the decimal value of the binary number `10000000`?", a: "128", d: ["255", "64", "1"] },
        { cat: "Binary Math", val: 300, q: "How do you represent the decimal number 15 in 8-bit binary?", a: "00001111", d: ["00001010", "11110000", "00001000"] },

        { cat: "Binary Math", val: 400, q: "What is the highest decimal number you can represent with 8 bits?", a: "255", d: ["256", "128", "1000"] },
        { cat: "Binary Math", val: 400, q: "What is the binary representation of the decimal number 200?", a: "11001000", d: ["10101010", "11111111", "00110010"] },
        { cat: "Binary Math", val: 400, q: "In the 'Binary Abacus' activity, turning a bit 'OFF' represents which value?", a: "0", d: ["1", "Null", "128"] },

        { cat: "Binary Math", val: 500, q: "What happens if you add 1 to the binary number `11111111`?", a: "Overflow (it resets to 00000000 in 8-bit architecture)", d: ["It becomes 256.", "The computer explodes.", "It becomes 100000000."] },
        { cat: "Binary Math", val: 500, q: "The formula for the maximum value of $N$ bits is:", a: "$2^{N} - 1$", d: ["$N \times 2$", "$2 \times N$", "$N^{2}$"] },
        { cat: "Binary Math", val: 500, q: "What is the decimal value of `10101010`?", a: "170", d: ["128", "150", "200"] },

        // --- CATEGORY: TEXT ENCODINGS ---
        { cat: "Text Encodings", val: 100, q: "What is a 'Translation Table' that tells a computer which numbers represent which letters?", a: "Encoding", d: ["Encryption", "Compression", "Formatting"] },
        { cat: "Text Encodings", val: 100, q: "What does ASCII stand for?", a: "American Standard Code for Information Interchange", d: ["All Systems Computer Information Input", "Advanced Silicon Code Internal Index", "Analog Signal Character Input"] },
        { cat: "Text Encodings", val: 100, q: "Which encoding allows computers to display Emojis?", a: "Unicode", d: ["ASCII", "Binary", "Hexadecimal"] },

        { cat: "Text Encodings", val: 200, q: "Why was Unicode created to replace the original ASCII?", a: "To include characters from every language and diverse alphabets.", d: ["ASCII was too fast for computers.", "Unicode uses less memory.", "Emojis are required by law."] },
        { cat: "Text Encodings", val: 200, q: "How many characters could the original 7-bit ASCII represent?", a: "128", d: ["256", "100", "8"] },
        { cat: "Text Encodings", val: 200, q: "In the computer's 'mind,' the letter 'A' is actually stored as:", a: "A specific number (like 65)", d: ["A tiny picture of an A.", "The word 'Alpha'.", "A network link."] },

        { cat: "Text Encodings", val: 300, q: "What is the most common version of Unicode used on the web today?", a: "UTF-8", d: ["ASCII-12", "Binary-64", "Hex-Color"] },
        { cat: "Text Encodings", val: 300, q: "Which encoding uses only 7 or 8 bits and is limited to English characters?", a: "ASCII", d: ["Unicode", "Binary", "Logic Builder"] },
        { cat: "Text Encodings", val: 300, q: "What happens when a computer tries to read Unicode using an old ASCII translator?", a: "You see 'garbage' characters or empty boxes.", d: ["The computer crashes.", "The text translates to Spanish.", "The internet slows down."] },

        { cat: "Text Encodings", val: 400, q: "How does UTF-8 save memory compared to older fixed-width encodings?", a: "It uses 1 byte for English but adds more bytes for complex characters.", d: ["It deletes vowels.", "It only works in the cloud.", "It compresses text into ZIP files automatically."] },
        { cat: "Text Encodings", val: 400, q: "What is the 'Abstration' used in text encodings?", a: "Humans see letters, while the computer only deals with binary numbers.", d: ["The computer sees the font color.", "The CPU reads the ink level.", "Text is stored as a video file."] },
        { cat: "Text Encodings", val: 400, q: "Which organization maintains the global standards for Unicode characters?", a: "The Unicode Consortium", d: ["The FBI", "Microsoft", "The W3C"] },

        { cat: "Text Encodings", val: 500, q: "If a text file is saved in a 16-bit encoding, it uses how many bytes per character?", a: "2", d: ["1", "8", "16"] },
        { cat: "Text Encodings", val: 500, q: "How many unique characters can 16-bit Unicode theoretically represent?", a: "65,536", d: ["256", "1,000", "1 million"] },
        { cat: "Text Encodings", val: 500, q: "Which encoding concept explains why you can see Ancient Greek and Modern Arabic on the same page?", a: "Universal Character Set (Unicode)", d: ["Binary Conversion", "Data Exfiltration", "The OSI Model"] },

        // --- CATEGORY: COLOR & IMAGES ---
        { cat: "Color & Images", val: 100, q: "What is a 'Pixel'?", a: "A single colored dot in a massive grid that forms an image.", d: ["A type of computer virus.", "A cable used for the internet.", "A mathematical formula."] },
        { cat: "Color & Images", val: 100, q: "What does RGB stand for?", a: "Red, Green, Blue", d: ["Read, Generate, Build", "Ratio, Grid, Byte", "Remote, Global, Binary"] },
        { cat: "Color & Images", val: 100, q: "Which numbering system uses 0-9 and A-F as a shorthand for binary colors?", a: "Hexadecimal", d: ["Decimal", "ASCII", "Octal"] },

        { cat: "Color & Images", val: 200, q: "What color is represented by the Hex code #FF0000?", a: "Bright Red", d: ["Bright Blue", "Bright Green", "White"] },
        { cat: "Color & Images", val: 200, q: "In an RGB model, what is the maximum intensity value for any single color?", a: "255", d: ["100", "256", "1,024"] },
        { cat: "Color & Images", val: 200, q: "What color do you get if Red, Green, and Blue are all set to 0 (#000000)?", a: "Black", d: ["White", "Gray", "Transparent"] },

        { cat: "Color & Images", val: 300, q: "What is 'Bit Depth' in digital imagery?", a: "The number of bits used to represent the color of a single pixel.", d: ["The physical thickness of the monitor.", "The speed of the internet connection.", "The number of files in a folder."] },
        { cat: "Color & Images", val: 300, q: "What color do you get if Red, Green, and Blue are all at maximum (#FFFFFF)?", a: "White", d: ["Black", "Yellow", "Rainbow"] },
        { cat: "Color & Images", val: 300, q: "How does increasing bit depth affect an image?", a: "It provides more colors and smoother gradients but increases file size.", d: ["It makes the image physically smaller.", "It makes the computer run cooler.", "It deletes the metadata."] },

        { cat: "Color & Images", val: 400, q: "In the Hex code #00FF00, which color is set to maximum?", a: "Green", d: ["Red", "Blue", "Black"] },
        { cat: "Color & Images", val: 400, q: "A 'True Color' image uses 24 bits per pixel. How many bits are assigned to Red?", a: "8", d: ["24", "1", "16"] },
        { cat: "Color & Images", val: 400, q: "Why is Hexadecimal used in Web Design (CSS) instead of pure Binary?", a: "It is a much shorter and more human-readable shorthand.", d: ["Binary is illegal on the web.", "Hexadecimal makes the Wi-Fi faster.", "Browsers cannot read numbers."] },

        { cat: "Color & Images", val: 500, q: "If an image is 100 pixels wide and 100 pixels tall with a 24-bit depth, how many total BITS are needed?", a: "240,000", d: ["10,000", "24,000", "1 million"] },
        { cat: "Color & Images", val: 500, q: "Calculate the decimal value of the Hex pair '7F'.", a: "127", d: ["255", "70", "100"] },
        { cat: "Color & Images", val: 500, q: "What are 'Sub-pixels'?", a: "Tiny individual Red, Green, and Blue lights that make up a single pixel.", d: ["Smaller files inside a JPEG.", "Extra pixels used for backups.", "The resolution of a mouse."] },

        // --- CATEGORY: COMPRESSION & TRADEOFFS ---
        { cat: "Compression & Tradeoffs", val: 100, q: "What type of compression throws away data to make a file much smaller?", a: "Lossy", d: ["Lossless", "Binary", "Static"] },
        { cat: "Compression & Tradeoffs", val: 100, q: "What type of compression makes a file smaller without losing any original data?", a: "Lossless", d: ["Lossy", "Decimal", "Dynamic"] },
        { cat: "Compression & Tradeoffs", val: 100, q: "Which file extension is a common example of Lossy compression?", a: ".jpg (JPEG)", d: [".zip", ".png", ".exe"] },

        { cat: "Compression & Tradeoffs", val: 200, q: "What is 'Sampling Rate' in digital audio?", a: "How many digital 'snapshots' are taken of an analog sound wave per second.", d: ["The volume of the speakers.", "The number of instruments in a song.", "The price of the music file."] },
        { cat: "Compression & Tradeoffs", val: 200, q: "Why would you use Lossless compression (like .zip) for a text document?", a: "Because losing even one character would ruin the meaning of the data.", d: ["To make the text more colorful.", "To protect the file from viruses.", "To make the file 100x larger."] },
        { cat: "Compression & Tradeoffs", val: 200, q: "Which file extension is a common example of Lossless compression?", a: ".png", d: [".jpg", ".mp3", ".gif"] },

        { cat: "Compression & Tradeoffs", val: 300, q: "What is the primary tradeoff when choosing a high-resolution file format?", a: "Better quality vs. larger storage space and slower performance.", d: ["More colors vs. less electricity.", "Faster internet vs. cheaper hardware.", "English text vs. Spanish text."] },
        { cat: "Compression & Tradeoffs", val: 300, q: "Why do we use Lossy compression for photos and music?", a: "The human eye and ear often cannot detect the missing data, but the file size is much smaller.", d: ["It is a requirement for social media.", "Lossless files are illegal to share.", "It makes the colors look more natural."] },
        { cat: "Compression & Tradeoffs", val: 300, q: "What happens if you save a JPEG over and over again?", a: "The quality gets worse each time due to repeated Lossy compression.", d: ["The file size gets larger.", "The computer deletes the file.", "The image becomes Lossless."] },

        { cat: "Compression & Tradeoffs", val: 400, q: "What is a 'High-Resolution TIFF' used for?", a: "Professional printing where quality is more important than file size.", d: ["Sending a quick text message.", "Creating a tiny website icon.", "Storing passwords."] },
        { cat: "Compression & Tradeoffs", val: 400, q: "How does compression affect the CPU?", a: "The CPU must work harder (unzip/decompress) to read the data in real-time.", d: ["It makes the CPU run cooler.", "It deletes the CPU's memory.", "It has no effect on the CPU."] },
        { cat: "Compression & Tradeoffs", val: 400, q: "If you want to save a logo with a transparent background, which format should you use?", a: ".png", d: [".jpg", ".txt", ".mp3"] },

        { cat: "Compression & Tradeoffs", val: 500, q: "Why does choosing a low sampling rate make audio sound 'robotic' or 'fuzzy'?", a: "There aren't enough digital bits to accurately recreate the original smooth sound wave.", d: ["The microphone was too close.", "The speakers are broken.", "The file has a virus."] },
        { cat: "Compression & Tradeoffs", val: 500, q: "In the discussion 'Can a Computer Think in Patterns?', what is the technical truth?", a: "The computer only sees a long list of numbers; 'meaning' is assigned by human algorithms.", d: ["Computers have feelings for photos.", "Computers understand art like humans.", "Binary is a living language."] },
        { cat: "Compression & Tradeoffs", val: 500, q: "What is 'Redundancy' in Lossless compression?", a: "Finding repeating patterns of 1s and 0s and replacing them with a shorter code.", d: ["Deleting files that look similar.", "Having a backup of every file.", "Using two different hard drives."] }
    ].map(item => ({ ...item, chapter: "Chapter 7", grade: "CS & Literacy Guild" })));
    
})();