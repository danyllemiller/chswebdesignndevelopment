-- CS Unit 3 project swapped from "The Player Data Pipeline" (Byte Size Games)
-- to "The Personal Finance Pipeline" -- same exam_id, so existing grades stay.
-- Keeps the "U3 " tag from 2026-10-14_cs_title_chapter_unit_tags.sql.
UPDATE exams SET title = 'U3 Project: The Personal Finance Pipeline' WHERE exam_id = 'Unit3-Project';
