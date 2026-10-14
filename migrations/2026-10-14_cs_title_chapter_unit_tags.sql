-- Prefix CS activity titles with "CH#" and CS Unit Project titles with "U#"
-- so gradebook columns and the student grades page match IC at a glance.
-- Mirrors admin/due-dates.html's TITLE_MAP (which re-applies the same tags on
-- every due-date save). Idempotent: rows that already carry a tag are skipped,
-- so this is safe to re-run -- including on the new home server after the
-- droplet failover, since this was first applied on the droplet.

UPDATE exams
SET title = CONCAT('CH', REGEXP_REPLACE(exam_id, '^cs_ch([0-9]+)_.*$', '\\1'), ' ', title)
WHERE exam_id REGEXP '^cs_ch[0-9]+_'
  AND title IS NOT NULL AND title <> '' AND title <> exam_id
  AND title NOT REGEXP '^CH[0-9]+ ';

UPDATE exams
SET title = CONCAT('U', REGEXP_REPLACE(exam_id, '^Unit([0-9]+)-Project$', '\\1'), ' ', title)
WHERE exam_id REGEXP '^Unit[0-9]+-Project$'
  AND title IS NOT NULL AND title <> '' AND title <> exam_id
  AND title NOT REGEXP '^U[0-9]+ ';
