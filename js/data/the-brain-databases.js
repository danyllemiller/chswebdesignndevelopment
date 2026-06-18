/**
 * CHAPTER 14: THE BRAIN (Databases)
 * MASTER MIGRATION FILE - UNIFIED DATA BANK
 * 75 Items Total (5 Categories x 5 Levels x 3 Variations)
 */
window.migrationPool = window.migrationPool || []; window.migrationPool.push(...[
        // --- CATEGORY: DATABASE BASICS ---
        { cat: "Database Basics", val: 100, q: "A structured collection of data stored and accessed electronically.", a: "Database", d: ["Spreadsheet", "Folder", "Cache"] },
        { cat: "Database Basics", val: 100, q: "Software used to define, create, and manage databases (e.g. MySQL).", a: "DBMS", d: ["IDE", "CMS", "OS"] },
        { cat: "Database Basics", val: 100, q: "The standard and most common language used to manage relational databases.", a: "SQL", d: ["HTML", "PHP", "Python"] },

        { cat: "Database Basics", val: 200, q: "A single piece of information in a database row, also known as a column.", a: "Field", d: ["Record", "Table", "Query"] },
        { cat: "Database Basics", val: 200, q: "A complete set of fields for one specific item in a database table.", a: "Record", d: ["Field", "Schema", "Constraint"] },
        { cat: "Database Basics", val: 200, q: "A collection of related data records organized in rows and columns.", a: "Table", d: ["View", "Index", "Key"] },

        { cat: "Database Basics", val: 300, q: "A unique identifier assigned to every single record in a table.", a: "Primary Key", d: ["Foreign Key", "Master Key", "Public Key"] },
        { cat: "Database Basics", val: 300, q: "A field in one table that links to the primary identifier of another table.", a: "Foreign Key", d: ["Primary Key", "Secret Key", "Logic Key"] },
        { cat: "Database Basics", val: 300, q: "A type of database that organizes data into related tables.", a: "Relational Database", d: ["Flat Database", "Graph Database", "NoSQL DB"] },

        { cat: "Database Basics", val: 400, q: "Non-relational databases often used for big data and real-time apps (e.g. MongoDB).", a: "NoSQL", d: ["NewSQL", "AntiSQL", "PostSQL"] },
        { cat: "Database Basics", val: 400, q: "The formal blueprint or structure of a database system.", a: "Schema", d: ["Template", "Framework", "Script"] },
        { cat: "Database Basics", val: 400, q: "A special marker used in SQL to indicate that a data value does not exist.", a: "NULL", d: ["VOID", "EMPTY", "ZERO"] },

        { cat: "Database Basics", val: 500, q: "The process of organizing tables to reduce data redundancy and improve integrity.", a: "Normalization", d: ["Optimization", "Standardization", "Encryption"] },
        { cat: "Database Basics", val: 500, q: "Ensuring that database data remains accurate and consistent over its entire life.", a: "Data Integrity", d: ["Data Security", "Data Privacy", "Data Normalization"] },
        { cat: "Database Basics", val: 500, q: "Scaling a database by adding more power (CPU/RAM) to a single existing server.", a: "Vertical Scaling", d: ["Horizontal Scaling", "Lateral Scaling", "Node Scaling"] },

        // --- CATEGORY: SQL COMMANDS ---
        { cat: "SQL Commands", val: 100, q: "The SQL command used to retrieve or 'get' data from a table.", a: "SELECT", d: ["GET", "FETCH", "READ"] },
        { cat: "SQL Commands", val: 100, q: "The SQL command used to add a brand new record to a table.", a: "INSERT", d: ["ADD", "POST", "CREATE"] },
        { cat: "SQL Commands", val: 100, q: "The SQL command used to modify or change existing data in a table.", a: "UPDATE", d: ["CHANGE", "SET", "MODIFY"] },

        { cat: "SQL Commands", val: 200, q: "The SQL command used to permanently remove a record from a table.", a: "DELETE", d: ["REMOVE", "DROP", "ERASE"] },
        { cat: "SQL Commands", val: 200, q: "The part of a SQL query used to filter results based on a condition.", a: "WHERE", d: ["IF", "HAVING", "FILTER"] },
        { cat: "SQL Commands", val: 200, q: "Which command would you use to pick exactly which columns appear in results?", a: "SELECT", d: ["VIEW", "SHOW", "DISPLAY"] },

        { cat: "SQL Commands", val: 300, q: "The symbol used in SQL to represent 'all columns' in a table.", a: "Asterisk (*)", d: ["Percent (%)", "Hash (#)", "Plus (+)"] },
        { cat: "SQL Commands", val: 300, q: "The SQL command used to combine rows from two or more tables based on a related column.", a: "JOIN", d: ["MERGE", "UNION", "LINK"] },
        { cat: "SQL Commands", val: 300, q: "The SQL clause used to sort the results of a query.", a: "ORDER BY", d: ["SORT BY", "ARRANGE", "GROUP BY"] },

        { cat: "SQL Commands", val: 400, q: "The SQL keyword used to remove duplicate rows from query results.", a: "DISTINCT", d: ["UNIQUE", "SINGLE", "ONLY"] },
        { cat: "SQL Commands", val: 400, q: "The SQL command used to delete an entire table and its structure.", a: "DROP", d: ["DELETE", "TRUNCATE", "KILL"] },
        { cat: "SQL Commands", val: 400, q: "The SQL command used to add, delete, or modify columns in an existing table.", a: "ALTER", d: ["CHANGE", "MODIFY", "RESTRUCTURE"] },

        { cat: "SQL Commands", val: 500, q: "The SQL clause used to restrict the number of rows returned by a query.", a: "LIMIT", d: ["TOP", "MAX", "STOP"] },
        { cat: "SQL Commands", val: 500, q: "The SQL keyword used to filter results after they have been grouped.", a: "HAVING", d: ["WHERE", "FILTER", "WHEN"] },
        { cat: "SQL Commands", val: 500, q: "The SQL clause used to combine rows that have the same values into summary rows.", a: "GROUP BY", d: ["SORT BY", "ORDER BY", "CLUSTER"] },

        // --- CATEGORY: RELATIONSHIPS ---
        { cat: "Relationships", val: 100, q: "The relationship where one record in Table A relates to many in Table B.", a: "One-to-Many", d: ["Many-to-Many", "One-to-One", "Multi-Link"] },
        { cat: "Relationships", val: 100, q: "The relationship where one record in Table A relates to exactly one in Table B.", a: "One-to-One", d: ["One-to-Many", "Single-Link", "Flat-Key"] },
        { cat: "Relationships", val: 100, q: "Which relationship type is the most common in database design?", a: "One-to-Many", d: ["One-to-One", "Many-to-Many", "Many-to-One"] },

        { cat: "Relationships", val: 200, q: "The complex relationship where multiple records in Table A relate to multiple in Table B.", a: "Many-to-Many", d: ["Many-to-One", "Double-Link", "Full-Relational"] },
        { cat: "Relationships", val: 200, q: "A third table used specifically to connect two others in a many-to-many link.", a: "Junction Table", d: ["Master Table", "Pivot List", "Logic Folder"] },
        { cat: "Relationships", val: 200, q: "In a One-to-Many link, which side of the relationship usually holds the Foreign Key?", a: "The Many side", d: ["The One side", "The Parent side", "The Primary side"] },

        { cat: "Relationships", val: 300, q: "The relationship between a specific student and their unique school ID card.", a: "One-to-One", d: ["One-to-Many", "Many-to-Many", "Linked-Key"] },
        { cat: "Relationships", val: 300, q: "The relationship between a single customer and the multiple orders they place.", a: "One-to-Many", d: ["Many-to-Many", "One-to-One", "Primary-Link"] },
        { cat: "Relationships", val: 300, q: "The relationship between students and the multiple classes they are enrolled in.", a: "Many-to-Many", d: ["One-to-Many", "Multi-Layer", "One-to-One"] },

        { cat: "Relationships", val: 400, q: "A constraint that ensures a Foreign Key must always point to an existing Primary Key.", a: "Referential Integrity", d: ["Data Normalization", "Key Security", "Logic Shield"] },
        { cat: "Relationships", val: 400, q: "A relationship where a record in a table links back to another record in the same table.", a: "Self-Referential", d: ["Auto-Keyed", "Circular Link", "Internal Relation"] },
        { cat: "Relationships", val: 400, q: "A primary key that is made up of two or more combined columns.", a: "Composite Key", d: ["Joint Key", "Master Key", "Multi-Key"] },

        { cat: "Relationships", val: 500, q: "A visual diagram used to map out the structure and relationships of a database.", a: "ERD", d: ["SQL Map", "UML Box", "Data Flow"] },
        { cat: "Relationships", val: 500, q: "A rule that prevents a parent record from being deleted if child records exist.", a: "Restrict Constraint", d: ["Cascade Delete", "Safety Lock", "Key Block"] },
        { cat: "Relationships", val: 500, q: "A rule that automatically deletes child records when the parent record is removed.", a: "Cascade Delete", d: ["Restrict Deletion", "Auto-Wipe", "Chain Remove"] },

        // --- CATEGORY: OPERATIONS ---
        { cat: "Operations", val: 100, q: "The standard acronym for the four basic database functions (Create, Read, Update, Delete).", a: "CRUD", d: ["CART", "READ", "DBMS"] },
        { cat: "Operations", val: 100, q: "A formal request for information from a database, often called a 'Question'.", a: "Query", d: ["Script", "Command", "Statement"] },
        { cat: "Operations", val: 100, q: "A single logical unit of work that must either succeed completely or fail completely.", a: "Transaction", d: ["Session", "Batch", "Exchange"] },

        { cat: "Operations", val: 200, q: "The process of undoing a transaction that has failed or encountered an error.", a: "Rollback", d: ["Undo", "Revert", "Commit"] },
        { cat: "Operations", val: 200, q: "The command used to permanently save all changes made during a transaction.", a: "Commit", d: ["Save", "Push", "Finish"] },
        { cat: "Operations", val: 200, q: "Ensuring that multiple users can update the database without overwriting each other.", a: "Concurrency Control", d: ["Access Policy", "Input Guard", "Traffic Control"] },

        { cat: "Operations", val: 300, q: "Searchable pointers created in a database to significantly speed up queries.", a: "Indexes", d: ["Primary Keys", "Foreign Keys", "Tables"] },
        { cat: "Operations", val: 300, q: "A virtual table that is actually just a saved SELECT query.", a: "View", d: ["Portal", "Mirror", "Snapshot"] },
        { cat: "Operations", val: 300, q: "A block of SQL code that is saved on the server and can be reused.", a: "Stored Procedure", d: ["Server Script", "Macro", "Query Batch"] },

        { cat: "Operations", val: 400, q: "A type of JOIN that returns only the rows where there is a match in both tables.", a: "Inner Join", d: ["Outer Join", "Full Join", "Left Join"] },
        { cat: "Operations", val: 400, q: "A type of JOIN that returns all records from the left table and matched from the right.", a: "Left Join", d: ["Inner Join", "Right Join", "Root Join"] },
        { cat: "Operations", val: 400, q: "The 'All or Nothing' property of a database transaction.", a: "Atomicity", d: ["Isolation", "Consistency", "Durability"] },

        { cat: "Operations", val: 500, q: "The acronym for the four properties of reliable database transactions.", a: "ACID", d: ["BASE", "SALT", "WASP"] },
        { cat: "Operations", val: 500, q: "An automated action that is triggered when a specific event occurs in the database.", a: "Trigger", d: ["Alarm", "Hook", "Alert"] },
        { cat: "Operations", val: 500, q: "The 'I' in the ACID transaction acronym.", a: "Isolation", d: ["Integrity", "Iteration", "Indexing"] },

        // --- CATEGORY: MODERN DATA ---
        { cat: "Modern Data", val: 100, q: "What does the 'C' in the CRUD acronym stand for?", a: "Create", d: ["Change", "Check", "Code"] },
        { cat: "Modern Data", val: 100, q: "What does the 'R' in the CRUD acronym stand for?", a: "Read", d: ["Retrieve", "Refresh", "Review"] },
        { cat: "Modern Data", val: 100, q: "A type of NoSQL database where data is stored as JSON-like objects.", a: "Document-based", d: ["Flat-file", "Graph-based", "String-based"] },

        { cat: "Modern Data", val: 200, q: "A database that stores data by columns instead of rows to improve analytical speed.", a: "Columnar", d: ["Row-based", "Cell-centric", "Relational"] },
        { cat: "Modern Data", val: 200, q: "A database stored entirely in the system's RAM to provide extreme performance.", a: "In-Memory", d: ["On-Disk", "Cloud-Stored", "Virtualized"] },
        { cat: "Modern Data", val: 200, q: "The simplest form of NoSQL database, like Redis, using unique identifiers.", a: "Key-Value", d: ["Map-Reduce", "Node-Link", "Primary-Foreign"] },

        { cat: "Modern Data", val: 300, q: "A tool or script used to manage and track changes to a database schema via code.", a: "Migration", d: ["Deployment", "Transfer", "Translation"] },
        { cat: "Modern Data", val: 300, q: "A technique for converting data between incompatible systems (like DB rows to Code objects).", a: "ORM", d: ["SQLM", "DATA-MAP", "J-LINK"] },
        { cat: "Modern Data", val: 300, q: "Scaling a database by adding more servers to the network (distributed nodes).", a: "Horizontal Scaling", d: ["Vertical Scaling", "Linear Scaling", "Up-Scaling"] },

        { cat: "Modern Data", val: 400, q: "A database that is physically spread across multiple geographic locations.", a: "Distributed", d: ["Centralized", "Mirrored", "Localized"] },
        { cat: "Modern Data", val: 400, q: "A database specifically designed for handling highly connected data like social networks.", a: "Graph Database", d: ["Web Database", "Node Database", "Map Database"] },
        { cat: "Modern Data", val: 400, q: "A massive central repository used for storing historical data from many sources.", a: "Data Warehouse", d: ["Data Silo", "Data Vault", "Data Bank"] },

        { cat: "Modern Data", val: 500, q: "The process of splitting a large database into smaller, faster, more manageable pieces.", a: "Sharding", d: ["Slicing", "Splitting", "Partitioning"] },
        { cat: "Modern Data", val: 500, q: "The automatic copying of data from one server to another for redundancy and backup.", a: "Replication", d: ["Cloning", "Mirroring", "Syncing"] },
        { cat: "Modern Data", val: 500, q: "A database optimized specifically for handling time-stamped or sequential data.", a: "Time-Series", d: ["Event-log", "Data-Track", "Chronos"] }
    ].map(item => ({ ...item, chapter: "Chapter 14", grade: "Web Design 2" })));
