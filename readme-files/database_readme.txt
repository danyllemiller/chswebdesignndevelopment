CHS Gradebook (chs_gradebook) Database Documentation

Database Environment & Connection Overview

Technical Specifications

* Database Name: chs_gradebook
* Database Engine: MariaDB / MySQL
* Server Assignment: Local Mac Mini / webServer
* Primary Database Port: 3306
* Application Server Port: 3000 (Node.js)

Connection Configuration

The application server manages database interactions using the mysql2/promise library. Standard access utilizes the credentials defined in the server.js dbConfig object:

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'chs_password',
  database: 'chs_gradebook'
};


Database Connection Logic

The system implements a high-availability getDbConnection helper. It first attempts a standard TCP/IP connection via port 3306 using the dbConfig credentials. If the application is running on a Linux environment and the initial attempt fails, the logic executes an automatic fallback to the Linux UNIX socket at /var/run/mysqld/mysqld.sock. This fallback connection utilizes the root user with an empty password string ('') to ensure local administrative access remains functional during network-layer failures.

Command-Line Interface (CLI) Reference

MariaDB Shell Management

To perform administrative tasks, schema updates, or manual data audits, connect via the terminal:

Access MariaDB Shell:

sudo mysql -u root -p


(When prompted, provide the administrative password: chs_password)

Select Database Context:

USE chs_gradebook;


Verify Active Database: Before executing modifications, verify the current session context:

SELECT DATABASE();


Essential Diagnostic Commands

Command	Purpose
SHOW TABLES;	Lists all tables currently within the chs_gradebook schema.
DESCRIBE table_name;	Displays columns, data types, nullability, and keys for a specific table.
SHOW CREATE TABLE table_name;	Returns the exact DDL SQL used to generate the table and its constraints.
\G	Appends to any query to display results in a vertical format (ideal for wide tables like students).

Section 1: Core Course Architecture

Table: courses

Defines the primary curriculum tracks and state-level course identifiers.

* course_id (VARCHAR(50)): Primary Key. State-assigned course/track identifier.
* course_name (VARCHAR(100)): The descriptive name of the course.
* department (VARCHAR(50)): The academic department (e.g., CTE).

Table: class_sections

Maps specific schedule blocks to the parent course tracks.

* section_id (VARCHAR(50)): Primary Key. The period block identifier (e.g., A1, B4).
* course_id (VARCHAR(50)): Foreign Key. References courses.course_id.

Table: students

The central identity registry for all students, encompassing credentials and roster placement.

* student_id (VARCHAR(50)): Primary Key. Official school identification number.
* first_name (VARCHAR(50)): Student's legal given name.
* last_name (VARCHAR(50)): Student's legal family name.
* section_id (VARCHAR(50)): Foreign Key. References class_sections.section_id.
* email (VARCHAR(100)): UNIQUE. Official student email address.
* username (VARCHAR(50)): UNIQUE. Application workspace handle.
* role (VARCHAR(50)): System permission level. Defaults to 'student'.
* password_hash (VARCHAR(255)): Bcrypt encrypted password string.
* password (VARCHAR(255)): Plaintext backup string for legacy recovery.

Section 2: Assessment & Grading Engine

Table: exams

Defines curriculum milestones and assessment parameters.

* exam_id (VARCHAR(50)): Primary Key. Unique system identifier for the assessment.
* title (VARCHAR(100)): The student-facing assignment name.
* total_points (INT): The maximum point value for the assessment.
* due_date (DATETIME/NULL): Deadline for submission.
* instructions (TEXT): Guidelines and reference material for the student.
* course_id (VARCHAR(50)): Foreign Key. References courses.course_id.
* Note: This table supports ON DUPLICATE KEY UPDATE logic for administrative modifications.

Table: questions

The itemized test bank for quiz and exam problems.

* question_id (INT): Primary Key (Auto-increment).
* exam_id (VARCHAR(50)): Foreign Key. References exams.exam_id.
* question_text (TEXT): The actual assessment prompt.
* option_a, option_b, option_c, option_d (VARCHAR(255)): Multiple-choice selectors.
* correct_answer (VARCHAR(255)): The validation key used for automated grading.
* study_hint (TEXT): Remediation text provided for review.
* concept_tag (VARCHAR(100)): Taxonomy tag for tracking mastery.

Table: student_responses

Granular storage tracking individual student performance on a per-question basis.

* response_id (INT): Primary Key (Auto-increment).
* student_id (VARCHAR(50)): Foreign Key. References students.student_id.
* exam_id (VARCHAR(50)): Foreign Key. References exams.exam_id.
* question_id (INT): Foreign Key. References questions.question_id.
* student_answer (VARCHAR(255)): The specific choice submitted by the student.
* is_correct (TINYINT(1)): Boolean flag (1 = Correct, 0 = Incorrect).
* submission_date (TIMESTAMP): Automatic timestamp of the specific question submission.

Table: responses

The master grading summary table for overall assessment performance.

* id (INT): Primary Key (Auto-increment).
* student_id (VARCHAR(50)): Foreign Key. References students.student_id.
* exam_id (VARCHAR(100)): Foreign Key. References exams.exam_id.
* score (VARCHAR(10)): The total raw points earned.
* total_points (INT): Total points available at the time of completion.
* timestamp (DATETIME): The specific date and time the assessment was completed.
* Note: This table utilizes ON DUPLICATE KEY UPDATE logic to support grade overrides and teacher edits.

Section 3: Operations, Notebooks & Tracking

Table: chapters

Provides the structural mapping of curriculum units to course tracks.

* id (INT): Primary Key (Auto-increment).
* chapter_number (INT): Numerical sequence for sorting.
* chapter_name (VARCHAR(100)): Descriptive title of the curriculum unit.
* course_id (VARCHAR(50)): Foreign Key. References courses.course_id.
* is_visible (TINYINT(1)): Boolean toggle for student-side visibility.

Table: notebook_entries

Stores student-generated text and source code from the integrated portfolio editor.

* id (INT): Primary Key (Auto-increment).
* student_id (VARCHAR(50)): Foreign Key. References students.student_id.
* chapter_id (INT): Foreign Key. References chapters.id.
* title (VARCHAR(150)): Student-defined header for the entry.
* category (ENUM): Allowed values: Notes, Do Now, Exit Ticket, Worksheet.
* content (LONGTEXT): The raw text or HTML project data.
* created_at (TIMESTAMP): Initialization timestamp.
* updated_at (TIMESTAMP): Automatic timestamp updated upon every save/sync.

Table: clockins

Maintains real-time attendance and participation logs.

* id (INT): Primary Key (Auto-increment).
* student_id (VARCHAR(50)): Foreign Key. References students.student_id.
* section_id (VARCHAR(50)): The period block where the log occurred.
* type (VARCHAR(50)): Modality tracker; typically 'Do Now' or 'Clock-In'.
* answer (TEXT): Student input provided during the clock-in sequence.
* timestamp (DATETIME): The verified time of the log entry.

Table: daily_questions

Field	Type	Description
Pending	Pending	Execute DESCRIBE daily_questions; to populate.

Table: timesheets

Field	Type	Description
Pending	Pending	Execute DESCRIBE timesheets; to populate.

Service Maintenance & Server Process Management

Maintenance Protocol

Follow this procedure to stop the database service for maintenance or schema migration:

1. Stop Database Service:
2. (Fallback: sudo systemctl stop mariadb)
3. Verify Service Downtime:
4. Restore Service:

Watchdog & Process Management

In environments where services automatically restart, the DBA must identify and terminate watchdog scripts or scheduled tasks:

* Identify Background Monitors:
* Terminate Identified Watchdog:
* Review Scheduled Tasks: Check both user and root crontabs for restart scripts:
* Port Verification: Ensure ports 3000 and 3306 are vacant before restarting services.

Node.js (PM2) Workflow

The Node.js application is managed via PM2 for process persistence.

* Initial Service Launch:
* Restart Service:
* Configure Persistent Startup:
* Freeze Process List:
