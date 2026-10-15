-- Unit 3 project now offers a choice: Option A Personal Finance or Option B
-- Grade Tracker (compsci/unit3-project-grades.html). Same exam_id; title only.
UPDATE exams SET title = 'U3 Project: The Data Pipeline (Finance or Grades)' WHERE exam_id = 'Unit3-Project';
