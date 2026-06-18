-- CHS Web Design / Comp Sci Project Workflow Schema
-- Adds chapter project specs, submission tracking, rubric scoring, and grade aggregation support.

USE chs_gradebook;

-- 1) Chapter project specification registry
CREATE TABLE IF NOT EXISTS chapter_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id VARCHAR(50) NOT NULL,              -- e.g., CH08
  chapter_title VARCHAR(150) NOT NULL,          -- e.g., Sights & Sounds
  course_id VARCHAR(50) NOT NULL,               -- e.g., 05254G1S / 05254G2S / 05254ES / 10003GS
  exam_id VARCHAR(100) NOT NULL,                -- gradebook assignment key used in exams/responses
  project_title VARCHAR(200) NOT NULL,
  project_spec_html LONGTEXT NULL,              -- rendered spec content (or markdown converted html)
  self_reflection_weight DECIMAL(5,2) NOT NULL DEFAULT 33.33,
  peer_review_weight DECIMAL(5,2) NOT NULL DEFAULT 33.33,
  auto_grade_weight DECIMAL(5,2) NOT NULL DEFAULT 33.34,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_chapter_course_exam (chapter_id, course_id, exam_id)
);

-- 2) Submission records for student projects
CREATE TABLE IF NOT EXISTS project_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(50) NOT NULL,
  chapter_project_id INT NOT NULL,
  exam_id VARCHAR(100) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  file_hash VARCHAR(128) NULL,
  submission_mode ENUM('new', 'overwrite', 'new_version') NOT NULL DEFAULT 'new',
  version_no INT NOT NULL DEFAULT 1,
  overwrite_of_submission_id INT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_proj_sub_student (student_id),
  INDEX idx_proj_sub_exam (exam_id),
  CONSTRAINT fk_proj_sub_project FOREIGN KEY (chapter_project_id) REFERENCES chapter_projects(id) ON DELETE CASCADE
);

-- 3) Rubric evaluations
CREATE TABLE IF NOT EXISTS project_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_project_id INT NOT NULL,
  exam_id VARCHAR(100) NOT NULL,
  student_id VARCHAR(50) NOT NULL,              -- evaluated student
  evaluator_student_id VARCHAR(50) NULL,        -- reviewer student for peer review
  evaluator_type ENUM('self', 'peer', 'auto') NOT NULL,
  score DECIMAL(6,2) NOT NULL,
  max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  rubric_json LONGTEXT NULL,                    -- criterion breakdown
  feedback TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_proj_eval_student_exam (student_id, exam_id),
  INDEX idx_proj_eval_type (evaluator_type),
  UNIQUE KEY uq_proj_eval_single (chapter_project_id, exam_id, student_id, evaluator_type),
  CONSTRAINT fk_proj_eval_project FOREIGN KEY (chapter_project_id) REFERENCES chapter_projects(id) ON DELETE CASCADE
);

-- 4) Aggregated project grades for traceability and deterministic writes to responses
CREATE TABLE IF NOT EXISTS project_grade_aggregates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_project_id INT NOT NULL,
  exam_id VARCHAR(100) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  self_score DECIMAL(6,2) NULL,
  peer_score DECIMAL(6,2) NULL,
  auto_score DECIMAL(6,2) NULL,
  aggregate_score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  status ENUM('partial', 'complete') NOT NULL DEFAULT 'partial',
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proj_agg_student_exam (student_id, exam_id),
  CONSTRAINT fk_proj_agg_project FOREIGN KEY (chapter_project_id) REFERENCES chapter_projects(id) ON DELETE CASCADE
);

-- Helpful note:
-- Gradebook writeback target remains `responses` table using:
--   INSERT ... ON DUPLICATE KEY UPDATE score,total_points,timestamp
-- keyed by (student_id, exam_id) logical uniqueness in application logic.
