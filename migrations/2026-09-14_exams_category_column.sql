-- Adds a real, stored category column to `exams` so grade-weight
-- classification no longer has to be re-inferred from exam_id/title text
-- on every read. Previously the only source of truth was string-matching
-- in getAssignmentCategory() (server/gradeCalc.js, js/modules/grade-weights.js),
-- which silently miscategorized any exam_id that didn't happen to contain
-- one of its magic keywords (confirmed real case: "Ch9-Profile App Assembly",
-- a 100-point capstone project, fell through to the generic low-weight
-- "assignment" bucket because "Assembly" isn't "project" or "milestone").
--
-- category values match the 4 grade-weight buckets already defined in
-- COURSE_WEIGHTS: 'assignment' | 'project_quiz' | 'final' | 'career'.
-- DEFAULT 'assignment' matches the existing string-matching fallback, so any
-- exam_id created after this migration without an explicit category keeps
-- working exactly as before until someone sets it.
ALTER TABLE exams
  ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'assignment' AFTER course_id;
